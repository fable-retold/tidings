// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Log something to the manifest (not fable though)
module.exports = (pManifest, pLogEntry, pError) =>
{
	pManifest.Log.push(new Date().toUTCString() + ': ' + pLogEntry);
};
