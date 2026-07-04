// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

const libFS = require('fs');

// File write functions
module.exports = (pState, pData, pPath, pFileName, fCallback) =>
{
	// Now write out the file
	pState.Libraries.DropBag.makeFolderRecursive(
		{
			File: pFileName,
			Path: pState.Behaviors.parseReportPath(pPath, pState),
			Data: pData,
			AutoCreateFolders: true,
		},
		(pCreateError) =>
		{
			// We shouldn't bail out because one template didn't load so don't alter the callback.
			if (pCreateError)
			{
				pState.Behaviors.stateLog(pState, 'Error making folder for report file stream: ' + pState.Behaviors.parseReportPath(pPath, pState) + ' -> ' + pFileName + ': ' + pCreateError, pCreateError);
			}

			const tmpReportFileStream = libFS.createWriteStream(pState.Behaviors.parseReportPath(pPath, pState) + pFileName);

			return fCallback(null, tmpReportFileStream);
		});
};
