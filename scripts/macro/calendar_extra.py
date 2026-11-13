"""Eventos extra del calendario MacroLab.

Suma al calendario (monitor.calendar.eventos) eventos que Monitor Argy no trae:
licitaciones del Tesoro (con fecha de liquidación), feriados, y —a futuro—
vencimientos de bonos y datos de EE.UU./FOMC.

Cada evento extra lleva:
  - tipo: 'licitacion' | 'liquidacion' | 'feriado' | 'vencimiento' | 'eeuu' | 'fomc'
  - origen: 'amauta'   (marca para re-merge idempotente)
  - fechaLiquidacion:  solo en licitaciones
Mantiene el mismo esquema base que los eventos de Monitor Argy
(fecha, hora, series, titulo, metodo, url) para no romper el render actual.

Se usa de dos formas:
  1) Importado por collect.py (CI): merge_into_calendar(cal, fetch).
  2) Standalone:  python scripts/macro/calendar_extra.py
     → lee public/macro-lab/live/latest.json, mezcla y lo reescribe.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import datetime, timezone, date
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'macro-lab' / 'live'
DATA = Path(__file__).resolve().parent / 'data'
UA = 'AmautaMacroLab/0.3'
FERIADOS_API = 'https://api.argentinadatos.com/v1/feriados/'
FERIADOS_URL = 'https://www.argentina.gob.ar/interior/feriados'
BONOS_CER_API = 'https://api.argentinadatos.com/v1/finanzas/bonos-cer'
DEUDA_URL = 'https://www.argentina.gob.ar/economia/finanzas/deuda-publica'


def _default_fetch(url, timeout=20):
    req = Request(url, headers={'Accept': 'application/json', 'User-Agent': UA})
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read(5_000_000))


def licitaciones_events():
    """Licitaciones del Tesoro desde los JSON curados en data/licitaciones-*.json.
    Genera un evento 'licitacion' (con fechaLiquidacion) el día de la licitación y
    un evento 'liquidacion' el día de la liquidación."""
    ev = []
    for path in sorted(DATA.glob('licitaciones-*.json')):
        try:
            d = json.loads(path.read_text(encoding='utf8'))
        except Exception:
            continue
        url = d.get('_url') or d.get('_pdf') or FERIADOS_URL
        for x in d.get('licitaciones', []):
            L = x.get('fecha_licitacion'); Q = x.get('fecha_liquidacion')
            if L:
                ev.append({
                    'fecha': L, 'hora': x.get('hora'), 'series': [],
                    'titulo': x.get('titulo') or 'Licitación del Tesoro',
                    'metodo': 'oficial', 'url': url, 'tipo': 'licitacion',
                    'fechaLiquidacion': Q, 'organismo': 'Tesoro', 'origen': 'amauta',
                })
            if Q:
                ev.append({
                    'fecha': Q, 'hora': None, 'series': [],
                    'titulo': 'Liquidación del Tesoro',
                    'metodo': 'oficial', 'url': url, 'tipo': 'liquidacion',
                    'licitacion': L, 'organismo': 'Tesoro', 'origen': 'amauta',
                })
    return ev


def feriados_events(years, fetch=_default_fetch):
    """Feriados nacionales desde ArgentinaDatos (JSON público, sin token)."""
    ev = []
    for y in years:
        try:
            data = fetch(FERIADOS_API + str(y))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for f in data:
            fecha = f.get('fecha'); nombre = f.get('nombre')
            if not fecha or not nombre:
                continue
            ev.append({
                'fecha': fecha, 'hora': None, 'series': [],
                'titulo': 'Feriado — ' + str(nombre),
                'metodo': 'oficial', 'url': FERIADOS_URL,
                'tipo': 'feriado', 'subtipo': f.get('tipo', ''),
                'organismo': 'Nacional', 'origen': 'amauta',
            })
    return ev


def vencimientos_events(fetch=_default_fetch):
    """Vencimientos de bonos CER (ArgentinaDatos · Docta Capital). Solo futuros."""
    try:
        data = fetch(BONOS_CER_API)
    except Exception:
        return []
    bonos = data.get('bonos', []) if isinstance(data, dict) else []
    hoy = date.today().isoformat()
    ev = []
    for b in bonos:
        t = b.get('ticker'); v = b.get('fechaVencimiento')
        if not t or not v or v < hoy:
            continue
        ev.append({
            'fecha': v, 'hora': None, 'series': [],
            'titulo': 'Vencimiento ' + str(t) + ' · bono CER',
            'metodo': 'oficial', 'url': DEUDA_URL,
            'tipo': 'vencimiento', 'organismo': 'Tesoro', 'origen': 'amauta',
        })
    return ev


def eeuu_events():
    """Datos de EE.UU./FOMC desde los JSON curados en data/eeuu-*.json."""
    ev = []
    for path in sorted(DATA.glob('eeuu-*.json')):
        try:
            d = json.loads(path.read_text(encoding='utf8'))
        except Exception:
            continue
        url = d.get('_url') or ''
        for x in d.get('eventos', []):
            f = x.get('fecha')
            if not f:
                continue
            ev.append({
                'fecha': f, 'hora': x.get('hora'), 'series': [],
                'titulo': x.get('titulo') or 'Dato EE.UU.',
                'metodo': 'oficial', 'url': x.get('url') or url,
                'tipo': x.get('tipo') or 'eeuu',
                'organismo': x.get('organismo') or 'EE.UU.', 'origen': 'amauta',
            })
    return ev


def extra_events(fetch=_default_fetch, years=None):
    if years is None:
        y = datetime.now(timezone.utc).year
        years = [y, y + 1]
    out = []
    out += licitaciones_events()
    out += feriados_events(years, fetch)
    out += vencimientos_events(fetch)
    out += eeuu_events()
    return out


def merge_into_calendar(calendar, fetch=_default_fetch):
    """Reemplaza los eventos 'amauta' previos por los recalculados (idempotente)."""
    if not isinstance(calendar, dict):
        return calendar
    base = [e for e in calendar.get('eventos', []) if e.get('origen') != 'amauta']
    extra = extra_events(fetch)
    eventos = base + extra
    eventos.sort(key=lambda e: (e.get('fecha', ''), e.get('hora') or ''))
    calendar['eventos'] = eventos
    calendar['amautaExtra'] = {
        'generado': datetime.now(timezone.utc).isoformat(),
        'conteo': len(extra),
        'tipos': sorted({e['tipo'] for e in extra if e.get('tipo')}),
    }
    return calendar


def main():
    target = OUT / 'latest.json'
    packet = json.loads(target.read_text(encoding='utf8'))
    cal = packet.setdefault('monitor', {}).setdefault('calendar', {'eventos': []})
    before = len(cal.get('eventos', []))
    merge_into_calendar(cal)
    after = len(cal['eventos'])
    tmp = OUT / 'latest.pending'
    tmp.write_text(json.dumps(packet, ensure_ascii=False, indent=2), encoding='utf8')
    tmp.replace(target)
    print('eventos:', before, '->', after,
          '| extra:', cal.get('amautaExtra', {}).get('conteo'),
          '| tipos:', cal.get('amautaExtra', {}).get('tipos'))


if __name__ == '__main__':
    main()
