import functions from "firebase-functions";

// Load Express server bundle
import expressApp from "./dist/server.cjs";

export const api = functions
  .runWith({ memory: "512MB", timeoutSeconds: 120 })
  .https
  .onRequest(expressApp.app || expressApp);
