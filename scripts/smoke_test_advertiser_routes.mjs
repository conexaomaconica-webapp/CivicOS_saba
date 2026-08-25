import http from 'http';

const routes = [
  '/anunciante',
  '/anunciante/empresa',
  '/anunciante/empresa/midias',
  '/anunciante/conteudo/servicos',
  '/anunciante/conteudo/beneficios',
  '/anunciante/conteudo/eventos',
  '/anunciante/conteudo/posts',
  '/anunciante/resultados',
  '/anunciante/plano',
  '/anunciante/pagamentos',
  '/anunciante/contrato',
  '/anunciante/notificacoes',
  '/anunciante/conta',
  '/anunciante/financeiro', // Redirect to /anunciante/pagamentos
  '/guia/comandos-terceirizacao-e-seguranca-eletronica',
];

function checkRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      resolve({ path, statusCode: res.statusCode });
    });
    req.on('error', (err) => {
      resolve({ path, statusCode: 0, error: err.message });
    });
    req.end();
  });
}

async function runSmokeTest() {
  console.log('=== SMOKE TEST OPERACIONAL DAS ROTAS DO PORTAL DO ANUNCIANTE ===\n');
  let passedCount = 0;

  for (const r of routes) {
    const result = await checkRoute(r);
    const isOk = result.statusCode === 200 || result.statusCode === 307 || result.statusCode === 308 || result.statusCode === 302;
    if (isOk) passedCount++;
    console.log(`Route [${result.path}]: Status ${result.statusCode} ${isOk ? '✅ PASS' : '❌ FAIL'}`);
  }

  console.log(`\nResultado Final: ${passedCount}/${routes.length} rotas respondendo corretamente.`);
}

runSmokeTest();
