import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const overridesDir = path.join(rootDir, 'ios-overrides');
const iosDir = path.join(rootDir, 'ios');

const PRIVACY_BUILD_FILE_ID = '958000012F99000100000001';
const PRIVACY_FILE_REF_ID = '958000022F99000100000001';

const CUSTOM_SWIFT_FILES = [
  {
    name: 'BiometricKeychainPlugin.swift',
    buildId: 'A1B2C3D42F99000100000011',
    fileId: 'A1B2C3D42F99000100000012',
  },
  {
    name: 'AppBridgeViewController.swift',
    buildId: 'A1B2C3D42F99000100000021',
    fileId: 'A1B2C3D42F99000100000022',
  },
];

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

  if (!content.includes('/* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference;')) {
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

function ensureCustomSwiftFilesInPbxproj(pbxprojContent) {
  let content = pbxprojContent;

  for (const file of CUSTOM_SWIFT_FILES) {
    if (!content.includes(file.name)) {
      content = content.replace(
        '504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };',
        `504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };\n\t\t${file.buildId} /* ${file.name} in Sources */ = {isa = PBXBuildFile; fileRef = ${file.fileId} /* ${file.name} */; };`,
      );
      content = content.replace(
        '504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };',
        `504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };\n\t\t${file.fileId} /* ${file.name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${file.name}; sourceTree = "<group>"; };`,
      );
      content = content.replace(
        '504EC3071FED79650016851F /* AppDelegate.swift */,',
        `504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\t${file.fileId} /* ${file.name} */,`,
      );
      content = content.replace(
        '504EC3081FED79650016851F /* AppDelegate.swift in Sources */,',
        `504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t\t\t${file.buildId} /* ${file.name} in Sources */,`,
      );
    }
  }

  return content;
}

function ensureCodeSignEntitlementsInAppTarget(pbxprojContent) {
  let content = pbxprojContent;

  const ensureInBlock = (blockId, configName) => {
    const regex = new RegExp(
      `(${blockId} \\/\\* ${configName} \\*\\/ = \\{\\s*isa = XCBuildConfiguration;[\\s\\S]*?buildSettings = \\{\\n)([\\s\\S]*?)(\\n\\t\\t\\t\\};[\\s\\S]*?name = ${configName};)`,
    );
    content = content.replace(regex, (_full, prefix, settingsBody, suffix) => {
      if (/CODE_SIGN_ENTITLEMENTS\s*=/.test(settingsBody)) {
        const updated = settingsBody.replace(
          /CODE_SIGN_ENTITLEMENTS = [^;]+;/g,
          'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;',
        );
        return `${prefix}${updated}${suffix}`;
      }
      return `${prefix}\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n${settingsBody}${suffix}`;
    });
  };

  ensureInBlock('504EC3171FED79650016851F', 'Debug');
  ensureInBlock('504EC3181FED79650016851F', 'Release');
  return content;
}

function applyAppTargetReleaseSigning(pbxprojContent, { teamId, profileSpecifier }) {
  const releaseBlockRegex =
    /(504EC3181FED79650016851F \/\* Release \*\/ = \{\s*isa = XCBuildConfiguration;[\s\S]*?buildSettings = \{\n)([\s\S]*?)(\n\t\t\t\};[\s\S]*?name = Release;)/;

  if (!releaseBlockRegex.test(pbxprojContent)) {
    return pbxprojContent;
  }

  return pbxprojContent.replace(releaseBlockRegex, (_full, prefix, settingsBody, suffix) => {
    let nextBody = settingsBody
      .replace(/^\t\t\t\tCODE_SIGN_STYLE = [^;]+;\n?/gm, '')
      .replace(/^\t\t\t\tDEVELOPMENT_TEAM = [^;]+;\n?/gm, '')
      .replace(/^\t\t\t\tCODE_SIGN_IDENTITY = [^;]+;\n?/gm, '')
      .replace(/^\t\t\t\t"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]" = [^;]+;\n?/gm, '')
      .replace(/^\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = [^;]+;\n?/gm, '');

    if (profileSpecifier) {
      const signingLines = [
        `\t\t\t\tCODE_SIGN_STYLE = Manual;`,
        `\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";`,
        `\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";`,
        `\t\t\t\tDEVELOPMENT_TEAM = ${teamId};`,
        `\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${profileSpecifier}";`,
      ].join('\n');
      nextBody = `${signingLines}\n${nextBody.replace(/^\n+/, '')}`;
    } else {
      nextBody = `\t\t\t\tCODE_SIGN_STYLE = Automatic;\n${nextBody.replace(/^\n+/, '')}`;
    }

    return `${prefix}${nextBody.replace(/\n+$/, '')}${suffix}`;
  });
}

if (!fs.existsSync(iosDir)) {
  console.warn('⚠️ Pasta ios/ não encontrada. Execute "npx cap add ios" primeiro.');
  process.exit(0);
}

console.log('🍏 Aplicando overrides nativos do iOS (Info.plist, PrivacyInfo.xcprivacy, Swift plugins, AppIcons, Splash)...');
copyRecursiveSync(overridesDir, iosDir);

// Ajuste dinâmico de APNs environment se solicitado por variável de ambiente
const destinationEntitlements = path.join(iosDir, 'App', 'App', 'App.entitlements');
const targetApnsEnv = process.env.APNS_ENVIRONMENT;
if (targetApnsEnv && ['development', 'production'].includes(targetApnsEnv) && fs.existsSync(destinationEntitlements)) {
  try {
    let entContent = fs.readFileSync(destinationEntitlements, 'utf8');
    entContent = entContent.replace(
      /<string>(development|production)<\/string>/,
      `<string>${targetApnsEnv}</string>`,
    );
    fs.writeFileSync(destinationEntitlements, entContent, 'utf8');
    console.log(`Ambiente APNs configurado para: ${targetApnsEnv}`);
  } catch (err) {
    console.warn('Aviso ao ajustar APNS_ENVIRONMENT no entitlements:', err.message);
  }
}

// Sincroniza MARKETING_VERSION, PrivacyInfo.xcprivacy, plugins Swift, TARGETED_DEVICE_FAMILY e assinatura no project.pbxproj
try {
  const pkgJsonPath = path.join(rootDir, 'package.json');
  const pbxprojPath = path.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(pkgJsonPath) && fs.existsSync(pbxprojPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const version = pkg.version || '1.0.1';
    let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
    pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
    pbxproj = pbxproj.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = "1";');
    pbxproj = ensurePrivacyManifestInPbxproj(pbxproj);
    pbxproj = ensureCustomSwiftFilesInPbxproj(pbxproj);
    pbxproj = ensureCodeSignEntitlementsInAppTarget(pbxproj);
    const teamId = (process.env.IOS_TEAM_ID || 'K695SZBF67').trim();
    const profileSpecifier = (process.env.IOS_PROVISIONING_PROFILE_SPECIFIER || '').trim();
    pbxproj = applyAppTargetReleaseSigning(pbxproj, { teamId, profileSpecifier });
    fs.writeFileSync(pbxprojPath, pbxproj, 'utf8');
    console.log(
      `✅ MARKETING_VERSION=${version}, TARGETED_DEVICE_FAMILY="1", PrivacyInfo.xcprivacy e plugins Swift vinculados${profileSpecifier ? ` com assinatura Manual (Team ${teamId})` : ''}.`,
    );
  }
} catch (err) {
  console.warn('⚠️ Não foi possível atualizar project.pbxproj:', err);
}

console.log('✅ Overrides do iOS aplicados com sucesso!');
