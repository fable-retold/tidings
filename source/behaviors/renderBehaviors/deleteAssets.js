// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

module.exports = (pState, fCallback) =>
{
	const libDropbag = pState.Libraries.DropBag;

	pState.Behaviors.stateLog(pState, 'Cleaning up asset files...');
	// Delete files from asset folder
	libDropbag.deleteFolderRecursively({Path:pState.Manifest.Metadata.Locations.Asset},
		(pError) =>
		{
			if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error deleting asset files', pError);
			}

			fCallback(null, pState);
		});
};
