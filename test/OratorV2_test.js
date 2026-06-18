var reportDatum = (
{
	Name: 'Joan of Arc'
});

// Same port as the v6 tests (9042); the assetladen report definition hardcodes
// 9042 for ViaAPI callbacks. This suite stops its server in cleanup before the
// v6 suite runs (alphabetical: OratorV2 before OratorV6).
var ORATOR_V2_PORT = 9042;

var Chai = require('chai');
var Expect = Chai.expect;

var libTidings = require('../source/Tidings.js');
var libRequest = require('request');

var Fable = require('fable');
// orator2 is the orator@^2 dev alias — proves tidings still supports the legacy
// orator 2 path (the no-arg Orator() fallback / regex routes) alongside orator 6.
var Orator2 = require('orator2');

var GLOBAL_REPORT_HASH = false;

suite
(
	'Tidings with Orator v2',
	() =>
	{
		let _OratorV2;
		let _Fable;
		let _Tidings;

		suite
		(
			'Orator v2 Injection and HTTP Integration',
			() =>
			{
				test
				(
					'initialize orator v2 and inject into tidings',
					(fDone) =>
					{
						_Fable = new Fable(
						{
							Product: 'TidingsTestV2',
							APIServerPort: ORATOR_V2_PORT,
							LogNoisiness: 0,
							Tidings:
							{
								ReportDefinitionFolder: `${__dirname}/reports/`,
								ReportOutputFolder: `${__dirname}/../stage/`,
								TidingsServerAddress: `http://localhost:${ORATOR_V2_PORT}`
							},
							LogStreams:
							[
								{
									level: 'error',
									path: `${__dirname}/../Tests-Run.log`
								}
							]
						});

						// Orator 2 is constructed straight from settings and exposes webServer
						// immediately — no serviceManager / initialize() step (that is v6), and it
						// auto-configures restify parsers (also a v6 difference).
						_OratorV2 = Orator2.new(_Fable.settings);

						_Tidings = libTidings.new(_Fable);
						_Tidings.Orator(_OratorV2);

						// No route patching: orator 2 / restify 6 accept the default regex route
						// patterns, so this exercises tidings' original routing unchanged.
						// Static routes first; connectRoutes installs a `/.*/` catchall that must
						// be registered LAST or it shadows them (same ordering ReportService.js uses).
						_Tidings.connectOutputRoutes(_OratorV2);
						_Tidings.connectDefinitionRoutes(_OratorV2);
						_Tidings.connectRoutes(_OratorV2.webServer);

						_OratorV2.startWebServer(fDone);
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
					'request a synchronous report via HTTP through orator v2',
					(fDone) =>
					{
						libRequest(
							{
								method: 'POST',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/ReportSync`,
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
					'get report manifest via HTTP through orator v2',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/Report/Manifest/${GLOBAL_REPORT_HASH}`
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
					'get report default file via HTTP through orator v2',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/Report/${GLOBAL_REPORT_HASH}/Default`
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
					'get report output via static route through orator v2',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/ReportOutput/${GLOBAL_REPORT_HASH}/Stage/index.html`
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
					'get report definition via static route through orator v2',
					(fDone) =>
					{
						libRequest(
							{
								method: 'GET',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/ReportDefinition/default/report_definition.json`
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
					'request a report via pdfapi renderer through orator v2',
					(fDone) =>
					{
						var tmpViaAPIPayload;

						_OratorV2.webServer.post('/1.0/viaapi',
							(pRequest, pResponse, fNext) =>
							{
								tmpViaAPIPayload = pRequest.body;
								_OratorV2.log.info('viaapi request on v2', { body: pRequest.body });
								pResponse.header('Content-Type', 'application/pdf');
								pResponse.send('not an actual pdf');
								fNext();
							});

						libRequest(
							{
								method: 'POST',
								url: `http://localhost:${ORATOR_V2_PORT}/1.0/ReportSync`,
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
							Expect(tmpViaAPIPayload.URL).to.include(`http://localhost:${ORATOR_V2_PORT}/1.0/Report/` + pBody.GUIDReportDescription);
							fDone();
						});
					}
				).timeout(10000);
				test('clean up orator v2', () => _OratorV2.stopWebServer());
			}
		);
	}
);
