"""Colector de datos públicos para GitHub Actions. Solo escribe el snapshot normalizado."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode
from datetime import datetime,timezone,date
import json,os,re,base64,hashlib,time,sys

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public'/'macro-lab'/'live'
INDEC='https://api.indec.gob.ar/v1/canasta-crianza'
BCRA='https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias'
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
def fetch(url,token=None):
    headers={'Accept':'application/json','User-Agent':'AmautaMacroLab/0.3'}
    if token:headers['Authorization']='Bearer '+token
    for attempt in range(3):
        try:
            with urlopen(Request(url,headers=headers),timeout=25) as response:
                content=response.read(12_000_001)
                if len(content)>12_000_000:raise SourceError('Respuesta demasiado grande. No se importó parcialmente.')
                return json.loads(content)
        except HTTPError as e:
            if e.code==401:raise SourceError('INDEC rechazó la autenticación (401). Revisar que el secreto contenga el JWT vigente completo, no una clave de Alphacast ni el encabezado duplicado.') from None
            if e.code==403:raise SourceError('La fuente rechazó el acceso (403). Revisar permisos o restricciones del proveedor.') from None
            if e.code in (429,500,502,503,504) and attempt<2:time.sleep(2**attempt);continue
            raise SourceError(f'El proveedor devolvió HTTP {e.code}.') from None
        except (URLError,TimeoutError,OSError):
            if attempt<2:time.sleep(2**attempt);continue
            raise SourceError('La fuente no respondió después de tres intentos.') from None
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
def monetary(meta,sid):
    variable=int(meta['idVariable']);today=datetime.now(timezone.utc).date();start=date(today.year-3,today.month,1).isoformat();rows=[]
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
def collect(previous=None):
    previous=previous or {};series={s['id']:s for s in previous.get('series',[])};failures=[];success=[]
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
    return {'schemaVersion':1,'generatedAt':stamp(),'series':list(series.values()),'failures':failures,'updatedSources':success,'lsegValuesIncluded':False}
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
