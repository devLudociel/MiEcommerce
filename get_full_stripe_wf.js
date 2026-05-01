const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzU2NTcxNy1jZDI1LTRlMWItYWYyNS01YTQ1MzU2YjFjNDUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDU2NDg2YWEtYTE0Zi00MTRlLWFjNjctMGM2MzcwODBmNmZlIiwiaWF0IjoxNzc2NDM4NDkyfQ.nc3A_aiD9ywxr7iDrJjsXIzmf-PYwGYWAbED3JjMAfo';
fetch('https://vps22689.cubepath.net/api/v1/workflows/f4dIqOfdAt05u7L3', {
  headers: { 'X-N8N-API-KEY': KEY }
}).then(r => r.json()).then(d => {
  console.log('=== CONNECTIONS ===');
  console.log(JSON.stringify(d.connections, null, 2));
  console.log('\n=== ECOMMERCE NODE ===');
  const n = d.nodes.find(n => n.name === 'Ecommerce: Crear Orden WhatsApp');
  console.log(JSON.stringify(n?.parameters, null, 2));
});
