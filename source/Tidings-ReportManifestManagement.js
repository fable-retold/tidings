// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
const libUnderscore = require('underscore');

/**
* Tidings Report Manifest Creation and Data Management
*
* Creates a raw manifest object, for use whenever a new report is created.
*
* @class ReportManifestManagement
* @constructor
*/
module.exports = new function()
{
	function createNew(pFable)
	{
		// If a valid fable object isn't passed in, return a constructor
		if (typeof(pFable) !== 'object')
		{
			return {new: createNew};
		}

		const _Fable = pFable;

		// This is the manifest base object, which is maintained by the library
		const _ManifestBase = require('./Tidings-ReportManifest.json');

		// The manifest override is a setting that can be created by putting it into fable settings, for the engine to merge in
		const _ManifestOverride = (typeof(_Fable.settings.TidingsManifestOverride) === 'object') ? _Fable.settings.TidingsManifestOverride : {};

		/**
		 * Create a manifest object for use on a new report
		 *
		 * @method create
		 */
		const create = (pDatum) =>
		{
			// This creates a new manifest, prioritizing what is passed in, then the override from config, then base.
			const tmpManifest = libUnderscore.extend(
									{}, // The new object
									JSON.parse(JSON.stringify(_ManifestBase)), // The base from the Tidings Module
									JSON.parse(JSON.stringify(_ManifestOverride)));

			// Set the start time
			tmpManifest.Status.StartTime = +new Date();

			// On testing and reflection, having this separated from the manifest is a better idea.
			//tmpManifest.Datum = typeof(pDatum) === 'object' ? pDatum : {}; // Whatever was passed in

			// Now assign the GUID
			tmpManifest.Metadata.GUIDReportDescription = pDatum.TidingsData.GUIDReportDescription;

			if (pDatum.TidingsData.Type)
				tmpManifest.Metadata.Type = pDatum.TidingsData.Type;

			if (pDatum.TidingsData.Renderer)
				tmpManifest.Metadata.Renderer = pDatum.TidingsData.Renderer;

			// Check if the hash has been overridden (this affects how it is stored in the filesystem / mongodb / wherever)
			if (pDatum.TidingsData.LocationHash)
				tmpManifest.Metadata.LocationHash = pDatum.TidingsData.LocationHash;
			else
				tmpManifest.Metadata.LocationHash = tmpManifest.Metadata.GUIDReportDescription;

			return tmpManifest;
		};

		const tmpReportManifestManagement = (
		{
			create: create,

			new: createNew,
		});

		return tmpReportManifestManagement;
	}

	return createNew();
};
