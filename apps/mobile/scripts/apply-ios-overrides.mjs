import { cp, access, readFile, writeFile } from 'node:fs/promises';
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

  // Ajuste dinâmico de APNs environment se solicitado por variável de ambiente
  const destinationEntitlements = path.join(destination, 'App', 'App', 'App.entitlements');
  const targetApnsEnv = process.env.APNS_ENVIRONMENT;
  if (targetApnsEnv && ['development', 'production'].includes(targetApnsEnv)) {
    try {
      let entContent = await readFile(destinationEntitlements, 'utf8');
      entContent = entContent.replace(
        /<string>(development|production)<\/string>/,
        `<string>${targetApnsEnv}</string>`
      );
      await writeFile(destinationEntitlements, entContent, 'utf8');
      console.log(`Ambiente APNs configurado para: ${targetApnsEnv}`);
    } catch (err) {
      console.warn('Aviso ao ajustar APNS_ENVIRONMENT no entitlements:', err.message);
    }
  }

  // Configurações em project.pbxproj se existir
  const pbxprojPath = path.join(destination, 'App', 'App.xcodeproj', 'project.pbxproj');
  try {
    let pbxproj = await readFile(pbxprojPath, 'utf8');
    let changed = false;

    // Injeta CODE_SIGN_ENTITLEMENTS se ainda não estiver configurado
    if (!pbxproj.includes('CODE_SIGN_ENTITLEMENTS')) {
      pbxproj = pbxproj.replaceAll(
        'INFOPLIST_FILE = App/Info.plist;',
        'INFOPLIST_FILE = App/Info.plist;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;'
      );
      changed = true;
    }

    // Sincroniza MARKETING_VERSION a partir do package.json
    const pkgPath = path.join(mobileRoot, 'package.json');
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      if (pkg.version) {
        pbxproj = pbxproj.replaceAll(
          /MARKETING_VERSION = [^;]+;/g,
          `MARKETING_VERSION = ${pkg.version};`
        );
        changed = true;
      }
    } catch {}

    if (changed) {
      await writeFile(pbxprojPath, pbxproj, 'utf8');
      console.log('project.pbxproj atualizado com entitlements e versionamento.');
    }
  } catch (err) {
    console.log('Aviso: project.pbxproj não localizado ou não modificado:', err.message);
  }
} catch {
  // Se a pasta ios ainda não existir no ambiente, ignora silenciosamente
  console.log('Pasta ios não encontrada ou sem permissão de escrita, ignorando overrides.');
}
