// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Log something to the manifest with the state passed in
module.exports = (pState, pLogEntry, pError) =>
{
	pState.Manifest.Log.push(new Date().toUTCString() + ': ' + pLogEntry);

	if (pError)
	{
		let payload;

		if (typeof(pError) === 'object')
		{
			payload = { Error: pError.message, Stack: pError.stack };
		}
		else if (typeof(pError) === 'string')
		{
			payload = { Error: pError };
		}
		else if (typeof(pError) !== 'boolean') // true just means "log an as error", as before - we don't except other types here, so log more for debugging
		{
			payload = { Error: JSON.stringify(pError), ErrorType: typeof(pError) };
		}
		pState.Fable.log.error(pLogEntry, payload);
	}
	else
	{
		pState.Fable.log.info(pLogEntry);
	}
};
