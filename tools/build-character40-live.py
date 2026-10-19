from pathlib import Path
import json,shutil

root=Path(__file__).resolve().parents[1]
src=root/'prototype/character40';out=root/'assets/characters/gmww40';out.mkdir(parents=True,exist_ok=True)
catalog=json.loads((src/'catalog.json').read_text())
for folder in ['originals','atlases']:shutil.copytree(src/folder,out/folder,dirs_exist_ok=True)
(out/'catalog.json').write_text(json.dumps(catalog,separators=(',',':')))
motion=(src/'shared-motion.mjs').read_text().replace('export ','')
adapter=(root/'server-game/shared/character40-adapter.js').read_text()
data=json.dumps({c['id']:c for c in catalog['characters']},separators=(',',':'))
bundle="(function(g){'use strict';\n"+motion+'\nconst CATALOG='+data+';\n'+adapter+'\n})(globalThis);\n'
(out/'runtime.js').write_text(bundle)
(root/'server-game/current/gmww-shared-motion.js').write_text(bundle)
