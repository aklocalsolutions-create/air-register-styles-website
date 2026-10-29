# Contact sheet of the register screenshot for every style in demo/demo-styles-config.js
import re, os
from PIL import Image, ImageDraw, ImageFont
R = os.path.dirname(os.path.abspath(__file__)) + '/..'
cfg = open(R + '/demo/demo-styles-config.js').read()
styles = re.findall(r"id: '(\d+)', slug: '([^']+)',\s*name: '([^']+)'.*?stage: '(\w+)'", cfg)
TW, TH, COLS, PAD, LAB = 480, 300, 4, 16, 34
rows = (len(styles) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (TW + PAD) + PAD, 70 + rows * (TH + LAB + PAD) + PAD), '#14161c')
d = ImageDraw.Draw(sheet)
def font(sz, bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
d.text((PAD, 20), 'Demo Store - register styles (DEMO - nothing is real)', fill='#ffd54a', font=font(26, True))
for i, (sid, slug, name, stage) in enumerate(styles):
    x = PAD + (i % COLS) * (TW + PAD); y = 70 + (i // COLS) * (TH + LAB + PAD)
    p = R + '/screenshots/register-%s-%s.png' % (sid, slug)
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); im.thumbnail((TW, TH)); sheet.paste(im, (x, y + LAB))
    else:
        d.rectangle([x, y + LAB, x + TW, y + LAB + TH], outline='#c33'); d.text((x + 10, y + LAB + 10), 'missing', fill='#c33', font=font(16))
    d.text((x, y + 6), 'Style %s %s' % (sid, name), fill='#fff', font=font(18, True))
    d.text((x + TW - 80, y + 8), stage.capitalize(), fill='#5fd38d' if stage == 'tested' else '#f0b24a', font=font(15))
sheet.save(R + '/screenshots/contact-sheet.png'); print('contact sheet', sheet.size, len(styles), 'styles')
