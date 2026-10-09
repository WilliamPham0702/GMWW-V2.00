import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Cloudflare PR preview declares its own room namespace without linking production',()=>{
 const cfg=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
 assert.deepEqual(cfg.previews.durable_objects.bindings,[{name:'ROOMS',class_name:'RoomDurableObject'}]);
 assert.deepEqual(cfg.durable_objects.bindings,[{name:'ROOMS',class_name:'RoomDurableObject'}]);
 assert.equal(cfg.exports.RoomDurableObject.storage,'sqlite');
 assert.equal(cfg.exports.MemberDurableObject.state,'deleted');
});
