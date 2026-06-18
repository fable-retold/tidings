
var reportDatum = (
{
	Name: 'Joan of Arc'
});

// Use the same port as the v2 tests (9042) since the v2 server is stopped
// before these tests run.  This is necessary because the assetladen report
// definition hardcodes port 9042 for ViaAPI callbacks in report.js.
var ORATOR_V6_PORT = 9042;

var Chai = require('chai');
var Expect = Chai.expect;

var libTidings = require('../source/Tidings.js');
var libRequest = require('request');

var Fable3 = require('fable');
var Orator6 = require('orator');
var OratorServiceServerRestify = require('orator-serviceserver-restify');

var GLOBAL_REPORT_HASH = false;

suite
(
	'Tidings with Orator v6',
	() =>
	{
		let _OratorV6;
		let _Fable3;
		let _Tidings;

		suite
		(
			'Orator v6 Injection and HTTP Integration',
			() =>
			{
				test
				(
					'initialize fable 3 + orator v6 with restify and inject into tidings',
					(fDone) =>
					{
						// Stand up a single Fable 3 instance shared by orator AND tidings.
						// This simulates a consumer on the modern retold stack passing their
						// fable 3 instance into tidings (which declares fable ^2.0.5).
						_Fable3 = new Fable3(
						{
							Product: 'TidingsTestV6',
							APIServerPort: ORATOR_V6_PORT,
							LogNoisiness: 0,
							Tidings:
							{
								ReportDefinitionFolder: `${__dirname}/reports/`,
								ReportOutputFolder: `${__dirname}/../stage/`,
								TidingsServerAddress: `http://localhost:${ORATOR_V6_PORT}`
							},
							LogStreams:
							[
								{
									level: 'trace',
									path: `${__dirname}/../Tests-Run.log`
								}
							]
						});
						_Fable3.addServiceType('OratorServiceServer', OratorServiceServerRestify);
						_Fable3.addServiceType('Orator', Orator6);
						_OratorV6 = _Fable3.instantiateServiceProvider('Orator', {}, 'Orator-Test');

						// Initialize creates the service server; we need it before connecting routes
						_OratorV6.initialize(
							() =>
							{
								// Set up body parser on the underlying restify server.
								// Orator v6 does not auto-configure parsers like v2 did;
								// the consumer is responsible for middleware setup.
								var tmpRestifyServer = _OratorV6.webServer.server;
								tmpRestifyServer.use(_OratorV6.webServer.bodyParser());

								// Create a tidings instance with fable 3 and inject the v6 orator
								_Tidings = libTidings.new(_Fable3);
								_Tidings.Orator(_OratorV6);

								// Patch tidings route definitions for restify 11 compatibility.
								// Restify 11 uses a radix tree router that does not support
								// regex patterns. Replace them with string wildcards.
								var tmpRoutes = _Tidings.routes;
								tmpRoutes.output.route = tmpRoutes.output.routeStrip + '/*';
								tmpRoutes.definition.route = tmpRoutes.definition.routeStrip + '/*';
								for (var i = 0; i < tmpRoutes.api.length; i++)
								{
									if (tmpRoutes.api[i].route instanceof RegExp)
									{
										tmpRoutes.api.splice(i, 1);
										i--;
									}
								}

								_Tidings.connectRoutes(_OratorV6.webServer);
								_Tidings.connectOutputRoutes(_OratorV6);
								_Tidings.connectDefinitionRoutes(_OratorV6);

								// Start listening
								_OratorV6.startService(fDone);
							});
					}
				).timeout(10000);
				test
				(
					'generate a report directly (no HTTP, sanity check)',
					(fDone) =>
					{
						var tmpReportGUID = _Tidings.render(reportDatum,
							() =>
							{
								Expect(tmpReportGUID).to.be.a('string');
								fDone();
							}
						);
					}
				);
				test
				(
					'request a synchronous report via HTTP through orator v6',
					(fDone) =>
					{
						libRequest(
							{
								method: 'POST',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/ReportSync`,
								json: { TidingsData: { Type: 'assetladen' }, Name: 'Billy Corgan' }
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pBody).to.be.an('object');
							Expect(pBody.GUIDReportDescription).to.be.a('string');
							Expect(pBody.Error).to.equal(undefined);
							GLOBAL_REPORT_HASH = pBody.GUIDReportDescription;
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'get report manifest via HTTP through orator v6',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/Report/Manifest/${GLOBAL_REPORT_HASH}`
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pBody).to.be.a('string');
							var tmpData = JSON.parse(pBody);
							Expect(tmpData.Status.Rendered).to.equal(true);
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'get report default file via HTTP through orator v6',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/Report/${GLOBAL_REPORT_HASH}/Default`
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pResponse.statusCode).to.equal(200);
							Expect(pBody).to.be.a('string');
							Expect(pBody.length).to.be.greaterThan(0);
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'get report output via static route through orator v6',
					(fDone) =>
					{
						// This exercises the connectOutputRoutes static route which
						// previously used a regex pattern and failed silently on
						// restify 11's radix tree router.
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/ReportOutput/${GLOBAL_REPORT_HASH}/Stage/index.html`
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pResponse.statusCode).to.equal(200);
							Expect(pBody).to.be.a('string');
							Expect(pBody.length).to.be.greaterThan(0);
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'get report definition via static route through orator v6',
					(fDone) =>
					{
						// This exercises the connectDefinitionRoutes static route which
						// previously used a regex pattern and failed silently on
						// restify 11's radix tree router.
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/ReportDefinition/default/report_definition.json`
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pResponse.statusCode).to.equal(200);
							var tmpDefinition = JSON.parse(pBody);
							Expect(tmpDefinition).to.be.an('object');
							Expect(tmpDefinition).to.have.property('Hash');
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'request a report via pdfapi renderer through orator v6',
					(fDone) =>
					{
						var tmpViaAPIPayload;

						// Register a mock PDF API endpoint on the v6 server
						_OratorV6.webServer.post('/1.0/viaapi',
							(pRequest, pResponse, fNext) =>
							{
								tmpViaAPIPayload = pRequest.body;
								_OratorV6.log.info('viaapi request on v6', { body: pRequest.body });
								pResponse.header('Content-Type', 'application/pdf');
								pResponse.send('not an actual pdf');
								fNext();
							});

						libRequest(
							{
								method: 'POST',
								url: `http://localhost:${ORATOR_V6_PORT}/1.0/ReportSync`,
								json: { TidingsData: { Type: 'assetladen', Renderer: 'pdfapi' }, Name: 'Billy Corgan' }
							},
						(pError, pResponse, pBody) =>
						{
							Expect(pError).to.be.null;
							Expect(pBody).to.be.an('object');
							Expect(pBody.GUIDReportDescription).to.be.a('string');
							Expect(pBody.Error).to.not.exist;
							Expect(tmpViaAPIPayload).to.be.an('object');
							Expect(tmpViaAPIPayload.URL).to.be.a('string');
							Expect(tmpViaAPIPayload.URL).to.include(`http://localhost:${ORATOR_V6_PORT}/1.0/Report/${pBody.GUIDReportDescription}`);
							fDone();
						});
					}
				).timeout(10000);
				test
				(
					'clean up orator v6',
					(fDone) =>
					{
						_OratorV6.stopService(fDone);
					}
				);
			}
		);
	}
);
