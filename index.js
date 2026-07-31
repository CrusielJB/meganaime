const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "us-central1" });

// Load bundled Express server
const expressApp = require("./dist/server.cjs");

exports.api = onRequest({
  memory: "512MiB",
  timeoutSeconds: 60,
  minInstances: 0
}, expressApp.app || expressApp);
