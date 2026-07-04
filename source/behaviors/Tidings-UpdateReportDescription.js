// ##### Part of the **[retold](https://fable-retold.io/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Tidings Update a Report
*
* The Report Description blob contains at minimum "Type".
*
* Example Structure:
{
	Type: 'BudgetSummaryReport',
	ReportDefinition: { ... definition here ...},
	ReportScript: '... script here ...',
	Common: [
		{ File: 'myfile.css', Content:".blah{color:#ff00ff}"}
		],
	Renderers:
		[
		html: [
			{File: 'index.html', Content:"<html><head><title>Ah</title></head><body><h1>This Rules</h1></body>"}
			]
		pdf: [
			{File: 'index.html', Content:"<html><head><title>Ah</title></head><body><h1>This Rules</h1></body>"},
			{File: 'hints.ps', Content:"% This is a postscript file."}
			]
		]
}
*
*
* @class doUpdateReport
* @constructor
*/
module.exports = (pReportDescriptionBlob, pFable, fCallback) =>
{
	if (typeof(pReportDescriptionBlob) === 'object')
	{
		return fCallback(new Error('The Description update object must be an object.'), pReportDescriptionBlob);
	}

	if (!pReportDescriptionBlob.Type)
	{
		return fCallback(new Error('The Description update object must have a type.'), pReportDescriptionBlob);
	}

	// Now figure out if it exists

	// If not, put a cookie cutter report in there.

	// Now update the
	// ?????
	fCallback(null, pReportDescriptionBlob);
};
