// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report Status Access Behavior
*
*
* @class doReportStatus
* @constructor
*/
module.exports = (pLocationHash, pFable, fCallback) =>
{
	// fCallback(pError, pStatus) comes from this.
	pFable.Tidings.libraries.DropBag.readFile({ Path: pFable.settings.Tidings.ReportOutputFolder + pLocationHash, File: 'Manifest.json' }, fCallback);
};
