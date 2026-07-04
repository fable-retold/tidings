// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
 * @license MIT
 * @author <steven@velozo.com>
 */
/*
Allows you to rasterize the report via an API endpoint. Define the request you make using your task data property 'Request' property
and/or use the property ViaAPIRequest on Scratch to define the request. See the "request" library for more details on what values you can use.
 */
const libFS = require('fs');
const libRequest = require('request');
const libUnderscore = require('underscore');

module.exports = (pTaskData, pState, fCallback) =>
{
	const tmpCallback = libUnderscore.once(fCallback);
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
		tmpCallback(new Error('Output file name not provided for rasterizeViaAPI'), pState);
		return;
	}

	// Load settings from the scratch state if they are there (so reports can pass them in)
	const tmpViaAPISettings = (typeof(pState.Scratch.ViaAPIRequest) !== 'undefined') ? pState.Scratch.ViaAPIRequest : {};
	const tmpRequest = Object.assign({}, pTaskData?.Request || {}, tmpViaAPISettings);

	// Need to move away from libFS only ASAFP so this works with dropbag.
	// Because these tools are external, they likely need to happen locally in scratch then upload the files that are generated.
	// Talk to Jason about how best to manage this and for now only support FS.
	const tmpOutputStream = libFS.createWriteStream(pTaskData.OutputPath + pTaskData.Output);
	tmpOutputStream.on('finish',
		() =>
		{
			tmpCallback(null, pState);
		}
	);
	tmpOutputStream.on('error',
		(pError) =>
		{
			pState.Behaviors.stateLog(pState, 'Error writing pdf from ViaAPI: ' + JSON.stringify(tmpRequest) + ' ' + pError, pError);
		}
	);

	try
	{
		pState.Behaviors.stateLog(pState, `Generating pdf from ViaAPI` + JSON.stringify(tmpRequest));
		makeRequestWithRetry(pState, tmpRequest,
			(pRequestError, pResponse) =>
			{
				if(pRequestError || pResponse.statusCode >= 400)
				{
					const tmpFailure = pRequestError || new Error(`Rasterize via API response response status code ${pResponse.statusCode}`);
					pState.Behaviors.stateLog(pState, 'Error generating pdf with ViaAPI: ' + JSON.stringify(tmpRequest) + ' ' + tmpFailure, tmpFailure);
					tmpCallback(tmpFailure, pState);
					tmpOutputStream.close();
					//FIXME: does this need to clean up the file?
					return;
				}
				else
				{
					pResponse.on('error',
						(pError) =>
						{
							pState.Behaviors.stateLog(pState, 'Error generating pdf with ViaAPI: ' + JSON.stringify(tmpRequest) + ' ' + (pError.message || pError), pError);
						}
					);
					pResponse.pipe(tmpOutputStream);
				}
			});
	}
	catch (pError)
	{
		tmpCallback(new Error(`Problem rasterizing using the ViaAPI library: ${pError.message}`), pState);
	}
};


function makeRequestWithRetry(pState, pOptions, fCallback)
{
	const tmpCallback = libUnderscore.once(fCallback);
	const maxRetries = pOptions.maxRetries || 3;
	pOptions._retryCount = pOptions._retryCount || 0;
	libRequest(pOptions)
		.on('error', (error) =>
		{
			tmpCallback(error, null);
		})
		.on('response', (response) =>
		{
			//NOTE: this HTTP library doesn't send an error event for 4xx and 5xx status codes
			if (response.statusCode === 429 || response.statusCode >= 500)
			{
				const rateLimited = response.statusCode === 429;
				pOptions._retryCount++;

				if(pOptions._retryCount > maxRetries)
				{
					// propagate the (error) result of the last request
					return tmpCallback(null, response);
				}

				// use our header or do a retry after exp backoff or from our header depending on who tells us to wait
				let timeoutTime = response.headers['retry-after'] ||
					Math.min(5, pOptions._retryCount * pOptions._retryCount);

				pState.Behaviors.stateLog(pState, (rateLimited ? 'Rate limited' : 'Server error') + ', retrying after ' + timeoutTime + ' seconds');
				setTimeout(() =>
				{
					makeRequestWithRetry(pState, pOptions, tmpCallback);
				}, timeoutTime * 1000);
			}
			else
			{
				return tmpCallback(null, response);
			}
		})
}

