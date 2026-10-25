#!/usr/bin/env python3
"""Generate truly transparent, frameless action art from each approved individual SVG.

Do not resample a contact sheet or replace content with an emoji. Keep the
recognizable icon subject; remove only its shared medallion, scenery and rim.
"""
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import cairosvg
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/action-icons/sea-v1'
OUT=ROOT/'assets/action-icons/v2'
GM=ROOT/'server-game/current/action-icons/v2'

def frameless(source, name):
    # 1–29 and 40–49 share a generated badge shell, then a distinct motif.
    badge_end=re.search(r'<!--\s*(?:Motif injected|Standalone original artwork:[\s\S]*?)\s*-->',source)
    if badge_end:
        defs_end=source.find('</defs>')
        if defs_end<0:raise ValueError('SVG has no definitions: '+name)
        head=source[:defs_end+len('</defs>')]
        motif=source[badge_end.end():]
        result=head+'\n'+motif
        result=re.sub(r'viewBox="[^"]+"','viewBox="160 160 480 480"',result,count=1)
    else:
        # 30–39 use the other shared medal template: first seven direct
        # elements after <defs> are the circular rim and ornamental jewels.
        svg=ET.fromstring(source)
        nodes=list(svg)
        definition=next((x for x in nodes if x.tag.endswith('defs')),None)
        motifs=[x for x in nodes if x is not definition]
        if len(motifs)<10:raise ValueError('Unknown medallion layout: '+name)
        if not all(motifs[i].tag.endswith(t) for i,t in enumerate(['circle','circle','circle','path','path','path','path'])):
            raise ValueError('Unexpected medallion layout: '+name)
        for decorative in motifs[:7]:svg.remove(decorative)
        svg.set('viewBox','190 180 620 620')
        result=ET.tostring(svg,encoding='unicode')
    if '<svg' not in result or '</svg>' not in result:
        # In ElementTree the root can carry an ns0 namespace.
        if not re.search(r'<(?:ns\d+:)?svg\b',result):raise ValueError('Invalid artwork root: '+name)
    return result

def main():
    manifest=json.loads((SRC/'manifest.json').read_text())
    icons=manifest['icons']
    assert len(icons)==49 and manifest['count']==49, 'Required approved 49-icon catalog'
    OUT.mkdir(parents=True,exist_ok=True)
    GM.mkdir(parents=True,exist_ok=True)
    rows=[]
    for icon in icons:
        name=icon['svg']
        original=(SRC/name).read_text()
        result=frameless(original,name)
        svgpath=OUT/name
        pngpath=OUT/icon['png']
        svgpath.write_text(result)
        cairosvg.svg2png(bytestring=result.encode(),write_to=str(pngpath),
            output_width=1024,output_height=1024)
        with Image.open(pngpath) as image:
            rgba=image.convert('RGBA')
            box=rgba.getchannel('A').getbbox()
            if box is None or box[0]<5 or box[1]<5 or box[2]>1019 or box[3]>1019:
                raise ValueError('Clipped or empty motif '+name+': '+str(box))
            if rgba.getpixel((0,0))[3] or rgba.getpixel((1023,1023))[3]:
                raise ValueError('Opaque background '+name)
            assert rgba.size==(1024,1024)
        copied=GM/icon['png']
        copied.write_bytes(pngpath.read_bytes())
        rows.append({'id':icon['id'],'png':icon['png'],'svg':name,
            'sha256_png':hashlib.sha256(pngpath.read_bytes()).hexdigest(),
            'sha256_svg':hashlib.sha256(result.encode()).hexdigest(),
            'size':[1024,1024],'transparent':True,'frameless':True})
    (OUT/'manifest.json').write_text(json.dumps({'count':len(rows),'icons':rows},indent=2)+'\n')
    print('GMWW Icon Action V2: generated',len(rows),'independent frameless artworks and PNGs')

if __name__=='__main__': main()
