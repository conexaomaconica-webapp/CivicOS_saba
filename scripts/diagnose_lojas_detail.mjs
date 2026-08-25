async function test() {
  const url = 'http://localhost:3000/guia/lojas';
  const res = await fetch(url);
  console.log('Status Code:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response Snippet:', text.slice(0, 1000));
}

test().catch(console.error);
