// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Also apt-get install graphviz
// To use this you have to: npm install graphviz
// docs https://github.com/glejeune/node-graphviz
const libGraphviz = require('graphviz');

module.exports = (pTaskData, pState, fCallback) =>
{
	const tmpFileName = pTaskData.File;

	// If no path was supplied, use the Stage path
	if (!pTaskData.Path)
	{
		pTaskData.Path = pState.Manifest.Metadata.Locations.Stage;
	}

	if (!pTaskData.OutputPath)
	{
		pTaskData.OutputPath = pState.Manifest.Metadata.Locations.Stage;
	}

	if (!pTaskData.Output)
	{
		pTaskData.Output = tmpFileName + '.png';
	}

	libGraphviz.parse(pTaskData.Path + pTaskData.File,
		(pGraph) =>
		{
			pGraph.render('png', pTaskData.OutputPath + pTaskData.Output);
			fCallback(null, pState);
		}
	);
};
