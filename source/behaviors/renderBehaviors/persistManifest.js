// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

module.exports = (pState, fStageComplete) =>
{
	if (!pState.Manifest || (typeof(pState.Manifest) == 'object' && Object.keys(pState.Manifest).length < 1))
	{
		pState.Behaviors.stateLog(pState, '...manifest does not exist, not writing empty manifest. ' + JSON.stringify(pState.Manifest));
		return fStageComplete(null, pState);
	}
	// Persist the manifest (and separately the datum)
	pState.Libraries.DropBag.storeFile(
	{
		Data: JSON.stringify(pState.Manifest, null, 4),
		File: 'Manifest.json',
		Path: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash,
	},
	() =>
	{
		pState.Behaviors.stateLog(pState, '...persisted the Report Manifest for ' + pState.Manifest.Metadata.LocationHash + ' type ' + pState.Manifest.Metadata.Type);
		fStageComplete(null, pState);
	});
};
