import unittest,importlib.util,base64,json,time
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector',Path(__file__).with_name('collect.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def jwt(exp):
    payload=base64.urlsafe_b64encode(json.dumps({'exp':exp}).encode()).decode().rstrip('=')
    return 'testheader.'+payload+'.testsignature'
class CollectorTests(unittest.TestCase):
    def setUp(self):
        for name in ['inflation','country_risk','rem_expectations']:
            p=patch.object(c,name,side_effect=c.SourceError('Fuente de prueba indisponible'));p.start();self.addCleanup(p.stop)
    def test_normalizes_copied_authorization_header(self):
        token=jwt(time.time()+3600)
        self.assertEqual(c.token_value(' Authorization: Bearer '+token+'\n'),token)
    def test_expired_token_fails_before_network_request(self):
        with self.assertRaises(c.SourceError) as error:c.token_value(jwt(time.time()-3600))
        self.assertIn('vencido',str(error.exception))
    def test_alphacast_or_incomplete_token_rejected(self):
        with self.assertRaises(c.SourceError):c.token_value('not-a-jwt')
    def test_source_failure_preserves_previous_observations(self):
        old={'id':'crianza0','points':[{'date':'2026-01-01','value':100}],'retrievedAt':'2026-01-02T00:00:00Z'}
        with patch.object(c,'crianza',side_effect=c.SourceError('Autenticación rechazada')),patch.object(c,'catalog',side_effect=c.SourceError('Fuente indisponible')):
            packet=c.collect({'series':[old]})
        # El calendario Amauta (licitaciones curadas locales + feriados) aporta siempre,
        # aun si fallan todas las fuentes de red.
        self.assertEqual(packet['series'],[old]);self.assertEqual(len(packet['failures']),4);self.assertEqual(packet['updatedSources'],['Amauta · calendario (licitaciones y feriados)'])
        self.assertEqual(packet['retainedSeries'],['crianza0'])
        self.assertGreaterEqual(packet['generatedAt'],packet['collectionStartedAt'])
    def test_purchase_candidate_cannot_be_silently_misidentified(self):
        entries=[{'idVariable':1,'descripcion':'Reservas internacionales','unidadExpresion':'millones de USD'}, {'idVariable':78,'descripcion':'Depósitos en moneda extranjera','unidadExpresion':'millones de USD'}]
        with patch.object(c,'crianza',return_value=[]),patch.object(c,'catalog',return_value=entries),patch.object(c,'monetary',return_value={'id':'reserves','points':[{'date':'2026-01-01','value':100}]}):
            packet=c.collect()
        self.assertNotIn('purchases',[s['id'] for s in packet['series']]);self.assertIn('no coincide',packet['failures'][0]['message'])
    def test_nulls_and_duplicates(self):
        self.assertEqual(c.points([{'d':'202601','v':None},{'d':'202602','v':10}],'d','v'),[{'date':'2026-02-01','value':10}])
        with self.assertRaises(c.SourceError):c.points([{'d':'202601','v':1},{'d':'202601','v':2}],'d','v')
class PublicSourceTests(unittest.TestCase):
    def test_indec_credential_is_refused_for_a_different_host(self):
        with patch.object(c,'urlopen') as network:
            with self.assertRaises(c.SourceError):c.fetch('https://monitorargy.com/api/v1/series',token='dummy-for-test')
        network.assert_not_called()
    def test_public_request_never_contains_authorization_or_cookie(self):
        import io
        with patch.object(c,'urlopen',return_value=io.BytesIO(b'{"series":[]}')) as network:
            c.fetch('https://monitorargy.com/api/v1/series')
        headers={k.lower():v for k,v in network.call_args.args[0].headers.items()}
        self.assertNotIn('authorization',headers);self.assertNotIn('cookie',headers)
    def test_real_wage_deflates_and_rebases_only_common_months(self):
        nominal={'id':'salarios','name':'Salarios','sourceUrl':'https://api.indec.gob.ar/v1/indice_salarios','points':[{'date':'2026-01-01','value':100},{'date':'2026-02-01','value':121},{'date':'2026-03-01','value':130}]}
        prices={'points':[{'date':'2026-01-01','value':200},{'date':'2026-02-01','value':220}]}
        result=c.real_wage(nominal,prices)
        self.assertEqual(len(result['points']),2);self.assertAlmostEqual(result['points'][0]['value'],100);self.assertAlmostEqual(result['points'][1]['value'],110);self.assertTrue(result['derived'])
    def test_rem_keeps_report_and_target_horizon_separate(self):
        row={'informe':'2026-09','indicador':'IPC','periodo':'2027','muestra':'todos','unidad':'%','mediana':20}
        with patch.object(c,'fetch',return_value=[row]):result=c.rem_expectations()
        self.assertEqual(result['rows'][0]['informe'],'2026-09');self.assertEqual(result['rows'][0]['periodo'],'2027')
    def test_risk_dates_sorted_and_secondary_source_identified(self):
        with patch.object(c,'fetch',return_value=[{'fecha':'2026-11-02','valor':805},{'fecha':'2026-10-30','valor':810}]):s=c.country_risk()
        self.assertFalse(s['official']);self.assertEqual(s['points'][-1]['value'],805);self.assertIn('Ámbito',s['provider'])
    def test_risk_out_of_range_rejected(self):
        with patch.object(c,'fetch',return_value=[{'fecha':'2026-11-02','valor':-1}]):
            with self.assertRaises(c.SourceError):c.country_risk()
    def test_inflation_normalizes_period_without_deriving_a_second_rate(self):
        entries=[{'idVariable':27,'descripcion':'Inflación mensual'},{'idVariable':28,'descripcion':'Inflación interanual'}]
        with patch.object(c,'monetary',return_value={'points':[{'date':'2026-09-30','value':1.9}]}):s=c.inflation(entries)
        self.assertEqual(s[0]['points'],[{'date':'2026-09-01','value':1.9}]);self.assertEqual(s[0]['valueType'],'rate');self.assertEqual(s[1]['id'],'inflation_yoy')
    def test_inflation_identity_change_rejected(self):
        with self.assertRaises(c.SourceError):c.inflation([{'idVariable':27,'descripcion':'Depósitos'}])
if __name__=='__main__':unittest.main()
