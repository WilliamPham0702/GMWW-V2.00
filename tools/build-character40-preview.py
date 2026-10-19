from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
workspace=root.parent
out=root/'prototype/character40'
order=json.loads((workspace/'atlas-order.json').read_text())
# Explicit visual matching to the accepted originals; never infer IDs from timestamps.
mapping=[13,25,2,1,4,5,6,8,7,9,10,11,12,32,20,33,16,26,14,23,19,24,27,21,31,17,28,22,35,29,18,30,41,37,38,34,36,40,42,39]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def cuts(alpha,n,axis):
    counts=(alpha>30).sum(axis=axis); length=len(counts); result=[0]
    for k in range(1,n):
        a=round(length*(k-.24)/n);b=round(length*(k+.24)/n)
        result.append(a+int(np.argmin(counts[a:b])))
    return result+[length]
entries=[]
for i,index in enumerate(mapping,1):
    ident=f'character-{i:02}'
    original=workspace/'restored-originals/GMWW-V2-ASSETS/CHARACTER'/f'GMWW-CHAR-{i:03}.png'
    source=workspace/'restored-atlases'/order[index]['name']
    for folder,path in [('originals',original),('atlases',source)]:
        dest=out/folder/f'{ident}.webp';dest.parent.mkdir(parents=True,exist_ok=True)
        Image.open(path).save(dest,'WEBP',quality=90,method=1)
    im=Image.open(source).convert('RGBA');a=np.array(im)[:,:,3]
    ys=cuts(a,6,1);frames=[]
    for r in range(6):
        xs=cuts(a[ys[r]:ys[r+1]],8,0)
        for c in range(8): frames.append([xs[c],ys[r],xs[c+1]-xs[c],ys[r+1]-ys[r]])
    entries.append({'id':ident,'original':f'originals/{ident}.webp','atlas':f'atlases/{ident}.webp','frames':frames,'sourceSHA256':sha(original),'atlasSourceSHA256':sha(source),'atlasLibraryId':order[index]['library_file_id'],'originalSHA256':sha(out/'originals'/f'{ident}.webp'),'atlasSHA256':sha(out/'atlases'/f'{ident}.webp'),'width':im.width,'height':im.height,'review':'pending-motion-acceptance'})
(out/'catalog.json').write_text(json.dumps({'mode':'preview-only','characters':entries},ensure_ascii=False,indent=2))
print({'characters':len(entries),'bytes':sum(p.stat().st_size for p in out.rglob('*.webp'))})
