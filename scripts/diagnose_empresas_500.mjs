async function test() {
  console.log('Sending request to http://localhost:3000/guia/empresas ...');
  const res = await fetch('http://localhost:3000/guia/empresas', {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  console.log('Status Code:', res.status, res.statusText);
  const body = await res.text();
  if (res.status !== 200) {
    console.log('Error Body Snippet:', body.slice(0, 2000));
  } else {
    console.log('SUCCESS! HTML Length:', body.length);
  }
}

test().catch(console.error);
