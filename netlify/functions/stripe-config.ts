import { Handler } from "@netlify/functions";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc, Firestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const resolvedFirebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId:
    process.env.FIREBASE_DATABASE_ID ||
    firebaseConfig.firestoreDatabaseId ||
    "(default)",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfig.messagingSenderId,
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

function getDb(): Firestore | null {
  try {
    if (!appInstance) {
      const apps = getApps();
      appInstance = apps.length > 0 ? apps[0] : initializeApp(resolvedFirebaseConfig);
    }
    if (!dbInstance && appInstance) {
      dbInstance = getFirestore(appInstance, resolvedFirebaseConfig.firestoreDatabaseId);
    }
    return dbInstance;
  } catch (err) {
    console.error("[FIREBASE INIT] Firestore init error in stripe-config:", err);
    return null;
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" }),
    };
  }

  let publishableKey = (
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PK ||
    process.env.STRIPE_PUBLIC_KEY ||
    process.env.VITE_STRIPE_PK ||
    ""
  ).trim();

  let secretKey = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SK ||
    process.env.STRIPE_API_KEY ||
    process.env.VITE_STRIPE_SECRET_KEY ||
    process.env.VITE_STRIPE_SK ||
    process.env.NETLIFY_STRIPE_SECRET_KEY ||
    ""
  ).trim();

  // If not found in process.env, check Firestore crrave_receipt document
  if (!publishableKey || !secretKey) {
    try {
      const db = getDb();
      if (db) {
        const snap = await getDoc(doc(db, "settings", "crrave_receipt"));
        if (snap.exists()) {
          const data = snap.data();
          if (!publishableKey && data.stripePublishableKey) {
            publishableKey = String(data.stripePublishableKey).trim();
          }
          if (!secretKey && (data.stripeSecretKey || data.stripeSK)) {
            secretKey = String(data.stripeSecretKey || data.stripeSK).trim();
          }
        }
      }
    } catch (e) {
      console.warn("Firestore crrave_receipt lookup in stripe-config failed:", e);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      publishableKey,
      hasSecretKey: !!secretKey,
    }),
  };
};
