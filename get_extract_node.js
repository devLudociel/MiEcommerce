const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzU2NTcxNy1jZDI1LTRlMWItYWYyNS01YTQ1MzU2YjFjNDUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDU2NDg2YWEtYTE0Zi00MTRlLWFjNjctMGM2MzcwODBmNmZlIiwiaWF0IjoxNzc2NDM4NDkyfQ.nc3A_aiD9ywxr7iDrJjsXIzmf-PYwGYWAbED3JjMAfo';
fetch('https://vps22689.cubepath.net/api/v1/workflows/f4dIqOfdAt05u7L3', {
  headers: { 'X-N8N-API-KEY': KEY }
}).then(r => r.json()).then(d => {
  const node = d.nodes.find(n => n.name === 'Extraer datos del pago');
  console.log(JSON.stringify(node?.parameters, null, 2));
});
