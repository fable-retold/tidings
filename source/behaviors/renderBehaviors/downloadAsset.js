// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Used for asset gathering.
const libRequest = require('request');

module.exports = (pTaskData, pState, fCallback) =>
{
	pTaskData.RequestStartTime = +new Date();

	const tmpFileName = pTaskData.File;
	// If no path was supplied, use the Asset path
	if (!pTaskData.hasOwnProperty('Path') || !pTaskData.Path)
	{
		pTaskData.Path = 'Asset';
	}

	libRequest.head({ url: pTaskData.URL, jar: pState.jar },
		(pRequestError, pResponse, pBody) =>
		{
			// We shouldn't bail out because one asset didn't download so don't alter the callback.
			if (pRequestError)
			{
				pState.Behaviors.stateLog(pState, 'Error downloading asset: ' + JSON.stringify(pTaskData) + ' ' + pRequestError, pRequestError);
				return fCallback();
			}
			if (typeof(pBody) === 'undefined')
			{
				pState.Behaviors.stateLog(pState, 'Error downloading asset: ' + JSON.stringify(pTaskData) + ' ... body is undefined!', new Error('Asset response body is undefined.'));
				return fCallback();
			}
			console.log('content-type:', pResponse.headers['content-type']);
			console.log('content-length:', pResponse.headers['content-length']);

			pTaskData.Size = parseInt(pResponse.headers['content-length'],10);
			pTaskData.RequestEndTime = +new Date();

			pState.Behaviors.getReportFileStream(pState, pBody, pTaskData.Path, tmpFileName,
				(pError, pFileStream) =>
				{
					libRequest({ url: pTaskData.URL, jar: pState.jar }).pipe(pFileStream).on('close', () =>
					{
						pTaskData.PersistCompletionTime = +new Date();
						pTaskData.TotalDownloadTime = pTaskData.PersistCompletionTime - pTaskData.RequestStartTime;
						fCallback();
					});
				}
			);
		});
};
