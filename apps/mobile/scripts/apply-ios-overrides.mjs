import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(mobileRoot, 'ios-overrides');
const destination = path.join(mobileRoot, 'ios');

try {
  await access(destination, constants.W_OK);
  await cp(source, destination, { recursive: true, force: true });
  console.log('Overrides iOS aplicados.');
} catch {
  // Se a pasta ios ainda não existir no ambiente, ignora silenciosamente
  console.log('Pasta ios não encontrada ou sem permissão de escrita, ignorando overrides.');
}

