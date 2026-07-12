const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const errScript = `
    <script>
      window.onerror = function(msg, url, lineNo, columnNo, error) {
        document.body.innerHTML += '<div style="color:red; z-index:9999; position:fixed; top:0; left:0; background:black; padding:10px;">ERROR: ' + msg + '</div>';
        return false;
      };
      window.onunhandledrejection = function(event) {
        document.body.innerHTML += '<div style="color:orange; z-index:9999; position:fixed; top:40px; left:0; background:black; padding:10px;">PROMISE REJECTION: ' + (event.reason ? event.reason.message : 'Unknown') + '</div>';
      };
    </script>
`;

if (!code.includes('window.onerror')) {
  code = code.replace('<head>', '<head>' + errScript);
  fs.writeFileSync('index.html', code);
}
