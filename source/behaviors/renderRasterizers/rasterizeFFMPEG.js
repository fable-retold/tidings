// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

// Read this: http://superuser.com/questions/538112/meaningful-thumbnails-for-a-video-using-ffmpeg

// To use this you have to: npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg @ffprobe-installer/ffprobe
// This is so we don't have a dependency on that library outright for our reporting module (when the usual case is to just use html)
// Docs at https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg
// And docs at https://www.npmjs.com/package/fluent-ffmpeg
const libFFMPEGPath = require('@ffmpeg-installer/ffmpeg').path;
const libFFProbePath = require('@ffprobe-installer/ffprobe').path;
const libFFMPEG = require('fluent-ffmpeg');
libFFMPEG.setFfmpegPath(libFFMPEGPath);
libFFMPEG.setFfprobePath(libFFProbePath);

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

	let tmpFFMPEGOptions = (
	{
		folder: pTaskData.OutputPath
	});

	if ((typeof(pTaskData.Options) === 'object') && (typeof(pTaskData.Options.Configuration) === 'object'))
	{
		tmpFFMPEGOptions = pState.Libraries.Underscore.extend(tmpFFMPEGOptions, pTaskData.Options.Configuration);
	}

	libFFMPEG(pTaskData.Path + tmpFileName)
		.on('filenames', (pFileNames) =>
		{
			console.log('Will generate ' + pFileNames.join(', '));
		})
		.on('error', (pError) =>
		{
			pState.Behaviors.stateLog(pState, 'Error executing FFMPEG ' + JSON.stringify(pTaskData) + ': ' + pError, pError);
		})
		.on('end', () =>
		{
			fCallback(null, pState);
		})[pTaskData.Options.Method](tmpFFMPEGOptions);
};
