// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report Datum Access Behavior
*
*
* @class doReportData
* @constructor
*/
module.exports = (pLocationHash, pFable, fCallback) =>
{
	// fCallback(pError, pData) comes from this.
	pFable.Tidings.libraries.DropBag.readFile({ Path: pFable.settings.Tidings.ReportOutputFolder + pLocationHash, File: 'Datum.json' }, fCallback);
};
