// Read-only GMWW Production monitoring. No room, member, GM or game mutations.
export const DEFAULT_ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';

export function assertGmwwHealth(health,deep,manifest,sync){
  if(health?.ok!==true||health?.project!=='GMWW-V2.00'||!/^V\\d+\\.\\d+$/.test(String(health.version||'')))
    throw new Error('Worker health is not a valid GMWW release');
  if(deep?.ok!==true||deep?.checks?.memberStorage!=='ready')
    throw new Error('Durable Object storage readiness failed');
  if(String(deep.version)!==String(health.version))
    throw new Error('Deep health and server versions differ');
  if(manifest?.releaseVersion!==String(health.version).replace(/^V/,''))
    throw new Error('Update manifest is not aligned with deployed Worker');
  if(sync?.ok!==true)throw new Error('Player Web sync endpoint is not healthy');
  return {version:health.version,storage:'ready',update:'aligned',webSync:'ready'};
}

async function readGet(base,path,fetchFn){
  const url=new URL(path,base);
  url.searchParams.set('monitor',String(Date.now()));
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetchFn(url.toString(),{method:'GET',cache:'no-store',headers:{accept:'*/*'},signal:AbortSignal.timeout(12000)});
      if(response.ok)return response;
      last=new Error(path+' returned HTTP '+response.status);
      if(response.status>=400&&response.status<500)break;
    }catch(e){last=e}
    if(attempt<3)await new Promise(r=>setTimeout(r,750));
  }
  throw new Error('Production probe '+path+' failed: '+String(last?.message||last));
}

export async function probeGmwwProduction(origin=DEFAULT_ORIGIN,fetchFn=fetch){
  const base=new URL(origin);
  if(base.protocol!=='https:'&&base.hostname!=='localhost'&&base.hostname!=='127.0.0.1')
    throw new Error('Production monitoring requires HTTPS');
  const paths=['/api/health','/api/health/deep','/api/update/manifest','/api/web-sync'];
  const responses=await Promise.all(paths.map(p=>readGet(base,p,fetchFn)));
  const values=await Promise.all(responses.map(r=>r.json()));
  const summary=assertGmwwHealth(...values);
  const page=await readGet(base,'/',fetchFn);
  if(!(await page.text()).includes('GMWW PLAYER'))throw new Error('Player Web entry is missing its expected signature');
  const leaf=await readGet(base,'/village/seat-leaf.webp',fetchFn);
  if(!String(leaf.headers.get('content-type')||'').includes('image/webp'))throw new Error('Seat leaf does not serve a WebP image');
  const wolf=await readGet(base,'/gm/gm-white-wolf.webp',fetchFn);
  if(!String(wolf.headers.get('content-type')||'').includes('image/webp'))throw new Error('GM wolf artwork does not serve WebP');
  return {...summary,playerWeb:'ready',seatLeaf:'ready',gmArtwork:'ready'};
}

if(process.argv.includes('--run')){
  probeGmwwProduction(process.env.GMWW_PRODUCTION_BASE||DEFAULT_ORIGIN)
    .then(summary=>{console.log('GMWW PRODUCTION MONITOR: PASS',JSON.stringify(summary))})
    .catch(error=>{console.error('GMWW PRODUCTION MONITOR: FAIL:',error.message);process.exitCode=1});
}
