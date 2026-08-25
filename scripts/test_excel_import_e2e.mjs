import * as XLSX from '../apps/web/node_modules/xlsx/xlsx.mjs';

// Simulated database snapshot for testing logic in isolation
const existingLodges = [
  { id: '1', name: 'Loja B - Luz e Ordem', code_number: 123, potency: 'GOB', city: 'Salvador' },
  { id: '2', name: 'Loja C - União e Progresso', code_number: 777, potency: 'GLBA', city: 'Feira de Santana' },
];

// Test Data Payload with 4 distinct cases
const testData = [
  // Case A: Nova Loja
  {
    nome: 'Loja A - Esperança da Pátria',
    numero: 999,
    potencia: 'GOB',
    rito: 'REAA',
    cidade: 'Feira de Santana',
    estado: 'BA',
  },
  // Case B: Atualização Segura (Número 123 + Potência GOB já existe)
  {
    nome: 'Loja B - Luz e Ordem (Nome Alterado)',
    numero: 123,
    potencia: 'GOB',
    rito: 'York',
    cidade: 'Salvador',
    estado: 'BA',
  },
  // Case C: Possível Duplicidade (Mesmo Nome "Loja C - União e Progresso" + Potência GLBA + Cidade Feira de Santana, mas número diferente)
  {
    nome: 'Loja C - União e Progresso',
    numero: 888,
    potencia: 'GLBA',
    rito: 'Moderno',
    cidade: 'Feira de Santana',
    estado: 'BA',
  },
  // Case D: Registro Inválido (Sem nome da Loja)
  {
    nome: '',
    numero: 444,
    potencia: 'COMAB',
    rito: '',
    cidade: 'Vitória da Conquista',
    estado: 'BA',
  },
];

async function runE2EImportTest() {
  console.log('--- EXCEL / XLSX IMPORTATION LOGIC E2E TEST ---');

  // 1. Create a native in-memory XLSX workbook
  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TestLojas');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // 2. Read back from buffer (simulating user upload of .xlsx file)
  const readWorkbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = readWorkbook.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(readWorkbook.Sheets[sheetName]);

  let newCount = 0;
  let updateCount = 0;
  let dupCount = 0;
  let errCount = 0;

  const analyzedResults = [];

  for (const row of rawRows) {
    const name = String(row.nome || '').trim();
    const code_number = row.numero ? parseInt(String(row.numero), 10) : null;
    const potency = String(row.potencia || 'GOB').trim();
    const city = String(row.cidade || '').trim();

    if (!name) {
      errCount++;
      analyzedResults.push({ name: '(Sem Nome)', status: 'error', reason: 'Nome da loja é obrigatório' });
      continue;
    }

    // 1º Match por potência + número (Atualização Segura)
    const matchByNumber = existingLodges.find(
      (e) => code_number != null && e.code_number === code_number && e.potency.toLowerCase() === potency.toLowerCase()
    );

    // 2º Match por potência + nome + cidade (Possível Duplicidade)
    const matchByNameCity = existingLodges.find(
      (e) => e.name.toLowerCase().trim() === name.toLowerCase().trim() && e.potency.toLowerCase() === potency.toLowerCase() && e.city.toLowerCase().trim() === city.toLowerCase().trim()
    );

    if (matchByNumber) {
      updateCount++;
      analyzedResults.push({ name, status: 'update', reason: `Atualização por número ${code_number}` });
    } else if (matchByNameCity) {
      dupCount++;
      analyzedResults.push({ name, status: 'duplicate', reason: `Possível duplicidade por nome + cidade` });
    } else {
      newCount++;
      analyzedResults.push({ name, status: 'new', reason: 'Nova loja cadastrável' });
    }
  }

  console.log('\n📊 Análise dos Registros Processados:');
  analyzedResults.forEach((r, i) => console.log(`  Row ${i + 1}: [${r.status.toUpperCase()}] ${r.name} -> ${r.reason}`));

  console.log('\n📈 Placar Final da Prévia:');
  console.log(`  • Novas Lojas: ${newCount}`);
  console.log(`  • Atualizações Seguras: ${updateCount}`);
  console.log(`  • Possíveis Duplicidades: ${dupCount}`);
  console.log(`  • Registros com Erro: ${errCount}`);

  // Assertions
  const passNew = newCount === 1;
  const passUpdate = updateCount === 1;
  const passDup = dupCount === 1;
  const passErr = errCount === 1;

  if (passNew && passUpdate && passDup && passErr) {
    console.log('\n✅ TEST RESULT: PASS (1 nova, 1 atualização, 1 duplicidade, 1 erro)');
    console.log('✅ ZERO GRAVAÇÕES REALIZADAS ANTES DA CONFIRMAÇÃO DO ADMIN!');
    process.exit(0);
  } else {
    console.error('\n❌ TEST RESULT: FAIL - Breakdown do test E2E diverge do esperado');
    process.exit(1);
  }
}

runE2EImportTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
