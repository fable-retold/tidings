// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Used for asset gathering.
const libRequest = require('request');

// Defaults for asset-download resilience. All are overridable via
// fable settings.Tidings.AssetDownload (RetryTimes / RetryIntervalMS / StallTimeoutMS).
const ASSET_DOWNLOAD_RETRY_TIMES_DEFAULT = 3;
const ASSET_DOWNLOAD_RETRY_INTERVAL_MS_DEFAULT = 1000;
// Idle (no-progress) cutoff for the streaming body, NOT a total-duration cap — a large
// asset that keeps sending bytes is left alone; only a genuinely stalled transfer is reaped.
// Set to 0 to disable stall detection entirely.
const ASSET_DOWNLOAD_STALL_TIMEOUT_MS_DEFAULT = 60000;

/**
* Download a single report asset to the report stage, with retries and stall detection.
*
* Tunables (fable settings.Tidings.AssetDownload):
*   - RetryTimes:      attempts before giving up (default 3)
*   - RetryIntervalMS: delay between attempts (default 1000)
*   - StallTimeoutMS:  abort an in-flight transfer after this many ms with no bytes
*                      received; 0 disables (default 60000)
*
* @param {Object} pTaskData - The asset descriptor ({ URL, File, Path, ... }).
* @param {Object} pState - The report render state.
* @param {Function} fCallback - Invoked (no error) when the asset is settled; one
*	failed asset must never abort the overall collection, so the callback is always
*	called without an error.
* @return {void}
*/
module.exports = (pTaskData, pState, fCallback) =>
{
	pTaskData.RequestStartTime = +new Date();

	const tmpFileName = pTaskData.File;
	// If no path was supplied, use the Asset path
	if (!pTaskData.hasOwnProperty('Path') || !pTaskData.Path)
	{
		pTaskData.Path = 'Asset';
	}

	const tmpTidingsSettings = (pState.Fable && pState.Fable.settings && pState.Fable.settings.Tidings) || {};
	const tmpAssetSettings = tmpTidingsSettings.AssetDownload || {};
	const tmpRetryTimes = Number.isFinite(tmpAssetSettings.RetryTimes) ? tmpAssetSettings.RetryTimes : ASSET_DOWNLOAD_RETRY_TIMES_DEFAULT;
	const tmpRetryIntervalMS = Number.isFinite(tmpAssetSettings.RetryIntervalMS) ? tmpAssetSettings.RetryIntervalMS : ASSET_DOWNLOAD_RETRY_INTERVAL_MS_DEFAULT;
	const tmpStallTimeoutMS = Number.isFinite(tmpAssetSettings.StallTimeoutMS) ? tmpAssetSettings.StallTimeoutMS : ASSET_DOWNLOAD_STALL_TIMEOUT_MS_DEFAULT;

	const libAsync = pState.Fable.Tidings.libraries.Async;

	const fAttemptDownload = (fAttemptComplete) =>
	{
		// Flat timeout on the metadata HEAD (it returns no streamed body to gate on progress).
		const tmpHeadOptions = { url: pTaskData.URL, jar: pState.jar };
		if (tmpStallTimeoutMS > 0)
		{
			tmpHeadOptions.timeout = tmpStallTimeoutMS;
		}
		libRequest.head(tmpHeadOptions,
			(pRequestError, pResponse, pBody) =>
			{
				if (pRequestError)
				{
					return fAttemptComplete(pRequestError);
				}
				if (typeof(pBody) === 'undefined')
				{
					return fAttemptComplete(new Error('Asset response body is undefined.'));
				}

				pTaskData.Size = parseInt(pResponse.headers['content-length'], 10);
				pTaskData.RequestEndTime = +new Date();

				pState.Behaviors.getReportFileStream(pState, pBody, pTaskData.Path, tmpFileName,
					(pError, pFileStream) =>
					{
						if (pError)
						{
							return fAttemptComplete(pError);
						}

						const tmpRequestStream = libRequest({ url: pTaskData.URL, jar: pState.jar });

						// The request and file streams can each emit an error and the request
						// can still emit 'close' afterward; settle exactly once.
						let tmpSettled = false;
						let tmpStallTimer = null;
						const fClearStall = () =>
						{
							if (tmpStallTimer)
							{
								clearTimeout(tmpStallTimer);
								tmpStallTimer = null;
							}
						};
						const fSettle = (pStreamError) =>
						{
							if (tmpSettled)
							{
								return;
							}
							tmpSettled = true;
							fClearStall();
							return fAttemptComplete(pStreamError || null);
						};
						// Progress gate: each received chunk re-arms the timer, so a transfer
						// that keeps making progress never trips it; only a stalled one does.
						const fArmStall = () =>
						{
							if (tmpStallTimeoutMS <= 0)
							{
								return;
							}
							fClearStall();
							tmpStallTimer = setTimeout(() =>
							{
								fSettle(new Error('Asset download stalled (no progress for ' + tmpStallTimeoutMS + 'ms)'));
								if (typeof(tmpRequestStream.abort) === 'function')
								{
									tmpRequestStream.abort();
								}
							}, tmpStallTimeoutMS);
						};

						tmpRequestStream.on('error', fSettle);
						pFileStream.on('error', fSettle);
						tmpRequestStream.on('data', fArmStall);
						fArmStall();
						tmpRequestStream.pipe(pFileStream).on('close', () =>
						{
							pTaskData.PersistCompletionTime = +new Date();
							pTaskData.TotalDownloadTime = pTaskData.PersistCompletionTime - pTaskData.RequestStartTime;
							fSettle();
						});
					}
				);
			});
	};

	libAsync.retry(
		{ times: tmpRetryTimes, interval: tmpRetryIntervalMS },
		fAttemptDownload,
		(pError) =>
		{
			// We shouldn't bail out because one asset didn't download so don't alter the callback.
			if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error downloading asset (gave up after ' + tmpRetryTimes + ' attempts): ' + JSON.stringify(pTaskData) + ' ' + pError, pError);
			}
			return fCallback();
		});
};
