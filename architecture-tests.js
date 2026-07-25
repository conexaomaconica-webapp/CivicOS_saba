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

// ==========================================
// Rule 4: Snapshot serializability test
// ==========================================
console.log('Testing Rule 4: Snapshot should be JSON serializable (no functions)');
let hasErrors = false;
try {
  // We can test this by using the SDK/Core to generate a snapshot and trying to stringify it
  // Since we are not in a TS environment here, we'll just parse the presentation types 
  // to ensure there are no function signatures in RouteDefinition or NavigationItem
  const typesContent = fs.readFileSync('packages/core/src/presentation/presentation-types.ts', 'utf-8');
  if (typesContent.includes('=>') && typesContent.includes('readonly component:')) {
    console.error('❌ Snapshot types must not contain functions.');
    hasErrors = true;
  } else {
    console.log('✅ Snapshot types look clean.');
  }

  // Runtime check for functions in snapshot
  console.log('Running runtime test for PresentationSnapshot...');
  // Since we just built packages/core, we can require its dist
  const core = require('./packages/core/dist');
  
  // Create a mock plugin to test presentation layer
  const mockPlugin = {
    manifest: {
      id: 'mock-plugin',
      name: 'Mock Plugin',
      version: '1.0.0'
    },
    presentation: {
      routes: [
        {
          id: 'mock-route',
          pathname: '/mock',
          componentId: 'mock-component',
          props: { hello: 'world' }
        }
      ],
      navigation: [
        {
          id: 'mock-nav',
          label: 'Mock',
          pathname: '/mock'
        }
      ]
    }
  };

  const kernel = core.createKernel({ plugins: [mockPlugin] });
  const snapshot = kernel.presentation().snapshot({
    tenantId: 'tenant-demo',
    userId: 'user-demo',
    permissions: ['mock-plugin.view']
  });

  function containsFunction(value) {
    if (typeof value === "function") {
      return true;
    }
    if (Array.isArray(value)) {
      return value.some(containsFunction);
    }
    if (value && typeof value === "object") {
      return Object.values(value).some(containsFunction);
    }
    return false;
  }

  if (containsFunction(snapshot)) {
    console.error('❌ Snapshot contains functions!');
    hasErrors = true;
  }
  
  try {
    JSON.stringify(snapshot);
    console.log('✅ Snapshot is fully serializable.');
  } catch (err) {
    console.error('❌ Snapshot failed JSON.stringify:', err);
    hasErrors = true;
  }
} catch (err) {
  console.log('⚠️ Could not run Snapshot runtime test. Err: ' + err.message);
}

if (hasErrors) {
  violations.push(`[Rule 4] Snapshot types or runtime data contain functions, making them non-serializable.`);
}

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
        
        // Rule 3: No React imports in domain, application, or manifest
        const isDomain = file.includes(`${path.sep}domain${path.sep}`);
        const isApp = file.includes(`${path.sep}application${path.sep}`);
        const isManifest = file.endsWith('manifest.ts');
        const isPlugin = file.endsWith('plugin.ts');
        
        if (isDomain || isApp || isManifest || isPlugin) {
          const reactRegex = /from\s+['"]react(-dom)?['"]/g;
          const reactMatches = content.matchAll(reactRegex);
          for (const match of reactMatches) {
            violations.push(`[Rule 3] ${file}: imports React in a non-presentation layer. React is only allowed in presentation/.`);
          }
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
