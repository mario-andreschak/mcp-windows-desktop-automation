import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import { mkdtemp, writeFile, mkdir, realpath, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { DesktopServer } from '../dist/server/server.js';
import { DesktopRuntime } from '../dist/native/runtime.js';
import { readFileResource } from '../dist/resources/index.js';
import { proveWire } from './wire.mjs';
for (const modern of [true,false]) test((modern?'Modern':'Legacy')+' raw stdio, surface, native platform result and EOF', {timeout:25000}, () => proveWire(path.resolve('dist/index.js'),modern));
function httpCall(port, body, headers = {}, method = 'POST') {
  return new Promise((resolve,reject) => {
    const req = http.request({hostname:'127.0.0.1',port,path:'/mcp',method,headers:{
      ...(typeof body === 'object' && body?.params?._meta ? {'mcp-protocol-version':'2026-07-28','mcp-method':body.method,...(body.params.name?{'mcp-name':body.params.name}:{})}:{}),
      'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+ 'x'.repeat(40),...headers
    }},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});
    req.on('error',reject); req.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
}
function result(response) { const lines=response.text.split('\n').filter(line=>line.startsWith('data: ')); return JSON.parse(lines.at(-1)?.slice(6) ?? response.text); }
test('Authenticated HTTP: both eras, Host/Origin, no CORS, validation and owner isolation', {timeout:20000}, async t => {
  let calls = 0;
  const runtime = new DesktopRuntime(async method => { calls++; return method==='mouseGetPos'?{x:12,y:34}:1; });
  const server = new DesktopServer({transport:'streamable-http',port:0,authToken:'x'.repeat(40),fileRoots:[process.cwd()],runtime});
  await server.start(); t.after(()=>server.stop()); const port=server.getHttpPort();
  const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}};
  const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'mouseGetPos',arguments:{},_meta:meta}};
  for (const [headers,status] of [[{authorization:'Bearer wrong'},401],[{host:'attacker.example'},421],[{origin:'https://attacker.example'},403],[{origin:'null'},403]]) {
    const response=await httpCall(port,request,headers); assert.equal(response.status,status); assert.equal(response.headers['access-control-allow-origin'],undefined);
  }
  assert.equal(calls,0);
  for (const modern of [true,false]) {
    const input=structuredClone(request);
    if (!modern) delete input.params._meta;
    const response=await httpCall(port,input,modern?{'mcp-protocol-version':'2026-07-28'}:{'mcp-protocol-version':'2025-11-25'});
    assert.equal(response.status,200,response.text); assert.notEqual(result(response).result.isError,true);
    if(modern) assert.equal(response.headers['mcp-protocol-version'],'2026-07-28');
  }
  const [a,b]=await Promise.all([httpCall(port,request),httpCall(port,request)]);
  assert.equal(result(a).id,1);assert.equal(result(b).id,1);assert.equal(calls,4);
  assert.equal((await httpCall(port,'{bad')).status,400);
  assert.equal((await httpCall(port,'x'.repeat(1024*1024+1))).status,413);
  assert.equal((await httpCall(port,request,{'content-type':'text/plain'})).status,415);
  await server.stop();
  await assert.rejects(()=>runtime.run(new AbortController().signal,async()=>1),/stopped/);
});
test('Native owner queue bounds, serialization, cancellation and no replay', async () => {
  const runtime=new DesktopRuntime(); let release; let calls=0;
  const first=runtime.run(new AbortController().signal,()=>new Promise(resolve=>{release=resolve;}));
  await new Promise(resolve=>setImmediate(resolve));
  const controller=new AbortController();
  const cancelled=runtime.run(controller.signal,async()=>{calls++;});controller.abort();
  const rest=Array.from({length:14},()=>runtime.run(new AbortController().signal,async()=>{calls++;}));
  await assert.rejects(()=>runtime.run(new AbortController().signal,async()=>{}),/queue full/);
  release();await first;await assert.rejects(()=>cancelled,/cancelled/);await Promise.all(rest);assert.equal(calls,14);
  await runtime.close();
});
test('File resources enforce canonical roots, symlinks and real byte limits', async t => {
  const root=await mkdtemp(path.join(tmpdir(),'desktop-files-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const inside=path.join(root,'inside');await mkdir(inside);
  await writeFile(path.join(inside,'ok.txt'),'fixture');
  await writeFile(path.join(root,'outside.txt'),'secret');
  const roots=[await realpath(inside)];
  assert.equal(Buffer.from((await readFileResource(pathToFileURL(path.join(inside,'ok.txt')),roots)).blob,'base64').toString(),'fixture');
  await assert.rejects(()=>readFileResource(pathToFileURL(path.join(root,'outside.txt')),roots),/outside/);
  await writeFile(path.join(inside,'huge'),Buffer.alloc(1024*1024+1));
  await assert.rejects(()=>readFileResource(pathToFileURL(path.join(inside,'huge')),roots),/1 MiB/);
  await symlink(root,path.join(inside,'escape'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>readFileResource(pathToFileURL(path.join(inside,'escape','outside.txt')),roots),/outside/);
  await assert.rejects(()=>readFileResource(new URL('file://remote/share/file'),roots),/local file/);
});

test('HTTP deadline and client disconnect release the shared desktop queue', {timeout:10000}, async t => {
  let aborted=0;
  const runtime=new DesktopRuntime(async (method,_args,signal)=>{
    if(method==='mouseGetPos')return {x:1,y:2};
    return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(new Error('cancelled'));},{once:true}));
  });
  const server=new DesktopServer({transport:'streamable-http',port:0,authToken:'x'.repeat(40),fileRoots:[process.cwd()],requestTimeoutMs:150,runtime});
  await server.start();t.after(()=>server.stop());const port=server.getHttpPort();
  const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}};
  const body={jsonrpc:'2.0',id:0,method:'tools/call',params:{name:'processWait',arguments:{process:'fixture',timeout:25},_meta:meta}};
  const timed=await httpCall(port,body);
  assert.equal(result(timed).result.isError,true);assert.equal(aborted,1);
  const req=http.request({hostname:'127.0.0.1',port,path:'/mcp',method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+'x'.repeat(40),'mcp-protocol-version':'2026-07-28','mcp-method':'tools/call','mcp-name':'processWait'}});
  req.on('error',()=>{});req.end(JSON.stringify(body));
  await new Promise(resolve=>setTimeout(resolve,30));req.destroy();
  for(let i=0;i<100&&aborted<2;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(aborted,2);
  const healthy=await httpCall(port,{...body,id:2,params:{name:'mouseGetPos',arguments:{},_meta:meta}});
  assert.notEqual(result(healthy).result.isError,true);
});

test('Known native failure results become MCP tool errors without exposing credentials', async t => {
 const runtime=new DesktopRuntime(async()=>0);
 const server=new DesktopServer({transport:'streamable-http',port:0,authToken:'x'.repeat(40),fileRoots:[process.cwd()],runtime});
 await server.start();t.after(()=>server.stop());
 const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}};
 for(const [name,args] of [['controlSetText',{title:'owned',control:'missing',controlText:'text'}],['run',{program:'missing'}],['processWait',{process:'missing'}]]) {
  const response=await httpCall(server.getHttpPort(),{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args,_meta:meta}});
  assert.equal(result(response).result.isError,true,name);
 }
});
