"""Colector de datos públicos para GitHub Actions. Solo escribe el snapshot normalizado."""
from pathlib import Path
from urllib.request import Request,urlopen,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode,urlsplit
from datetime import datetime,timezone,date
import json,os,re,base64,hashlib,time,sys

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public'/'macro-lab'/'live'
INDEC='https://api.indec.gob.ar/v1/canasta-crianza'
BCRA='https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias'
RISK='https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'
class SourceError(Exception):pass
def stamp():return datetime.now(timezone.utc).isoformat()
def token_value(raw):
    token=str(raw or '').strip().strip('"\'')
    token=re.sub(r'^Authorization\s*:\s*','',token,flags=re.I)
    token=re.sub(r'^Bearer\s+','',token,flags=re.I)
    token=''.join(token.split()).strip('\ufeff\u200b')
    if not token:raise SourceError('INDEC_API_TOKEN no está configurado en GitHub Actions Secrets.')
    if len(token.split('.'))!=3:raise SourceError('La clave INDEC no tiene formato JWT. Copiar el token completo desde la cuenta de INDEC.')
    try:
        part=token.split('.')[1];payload=json.loads(base64.urlsafe_b64decode(part+'='*(-len(part)%4)))
        if isinstance(payload.get('exp'),(int,float)) and payload['exp']<=time.time():raise SourceError('El token INDEC está vencido. Reemplazar el secreto en GitHub.')
    except SourceError:raise
    except Exception:raise SourceError('No se pudo interpretar el formato del token INDEC.') from None
    return token
def fetch(url,token=None,timeout=25,attempts=3):
    # La credencial INDEC queda vinculada exclusivamente a su origen HTTPS.
    if token and (urlsplit(url).scheme!='https' or urlsplit(url).netloc!='api.indec.gob.ar'):
        raise SourceError('La credencial INDEC no puede enviarse a este destino.')
    headers={'Accept':'application/json','User-Agent':'AmautaMacroLab/0.3'}
    if token:headers['Authorization']='Bearer '+token
    class NoCredentialRedirect(HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):
            raise SourceError('La consulta autenticada no admite redirecciones.')
    opener=build_opener(NoCredentialRedirect()).open if token else urlopen
    for attempt in range(attempts):
        try:
            with opener(Request(url,headers=headers),timeout=timeout) as response:
                content=response.read(12_000_001)
                if len(content)>12_000_000:raise SourceError('Respuesta demasiado grande. No se importó parcialmente.')
                return json.loads(content)
        except HTTPError as e:
            if e.code==401:raise SourceError('INDEC rechazó la autenticación (401). Revisar que el secreto contenga el JWT vigente completo, no una clave de Alphacast ni el encabezado duplicado.') from None
            if e.code==403:raise SourceError('La fuente rechazó el acceso (403). Revisar permisos o restricciones del proveedor.') from None
            if e.code in (429,500,502,503,504) and attempt<attempts-1:time.sleep(2**attempt);continue
            raise SourceError(f'El proveedor devolvió HTTP {e.code}.') from None
        except (URLError,TimeoutError,OSError):
            if attempt<attempts-1:time.sleep(2**attempt);continue
            raise SourceError('La fuente no respondió después de '+str(attempts)+' intento(s).') from None
        except json.JSONDecodeError:raise SourceError('La fuente no devolvió JSON válido.') from None
def iso(v):
    text=str(v)
    if re.fullmatch(r'\d{6}',text):text=text[:4]+'-'+text[4:]+'-01'
    elif re.fullmatch(r'\d{4}-\d{2}',text):text+='-01'
    else:text=text[:10]
    try:date.fromisoformat(text)
    except ValueError:raise SourceError('La fuente devolvió una fecha inválida.') from None
    return text
def points(rows,date_key,value_key):
    import math
    seen=set();result=[]
    for r in rows:
        d=iso(r.get(date_key,''))
        if d in seen:raise SourceError('La fuente devolvió fechas duplicadas. Se conserva el último snapshot válido.')
        seen.add(d);value=r.get(value_key)
        if isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value):result.append({'date':d,'value':value})
    if not result:raise SourceError('La serie no tiene observaciones numéricas válidas.')
    return sorted(result,key=lambda p:p['date'])
def crianza():
    token=token_value(os.environ.get('INDEC_API_TOKEN'));rows=[]
    for offset in range(0,10000,1000):
        page=fetch(INDEC+'?'+urlencode({'order':'Periodo','limit':1000,'offset':offset}),token)
        if not isinstance(page,list):raise SourceError('Cambió el esquema de canasta de crianza.')
        rows.extend(page)
        if len(page)<1000:break
    else:raise SourceError('Se alcanzó el límite de páginas de INDEC.')
    definitions=[('crianza0','Crianza · menores de 1 año','tot_men1'),('crianza1','Crianza · de 1 a 3 años','tot_1a3'),('crianza4','Crianza · de 4 a 5 años','tot_4a5'),('crianza6','Crianza · de 6 a 12 años','tot_6a12')]
    return [{'id':sid,'name':name,'topic':'Ingresos','provider':'INDEC','unit':'ARS','frequency':'M','sourceUrl':INDEC,'retrievedAt':stamp(),'note':'Fuente: INDEC, canasta de crianza. Gran Buenos Aires. Bienes y servicios más valorización del cuidado. Valores nominales. La fecha es el período observado; publicación no informada por este conector.','points':points(rows,'Periodo',field)} for sid,name,field in definitions]
def catalog():
    result=[]
    for offset in range(0,20000,1000):
        response=fetch(BCRA+'?'+urlencode({'Limit':1000,'Offset':offset}));page=response.get('results')
        if not isinstance(page,list):raise SourceError('Cambió el catálogo monetario BCRA v4.')
        result.extend(page)
        if len(page)<1000:return result
    raise SourceError('Se alcanzó el límite de páginas del catálogo BCRA.')
def monetary(meta,sid,start=None):
    variable=int(meta['idVariable']);today=datetime.now(timezone.utc).date();start=start or date(today.year-3,today.month,1).isoformat();rows=[]
    for offset in range(0,15000,3000):
        response=fetch(BCRA+'/'+str(variable)+'?'+urlencode({'Desde':start,'Hasta':today.isoformat(),'Limit':3000,'Offset':offset}))
        results=response.get('results')
        if not isinstance(results,list):raise SourceError('Cambió el esquema de observaciones BCRA.')
        page=[p for result in results for p in result.get('detalle',[])];rows.extend(page)
        if len(page)<3000:break
    else:raise SourceError('Se alcanzó el límite de observaciones BCRA.')
    note='Fuente: BCRA, API monetaria v4. Reservas internacionales brutas; no netas ni de libre disponibilidad.' if sid=='reserves' else 'Fuente: BCRA, API monetaria v4. Factor de variación de reservas por compra de divisas; conservar fecha de observación y metodología. No equivale a la variación total de reservas ni necesariamente al momento de concertación de la intervención.'
    frequency=meta.get('periodicidad','D');frequency='Q' if frequency=='T' else frequency
    if frequency not in ('D','M','Q','A','S'):raise SourceError('Frecuencia BCRA no reconocida.')
    return {'id':sid,'name':str(meta['descripcion']),'topic':'Dinero','provider':'BCRA','unit':str(meta.get('unidadExpresion','unidad no informada')),'frequency':frequency,'sourceUrl':BCRA+'/'+str(variable),'retrievedAt':stamp(),'note':note,'points':points(rows,'fecha','valor')}

def inflation(entries):
    result=[]
    for variable,sid,label in [(27,'inflation_mom','Inflación mensual'),(28,'inflation_yoy','Inflación interanual')]:
        meta=next((m for m in entries if int(m['idVariable'])==variable),None)
        description=str(meta.get('descripcion','')).lower() if meta else ''
        if not meta or 'inflaci' not in description or not any(w in description for w in ('mensual', 'interanual','anual')):
            raise SourceError('El catálogo cambió la identidad de las variables de inflación 27/28.')
        if variable==27 and 'mensual' not in description or variable==28 and not any(w in description for w in ('interanual','anual')):
            raise SourceError('La frecuencia económica de inflación no coincide con la variable esperada.')
        series=monetary(meta,sid,'2003-01-01')
        series.update(id=sid,name=label,topic='Precios',provider='BCRA · fuente INDEC',unit='%',frequency='M',valueType='rate',official=True)
        series['note']='IPC publicado por BCRA, variable '+str(variable)+'. La fecha identifica el mes observado. La cobertura y metodología cambian en la historia; 2007–2015 requiere especial cautela y no se encadena con el IPC nacional actual. Vista predeterminada desde 2017. Variación publicada, no nivel de índice.'
        series['points']=points([{'month':p['date'][:7],'value':p['value']} for p in series['points']],'month','value')
        result.append(series)
    return result

def country_risk():
    rows=fetch(RISK)
    if not isinstance(rows,list):raise SourceError('Cambió el esquema de riesgo país de ArgentinaDatos.')
    observations=points(rows,'fecha','valor')
    if any(p['value']<0 or p['value']>100000 for p in observations):raise SourceError('Riesgo país fuera de rango; se conserva la versión anterior.')
    return {'id':'risk','name':'Riesgo país · referencia publicada','topic':'Mercado','provider':'ArgentinaDatos · Ámbito','unit':'pb','frequency':'D','official':False,'sourceUrl':RISK,'retrievedAt':stamp(),'note':'Referencia de riesgo país distribuida por ArgentinaDatos, que identifica a Ámbito como fuente. Servicio no oficial; no es una conexión directa al EMBI de J.P. Morgan. No se mezcla con la estimación propia de BondTerminal. Fecha de observación diaria; puede tener rezago. Datos: https://argentinadatos.com/docs/operations/get-finanzas-indices-riesgo-pais','points':observations}

def indec_dimensions():
    token=token_value(os.environ.get('INDEC_API_TOKEN'));result={}
    for endpoint in ['ipc_nacional','indice_salarios','ipi_manufacturero','estimador-mensual-de-actividad-economica-nivel-general','estimador-mensual-de-actividad-economica-sectores','valorizacion_canastas_cba_cbt']:
        rows=fetch('https://api.indec.gob.ar/v1/'+endpoint+'?'+urlencode({'order':'periodo.desc','limit':200}),token)
        if not isinstance(rows,list):raise SourceError('Dimensiones INDEC no disponibles.')
        unique={json.dumps({k:v for k,v in r.items() if k not in ['periodo','anio','mes','valor','observaciones']},sort_keys=True,ensure_ascii=False) for r in rows}
        result[endpoint]=[json.loads(r) for r in sorted(unique)]
    return result

def indec_series(endpoint,filters,groups,order,topic):
    token=token_value(os.environ.get('INDEC_API_TOKEN'));rows=[];base='https://api.indec.gob.ar/v1/'+endpoint
    for offset in range(0,30000,1000):
        page=fetch(base+'?'+urlencode({**filters,'order':order,'limit':1000,'offset':offset}),token)
        if not isinstance(page,list):raise SourceError('Cambió el esquema INDEC de '+endpoint)
        rows.extend(page)
        if len(page)<1000:break
    else:raise SourceError('Consulta INDEC incompleta; no se importó parcialmente.')
    result=[]
    for sid,name,matching,unit in groups:
        subset=[r for r in rows if all(str(r.get(k,''))==str(v) for k,v in matching.items())]
        if not subset:raise SourceError('INDEC no devolvió la apertura exacta: '+name)
        # Una fecha duplicada rechaza bases, coberturas o clasificaciones superpuestas.
        result.append({'id':sid,'name':name,'topic':topic,'provider':'INDEC','official':True,'unit':unit,'frequency':'M','sourceUrl':base+'?'+urlencode({**filters,**{k:'eq.'+str(v) for k,v in matching.items()}}),'retrievedAt':stamp(),'dimensions':matching,'note':'INDEC · '+name+'. Apertura: '+json.dumps(matching,ensure_ascii=False)+'. Se conserva el período observado. Revisiones y valores provisionales según la fuente.','points':points(subset,'periodo','valor')})
    return result

def research_indec():
    # Los filtros son aperturas verificadas en el catálogo; no se selecciona la primera serie disponible.
    standard='periodo,clasificador,nivel,codigo,descripcion,anio,mes,indicador,tipo_de_indicador'
    definitions=[
      ('ipc_nacional',{'descripcion':'ilike.*general*','region':'ilike.*nacional*','tipo_de_indicador':'eq.Indice','periodo':'gte.201701'},[('ipc','IPC nacional · nivel general',{},'índice')],standard+',region','Precios'),
      ('indice_salarios',{'tipo_de_indicador':'eq.Indice','codigo':'in.(0,100,110,120,200)','periodo':'gte.201701'},[(sid,name,{'codigo':code},'índice') for sid,name,code in [('salarios','Salarios · nivel general','0'),('salarios_reg','Salarios · total registrado','100'),('salarios_priv','Salarios · privado registrado','110'),('salarios_pub','Salarios · sector público','120'),('salarios_no_reg','Salarios · no registrado','200')]],standard,'Ingresos'),
      ('estimador-mensual-de-actividad-economica-nivel-general',{'tipo_de_indicador':'eq.Índice base 2004=100','periodo':'gte.200401'},[('emae','EMAE · desestacionalizado',{'tipo_de_indicador_descripcion':'Índice serie desestacionalizada'},'índice'),('emae_original','EMAE · serie original',{'tipo_de_indicador_descripcion':'Índice serie original'},'índice')],'periodo,tipo_de_indicador,tipo_de_indicador_descripcion,anio,mes','Actividad'),
      ('ipi_manufacturero',{'descripcion':'eq.IPI Manufacturero - Nivel general','tipo_de_indicador':'eq.Índice','serie':'eq.Serie desestacionalizada','periodo':'gte.201601'},[('industria','Industria · desestacionalizada',{},'índice')],'periodo,indicador,cuadro_web,codigo_CLaNAE_2004,descripcion,serie,tipo_de_indicador,anio,mes','Actividad'),
      ('estimador-mensual-de-actividad-economica-sectores',{'tipo_de_indicador':'eq.Índice base 2004=100','periodo':'gte.201701'},None,'periodo,codigo,descripcion,tipo_de_indicador,anio,mes','Actividad'),
      ('valorizacion_canastas_cba_cbt',{'codigo':'in.(CBA,CBT,CBA H2,CBT H2)','tipo_de_indicador':'in.(CBA,CBT,Hogar 2)','region':'eq.GBA','periodo':'gte.201701'},[(sid,name,{'codigo':code,'tipo_de_indicador':kind},'ARS') for sid,name,code,kind in [('cba','CBA · adulto equivalente · GBA','CBA','CBA'),('cbt','CBT · adulto equivalente · GBA','CBT','CBT'),('cba_hogar','CBA · hogar de 4 · GBA','CBA H2','Hogar 2'),('cbt_hogar','CBT · hogar de 4 · GBA','CBT H2','Hogar 2')]],standard+',region','Ingresos')
    ]
    result=[];errors=[]
    sector_names={'A':'Agro','B':'Pesca','C':'Minería','D':'Industria manufacturera','E':'Electricidad, gas y agua','F':'Construcción','G':'Comercio','H':'Hoteles y restaurantes','I':'Transporte y comunicaciones','J':'Intermediación financiera','K':'Servicios inmobiliarios y empresariales','L':'Administración pública','M':'Enseñanza','N':'Salud','O':'Otros servicios'}
    for endpoint,filters,groups,order,topic in definitions:
        try:
            if groups is None:groups=[('sector_'+code,'EMAE · '+name,{'codigo':code},'índice') for code,name in sector_names.items()]
            result.extend(indec_series(endpoint,filters,groups,order,topic))
        except SourceError as e:errors.append({'source':'INDEC · '+endpoint,'message':str(e),'at':stamp()})
    return result,errors

def real_wage(nominal,prices):
    price={p['date']:p['value'] for p in prices['points'] if p['value']>0}
    common=[p for p in nominal['points'] if p['date'] in price and p['value']>0]
    if not common:raise SourceError('No hay meses comunes para calcular salario real.')
    base=common[0]['value']/price[common[0]['date']]
    return {'id':nominal['id']+'_real','name':nominal['name']+' · real','topic':'Ingresos','provider':'Amauta · cálculo con INDEC','official':False,'derived':True,'unit':'índice real base común=100','frequency':'M','sourceUrl':nominal['sourceUrl'],'retrievedAt':stamp(),'inputs':[nominal['id'],'ipc'],'baseDate':common[0]['date'],'note':'Cálculo propio: (índice de salarios / IPC nacional) normalizado a 100 en '+common[0]['date']+'. Solo meses comunes. No representa un sueldo en pesos ni microdatos individuales.','points':[{'date':p['date'],'value':(p['value']/price[p['date']])/base*100} for p in common]}

def rem_expectations():
    url='https://api.argentinadatos.com/v1/finanzas/rem/ultimo';rows=fetch(url)
    if not isinstance(rows,list) or not rows:raise SourceError('REM sin observaciones válidas.')
    import math
    for row in rows:
        if not all(row.get(k) for k in ['informe','indicador','periodo','muestra','unidad']):raise SourceError('REM: faltan metadatos de horizonte o muestra.')
        if not isinstance(row.get('mediana'),(int,float)) or not math.isfinite(row['mediana']):raise SourceError('REM: mediana no válida.')
    return {'sourceUrl':url,'provider':'BCRA REM vía ArgentinaDatos','retrievedAt':stamp(),'rows':rows,'note':'Expectativas de participantes encuestados; no son proyecciones propias del BCRA. El informe y el horizonte objetivo son fechas distintas. Percentiles entre participantes no son intervalos de confianza.'}
def monitor_bundle():
    # Peticiones sin token ni cookies. fetch rechaza credenciales en este dominio.
    base='https://monitorargy.com/api/v1/';started=time.monotonic();result={'provider':'Monitor Argy','sourceUrl':'https://monitorargy.com','retrievedAt':stamp(),'attribution':'Monitor Argy (monitorargy.com), con datos de los organismos indicados en cada serie. Cálculos propios de Monitor Argy: CC BY 4.0.','errors':[]}
    for name,key in [('series','catalog'),('calendario','calendar'),('coyuntura','outlook')]:
        try:
            payload=fetch(base+name,timeout=8,attempts=1)
            required={'catalog':'series','calendar':'eventos','outlook':'secciones'}[key]
            if not isinstance(payload,dict) or not isinstance(payload.get(required),list):raise SourceError('Cambió el esquema de Monitor Argy: '+name)
            result[key]=payload
        except SourceError as e:result['errors'].append({'source':name,'message':str(e)})
        time.sleep(.4)
    if not result.get('catalog',{}).get('series'):raise SourceError('Monitor Argy no devolvió un catálogo válido.')
    ids={s['id'] for s in result['catalog']['series']};result['histories']={}
    featured=['emae_desest','ipc_mensual','empleo_privado_desest','pobreza_nowcast','tc_mayorista','saldo_comercial','tasa_tamar','base_monetaria','resultado_primario','supermercados_desest','isac_desest','petroleo']
    for sid in featured:
        if time.monotonic()-started>75:
            result['errors'].append({'source':'histories','message':'Se alcanzó el presupuesto de tiempo del proveedor complementario; se conservan las historias previas.'});break
        if sid not in ids:continue
        try:
            packet=fetch(base+'series/'+sid+'?desde=2020-01',timeout=8,attempts=1)
            if packet.get('id')!=sid or not isinstance(packet.get('puntos'),list):raise SourceError('Identidad o puntos de Monitor Argy no válidos.')
            result['histories'][sid]=packet
        except SourceError as e:result['errors'].append({'source':sid,'message':str(e)})
        time.sleep(.4)
    return result

def collect(previous=None):
    started=stamp();previous=previous or {};series={s['id']:s for s in previous.get('series',[])};failures=[];success=[]
    try:
        new=crianza()
        for s in new:series[s['id']]=s
        success.append('INDEC')
    except SourceError as e:failures.append({'source':'INDEC','message':str(e),'at':stamp()})
    try:
        entries=catalog();reserve=next((m for m in entries if int(m['idVariable'])==1),None)
        if not reserve:raise SourceError('El catálogo no contiene la variable 1 de reservas.')
        series['reserves']=monetary(reserve,'reserves');success.append('BCRA · reservas')
        # El ID 78 es candidato. Solo se usa después de validar descripción y unidad oficiales.
        purchase_id=int(os.environ.get('BCRA_PURCHASES_ID','78'))
        purchase=next((m for m in entries if int(m['idVariable'])==purchase_id),None)
        label=str(purchase.get('descripcion','')).lower() if purchase else ''
        unit=str(purchase.get('unidadExpresion','')).lower() if purchase else ''
        if not purchase or 'compra' not in label or 'divisa' not in label or not ('usd' in unit or 'dólar' in unit or 'dolar' in unit):raise SourceError('La variable candidata de compras de divisas no coincide con su definición/unidad. Validar BCRA_PURCHASES_ID; no se reemplazó por otra serie.')
        series['purchases']=monetary(purchase,'purchases');success.append('BCRA · compra de divisas')
    except (SourceError,ValueError,KeyError,TypeError) as e:failures.append({'source':'BCRA','message':str(e) if isinstance(e,SourceError) else 'Metadatos BCRA inválidos; no se importaron datos ambiguos.','at':stamp()})
    try:
        for s in inflation(entries if 'entries' in locals() else catalog()):series[s['id']]=s
        success.append('BCRA · inflación')
    except (SourceError,ValueError,KeyError,TypeError) as e:failures.append({'source':'BCRA · inflación','message':str(e) if isinstance(e,SourceError) else 'Metadatos de inflación inválidos.','at':stamp()})
    try:
        series['risk']=country_risk();success.append('ArgentinaDatos · riesgo país')
    except SourceError as e:failures.append({'source':'ArgentinaDatos','message':str(e),'at':stamp()})
    # En ausencia de clave se omite esta expansión; las series existentes mantienen su estado.
    if os.environ.get('INDEC_API_TOKEN'):
        new,errors=research_indec();failures.extend(errors)
        for s in new:series[s['id']]=s
        if new:success.append('INDEC · actividad, salarios y canastas')
        for sid in ['salarios','salarios_reg','salarios_priv','salarios_pub','salarios_no_reg']:
            if sid in series and 'ipc' in series:
                try:series[sid+'_real']=real_wage(series[sid],series['ipc'])
                except SourceError:pass
    packet={'schemaVersion':1,'generatedAt':stamp(),'series':list(series.values()),'failures':failures,'updatedSources':success,'lsegValuesIncluded':False}
    try:packet['expectations']=rem_expectations();success.append('REM · expectativas de mercado')
    except SourceError as e:
        if previous.get('expectations'):packet['expectations']=previous['expectations']
        packet['expectationsError']=str(e)
    if os.environ.get('INDEC_API_TOKEN'):
        try:
            incoming=monitor_bundle();older=previous.get('monitor',{})
            for key in ['calendar','outlook']:
                if key not in incoming and key in older:incoming[key]=older[key]
            incoming['histories']={**older.get('histories',{}),**incoming['histories']}
            packet['monitor']=incoming;success.append('Monitor Argy · catálogo, calendario y coyuntura')
        except SourceError as e:
            if previous.get('monitor'):packet['monitor']=previous['monitor']
            packet['monitorError']=str(e)
    packet['collectionStartedAt']=started
    packet['generatedAt']=stamp()
    packet['retainedSeries']=[s['id'] for s in packet['series'] if s.get('retrievedAt','')<started and not s.get('derived')]
    return packet
def main():
    OUT.mkdir(parents=True,exist_ok=True);target=OUT/'latest.json';previous={}
    if target.exists():
        try:previous=json.loads(target.read_text(encoding='utf8'))
        except json.JSONDecodeError:raise SourceError('El snapshot anterior no es JSON válido; no se sobrescribió.')
    packet=collect(previous)
    if not packet['series']:
        for error in packet['failures']:print(error['source']+': '+error['message'],file=sys.stderr)
        return 1
    temp=OUT/'latest.pending';temp.write_text(json.dumps(packet,ensure_ascii=False,indent=2),encoding='utf8');temp.replace(target)
    observations=[{'id':s['id'],'points':s['points']} for s in packet['series']]
    version=hashlib.sha256(json.dumps(observations,sort_keys=True).encode()).hexdigest()[:16]
    archive=OUT/'versions';archive.mkdir(exist_ok=True);snapshot=archive/(version+'.json')
    if not snapshot.exists():snapshot.write_text(json.dumps(packet,ensure_ascii=False),encoding='utf8')
    print(f"Series conservadas: {len(packet['series'])}. Fuentes actualizadas: {len(packet['updatedSources'])}. Fuentes con errores: {len(packet['failures'])}.")
    for error in packet['failures']:print(error['source']+': '+error['message'],file=sys.stderr)
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except SourceError as e:print(str(e),file=sys.stderr);sys.exit(1)
