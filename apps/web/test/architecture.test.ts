import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
}

function runArchitecturalTest() {
  const srcPath = path.join(__dirname, '../src');
  const files = getAllFiles(srcPath).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

  const internalImportsRegex = /from\s+['"](@saas\/(core|sdk|infrastructure|ui|app-sdk)\/src\/.*)['"]/g;

  const violations: string[] = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(internalImportsRegex);
    
    for (const match of matches) {
      violations.push(`${file}: imports from internal module ${match[1]}`);
    }
  });

  if (violations.length > 0) {
    console.error('Found internal import violations:\n' + violations.join('\n'));
    process.exit(1);
  }
  
  console.log('Architectural test passed: No internal imports found.');
}

runArchitecturalTest();

