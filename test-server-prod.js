const { exec } = require('child_process');

const proc = exec('PORT=3001 NODE_ENV=production node dist/server.cjs');

setTimeout(() => {
  exec('curl -s http://localhost:3001/', (err, stdout) => {
    console.log("CURL OUTPUT LENGTH:", stdout.length);
    console.log("CURL HEAD:", stdout.substring(0, 200));
    proc.kill();
  });
}, 3000);
