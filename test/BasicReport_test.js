
var reportDatum = (
{
	Name: 'Joan of Arc'
});

var fableConfig = (
{
	APIServerPort: 9042,
	Tidings:
	{
		ReportDefinitionFolder: `${__dirname}/reports/`,
		ReportOutputFolder: `${__dirname}/../stage/`
	},
	LogStreams:
	[
		{
			level: 'trace',
			path: `${__dirname}/../Tests-Run.log`
		},
		{
			level: 'trace',
			streamtype: 'prettystream'
		}
	]
});


var Chai = require('chai');
var Expect = Chai.expect;

var libFable = require('fable').new(fableConfig);
var libTidings = require('../source/Tidings.js');
var libRequest = require('request');


var GLOBAL_REPORT_HASH = false;
var GLOBAL_DELETE_REPORT_HASH = false;

suite
(
	'Tidings Basic Report',
	() =>
	{
		setup (() => {});

		suite
		(
			'Basic Reporting',
			() =>
			{
				test
				(
					'generate a simple report',
					(fDone) =>
					{
						var testTidings = libTidings.new(libFable);

						GLOBAL_DELETE_REPORT_HASH = testTidings.render(reportDatum,
							()=>
							{
								Expect(GLOBAL_DELETE_REPORT_HASH).to.be.a('string');
								fDone();
							}
						);
					}
				);
				test
				(
					'generate an asset laden report',
					(fDone) =>
					{
						var testTidings = libTidings.new(libFable);

						var testReportGUID = testTidings.render({TidingsData:{Type:'assetladen'}, Name: 'Billy Corgan'},
							()=>
							{
								GLOBAL_REPORT_HASH = testReportGUID;
								Expect(testReportGUID).to.be.a('string');
								fDone();
							}
						);
					}
				).timeout(10000);
				test
				(
					'get report datum',
					(fDone) =>
					{
						var testTidings = libTidings.new(libFable);

						testTidings.getReportData(GLOBAL_REPORT_HASH,
							(pError, pData)=>
							{
								Expect(pError).to.be.null;
								Expect(pData).to.be.a('string');
								Expect(pData).to.contain('Billy Corgan');
								fDone();
							}
						);
					}
				);
				test
				(
					'get report status',
					(fDone) =>
					{
						var testTidings = libTidings.new(libFable);

						testTidings.getReportStatus(GLOBAL_REPORT_HASH,
							(pError, pData)=>
							{
								Expect(pError).to.be.null;
								Expect(pData).to.be.a('string');
								var tmpData = JSON.parse(pData);
								Expect(tmpData.Status.Rendered).to.equal(true);
								fDone();
							}
						);
					}
				);
				test
				(
					'delete a report',
					(fDone) =>
					{
						var testTidings = libTidings.new(libFable);
						testTidings.deleteReport(GLOBAL_DELETE_REPORT_HASH,
							(pError)=>
							{
								Expect(pError).to.be.null;
								Expect(pError).to.equal(null);
								fDone();
							}
						);
					}
				);
			}
		);
	}
);
