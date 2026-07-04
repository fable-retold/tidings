// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
// There are a number of auto rasterizers, which require additional installations for the OS.
// These show up in the Report Definition in the Rasterization array.
/* The format is:
   {
		Rasterizer: 'LaTeX',
		File: 'MyFile.tex',
		Output: 'MyFile.pdf'
   }
   Or:
   {
		Rasterizer: 'WKHTMLTOPDF',
		File: 'index.html',
		Output: 'index.pdf'
   }
   Or:
   {
		Rasterizer: 'FFMPEG',
		File: 'MyVideo.mp4',
		Options:
		{
				Method: 'fnExtractFrameToJPG',
				Configuration:
				{
					timestamps: [30.5, '50%', '01:10.123'],
					filename: 'thumbnail-at-%s-seconds.png'
					size: '320x240'
				}
		}
   }

   Notice the Options.  This tells the FFMPEG rasterizer some parameters, which it uses to do this (cribbed from the docs at https://www.npmjs.com/package/fluent-ffmpeg)
	ffmpeg('/path/to/Stage/video.avi')
	  .screenshots({
		timestamps: [30.5, '50%', '01:10.123'],
		filename: 'thumbnail-at-%s-seconds.png',
		folder: '/path/to/Stage',
		size: '320x240'
	  });

   You can also supply InputPath and OutputPath, but if you don't it defaults to Stage for both (we assume the .tex or .html input file was dynamically generated)

   Valid rasterizers: LaTeX, WKHTMLTOPDF, PhantomJS, ImageMagick, FFMPEG

   This means you can do things like transcode video or render image versions of graphs.

   For instance you could create a YearGraph.html file that only displays a bar chart, then PhantomJS it to an image, then ImageMagick some text over it, then use it in your final report.
 */

module.exports = (pTaskData, pState, fCallback) =>
{
	// Check that the rasterizer exists
	try
	{
		pTaskData.RasterizeStartTime = +new Date();
		const tmpRasterizer = require('../renderRasterizers/rasterize' + pTaskData.Rasterizer + '.js');

		// Check if the Path is set to one of the constants (this lets you set a Path of something like "Stage" or "Common" etc.)
		pTaskData.Path = pState.Behaviors.parseReportPath(pTaskData.Path, pState);

		tmpRasterizer(pTaskData, pState,
			(pError, pState) =>
			{
				pTaskData.RasterizeEndTime = +new Date();
				pTaskData.TotalRasterizeTime = pTaskData.RasterizeEndTime - pTaskData.RasterizeStartTime;
				if (pError)
				{
					pState.Behaviors.stateLog(pState, 'Error executing auto rasterizer [' + pTaskData.Rasterizer + ']: ' + pError, pError);
					return fCallback(null, pState);
				}

				pState.Behaviors.stateLog(pState, 'Successfully executed auto rasterizer [' + pTaskData.Rasterizer + ']');
				return fCallback(null, pState);
			});
	}
	catch (pError)
	{
		pState.Behaviors.stateLog(pState, 'Error loading auto rasterizer [' + pTaskData.Rasterizer + ']: ' + pError, pError);
		fCallback(null, pState);
	}
};
