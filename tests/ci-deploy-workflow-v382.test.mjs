import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

test('Production workflow Bash syntax is valid after adding V3.82 OTA verification',()=>{
  const workflow=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  const head='      - name: Verify Production\n        shell: bash\n        run: |\n';
  assert.equal(workflow.split(head).length,2,'Verify Production block must be unique');
  const after=workflow.split(head)[1];
  const lines=after.split('\n');
  const shell=[];
  for(const line of lines){
    // YAML's literal block removes the base indentation of 10 spaces.
    if(line&&line.trim()&&!line.startsWith('          '))break;
    shell.push(line.startsWith('          ')?line.slice(10):'');
  }
  const script=shell.join('\n');
  assert.ok(script.length>500);
  assert.match(script,/if \[ "\$EXPECTED" = "3\.82" \]; then/);
  assert.match(script,/gmww-ai-support\.js/);
  assert.match(script,/gmww-ai-support\.css/);
  assert.match(script,/sha256sum|shasum -a 256/);
  assert.match(script,/AI_AUTH_STATUS/);
  assert.doesNotMatch(script,/while IFS=\s*#/);
  const result=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
