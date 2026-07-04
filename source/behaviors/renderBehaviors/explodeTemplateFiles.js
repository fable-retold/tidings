// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

const libFS = require('fs');
const libPath = require('path');

const recurseFiles = (pPath, pState, fRecursionComplete, pPathRoot) =>
{
	const tmpPathRoot = (typeof(pPathRoot) === 'undefined') ? pPath : pPathRoot;
	const tmpNormalizedPath = libPath.normalize(tmpPathRoot);

	libFS.readdir(tmpNormalizedPath,
		(pError, pFiles) =>
		{
			if (pError && pError.code == 'ENOENT')
			{
				pState.Behaviors.stateLog(pState, 'Warning: Template path [' + tmpNormalizedPath + '] does not exist; most likely there is no folder for the current renderer.');
				pState.Behaviors.stateLog(pState, 'Warning FS Error Message: ' + pError, pError);
				return fRecursionComplete();
			}
			else if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error: Template scanning of path [' + tmpNormalizedPath + '] failed.');
				pState.Behaviors.stateLog(pState, 'FS Error Message: ' + pError, pError);
				return fRecursionComplete();
			}

			// Parse each template entry and explode them if they are wildcards
			const tmpQueue = pState.Fable.Tidings.libraries.Async.queue(
				(pFileName, fPhaseCallback) =>
				{
					libFS.stat(libPath.join(pPath, pFileName),
						(pStatError, pFileStats) =>
						{
							if (pStatError)
							{
								return console.log('Error: ', pStatError);
							}

							if (pFileStats.isDirectory())
							{
								recurseFiles(libPath.join(pPath, pFileName), pState, fPhaseCallback, tmpPathRoot);
							}
							else
							{
								const tmpPathFragment = libPath.resolve(pPath).replace(libPath.resolve(tmpPathRoot), '');
								pState.Manifest.Templates.push({ File: pFileName, Path: pPath, OutputPath: libPath.join(pState.Manifest.Metadata.Locations.Stage, tmpPathFragment) });
								fPhaseCallback();
							}
			  			}
			  		);
				},
				1
			);
			tmpQueue.drain(() =>
			{
				fRecursionComplete(null);
			});
			tmpQueue.push(pFiles, () => { });
		}
	);
};

// Walk through the templates and explode any files
module.exports = (pState, fStageComplete) =>
{
	// Parse each template entry and explode them if they are wildcards
	const tmpQueue = pState.Fable.Tidings.libraries.Async.queue(
		(pTaskData, fPhaseCallback) =>
		{
			// This is a renderer dependency... append the renderer to the path.
			if (pTaskData.Renderer)
			{
				pTaskData.Path = libPath.join(pState.Behaviors.parseReportPath('ReportDefinition', pState), pTaskData.Renderer);
				if (!pTaskData.File)
					pTaskData.Recursive = true;
			}

			if (!pTaskData.Recursive)
				return fPhaseCallback();

			pTaskData.Ignore = true;

			// If we create a recursive entry without the files, it shows up.
			if (!pTaskData.Path)
				pTaskData.Path = 'Renderer';

			recurseFiles(pState.Behaviors.parseReportPath(pTaskData.Path, pState), pState, fPhaseCallback);
		},
		1
	);
	tmpQueue.drain(() =>
	{
		pState.Behaviors.stateLog(pState, '...template location explosion complete.');
		fStageComplete(null, pState);
	});
	if (pState.Manifest.Templates.length < 1)
	{
		pState.Manifest.Templates.push({ File:'*', Path:pState.Behaviors.parseReportPath('Renderer', pState), Recursive: true });
	}
	tmpQueue.push(pState.Manifest.Templates, () => { });
};
