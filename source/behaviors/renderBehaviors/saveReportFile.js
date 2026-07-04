// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// File write functions
module.exports = (pState, pData, pPath, pFileName, fCallback) =>
{
	// Now write out the file
	pState.Libraries.DropBag.storeFile(
		{
			File: pFileName,
			Path: pState.Behaviors.parseReportPath(pPath, pState),
			Data: pData,
			AutoCreateFolders: true,
		},
		(pPersistError) =>
		{
			// We shouldn't bail out because one template didn't load so don't alter the callback.
			if (pPersistError)
			{
				pState.Behaviors.stateLog(pState, 'Error writing report file: ' + pState.Behaviors.parseReportPath(pPath, pState) + ' -> ' + pFileName + ': ' + pPersistError, pPersistError);
			}
			else
			{
				pState.Behaviors.stateLog(pState, '--> Wrote report file: ' + pFileName + ' TO ' + pState.Behaviors.parseReportPath(pPath, pState));
			}
			return fCallback();
		});
};
