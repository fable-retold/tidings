// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report Rendering Behavior
*
* @class doReportRender
* @constructor
*/
module.exports = (pDatum, pFable, fCallback) =>
{
	const libDropbag = pFable.Tidings.libraries.DropBag;
	const libAsync = pFable.Tidings.libraries.Async;

	const loadReportBehavior = (pBehavior) =>
	{
		return require(__dirname + '/renderBehaviors/' + pBehavior + '.js');
	};

	const persistManifest = loadReportBehavior('persistManifest');

	// The state object for passing between phases
	const tmpReportRenderState = (
	{
		Manifest: null,
		Definition: null,
		ReportBehaviors: null,
		Datum: pDatum,
		Fable: pFable,
		Tidings: pFable.Tidings,
		Libraries: pFable.Tidings.libraries,
		Scratch: {},
		// The behaviors for working on Manifests, which is going to be passed around between phases.
		// These can be extended by the functions that the report data gets passed to.
		Behaviors: {
			persistManifest: persistManifest,

			stateLog: loadReportBehavior('stateLog'),
			manifestLog: loadReportBehavior('manifestLog'),
			addTemplate: loadReportBehavior('addTemplate'),
			setProgressPercentage: loadReportBehavior('setProgressPercentage'),

			downloadAsset: loadReportBehavior('downloadAsset'),
			deleteAssets: loadReportBehavior('deleteAssets'),

			// These are for extra sugar in the reports override functions
			parseReportPath: loadReportBehavior('parseReportPath'),
			loadReportFile: loadReportBehavior('loadReportFile'),
			saveReportFile: loadReportBehavior('saveReportFile'),
			getReportFileStream: loadReportBehavior('getReportFileStream'),

			processReportTemplateFile: loadReportBehavior('processReportTemplateFile'),
			processRasterizationTask: loadReportBehavior('processRasterizationTask'),
			explodeTemplateFiles: loadReportBehavior('explodeTemplateFiles'),
		},
	});

	// NOTE: this patches a breaking change in the 'async' library:
	// *  passing "error = false" to the waterfall callback now aborts the waterfall (without calling the callback)
	const falseToNull = (callback) =>
	{
		return (...args) =>
		{
			if (args[0] === false)
			{
				args[0] = null;
			}
			callback.apply(null, args);
		}
	};
	libAsync.waterfall(
		[
			// : Validate the Datum
			(fStageComplete) =>
			{
				const tmpState = tmpReportRenderState;
				if (!tmpState.Datum)
				{
					return fStageComplete(new Error('Invalid Report Datum passed to Report Rendering.'));
				}
				if (!tmpState.Datum.hasOwnProperty('TidingsData'))
				{
					return fStageComplete(new Error('The Report Datum passed to Report Rendering does not contain the required Tidings Data.'));
				}
				if (typeof(tmpState.Datum.TidingsData.GUIDReportDescription) != 'string' || tmpState.Datum.TidingsData.GUIDReportDescription.length == 0)
				{
					return fStageComplete(new Error('The Report Datum does not have a valid manifest.'));
				}
				fStageComplete(null, tmpState);
			},
			// : Fill out the defaults in the Datum if they don't exist
			(pState, fStageComplete) =>
			{
				fStageComplete(null, pState);
			},
			// : Create a manifest
			(pState, fStageComplete) =>
			{
				// The buildReportManifest behavior stuffs the datum into Manifest.Datum so we can safely stop passing it forward from here.
				pState.Manifest = pState.Fable.Tidings.buildReportManifest(pState.Datum);
				fStageComplete(null, pState);
			},
			// AT THIS POINT IN THE CHAIN THE MANIFEST IS REPLACING THE DATUM
			// TODO: SHOULD THE REPORT MICROSERVICE BE ABLE TO OVERRIDE HERE (for dynamic LocationHash etc.)?
			// : Bootstrap the locations and the folder
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Creating folders at ' + pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash);

				pState.Manifest.Metadata.Locations = (
				{
					// The root of the report rendering.
					Root: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash + '/',
					// Where the Assets are hosted
					Asset: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash + '/Assets/',
					// Where the report is staged (rendered) to
					Stage: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash + '/Stage/',
					// A scratch folder where files are deleted from automatically after report render
					Scratch: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash + '/Scratch/',
				 });
				// TODO: Trap error here
				libDropbag.makeFolderRecursive({Path: pState.Manifest.Metadata.Locations.Root}, () => { fStageComplete(null, pState); });
			},
			// : Create some folders
			(pState, fStageComplete) =>
			{
				libDropbag.makeFolderRecursive({Path: pState.Manifest.Metadata.Locations.Asset}, () => { fStageComplete(null, pState); });
			},
			(pState, fStageComplete) =>
			{
				libDropbag.makeFolderRecursive({Path: pState.Manifest.Metadata.Locations.Stage}, () => { fStageComplete(null, pState); });
			},
			(pState, fStageComplete) =>
			{
				libDropbag.makeFolderRecursive({Path: pState.Manifest.Metadata.Locations.Scratch}, () => { fStageComplete(null, pState); });
			},
			// : Create the Datum file
			(pState, fStageComplete) =>
			{
				// Persist the datum
				libDropbag.storeFile(
				{
					Data: JSON.stringify(pState.Datum, null, 4),
					File: 'Datum.json',
					Path: pState.Fable.settings.Tidings.ReportOutputFolder + pState.Manifest.Metadata.LocationHash
				},
				(pError) =>
				{
					if (pError)
					{
						pState.Behaviors.stateLog(pState, 'Error writing report datum: ' + pError, pError);
						return fStageComplete(pError, pState);
					}
					pState.Behaviors.stateLog(pState, '...persisted the Report Datum');
					fStageComplete(null, pState);
				});
			},
			// : Create the Manifest file
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 2, falseToNull(fStageComplete)); },
			persistManifest,
			// : Try loading the report definition
			(pState, fStageComplete) =>
			{
				libDropbag.readFile(
					{
						File: 'report_definition.json',
						Path: pState.Fable.settings.Tidings.ReportDefinitionFolder + pState.Manifest.Metadata.Type
					},
					(pError, pData) =>
					{
						if (pError)
						{
							pState.Behaviors.stateLog(pState, 'Error loading report definition: ' + pError, pError);
							return fStageComplete(pError, pState);
						}
						pState.Behaviors.stateLog(pState, 'Loaded definition: ' + pState.Fable.settings.Tidings.ReportDefinitionFolder + pState.Manifest.Metadata.Type);
						pState.Manifest.Metadata.Locations.ReportDefinition = pState.Fable.settings.Tidings.ReportDefinitionFolder + pState.Manifest.Metadata.Type + '/';
						pState.Manifest.Metadata.Locations.Common = pState.Fable.settings.Tidings.ReportDefinitionFolder + pState.Manifest.Metadata.Type + '/common/';
						pState.Definition = JSON.parse(pData);
						// TODO: Error handling on bad JSON in the report definition. (does it bail out or do default?  I think bail)
						return fStageComplete(null, pState);
					});
			},
			// : Fall back to the default if the last load failed.
			(pState, fStageComplete) =>
			{
				if (pState.ReportDefinition === null)
				{
					libDropbag.readFile(
						{
							File: 'report_definition.json',
							Path: __dirname + '/../../reports/default',
						},
						(pError, pData) =>
						{
							if (pError)
							{
								pState.Behaviors.stateLog(pState, 'Error loading the default report definition: ' + pError, pError);
								return fStageComplete(pError, pState);
							}
							pState.Behaviors.stateLog(pState, 'Default definition loaded: ' + __dirname + '/../../reports/default');
							pState.Manifest.Metadata.Locations.ReportDefinition = __dirname + '/../../reports/default/';
							pState.Manifest.Metadata.Locations.Common = __dirname + '/../../reports/default/common/';
							pState.Definition = JSON.parse(pData);
							return fStageComplete(null, pState);
						});
				}
				else
				{
					return fStageComplete(null, pState);
				}
			},
			persistManifest,
			// : Load the Report-Specific Behaviors
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Loading the Report-Specific Behaviors');
				libDropbag.fileExists(
					{
						File: 'report.js',
						// This should always be in the folder with report_definition
						Path: pState.Manifest.Metadata.Locations.ReportDefinition
					},
					(pError, pFileExists) =>
					{
						if (pError)
						{
							pState.Behaviors.stateLog(pState, 'Error loading the report behaviors. ' + pError, pError);
							return fStageComplete(pError, pState);
						}
						try
						{
							pState.ReportBehaviors = pState.Fable.Tidings.libraries.Underscore.extend({}, require(__dirname + '/../../tidings-report-prototype/source/Tidings-Report-Prototype.js'), require(pState.Manifest.Metadata.Locations.ReportDefinition + '/report.js'));
						}
						catch (pRequireError)
						{
							return fStageComplete(pRequireError, pState);
						}

						return fStageComplete(null, pState);
					});
			},
			// : Parse the Report Definition
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Parsing the Report Definition for Renderer');
				// Add the renderer files folder
				pState.Manifest.Metadata.Locations.Renderer = pState.Manifest.Metadata.Locations.ReportDefinition + pState.Manifest.Metadata.Renderer + '/';
				if (pState.Definition.hasOwnProperty('Renderers') && pState.Definition.Renderers.hasOwnProperty(pState.Manifest.Metadata.Renderer))
				{
					// There is a renderer-specific definitions
					if (pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].hasOwnProperty('DefaultFile'))
						pState.Manifest.Metadata.DefaultFile = pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].DefaultFile;
					// Inject templates into the manifest from the definition
					if (pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Templates)
						for (let i = 0; i < pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Templates.length; i++)
						{
							pState.Manifest.Templates.push(JSON.parse(JSON.stringify(pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Templates[i])));
							pState.Behaviors.stateLog(pState, '...Adding template ' + pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Templates[i]);
						}
					// Inject rasterizers into the manifest from the definition
					if (pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Rasterization)
						for (let i = 0; i < pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Rasterization.length; i++)
						{
							pState.Manifest.RasterizationList.push(JSON.parse(JSON.stringify(pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Rasterization[i])));
							pState.Behaviors.stateLog(pState, '...Adding rasterizer ' + pState.Definition.Renderers[pState.Manifest.Metadata.Renderer].Rasterization[i]);
						}
				}
				fStageComplete(null, pState);
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 3, falseToNull(fStageComplete)); },
			persistManifest,
			// : Execute the report pre-collect function
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Executing report pre-collect');
				pState.ReportBehaviors.preCollect(pState, falseToNull(fStageComplete));
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 4, falseToNull(fStageComplete)); },
			persistManifest,
			// : Collect assets (from REST and such)
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Collecting assets...');
				//  (e.g. the report might require a set of values downloaded from NOAA to render)
				// Each entry of the pState.Manifest.AssetCollectionList array looks like:
				//	{"Type":"Request", "Address":"http://www.google.com/", "StageLocation":"google_index.html", "ExpectedSize":16076}
				// The downloader goes through each entry, and adds a "Downloaded" and "Bytes" object.  When the file is complete, the
				// "Downloaded" property is set from false to true.  Bytes has the current bytes.  Useful for progress bars.
				const tmpQueue = pState.Fable.Tidings.libraries.Async.queue(
					(pTaskData, fAssetCollectionCallback) =>
					{
						pState.Behaviors.downloadAsset(pTaskData, pState, fAssetCollectionCallback);
					},
					1
				);
				// Move on when the queue is empty.
				tmpQueue.drain(() =>
				{
					//  (e.g. the actual compiler/renderer/etc.)
					fStageComplete(null, pState);
					pState.Behaviors.stateLog(pState, '...Asset downloads complete.');
				});
				// add some items to the queue (batch-wise)
				tmpQueue.push(pState.Manifest.AssetCollectionList, () => { });
				//fStageComplete(null, pState);
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 60, falseToNull(fStageComplete)); },
			persistManifest,
			// : Execute the report calculate function
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Executing calculate function...');
				//  (e.g. the report might need to aggregate 3 sets of data into a new 4th set of data)
				pState.ReportBehaviors.calculate(pState, falseToNull(fStageComplete));
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 75, falseToNull(fStageComplete)); },
			persistManifest,
			// : Execute the report explodeTemplateFiles function
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Exploding template files...');
				//  (e.g. the report might need to aggregate 3 sets of data into a new 4th set of data)
				pState.Behaviors.explodeTemplateFiles(pState, falseToNull(fStageComplete));
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 75, falseToNull(fStageComplete)); },
			persistManifest,
			// : Process any defined templates
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Processing templates...');
				const tmpQueue = pState.Fable.Tidings.libraries.Async.queue(
					(pTaskData, fTemplateCallback) =>
					{
						pState.Behaviors.processReportTemplateFile(pTaskData, pState, fTemplateCallback);
					},
					1 // TODO: Discuss with Jason the pros and cons of parallelization
				);
				// Move on when the queue is empty.
				tmpQueue.drain(() =>
				{
					//  (e.g. the actual compiler/renderer/etc.)
					fStageComplete(null, pState);
					pState.Behaviors.stateLog(pState, '...Template processing complete.');
				});
				// add some items to the queue (batch-wise)
				tmpQueue.push(pState.Manifest.Templates, () => { });
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 80, falseToNull(fStageComplete)); },
			persistManifest,
			// : Execute the report rasterize function
			(pState, fStageComplete) =>
			{
				//  (e.g. the actual compiler/renderer/etc.)
				pState.Behaviors.stateLog(pState, 'Running rasterizer...');
				const tmpQueue = pState.Fable.Tidings.libraries.Async.queue(
					(pTaskData, fTemplateCallback) =>
					{
						pState.Behaviors.processRasterizationTask(pTaskData, pState, fTemplateCallback);
					},
					1
				);
				// Move on when the queue is empty.
				tmpQueue.drain(() =>
				{
					pState.Behaviors.stateLog(pState, '...auto rasterization complete.');
					// Now run the report-defined rasterization step for anything not auto rasterized
					pState.ReportBehaviors.rasterize(pState, falseToNull(fStageComplete));
				});
				// add some items to the queue (batch-wise)
				tmpQueue.push(pState.Manifest.RasterizationList, () => { });
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 95, falseToNull(fStageComplete)); },
			persistManifest,
			// : Execute the report post-render function
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Executing post-render functions...');
				//  (e.g. moving files from scratch to stage, etc.)
				pState.ReportBehaviors.postRender(pState, falseToNull(fStageComplete));
			},
			(pState, fStageComplete) => { pState.Behaviors.setProgressPercentage(pState, 97, falseToNull(fStageComplete)); },
			persistManifest,
			// : Cleanup the report
			(pState, fStageComplete) =>
			{
				pState.Behaviors.stateLog(pState, 'Cleaning up temporary files...');
				// Delete files from scratch
				libDropbag.deleteFolderRecursively({Path:pState.Manifest.Metadata.Locations.Scratch},
					(pError) =>
					{
						if (pError)
						{
							pState.Behaviors.stateLog(pState, 'Error deleting scratch files', pError);
						}

						fStageComplete(null, pState);
					});
			},
			// : Update the Manifest file
			persistManifest,
		],
		// : Return the manifest for the report, and store the state for the last rendered report
		(pError, pState) =>
		{
			const tmpCallback = (typeof(fCallback) === 'function') ? fCallback : () => { };

			if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error rendering a tidings report: ' + pError, pError);
				return tmpCallback(pError, pState);
			}

			pState.Behaviors.stateLog(pState, '...Report rendered.');

			pState.Manifest.Status.Rendered = true;
			pState.Manifest.Status.CompletionProgress = 100.0;
			pState.Manifest.Status.EndTime = +new Date();
			pState.Manifest.Status.CompletionTime = pState.Manifest.Status.EndTime - pState.Manifest.Status.StartTime;

			pState.Behaviors.stateLog(pState, 'Rendering completed in ' + pState.Manifest.Status.CompletionTime + 'ms');

			// Persist the manifest one last time.  For the children.
			persistManifest(pState, tmpCallback);

			return true;
		}
	);
};
