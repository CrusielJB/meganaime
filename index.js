import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "us-central1" });

// Load Express server bundle
import expressApp from "./dist/server.cjs";

export const api = onRequest({
  memory: "512MiB",
  timeoutSeconds: 60,
  minInstances: 0
}, expressApp.app || expressApp);
