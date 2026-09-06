const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Iniciando pipeline de descarga continua...");

const child = spawn("node", ["scripts/gdrive_direct_stream_downloader.cjs"], {
  stdio: "inherit",
  detached: true
});

child.unref();
console.log(`Pipeline activo en segundo plano con PID: ${child.pid}`);
