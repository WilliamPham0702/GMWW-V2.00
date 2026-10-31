import {ROOM_SNAPSHOT_SCHEMA} from './room-adapter.mjs';
#!/usr/bin/env node
/**
 * GMWW Oracle STAGING bootstrap. This is NOT a game server yet.
 * Never advertises readiness, stores game data or proxies Production.
 */
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

function json(res,status,body) {
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(JSON.stringify(body));
}
const unavailable={
  service:'gmww-oracle-staging',
  environment:'STAGING',
  ready:false,
  reason:'Room persistence, schema migration, login and realtime compatibility not certified',
  accepts_game_traffic:false
};
export function makeStagingServer() {
  const server=createServer({requestTimeout:15000,maxHeaderSize:8192},(req,res)=>{
    const path=(req.url||'').split('?')[0];
    if(req.method==='GET'&&path==='/healthz') {
      json(res,200,{service:'gmww-oracle-staging',environment:'STAGING',alive:true,ready:false,adapterSchema:ROOM_SNAPSHOT_SCHEMA});
      return;
    }
    if(req.method==='GET'&&path==='/readyz') {json(res,503,unavailable);return;}
    json(res,503,unavailable);
  });
  server.on('upgrade',(_req,socket)=>{
    socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n');
  });
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.env.GMWW_ORACLE_STAGING!=='1'){
    console.error('Oracle STAGING only. Set GMWW_ORACLE_STAGING=1 explicitly.');
    process.exit(2);
  }
  const host=process.env.GMWW_ORACLE_HOST||'127.0.0.1';
  if(host!=='127.0.0.1'&&host!=='::1'&&process.env.GMWW_ORACLE_PUBLIC_BIND!=='1'){
    console.error('Refusing public bind without GMWW_ORACLE_PUBLIC_BIND=1 and operator TLS/reverse-proxy review.');
    process.exit(2);
  }
  const port=Number(process.env.GMWW_ORACLE_PORT||8788);
  if(!Number.isInteger(port)||port<1||port>65535) {
    console.error('Invalid GMWW_ORACLE_PORT');process.exit(2);
  }
  const server=makeStagingServer();
  server.listen(port,host,()=>console.log('GMWW Oracle STAGING liveness only on '+host+':'+port));
}
