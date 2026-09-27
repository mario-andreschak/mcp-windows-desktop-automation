import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export const bound = (promise, ms = 20000) => {
  let timer;
  return Promise.race([promise, new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('Acceptance deadline exceeded')), ms); })]).finally(() => clearTimeout(timer));
};
export async function proveWire(entry, modern, { executable = process.execPath, args = [entry], cwd = process.cwd() } = {}) {
  const fixture=await mkdtemp(path.join(cwd,'.mcp-wire-')); const file=path.join(fixture,'fixture.txt'); await writeFile(file,'PRIVATE_FILE_MARKER');
  const child = spawn(executable, [...args, '--verbose'], { cwd, env: { ...process.env, MCP_AUTH_TOKEN: 'STDERR_SECRET_MARKER', MCP_FILE_ROOTS: JSON.stringify([cwd]) }, stdio: ['pipe','pipe','pipe'] });
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  let buffer = '', stderr = ''; const pending = new Map();
  child.stderr.setEncoding('utf8'); child.stderr.on('data', data => stderr += data);
  child.stdout.setEncoding('utf8'); child.stdout.on('data', data => {
    buffer += data; assert.ok(buffer.length <= 16 * 1024 * 1024);
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const message = JSON.parse(buffer.slice(0,index)); buffer = buffer.slice(index + 1);
      if (Object.hasOwn(message,'id')) { pending.get(message.id)?.(message); pending.delete(message.id); }
    }
  });
  const meta = modern ? { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } : undefined;
  const request = (id, method, params = {}) => bound(new Promise(resolve => { pending.set(id,resolve); child.stdin.write(JSON.stringify({ jsonrpc:'2.0',id,method,params:{ ...params, ...(meta ? {_meta:meta}: {}) }})+'\n'); })).catch(error => { error.message += ' at request '+id+' '+method; throw error; });
  try {
    const hello = modern ? await request(10,'server/discover') : await request(10,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'artifact-test',version:'1'}});
    assert.ok(hello.result, JSON.stringify(hello));
    if (!modern) { assert.equal(hello.result.protocolVersion,'2025-11-25'); child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n'); }
    const tools = (await request(11,'tools/list')).result;
    assert.equal(tools.tools.length,51);
    assert.ok(tools.tools.some(tool => tool.name === 'runAsWait'));
    assert.ok(tools.tools.some(tool => tool.name === 'takeScreenshot'));
    if (modern) { assert.equal(tools.ttlMs,0); assert.equal(tools.cacheScope,'private'); }
    assert.equal((await request(12,'prompts/list')).result.prompts.length,7);
    assert.ok((await request(13,'resources/list')).result.resources.some(resource => resource.uri === 'screenshot://desktop'));
    assert.equal((await request(14,'tools/call',{name:'missing',arguments:{}})).error.code,-32602);
    assert.equal((await request(15,'tools/call',{name:'mouseClick',arguments:{clicks:1000000}})).result.isError,true);
    const read=(await request(20,'resources/read',{uri:pathToFileURL(file).href}));
    assert.ok(read.result,JSON.stringify(read));
    assert.equal(Buffer.from(read.result.contents[0].blob,'base64').toString(),'PRIVATE_FILE_MARKER');
    assert.equal((await request(21,'tools/call',{name:'processWait',arguments:{process:'fixture',timeout:0.1}})).result.isError,true);
    const result = (await request(16,'tools/call',{name:'mouseGetPos',arguments:{}})).result;
    if (process.platform === 'win32') { assert.notEqual(result.isError,true,JSON.stringify(result)); assert.match(result.content[0].text,/position/i); }
    else { assert.equal(result.isError,true); assert.match(result.content[0].text,/Windows x64/); }
    if (modern) assert.equal(result.resultType,'complete');
    const prompt = await request(17,'prompts/get',{name:'findWindow',arguments:{windowTitle:'PRIVATE_TITLE_MARKER',action:'activate'}});
    assert.match(prompt.result.messages[0].content.text,/PRIVATE_TITLE_MARKER/);
    if (process.platform === 'win32') {
      const image=(await request(19,'tools/call',{name:'takeScreenshot',arguments:{target:'region',x:0,y:0,width:100,height:80}})).result;
      assert.notEqual(image.isError,true,JSON.stringify(image));assert.equal(image.content[0].mimeType,'image/png');
      const png=Buffer.from(image.content[0].data,'base64');assert.equal(png.readUInt32BE(16),100);assert.equal(png.readUInt32BE(20),80);
      const wait = request(0,'tools/call',{name:'processWait',arguments:{process:'MCP_never_exists_79210.exe',timeout:25}});
      await new Promise(resolve => setTimeout(resolve,150));
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:0,...(meta?{_meta:meta}:{})}})+'\n');
      assert.equal((await wait).result.isError,true);
      assert.notEqual((await request(18,'tools/call',{name:'mouseGetPos',arguments:{}})).result.isError,true);
    }
    child.stdin.end();
    assert.deepEqual(await bound(closed,5000),{code:0,signal:null});
    assert.equal(buffer,'');
    assert.doesNotMatch(stderr,/STDERR_SECRET_MARKER|PRIVATE_TITLE_MARKER|PRIVATE_FILE_MARKER/);
  } finally { child.kill('SIGKILL'); await rm(fixture,{recursive:true,force:true}); }
}
