// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Clear Cached Report Module
*
* This is to clear cached reports for reloading without restarting NPM.
* So they can be changed on production.
* This needs to be done manually.
*
* @class clearCache
*/
module.exports = (pModuleName) =>
{
	if (!pModuleName)
	{
		return false;
	}

	const tmpModule = require.resolve(pModuleName);

	delete require.cache[tmpModule.id];

	// Remove cached paths to the module.
	Object.keys(tmpModule.constructor._pathCache).forEach(
		(pCacheKey) =>
		{
			if (pCacheKey.indexOf(pModuleName) > 0 )
			{
				delete tmpModule.constructor._pathCache[pCacheKey];
			}
		}
	);
};
