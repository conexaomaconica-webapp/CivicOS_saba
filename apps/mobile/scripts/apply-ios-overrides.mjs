import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const overridesDir = path.join(rootDir, 'ios-overrides');
const iosDir = path.join(rootDir, 'ios');

const PRIVACY_BUILD_FILE_ID = '958000012F99000100000001';
const PRIVACY_FILE_REF_ID = '958000022F99000100000001';

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function ensurePrivacyManifestInPbxproj(pbxprojContent) {
  let content = pbxprojContent;

  if (!content.includes('PrivacyInfo.xcprivacy in Resources')) {
    content = content.replace(
      '/* Begin PBXBuildFile section */\n',
      `/* Begin PBXBuildFile section */\n\t\t${PRIVACY_BUILD_FILE_ID} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${PRIVACY_FILE_REF_ID} /* PrivacyInfo.xcprivacy */; };\n`,
    );
  }

  if (!content.includes(`/* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference;`)) {
    content = content.replace(
      '/* Begin PBXFileReference section */\n',
      `/* Begin PBXFileReference section */\n\t\t${PRIVACY_FILE_REF_ID} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xcprivacy; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n`,
    );
  }

  if (!content.includes(`${PRIVACY_FILE_REF_ID} /* PrivacyInfo.xcprivacy */,`)) {
    content = content.replace(
      /(504EC3061FED79650016851F \/\* App \*\/ = \{\s*isa = PBXGroup;\s*children = \(\n)/,
      `$1\t\t\t\t${PRIVACY_FILE_REF_ID} /* PrivacyInfo.xcprivacy */,\n`,
    );
  }

  if (!content.includes(`${PRIVACY_BUILD_FILE_ID} /* PrivacyInfo.xcprivacy in Resources */,`)) {
    content = content.replace(
      /(504EC3021FED79650016851F \/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;\s*buildActionMask = 2147483647;\s*files = \(\n)/,
      `$1\t\t\t\t${PRIVACY_BUILD_FILE_ID} /* PrivacyInfo.xcprivacy in Resources */,\n`,
    );
  }

  return content;
}

if (!fs.existsSync(iosDir)) {
  console.warn('⚠️ Pasta ios/ não encontrada. Execute "npx cap add ios" primeiro.');
  process.exit(0);
}

console.log('🍏 Aplicando overrides nativos do iOS (Info.plist, PrivacyInfo.xcprivacy, AppIcons, Splash)...');
copyRecursiveSync(overridesDir, iosDir);

// Sincroniza MARKETING_VERSION, PrivacyInfo.xcprivacy e TARGETED_DEVICE_FAMILY no project.pbxproj
try {
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const pbxprojPath = path.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(pkgJsonPath) && fs.existsSync(pbxprojPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const version = pkg.version || '1.0.0';
    let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
    pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
    // Foco inicial exclusivo em iPhone (TARGETED_DEVICE_FAMILY = "1") para evitar rejeição de layout iPad Landscape
    pbxproj = pbxproj.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = "1";');
    pbxproj = ensurePrivacyManifestInPbxproj(pbxproj);
    fs.writeFileSync(pbxprojPath, pbxproj, 'utf8');
    console.log(`✅ MARKETING_VERSION sincronizado para ${version}, TARGETED_DEVICE_FAMILY="1" (iPhone) e PrivacyInfo.xcprivacy vinculado ao target App.`);
  }
} catch (err) {
  console.warn('⚠️ Não foi possível atualizar project.pbxproj:', err);
}

console.log('✅ Overrides do iOS aplicados com sucesso!');
