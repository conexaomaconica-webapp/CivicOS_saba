'use strict';
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

let idxFixed = 0;
let policyGuarded = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  const original = fs.readFileSync(filePath, 'utf8');
  let src = original;

  // 1. CREATE [UNIQUE] INDEX -> CREATE [UNIQUE] INDEX IF NOT EXISTS
  src = src.replace(/^(CREATE (?:UNIQUE )?INDEX )(?!IF NOT EXISTS )/gm, (m, prefix) => {
    idxFixed++;
    return prefix + 'IF NOT EXISTS ';
  });

  // 2. CREATE POLICY -> guard with DROP POLICY IF EXISTS before it
  const lines = src.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*CREATE POLICY "([^"]+)"/);
    if (!m) {
      out.push(line);
      continue;
    }
    const policyName = m[1];
    // scan forward for the target table line (`ON schema.table`)
    let target = null;
    for (let j = i + 1; j < lines.length; j++) {
      const on = lines[j].match(/^\s*ON\s+(ONLY\s+)?([a-zA-Z0-9_."]+)/);
      if (on) { target = on[2].replace(/"/g, ''); break; }
      if (/^\S/.test(lines[j]) && lines[j].trim()) break; // stop at any non-indented line
    }
    if (!target) {
      throw new Error(`${file}:${i + 1}: nao localizei tabela alvo da policy "${policyName}"`);
    }
    out.push(`DROP POLICY IF EXISTS "${policyName}" ON ${target};`);
    out.push(line);
    policyGuarded++;
  }
  src = out.join('\n');
  src = src.replace(/\r?\n$/, '') + '\n';

  if (src !== original) fs.writeFileSync(filePath, src);
}

console.log(`CREATED INDEX IF NOT EXISTS: ${idxFixed}`);
console.log(`CREATE POLICY guarded: ${policyGuarded}`);
console.log(`files: ${files.length}`);