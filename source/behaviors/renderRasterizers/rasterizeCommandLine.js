// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <jason@hillier.us>
*/
const libFS = require('fs');
const libChildProcess = require('child_process');

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

	if (!pTaskData.WorkDir)
	{
		pTaskData.WorkDir = `${pState.Manifest.Metadata.Locations.Renderer}`;
	}

	if ((typeof(pTaskData.Options) === 'object') && (typeof(pTaskData.Options.Configuration) === 'object'))
	{
		let tmpParameterString = '';
		if (pTaskData.Options.Configuration.Parameters)
		{
			tmpParameterString = pTaskData.Options.Configuration.Parameters.join(' ');
		}

		if (!pTaskData.Command)
		{
			pTaskData.Command = `${pTaskData.Options.Configuration.Program} ${tmpParameterString}`;
		}
	}

	libChildProcess.exec(pTaskData.Command, { cwd: pTaskData.WorkDir },
		(pError, pStdout, pStderr) =>
		{
			if (pError)
			{
				pState.Behaviors.stateLog(pState, 'Error executing command line program: ' + JSON.stringify(pTaskData) + ' ' + pError, pError);
			}

			pState.Behaviors.stateLog(pState, 'STDOUT: ' + pStdout, true);
			pState.Behaviors.stateLog(pState, 'STDERR: ' + pStderr, true);

			return fCallback(null, pState);
		});
};
