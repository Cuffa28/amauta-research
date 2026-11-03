import unittest,importlib.util,base64,json,time
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector',Path(__file__).with_name('collect.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
def jwt(exp):
    payload=base64.urlsafe_b64encode(json.dumps({'exp':exp}).encode()).decode().rstrip('=')
    return 'testheader.'+payload+'.testsignature'
class CollectorTests(unittest.TestCase):
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
        self.assertEqual(packet['series'],[old]);self.assertEqual(len(packet['failures']),2);self.assertEqual(packet['updatedSources'],[])
    def test_purchase_candidate_cannot_be_silently_misidentified(self):
        entries=[{'idVariable':1,'descripcion':'Reservas internacionales','unidadExpresion':'millones de USD'}, {'idVariable':78,'descripcion':'Depósitos en moneda extranjera','unidadExpresion':'millones de USD'}]
        with patch.object(c,'crianza',return_value=[]),patch.object(c,'catalog',return_value=entries),patch.object(c,'monetary',return_value={'id':'reserves','points':[{'date':'2026-01-01','value':100}]}):
            packet=c.collect()
        self.assertNotIn('purchases',[s['id'] for s in packet['series']]);self.assertIn('no coincide',packet['failures'][0]['message'])
    def test_nulls_and_duplicates(self):
        self.assertEqual(c.points([{'d':'202601','v':None},{'d':'202602','v':10}],'d','v'),[{'date':'2026-02-01','value':10}])
        with self.assertRaises(c.SourceError):c.points([{'d':'202601','v':1},{'d':'202601','v':2}],'d','v')
if __name__=='__main__':unittest.main()
