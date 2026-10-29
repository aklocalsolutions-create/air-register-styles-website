# Side-by-side: style bot's own app screenshot (left) vs this site (right), plus a coarse look-difference score.
import json, os, sys, glob
from PIL import Image, ImageDraw, ImageChops, ImageStat
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'screenshots', 'compare')
REF = '/workspace/air-register-styles-work/screens/styles'
pairs = {'sale': '05-sale-3-items.png', 'payment': '07-payment.png', 'customer': '06-customer-sale.png'}
res = {}
for sid in sys.argv[1].split(','):
    d = glob.glob(f'{REF}/{sid}-*')[0]; res[sid] = {}
    for k, f in pairs.items():
        a = Image.open(os.path.join(d, f)).convert('RGB'); b = Image.open(os.path.join(OUT, f'site-{sid}-{k}.png')).convert('RGB').resize(a.size)
        sa, sb = a.resize((96, 56)), b.resize((96, 56))
        diff = sum(ImageStat.Stat(ImageChops.difference(sa, sb)).mean) / 3 / 255 * 100
        pa = sorted(a.resize((64, 40)).quantize(6).convert('RGB').getcolors(), reverse=True)[:3]
        pb = sorted(b.resize((64, 40)).quantize(6).convert('RGB').getcolors(), reverse=True)[:3]
        W, H = a.size; s = 0.5; im = Image.new('RGB', (int(W * s) * 2 + 30, int(H * s) + 40), '#20232f')
        im.paste(a.resize((int(W * s), int(H * s))), (10, 30)); im.paste(b.resize((int(W * s), int(H * s))), (int(W * s) + 20, 30))
        dr = ImageDraw.Draw(im); dr.text((12, 8), f'Style {sid} {k}: app screenshot (style bot)', fill='#ffd43b'); dr.text((int(W * s) + 22, 8), f'this site (Demo Store)   coarse diff {diff:.1f}%', fill='#ffd43b')
        p = os.path.join(OUT, f'compare-{sid}-{k}.png'); im.save(p)
        res[sid][k] = {'diff_pct': round(diff, 1), 'ref': os.path.join(d, f), 'site': os.path.join(OUT, f'site-{sid}-{k}.png'), 'side_by_side': p, 'ref_colors': [c for _, c in pa], 'site_colors': [c for _, c in pb]}
json.dump(res, open(os.path.join(os.path.dirname(__file__), 'compare-results.json'), 'w'), indent=1)
for sid, v in res.items(): print(sid, {k: x['diff_pct'] for k, x in v.items()})
