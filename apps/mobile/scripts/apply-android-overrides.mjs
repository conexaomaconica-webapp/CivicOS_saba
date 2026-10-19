import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(mobileRoot, 'android-overrides');
const destination = path.join(mobileRoot, 'android');

await access(destination, constants.W_OK);
await cp(source, destination, { recursive: true, force: true });
console.log('Overrides Android aplicados.');

