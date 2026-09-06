const http = require('http');

// Get targets
http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    console.log('Targets:', list.map(t => ({ id: t.id, url: t.url })));
    const page = list.find(t => t.type === 'page');
    if (!page) return;
    
    // We can use standard WebSocket in Node 22 if available or fallback
    try {
      const ws = new (global.WebSocket || require('ws'))(page.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
        ws.send(JSON.stringify({
          id: 4,
          method: 'Page.reload',
          params: { ignoreCache: true }
        }));
      };
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('EXCEPTION THROWN:', JSON.stringify(msg.params.exceptionDetails, null, 2));
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('CONSOLE:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        } else if (msg.id === 4) {
          console.log('Reload triggered');
        }
      };
    } catch (e) {
      console.error(e);
    }
  });
});
