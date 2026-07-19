const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const violations = [];

// Rule 1: apps/web cannot import from @saas/core/src/* or internal
const webFiles = getAllFiles(path.join(__dirname, 'apps/web/src')).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
const webInternalRegex = /from\s+['"](@saas\/(core|sdk|infrastructure|ui|app-sdk)\/src\/.*)['"]/g;

webFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(webInternalRegex);
  for (const match of matches) {
    violations.push(`[Rule 1] ${file}: imports from internal module ${match[1]}`);
  }
});

// Rule 2: plugins cannot import from @saas/core (they must use @saas/sdk)
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
  const pluginDirs = fs.readdirSync(pluginsDir);
  pluginDirs.forEach(pluginDir => {
    const srcDir = path.join(pluginsDir, pluginDir, 'src');
    if (fs.existsSync(srcDir)) {
      const pluginFiles = getAllFiles(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      // Search for any import from @saas/core
      const coreImportRegex = /from\s+['"]@saas\/core['"]/g;
      const coreInternalImportRegex = /from\s+['"]@saas\/core\/.*['"]/g;
      
      pluginFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const matches1 = content.matchAll(coreImportRegex);
        for (const match of matches1) {
          violations.push(`[Rule 2] ${file}: imports directly from @saas/core. Plugins MUST import from @saas/sdk instead.`);
        }
        const matches2 = content.matchAll(coreInternalImportRegex);
        for (const match of matches2) {
          violations.push(`[Rule 2] ${file}: imports directly from internal @saas/core. Plugins MUST import from @saas/sdk instead.`);
        }
      });
    }
  });
}

if (violations.length > 0) {
  console.error('❌ Architectural test failed: Found internal import violations:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('✅ Architectural test passed: All boundaries are respected.');
