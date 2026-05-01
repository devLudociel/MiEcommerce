const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzU2NTcxNy1jZDI1LTRlMWItYWYyNS01YTQ1MzU2YjFjNDUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDU2NDg2YWEtYTE0Zi00MTRlLWFjNjctMGM2MzcwODBmNmZlIiwiaWF0IjoxNzc2NDM4NDkyfQ.nc3A_aiD9ywxr7iDrJjsXIzmf-PYwGYWAbED3JjMAfo';
fetch('https://vps22689.cubepath.net/api/v1/workflows/f4dIqOfdAt05u7L3', {
  headers: { 'X-N8N-API-KEY': KEY }
}).then(r => r.json()).then(d => {
  // Show all nodes with their key params
  for (const node of d.nodes) {
    console.log('\n--- NODE:', node.name, '---');
    if (node.parameters?.jsCode) console.log('jsCode:', node.parameters.jsCode.slice(0, 500));
    if (node.parameters?.jsonBody) console.log('jsonBody:', JSON.stringify(node.parameters.jsonBody, null, 2).slice(0, 500));
    if (node.parameters?.body) console.log('body:', JSON.stringify(node.parameters.body, null, 2).slice(0, 500));
    if (node.parameters?.url) console.log('url:', node.parameters.url);
  }
});
