async function test() {
  const routes = [
    'http://localhost:3000/guia/lojas',
    'http://localhost:3000/admin/lojas',
    'http://localhost:3000/admin/lojas/importar',
    'http://localhost:3000/admin/lojas/potencias',
    'http://localhost:3000/admin/lojas/nova',
  ];

  for (const url of routes) {
    const res = await fetch(url);
    console.log(`[STATUS ${res.status}] ${url}`);
  }
}

test().catch(console.error);
