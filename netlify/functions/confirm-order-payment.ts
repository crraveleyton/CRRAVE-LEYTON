import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, Firestore } from "firebase/firestore";
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
    console.error("[FIREBASE INIT] Firestore init error in confirm-order-payment:", err);
    return null;
  }
}

async function getStripeClient(): Promise<Stripe | null> {
  let secretKey = (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SK ||
    process.env.STRIPE_API_KEY ||
    process.env.VITE_STRIPE_SECRET_KEY ||
    process.env.VITE_STRIPE_SK ||
    process.env.NETLIFY_STRIPE_SECRET_KEY ||
    ""
  ).trim();

  if (!secretKey) {
    try {
      const db = getDb();
      if (db) {
        const snap = await getDoc(doc(db, "settings", "crrave_receipt"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.stripeSecretKey || data.stripeSK) {
            secretKey = String(data.stripeSecretKey || data.stripeSK).trim();
          }
        }
      }
    } catch (e) {
      console.warn("Firestore settings lookup in confirm-order-payment failed:", e);
    }
  }

  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2025-01-27.acacia" as any,
  });
}

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OK" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { paymentIntentId, clientSecret, orderData } = body;

    let piId = paymentIntentId;
    if (!piId && clientSecret) {
      piId = clientSecret.split("_secret_")[0];
    }

    if (!piId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing payment intent identifier" }),
      };
    }

    const cleanPiId = String(piId).trim();
    const stripe = await getStripeClient();

    if (!stripe) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Stripe configuration unavailable" }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(cleanPiId);
    if (!paymentIntent) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Payment Intent not found", success: false }),
      };
    }

    if (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          orderId: null,
          paymentStatus: paymentIntent.status,
          message: `Payment status is ${paymentIntent.status}`,
        }),
      };
    }

    const db = getDb();
    if (!db) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Database unavailable" }),
      };
    }

    // Save order document into Firestore
    const orderDocRef = doc(db, "orders", cleanPiId);
    const existingSnap = await getDoc(orderDocRef);

    if (existingSnap.exists()) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          orderId: cleanPiId,
          alreadyExisted: true,
        }),
      };
    }

    const effectiveData = orderData || {};
    const isCollection = effectiveData.orderType === "collection" || effectiveData.type === "collection";

    const docPayload = {
      restaurantId: "crrave_leyton",
      brand: "crrave",
      userId: effectiveData.userId || "guest_" + cleanPiId.slice(-8),
      customerName: (effectiveData.customerName || paymentIntent.metadata?.customerName || "Customer").trim(),
      email: (effectiveData.email || paymentIntent.metadata?.email || "").trim(),
      items: Array.isArray(effectiveData.items) && effectiveData.items.length > 0 ? effectiveData.items : [
        { name: paymentIntent.metadata?.itemsSummary || "Online Order (Paid)", price: paymentIntent.amount / 100, quantity: 1 }
      ],
      subtotal: Number(effectiveData.subtotal) || (paymentIntent.amount / 100),
      discountAmount: Number(effectiveData.discountAmount) || 0,
      discountPercentage: Number(effectiveData.discountPercentage) || 0,
      deliveryFee: isCollection ? 0 : (Number(effectiveData.deliveryFee) || Number(paymentIntent.metadata?.deliveryFee) || 0),
      distance: isCollection ? null : (effectiveData.distance || null),
      total: paymentIntent.amount / 100,
      status: "pending",
      type: isCollection ? "collection" : "delivery",
      phone: (effectiveData.phone || paymentIntent.metadata?.phone || "").trim(),
      address: isCollection ? "" : (effectiveData.address || paymentIntent.metadata?.address || "").trim(),
      houseNumber: isCollection ? "" : (effectiveData.houseNumber || "").trim(),
      houseName: isCollection ? "" : (effectiveData.houseName || "").trim(),
      streetName: isCollection ? "" : (effectiveData.streetName || "").trim(),
      areaName: isCollection ? "" : (effectiveData.areaName || "").trim(),
      postcode: isCollection ? "" : (effectiveData.postcode || paymentIntent.metadata?.postcode || "").trim(),
      timeSlot: effectiveData.selectedTimeSlot || paymentIntent.metadata?.timeSlot || "ASAP",
      paymentMethod: "pay_online",
      paymentId: cleanPiId,
      notes: (effectiveData.orderNotes || paymentIntent.metadata?.notes || "").trim(),
      estimate: "",
      createdAt: serverTimestamp(),
    };

    await setDoc(orderDocRef, docPayload, { merge: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: cleanPiId,
      }),
    };
  } catch (error: any) {
    console.error("Netlify confirm-order-payment Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to confirm order payment" }),
    };
  }
};
