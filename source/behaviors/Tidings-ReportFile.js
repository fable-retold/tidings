// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report StagedFile Access Behavior
*
*
* @class doReportFile
* @constructor
*/
module.exports = (pLocationHash, pFileName, pFable, fCallback) =>
{
	// fCallback(pError, pData) comes from this.
	pFable.Tidings.libraries.DropBag.readFile({ Path: pFable.settings.Tidings.ReportOutputFolder + pLocationHash + '/Stage', File: pFileName }, fCallback);
};
