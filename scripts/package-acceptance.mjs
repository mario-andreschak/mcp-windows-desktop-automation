import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { proveWire } from '../tests/wire.mjs';
const exec=promisify(execFile);
const npm=(args,options={})=>exec(process.execPath,[process.env.npm_execpath,...args],{...options,maxBuffer:10*1024*1024});
const temp=await mkdtemp(path.join(tmpdir(),'desktop-package-'));
try {
 const packed=await npm(['pack','--json','--pack-destination',temp]);
 const manifest=JSON.parse(packed.stdout.slice(packed.stdout.indexOf('[')))[0];
 for(const file of ['dist/index.js','dist/native/worker.js','dist/native/capture.ps1']) assert.ok(manifest.files.some(entry=>entry.path===file));
 assert.ok(!manifest.files.some(entry=>entry.path.startsWith('tests/')||entry.path.includes('.env')));
 const consumer=path.join(temp,'consumer');await mkdir(consumer);
 await writeFile(path.join(consumer,'package.json'),'{"private":true,"type":"module"}');
 await npm(['install','--omit=dev','--ignore-scripts',path.join(temp,manifest.filename)],{cwd:consumer});
 const installed=path.join(consumer,'node_modules','mcp-windows-desktop-automation');
 const pkg=JSON.parse(await readFile(path.join(installed,'package.json'),'utf8'));
 const entry=path.join(installed,pkg.bin['mcp-windows-desktop-automation']);
 for(const modern of [true,false]) {
  // POSIX executes the installed bin shim; Windows executes exactly its declared Node entry.
  await proveWire(entry,modern,process.platform==='win32'?{cwd:consumer}:{cwd:consumer,executable:path.join(consumer,'node_modules','.bin','mcp-windows-desktop-automation'),args:[]});
  console.log((modern?'Modern':'Legacy')+' installed artifact: actual tools, prompts, stdout and EOF passed'+(process.platform==='win32'?', native call and ID 0 cancellation':' with truthful unsupported-native response'));
 }
} finally { await rm(temp,{recursive:true,force:true}); }
