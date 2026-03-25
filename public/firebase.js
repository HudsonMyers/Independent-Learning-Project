// firebase.js

/**
 * Initialize Firebase (optional)
 * * This stub allows your app to run locally without Firebase.
 * When ready, paste your Firebase config JSON and uncomment the imports & code below.
 */
export async function initializeFirebase() {
  // If you paste your config here later, set rawFirebaseConfig to the JSON string
  const rawFirebaseConfig = null; // <-- replace with JSON string when ready

  if (!rawFirebaseConfig) {
    // Firebase not configured — return disabled state, app can continue to use demo functions
    return { isFirebaseReady: false, currentUserId: null };
  }

  /*
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
  import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

  const firebaseConfig = JSON.parse(rawFirebaseConfig);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // sign in anonymously
  await signInAnonymously(auth);
  let currentUserId = null;
  onAuthStateChanged(auth, (user) => {
    if (user) currentUserId = user.uid;
  });

  return { isFirebaseReady: true, currentUserId };
  */

  return { isFirebaseReady: false, currentUserId: null };
}