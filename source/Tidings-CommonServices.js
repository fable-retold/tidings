// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report Service Common Services
*
* This provides authorization/authentication/errors/etc.  We may want to
* centralize these into a separate library since these are identical but
* extend the meadow-endpoints common services.
*
* @class Tidings
* @constructor
*/

module.exports = new function()
{
	function createNew(pFable)
	{
		// If a valid fable object isn't passed in, return a constructor
		if (typeof(pFable) !== 'object')
		{
			return { new: createNew };
		}

		const _Fable = pFable;
		const _Log = _Fable.log;

		// Attempt to load restify for bodyParser and serveStatic pass-throughs.
		// Restify may not be a direct dependency when consumers provide their
		// own Orator instance (e.g. orator v6 with orator-serviceserver-restify),
		// so we gracefully degrade if it is not available.
		let libRestify = false;
		try
		{
			libRestify = require('restify');
		}
		catch (pError)
		{
			_Log.warn('Tidings CommonServices: restify not found as a direct dependency.  bodyParser and serveStatic will not be available through commonservices.');
		}

		/**
		 * Send an Error Code and Error Message to the client, and log it as an error in the log files.
		 *
		 * @method sendCodedError
		 */
		const sendCodedError = (pDefaultMessage, pError, pRequest, pResponse, fNext) =>
		{
			let tmpErrorMessage = pDefaultMessage;
			let tmpErrorCode = 1;
			let tmpScope = null;
			let tmpParams = null;
			let tmpSessionID = null;
			let tmpStack = null;

			if (typeof(pError) === 'object')
			{
				tmpErrorMessage = pError.Message || pError.message || pDefaultMessage; // don't nuke the message with nothing
				tmpStack = pError.stack;
				if (pError.Code)
				{
					tmpErrorCode = pError.Code;
				}
			}
			else if (typeof(pError) === 'string')
			{
				tmpErrorMessage += ' ' + pError;
			}
			if (pRequest.DAL)
			{
				tmpScope = pRequest.DAL.scope;
			}
			if (pRequest.params)
			{
				tmpParams = pRequest.params;
			}
			if (pRequest.UserSession)
			{
				tmpSessionID = pRequest.UserSession.SessionID;
			}
			if (!tmpStack)
			{
				tmpStack = new Error().stack; // try to have a stack trace for debugging
			}

			_Log.warn('API Error: ' + tmpErrorMessage, {SessionID: tmpSessionID, RequestID:pRequest.RequestUUID, RequestURL:pRequest.url, Scope: tmpScope, Parameters: tmpParams, Action:'APIError', Stack: tmpStack}, pRequest);
			pResponse.send({Error:tmpErrorMessage, ErrorCode: tmpErrorCode});

			return fNext();
		};

		/**
		 * Send an Error to the client, and log it as an error in the log files.
		 *
		 * @method sendError
		 */
		const sendError = (pMessage, pRequest, pResponse, fNext) =>
		{
			let tmpSessionID = null;
			if (pRequest.UserSession)
			{
				tmpSessionID = pRequest.UserSession.SessionID;
			}

			_Log.warn('API Error: ' + pMessage, {SessionID: tmpSessionID, RequestID:pRequest.RequestUUID, RequestURL:pRequest.url, Action:'APIError'}, pRequest);
			pResponse.send({Error:pMessage});

			return fNext();
		};

		/**
		* Container Object for our Factory Pattern
		*/
		const tmpFableCommonServices = (
		{
			sendCodedError: sendCodedError,
			sendError: sendError,

			// Restify body parser passed through, for any POST and PUT requests
			bodyParser: libRestify ? libRestify.bodyParser : null,
			serveStatic: libRestify ? libRestify.serveStatic : null,

			new: createNew,
		});

		// Check if the services are there, add them if they aren't.
		// Turn the common services object into a first-class Fable object
		// addServices removed in fable 2.x
		if (typeof(_Fable.addServices) === 'function')
		{
			_Fable.addServices(tmpFableCommonServices);
		}
		else
		{
			// bring over addServices implementation from Fable 1.x for backward compatibility
			Object.defineProperty(tmpFableCommonServices, 'fable',
			{
				get: () => { return _Fable; },
				enumerable: false,
			});

			Object.defineProperty(tmpFableCommonServices, 'settings',
			{
				get: () => { return _Fable.settings; },
				enumerable: false,
			});

			Object.defineProperty(tmpFableCommonServices, 'log',
			{
				get: () => { return _Fable.log; },
				enumerable: false,
			});
		}

		return tmpFableCommonServices;
	}

	return createNew();
};
