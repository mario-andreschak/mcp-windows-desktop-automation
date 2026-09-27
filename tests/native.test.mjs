import test from 'node:test';
import { PNG } from 'pngjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DesktopRuntime, autoIt } from '../dist/native/runtime.js';
import { screenshot } from '../dist/native/screenshot.js';
import { bound } from './wire.mjs';
test('Actual Windows owned form: native FFI, Unicode, bounded text, PNG, cancellation and helper cleanup',
  {skip: process.platform !== 'win32' ? 'Native Windows coverage is required in the Windows CI jobs' : false, timeout:60000}, async t => {
    assert.equal(process.arch,'x64');
    const temp=await mkdtemp(path.join(tmpdir(),'desktop-native-'));
    const title='MCP owned fixture '+Date.now(), stopFile=path.join(temp,'stop');
    const fixture=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('tests/fixture.ps1')],{stdio:['pipe','pipe','pipe'],windowsHide:false});
    let controlHandle; let visible=false; let stderr='';fixture.stderr.on('data',data=>stderr+=data);
    const exited=new Promise(resolve=>fixture.once('close',resolve));
    const ready=bound(new Promise((resolve,reject)=>{fixture.stdout.on('data',data=>{const match=/READY ([0-9]+)/.exec(data.toString());if(match){controlHandle=Number(match[1]);visible=data.toString().includes('VISIBLE=True');resolve();}});fixture.once('error',reject);fixture.once('exit',code=>reject(new Error('Fixture exited '+code+': '+stderr)));}),15000);
    fixture.stdin.end(JSON.stringify({title,stopFile})+'\n');
    const runtime=new DesktopRuntime();
    t.after(async()=>{await runtime.close();await writeFile(stopFile,'stop');await bound(exited,5000).catch(()=>fixture.kill());await rm(temp,{recursive:true,force:true});});
    await ready; assert.ok(visible,'The owned native fixture must have WS_VISIBLE before capturing it'); assert.ok(controlHandle); const control='[NAME:McpFixtureText]';
    const operation=fn=>runtime.run(AbortSignal.timeout(20000),fn);
    assert.equal(await operation(()=>autoIt.winExists(title,undefined)),1);
    assert.equal(await operation(()=>autoIt.winGetTitle(title)),title);
    assert.equal(await operation(async()=>autoIt.controlGetHandle(await autoIt.winGetHandle(title),control)),controlHandle,'Resolve the owned WinForms control by its documented NAME selector');
    const text='Unicode fixture '+String.fromCodePoint(0x1f642)+' ä';
    assert.equal(await operation(()=>autoIt.controlSetText(title,undefined,control,text)),1);
    assert.equal(await operation(()=>autoIt.controlGetText(title,'',control)),text);
    await assert.rejects(()=>operation(()=>autoIt.controlGetText(title,'',control,4)),/failed/);
    const oldClipboard=await operation(()=>autoIt.clipGet());
    try {await operation(()=>autoIt.clipPut(text));assert.equal(await operation(()=>autoIt.clipGet()),text);}
    finally {await operation(()=>autoIt.clipPut(oldClipboard));}
    const position=await operation(()=>autoIt.winGetPos(title));
    for(const target of ['window','region']) {
      const encoded=await operation(()=>screenshot(target==='window'?{target,windowTitle:title}:{target,x:position.left+40,y:position.top+100,width:100,height:60}));
      const png=Buffer.from(encoded,'base64');
      assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
      assert.ok(png.length>100);
      const decoded=PNG.sync.read(png); let blue=0; const colors=new Map();
      for(let i=0;i<decoded.data.length;i+=4) {
        const rgb=[...decoded.data.subarray(i,i+3)]; const key=rgb.join(','); colors.set(key,(colors.get(key)??0)+1);
        // Remote Windows displays may quantize the known fixture color to 16-bit RGB.
        if(Math.abs(rgb[0]-100)<=8 && Math.abs(rgb[1]-149)<=8 && Math.abs(rgb[2]-237)<=8) blue++;
      }
      assert.ok(blue>100,'Captured owned '+target+' CornflowerBlue pixels; dominant fixture colors '+JSON.stringify([...colors].sort((a,b)=>b[1]-a[1]).slice(0,5)));
      if(target==='region'){assert.equal(png.readUInt32BE(16),100);assert.equal(png.readUInt32BE(20),60);}
      else {assert.ok(png.readUInt32BE(16)>=300);assert.ok(png.readUInt32BE(20)>=180);}
    }
    const controller=new AbortController();
    const wait=runtime.run(controller.signal,()=>autoIt.processWait('MCP_missing_owned_test_82172.exe',25));
    await new Promise(resolve=>setTimeout(resolve,100));const pid=runtime.workerPid;assert.ok(pid);controller.abort();
    await assert.rejects(()=>wait,/cancelled/);
    assert.equal(await operation(()=>autoIt.winExists(title,undefined)),1);
    const newPid=runtime.workerPid;assert.notEqual(newPid,pid);
    await runtime.close();
    await new Promise(resolve=>setTimeout(resolve,200));
    assert.throws(()=>process.kill(newPid,0));
    assert.throws(()=>process.kill(pid,0));
  });
