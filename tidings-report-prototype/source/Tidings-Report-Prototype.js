// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Report Prototype
*
* This has the base behaviors for a tidings report
*
* @class TidingsReportPrototype
* @constructor
*/
var TidingsReportPrototype = function()
{
	function createNew()
	{
		var passThrough = (pState, fCallback) =>
		{
			pState.Behaviors.stateLog(pState,'...Default behavior.')
			fCallback(false, pState);
		};

		var tmpNewTidingsReportObject = (
		{
			preCollect: passThrough,
			calculate: passThrough,
			rasterize: passThrough,
			postRender: passThrough,
			// Factory
			new: createNew
		});

		return tmpNewTidingsReportObject;
	}

	return createNew();
};

module.exports = new TidingsReportPrototype();
