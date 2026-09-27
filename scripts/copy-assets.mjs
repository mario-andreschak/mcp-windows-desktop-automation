import { copyFile } from 'node:fs/promises';
await copyFile('src/native/capture.ps1', 'dist/native/capture.ps1');
