import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";

async function run() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // We use a dummy email that is lowercased, matching the admin email format
  const adminEmail = "baezcabrera.j.r@gmail.com";
  const password = "password123";

  try {
    let uid;
    try {
      console.log("Attempting to create user with admin email...");
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password);
      uid = userCredential.user.uid;
      console.log("User created. UID:", uid);
    } catch (createErr) {
      if (createErr.code === "auth/email-already-in-use") {
        console.log("User already exists, signing in...");
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
        uid = userCredential.user.uid;
        console.log("Signed in. UID:", uid);
      } else {
        throw createErr;
      }
    }

    // Attempt to write document with isAdmin: true (simulating the client behavior)
    const userData = {
      id: uid,
      username: "AdminUser",
      email: adminEmail,
      favorites: [],
      history: [],
      isAdmin: true, // MUST trigger the rule failure because email is lowercased in token but uppercase in rules!
      createdAt: new Date().toISOString()
    };

    console.log("Attempting to write doc to users/" + uid + " with isAdmin: true...");
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, userData);
    console.log("Write successful! (This shouldn't happen if our theory is correct)");

    console.log("Attempting to get doc on users/" + uid + "...");
    const snap = await getDoc(docRef);
    console.log("Read successful! Exists:", snap.exists());
    process.exit(0);
  } catch (err) {
    console.error("Test failed as expected with error:", err.message || err);
    process.exit(1);
  }
}

run();
