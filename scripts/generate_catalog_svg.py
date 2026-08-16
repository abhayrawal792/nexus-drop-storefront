from pathlib import Path

OUT = Path('/home/ubuntu/webdev-static-assets/nexus-drop-catalog')
OUT.mkdir(parents=True, exist_ok=True)

products = {
  'cuban-chain': ('jewelry', 0), 'signet-ring': ('jewelry', 1), 'iced-tennis-bracelet': ('jewelry', 2), 'razor-pendant': ('jewelry', 3), 'curb-link-bracelet': ('jewelry', 4), 'steel-ear-cuff': ('jewelry', 5),
  'chrono-watch': ('watches', 0), 'minimal-square-watch': ('watches', 1), 'blackout-field-watch': ('watches', 2), 'digital-sport-watch': ('watches', 3), 'steel-mesh-watch': ('watches', 4), 'skeleton-dial-watch': ('watches', 5),
  'cyberpunk-sunglasses': ('eyewear', 0), 'smoke-oval-sunglasses': ('eyewear', 1), 'polarized-sport-wraps': ('eyewear', 2), 'clear-frame-glasses': ('eyewear', 3), 'matte-black-wayfarers': ('eyewear', 4), 'chrome-shield-sunglasses': ('eyewear', 5),
  'sling-bag': ('bags', 0), 'tech-utility-crossbody': ('bags', 1), 'mini-messenger-bag': ('bags', 2), 'black-roll-top-backpack': ('bags', 3), 'canvas-tote-bag': ('bags', 4), 'compact-waist-pack': ('bags', 5),
}

def svg(slug, category, variant):
    uid = slug.replace('-', '')
    bg = '#0b121a'
    cyan = '#22d3ee'
    steel = '#9ca3af' if variant % 2 else '#d1d5db'
    dark = '#111827'
    if category == 'jewelry':
        shapes = [
          '<ellipse cx="512" cy="520" rx="270" ry="160" fill="none" stroke="%s" stroke-width="38"/><ellipse cx="512" cy="520" rx="270" ry="160" fill="none" stroke="#374151" stroke-width="8" stroke-dasharray="30 15"/>' % steel,
          '<path d="M405 435h215v120H405z" rx="25" fill="%s" stroke="%s" stroke-width="18"/><path d="M445 435v-28c0-64 134-64 134 0v28" fill="none" stroke="%s" stroke-width="22"/>' % (dark, steel, steel),
          '<ellipse cx="512" cy="520" rx="245" ry="115" fill="none" stroke="%s" stroke-width="28" stroke-dasharray="4 18"/><circle cx="512" cy="520" r="10" fill="%s"/>' % (steel, cyan),
          '<path d="M512 265l108 190-108 188-108-188z" fill="#303744" stroke="%s" stroke-width="14"/><path d="M512 265v378" stroke="%s" stroke-width="8"/><path d="M430 455h164" stroke="%s" stroke-width="8"/>' % (steel, cyan, steel),
          '<path d="M260 500c90-80 150-125 252-125s162 45 252 125c-90 80-150 125-252 125S350 580 260 500z" fill="none" stroke="%s" stroke-width="30" stroke-dasharray="56 14"/>' % steel,
          '<path d="M380 430c-30 110 25 205 132 190 107-15 162-110 132-190" fill="none" stroke="%s" stroke-width="34"/><circle cx="380" cy="430" r="12" fill="%s"/><circle cx="644" cy="430" r="12" fill="%s"/>' % (steel, cyan, cyan),
        ][variant]
    elif category == 'watches':
        roundcase = variant != 1
        case = '<circle cx="512" cy="520" r="174"/>' if roundcase else '<rect x="338" y="346" width="348" height="348" rx="58"/>'
        face = '<circle cx="512" cy="520" r="145"/>' if roundcase else '<rect x="365" y="373" width="294" height="294" rx="40"/>'
        details = '<path d="M512 520l72-56M512 520v-80" stroke="%s" stroke-width="14" stroke-linecap="round"/><circle cx="512" cy="520" r="12" fill="%s"/>' % (steel, cyan)
        if variant == 3: details = '<rect x="424" y="472" width="176" height="96" rx="14" fill="#020617" stroke="%s" stroke-width="8"/><path d="M450 505h90M450 535h125" stroke="%s" stroke-width="8"/>' % (cyan, steel)
        if variant == 5: details = '<circle cx="512" cy="520" r="80" fill="none" stroke="%s" stroke-width="10"/><path d="M512 440v160M432 520h160M455 463l114 114M569 463L455 577" stroke="%s" stroke-width="7"/>' % (cyan, steel)
        shapes = '<path d="M446 215h132l22 130H424zM424 695h176l-22 130H446z" fill="#111827" stroke="#374151" stroke-width="12"/><g fill="#0b0f16" stroke="%s" stroke-width="15">%s</g><g fill="#111827" stroke="#374151" stroke-width="10">%s</g>%s' % (steel, case, face, details)
    elif category == 'eyewear':
        styles = [
          '<path d="M180 430h220l42 120H262c-45 0-72-22-82-120zM620 430h220c-10 98-37 120-82 120H558zM442 470h140" fill="#111827" stroke="%s" stroke-width="18"/>' % steel,
          '<ellipse cx="350" cy="510" rx="130" ry="88" fill="#1f2937" stroke="%s" stroke-width="18"/><ellipse cx="674" cy="510" rx="130" ry="88" fill="#1f2937" stroke="%s" stroke-width="18"/><path d="M480 505h64" stroke="%s" stroke-width="20"/>' % (steel, steel, cyan),
          '<path d="M154 450c80-60 200-60 286 20l-20 100H270c-70 0-104-40-116-120zM870 450c-80-60-200-60-286 20l20 100h150c70 0 104-40 116-120zM444 475h136" fill="#0f172a" stroke="%s" stroke-width="18"/>' % steel,
          '<rect x="190" y="430" width="225" height="150" rx="70" fill="none" stroke="%s" stroke-width="18"/><rect x="609" y="430" width="225" height="150" rx="70" fill="none" stroke="%s" stroke-width="18"/><path d="M415 490h194" stroke="%s" stroke-width="14"/>' % (steel, steel, cyan),
          '<path d="M180 430h240l28 142H270c-55 0-78-48-90-142zM604 430h240c-12 94-35 142-90 142H576zM448 462h128" fill="#111827" stroke="%s" stroke-width="20"/>' % steel,
          '<path d="M135 430c95-70 245-55 355 30 110-85 260-100 355-30l-38 145H620l-108-98-108 98H173z" fill="#1f2937" stroke="%s" stroke-width="18"/>' % cyan,
        ]
        shapes = styles[variant]
    else:
        styles = [
          '<path d="M290 420h445l-40 260H330z" fill="#111827" stroke="%s" stroke-width="16"/><path d="M330 420l55-125h170l55 125" fill="none" stroke="%s" stroke-width="28"/><path d="M350 485h250" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
          '<path d="M285 360h410l62 360H245z" fill="#111827" stroke="%s" stroke-width="18"/><path d="M340 360c0-170 300-170 300 0" fill="none" stroke="%s" stroke-width="30"/><path d="M330 520h310M360 600h200" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
          '<path d="M250 380h525v310H250z" fill="#1f2937" stroke="%s" stroke-width="18"/><path d="M250 380l85-85h355l85 85" fill="#111827" stroke="%s" stroke-width="18"/><path d="M320 445h380M320 510h260" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
          '<path d="M302 350h420l-20 390H322z" fill="#111827" stroke="%s" stroke-width="18"/><path d="M385 350v-80h230v80" fill="none" stroke="%s" stroke-width="24"/><path d="M390 430h240M390 500h180" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
          '<path d="M260 380h505v330H260z" fill="#111827" stroke="%s" stroke-width="18"/><path d="M340 380v-50h340v50" fill="none" stroke="%s" stroke-width="22"/><path d="M310 455h290" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
          '<path d="M250 450c90-100 430-100 520 0v210c-90 90-430 90-520 0z" fill="#111827" stroke="%s" stroke-width="18"/><path d="M290 450l-95-110M734 450l95-110" stroke="%s" stroke-width="24"/><path d="M320 520h260" stroke="%s" stroke-width="12"/>' % (steel, steel, cyan),
        ]
        shapes = styles[variant]
    content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><radialGradient id="g{uid}" cx="72%" cy="25%"><stop offset="0" stop-color="#164e63" stop-opacity=".75"/><stop offset=".45" stop-color="{bg}" stop-opacity="0"/></radialGradient><filter id="s{uid}"><feGaussianBlur stdDeviation="16"/></filter></defs><rect width="1024" height="1024" fill="{bg}"/><rect width="1024" height="1024" fill="url(#g{uid})"/><ellipse cx="512" cy="760" rx="310" ry="35" fill="#000" opacity=".7" filter="url(#s{uid})"/>{shapes}</svg>'''
    (OUT / f'{slug}.svg').write_text(content)

for slug, (category, variant) in products.items():
    svg(slug, category, variant)
print(f'generated {len(products)} SVG catalog visuals in {OUT}')
