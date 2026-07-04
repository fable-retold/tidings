// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report StagedFile Access Behavior
*
*
* @class doReportFil
* @constructor
*/
module.exports = (pLocationHash, pFable, fCallback) =>
{
	pFable.Tidings.libraries.DropBag.fileExists({ Path: pFable.settings.Tidings.ReportOutputFolder, File: pLocationHash },
		(pError) =>
		{
			if (pError)
			{
				return fCallback('Error deleting report: '+pError);
			}
			pFable.Tidings.libraries.DropBag.deleteFolderRecursively({ Path: pFable.settings.Tidings.ReportOutputFolder + '/' + pLocationHash},
				(pErrorDeleting) =>
				{
					if (pErrorDeleting)
					{
						return fCallback('Error deleting report folders: ' + pErrorDeleting);
					}
					fCallback(null);
				}
			);
		}
	);
};
