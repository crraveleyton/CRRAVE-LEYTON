import { Handler } from "@netlify/functions";
import Stripe from "stripe";
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
    console.error("[FIREBASE INIT] Firestore init error in create-payment-intent:", err);
    return null;
  }
}

async function resolveStripeKeys(): Promise<{ secretKey: string; publishableKey: string }> {
  let secretKey = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SK ||
    process.env.STRIPE_API_KEY ||
    process.env.VITE_STRIPE_SECRET_KEY ||
    process.env.VITE_STRIPE_SK ||
    process.env.NETLIFY_STRIPE_SECRET_KEY ||
    ""
  ).trim();

  let publishableKey = (
    process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PK ||
    process.env.STRIPE_PUBLIC_KEY ||
    process.env.VITE_STRIPE_PK ||
    ""
  ).trim();

  // If either key is missing from environment, check Firestore settings document
  if (!secretKey || !publishableKey) {
    try {
      const db = getDb();
      if (db) {
        const snap = await getDoc(doc(db, "settings", "crrave_receipt"));
        if (snap.exists()) {
          const data = snap.data();
          if (!secretKey && (data.stripeSecretKey || data.stripeSK)) {
            secretKey = String(data.stripeSecretKey || data.stripeSK).trim();
          }
          if (!publishableKey && data.stripePublishableKey) {
            publishableKey = String(data.stripePublishableKey).trim();
          }
        }
      }
    } catch (e) {
      console.warn("Firestore settings lookup in create-payment-intent failed:", e);
    }
  }

  return { secretKey, publishableKey };
}

let stripeClient: Stripe | null = null;
let cachedSecretKey = "";

function getStripeInstance(secretKey: string): Stripe {
  if (!stripeClient || cachedSecretKey !== secretKey) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-01-27.acacia" as any,
    });
    cachedSecretKey = secretKey;
  }
  return stripeClient;
}

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" }),
    };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { amount, orderData } = body;

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid amount. Amount must be at least £0.30." }),
      };
    }

    const { secretKey, publishableKey } = await resolveStripeKeys();

    if (!secretKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "STRIPE_SECRET_KEY is missing in Netlify. In Netlify Site Settings > Environment Variables, please verify that STRIPE_SECRET_KEY is saved with 'Functions' scope checked, then go to Deploys > Trigger Deploy > Clear Cache and Deploy Site."
        }),
      };
    }

    const stripe = getStripeInstance(secretKey);

    // Amount in pence / cents
    const amountInCents = Math.round(amount * 100);

    if (amountInCents < 30) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Amount must be at least £0.30 for online card payments." }),
      };
    }

    const metadata: Record<string, string> = {
      customerName: orderData?.customerName ? String(orderData.customerName).slice(0, 100) : "Guest",
      phone: orderData?.phone ? String(orderData.phone).slice(0, 30) : "",
      email: orderData?.email ? String(orderData.email).slice(0, 100) : "",
      orderType: orderData?.orderType || "delivery",
      timeSlot: orderData?.selectedTimeSlot || orderData?.timeSlot || "ASAP",
      postcode: orderData?.postcode ? String(orderData.postcode).slice(0, 20) : "",
      total: String(amount),
      deliveryFee: String(orderData?.deliveryFee || 0),
      discountAmount: String(orderData?.discountAmount || 0),
    };

    if (orderData?.address) {
      metadata.address = String(orderData.address).replace(/\n/g, ", ").slice(0, 300);
    }
    if (orderData?.orderNotes) {
      metadata.notes = String(orderData.orderNotes).slice(0, 200);
    }
    if (orderData?.items && Array.isArray(orderData.items)) {
      const itemsSummary = orderData.items
        .map((i: any) => `${i.quantity}x ${i.name}${i.variant ? ` (${i.variant})` : ''}`)
        .join("; ");
      metadata.itemsSummary = itemsSummary.slice(0, 450);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: publishableKey || (process.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim(),
      }),
    };
  } catch (error: any) {
    console.error("Netlify create-payment-intent Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to create payment intent" }),
    };
  }
};
