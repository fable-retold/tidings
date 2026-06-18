// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// To use this you have to: npm install wkhtmltopdf-selfcontained
/*

NOTICE: If you want to use this from Cloud9 (and other oddly configured *nix environments) you MUST have a valid fontconfig profile.

That means you need to do something like this in Cloud9 to see the available locales:
  stevenvelozo:~/workspace (master) $ locale -a
  C
  C.UTF-8
  POSIX


Then set a locale with this:
  stevenvelozo:~/workspace (master) $ LC_ALL=C

This has to happen before you execute the Tidings application.  This is a limitation of how wkhtmlpdf-selfcontained operates.  Not totally thrilled with it, but it does not properly bubble up errors.

 */
// This is so we don't have a dependency on that library outright for our reporting module (when the usual case is to just use html)
const libWkhtmltopdf = require('wkhtmltopdf');
const libFS = require('fs');

// Total-duration cap for a single rasterization, overridable via fable
// settings.Tidings.Rasterization.TimeoutMS. Kept high so legitimately large
// documents are not clipped; 0 disables. The point is to convert a hung
// rasterize (wkhtmltopdf wedged on an unreachable page server) into a bounded
// error instead of an indefinite stall. ~Kong's request ceiling by default.
const RASTERIZE_TIMEOUT_MS_DEFAULT = 600000;

module.exports = (pTaskData, pState, fCallback) =>
{
	const tmpFileName = pTaskData.File;

	// If no path was supplied, use the Stage path
	if (!pTaskData.Path)
	{
		pTaskData.Path = pState.Manifest.Metadata.Locations.Stage;
	}

	if (!pTaskData.OutputPath)
	{
		pTaskData.OutputPath = pState.Manifest.Metadata.Locations.Stage;
	}

	if (!pTaskData.Output)
	{
		pTaskData.Output = tmpFileName + '.pdf';
	}

	const tmpTidingsSettings = (pState.Fable && pState.Fable.settings && pState.Fable.settings.Tidings) || {};
	const tmpRasterizationSettings = tmpTidingsSettings.Rasterization || {};
	const tmpTimeoutMS = Number.isFinite(tmpRasterizationSettings.TimeoutMS) ? tmpRasterizationSettings.TimeoutMS : RASTERIZE_TIMEOUT_MS_DEFAULT;

	// Settle exactly once: 'finish' (success), any stream 'error', the timeout, or a
	// synchronous throw. The previous code only called back on 'finish', so any error
	// path left the render waterfall hung forever.
	let tmpSettled = false;
	let tmpTimeoutTimer = null;
	/** @type {NodeJS.ReadableStream|null} */
	let tmpPdfStream = null;
	const fSettle = (pError) =>
	{
		if (tmpSettled)
		{
			return;
		}
		tmpSettled = true;
		if (tmpTimeoutTimer)
		{
			clearTimeout(tmpTimeoutTimer);
			tmpTimeoutTimer = null;
		}
		// processRasterizationTask logs and continues on error (one failed rasterize
		// must not abort the report), so pass the error up rather than swallowing it.
		return fCallback(pError || null, pState);
	};

	// Need to move away from libFS only ASAFP so this works with dropbag.
	// Because these tools are external, they likely need to happen locally in scratch then upload the files that are generated.
	// Talk to Jason about how best to manage this and for now only support FS.
	const tmpOutputStream = libFS.createWriteStream(pTaskData.OutputPath  + pTaskData.Output);
	tmpOutputStream.on('finish',
		() =>
		{
			fSettle();
		}
	);
	tmpOutputStream.on('error',
		(pError) =>
		{
			pState.Behaviors.stateLog(pState, 'Error writing pdf from WKHTMLPDF: ' + JSON.stringify(pTaskData) + ' ' + pError, pError);
			fSettle(pError);
		}
	);

	if (tmpTimeoutMS > 0)
	{
		tmpTimeoutTimer = setTimeout(() =>
		{
			pState.Behaviors.stateLog(pState, 'WKHTMLTOPDF rasterize timed out after ' + tmpTimeoutMS + 'ms: ' + JSON.stringify(pTaskData), new Error('WKHTMLTOPDF rasterize timeout'));
			// Best-effort teardown of the wedged streams.
			try { if (tmpPdfStream && typeof(tmpPdfStream.destroy) === 'function') { tmpPdfStream.destroy(); } } catch (pDestroyError) { /* ignore */ }
			try { if (typeof(tmpOutputStream.destroy) === 'function') { tmpOutputStream.destroy(); } } catch (pDestroyError) { /* ignore */ }
			fSettle(new Error('WKHTMLTOPDF rasterize timed out after ' + tmpTimeoutMS + 'ms'));
		}, tmpTimeoutMS);
	}

	process.env['LC_ALL'] = 'C';
	// Load settings from the scratch state if they are there (so reports can pass them in)
	const tmpWKHTMLtoPDFSettings = (typeof(pState.Scratch.WKHTMLtoPDFSettings) !== 'undefined') ? pState.Scratch.WKHTMLtoPDFSettings : {};
	// Some default settings
	if (!tmpWKHTMLtoPDFSettings.hasOwnProperty('pageSize'))
	{
		tmpWKHTMLtoPDFSettings.pageSize = 'letter';
	}
	if (!tmpWKHTMLtoPDFSettings.hasOwnProperty('print-media-type'))
	{
		tmpWKHTMLtoPDFSettings['print-media-type'] = true;
	}

	// Actually run the PDF generator (this requires the server to be running)
	try
	{
		tmpPdfStream = libWkhtmltopdf(`${pState.Fable.settings.Tidings.TidingsServerAddress}/1.0/Report/${pState.Manifest.Metadata.GUIDReportDescription}/${tmpFileName}?Format=pdf`, tmpWKHTMLtoPDFSettings);
		tmpPdfStream.on('error',
			(pError) =>
			{
				pState.Behaviors.stateLog(pState, 'Error generating pdf with WKHTMLPDF: ' + JSON.stringify(pTaskData) + ' ' + (pError.message || pError), pError);
				fSettle(pError);
			}
		);
		tmpPdfStream.pipe(tmpOutputStream);
	}
	catch (pError)
	{
		fSettle(new Error(`Problem rasterizing using the WKHTMLtoPDF library: ${pError.message}`));
	}
};
