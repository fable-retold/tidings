// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// To use this you have to: npm install latex-file
// This is so we don't have a dependency on that library outright for our reporting module (when the usual case is to just use html)
// Also requires LaTeX to be in your OS (e.g. mac is mactex, linux is `sudo apt-get install texlive`)
const libLaTeX = require('latex-file');

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

	let tmpLaTeXOptions = (
	{
		out_directory: pTaskData.OutputPath
	});

	if (typeof(pTaskData.Options) === 'object')
	{
		tmpLaTeXOptions = pState.Libraries.Underscore.extend(tmpLaTeXOptions, pTaskData.Options);
	}

	const runLatex = (pExecutionError, pFilePath, pLaTeXOptions, fCallback) =>
	{
		if (pExecutionError)
		{
			return fCallback('Problem executing LaTeX while rasterizing using the LaTeX library: ' + pExecutionError, pState);
		}

		libLaTeX.latex(pFilePath, pLaTeXOptions,
			(pError) =>
			{
				if (pError)
				{
					return fCallback('Problem creating file while rasterizing using the LaTeX library: ' + pError, pState);
				}

				return fCallback(null, pState);
			}
		);
	};

	try
	{
		runLatex(null, pTaskData.Path + tmpFileName, tmpLaTeXOptions,
			(pError) =>
			{
				if (pError)
				{
					return fCallback('Problem in primary run while rasterizing using the LaTeX library: ' + pError, pState);
				}

				return fCallback(null, pState);
/*
				// Unsure if this is necessary because of the staging that the library does.  Investigate.
				// We are running the LaTeX command twice for ToC purposes (what a silly compiler)
				runLatex(null, pTaskData.Path + tmpFileName, tmpLaTeXOptions,
					(pError) =>
					{
						if (pError)
						{
							return fCallback('Problem in secondary run while rasterizing using the LaTeX library: ' + pError, pState);
						}

						return fCallback(null, pState);
					}
				);
*/
			}
		);
	}
	catch (pError)
	{
		fCallback('Error while rasterizing using the LaTeX library: ' + pError, pState);
	}
};
