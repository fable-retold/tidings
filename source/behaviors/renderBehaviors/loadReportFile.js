// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

module.exports = (pState, pPath, pFileName, fCallback) =>
{
	pState.Libraries.DropBag.readFile(
		{
			Path: pState.Behaviors.parseReportPath(pPath, pState),
			File: pFileName,
		},
		(pError, pData) =>
		{
			if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error loading file: ' + JSON.stringify(pPath) + ' ' + JSON.stringify(pFileName) + ' ' + pError, pError);
				return fCallback(pError);
			}

			return fCallback(pError, pData);
		});
};
