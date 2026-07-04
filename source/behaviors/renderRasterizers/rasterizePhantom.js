// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// To use this you have to: npm install phantomjs-prebuilt phantom-html-to-pdf
// docs https://www.npmjs.com/package/phantom-html-to-pdf
const libPhantom = require('phantom-html-to-pdf')();
const libFS = require('fs');

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
		pTaskData.Output = tmpFileName + '.png';
	}

	// Need to move away from libFS only ASAFP so this works with dropbag.
	// Because these tools are external, they likely need to happen locally in scratch then upload the files that are generated.
	// Talk to Jason about how best to manage this and for now only support FS.
	const tmpOutputStream = libFS.createWriteStream(pTaskData.OutputPath + pTaskData.Output);
	tmpOutputStream.on('finish',
		() =>
		{
			fCallback(null, pState);
		}
	);
	tmpOutputStream.on('error',
		(pError) =>
		{
			pState.Behaviors.stateLog(pState, 'Error generating pdf with PhantomPDF: ' + JSON.stringify(pTaskData) + ' ' + pError, pError);
			fCallback(null, pState);
		}
	);

	libPhantom(
		{
			url: `${pState.Fable.settings.Tidings.TidingsServerAddress}/1.0/Report/${pState.Manifest.Metadata.GUIDReportDescription}/${tmpFileName}?Format=pdf`,
		},
		(pError, pPDF) =>
		{
			console.log(pPDF.logs);
			console.log(pPDF.numberOfPages);
			pPDF.stream.pipe(tmpOutputStream);
		}
	);
};


/*

conversion({
	html: "<h1>Hello world</h1>",
	header: "<h2>foo</h2>",
	footer: "<h2>foo</h2>",
	url: "http://jsreport.net",//set direct url instead of html
	printDelay: 0,//time in ms to wait before printing into pdf
	waitForJS: true,//set to true to enable programmatically specify (via Javascript of the page) when the pdf printing starts (see Programmatic pdf printing section for an example)
	waitForJSVarName: //name of the variable that will be used as a printing trigger, defaults to "PHANTOM_HTML_TO_PDF_READY" (see Programmatic pdf printing section for an example)
	allowLocalFilesAccess: false,//set to true to allow request starting with file:///
	paperSize: {
		format, orientation, margin, width, height, headerHeight, footerHeight
	},
  fitToPage: false, //whether to set zoom if contents don't fit on the page
	customHeaders: [],
	settings: {
		javascriptEnabled : true,
		resourceTimeout: 1000
	},
	viewportSize: {
		width: 600,
		height: 600
	},
	format: {
		quality: 100
	}
}, cb);

*/
