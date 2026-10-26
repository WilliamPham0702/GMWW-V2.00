"""Size individually approved/generated artwork without redrawing it."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/action-icons/v3'
GM = ROOT / 'server-game/current/action-icons/v3'
sha = lambda b: hashlib.sha256(b).hexdigest()

def verify():
    manifest = json.loads((OUT / 'manifest.json').read_text())
    assert len(manifest['icons']) == 50
    assert len({x['sha256'] for x in manifest['icons']}) == 50
    for x in manifest['icons']:
        data = (OUT / x['file']).read_bytes()
        assert sha(data) == x['sha256'] and data == (GM / x['file']).read_bytes()
        assert len(data) < 250000
        im = Image.open(OUT / x['file'])
        assert im.size == (512,512) and im.mode == 'RGBA'
        alpha = im.getchannel('A')
        assert alpha.getextrema()[0] == 0 and alpha.getextrema()[1] >= 250
        box = alpha.getbbox()
        assert min(box[:2]) >= 12 and max(box[2:]) <= 500
    print('PASS: 50 distinct 512px transparent WebP images, safe margins, identical Worker/OTA copies and SHA-256')

def build(source_file):
    sources = json.loads(Path(source_file).read_text())
    icons = json.loads((ROOT / 'assets/action-icons/sea-v1/manifest.json').read_text())['icons']
    icons.append({'id':'yeu-tinh-xoay','png':'50_yeu_tinh_xoay.png'})
    OUT.mkdir(parents=True, exist_ok=True); GM.mkdir(parents=True, exist_ok=True)
    rows=[]
    for n, icon in enumerate(icons,1):
        src = Path(sources[str(n)]); raw=src.read_bytes()
        im=Image.open(src).convert('RGBA'); size=im.size
        assert im.getchannel('A').getextrema()[0] == 0 and im.getchannel('A').getextrema()[1] >= 250, src
        im.thumbnail((480,480),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(512,512)); canvas.alpha_composite(im,((512-im.width)//2,(512-im.height)//2))
        name=Path(icon['png']).stem+'.webp'
        canvas.save(OUT/name,'WEBP',quality=95,method=6,exact=True)
        data=(OUT/name).read_bytes(); (GM/name).write_bytes(data)
        rows.append(dict(number=n,id=icon['id'],file=name,sha256=sha(data),bytes=len(data),size=512,transparent=True,sourceFile=src.name,sourceSize=list(size),sourceSha256=sha(raw),approval='user-approved-2026-10-26' if n<=19 else 'authorized-completion-2026-10-26'))
    (OUT/'manifest.json').write_text(json.dumps(dict(schema=1,count=50,catalogCount=49,icons=rows),indent=2,ensure_ascii=False)+'\n')
    verify()

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--sources');p.add_argument('--verify',action='store_true');a=p.parse_args()
    if a.verify: verify()
    elif a.sources: build(a.sources)
    else: p.error('Specify --sources or --verify')
