import { Handler } from "@netlify/functions";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, Firestore } from "firebase/firestore";
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
    console.error("[FIREBASE INIT] Firestore init error in create-order:", err);
    return null;
  }
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
    const { orderData, orderId } = JSON.parse(event.body || "{}");
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid order data or empty cart" }),
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

    const finalOrderId = orderId || `crrave_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const docRef = doc(db, "orders", finalOrderId);

    const isCollection = orderData.orderType === "collection" || orderData.type === "collection";
    const formattedAddress = !isCollection && orderData.address
      ? orderData.address
      : !isCollection
        ? `${orderData.houseNumber ? orderData.houseNumber.trim() + " " : ""}${orderData.houseName ? orderData.houseName.trim() + "\n" : ""}${orderData.streetName ? orderData.streetName.trim() : ""}\n${orderData.areaName ? orderData.areaName.trim() : ""}\n${orderData.postcode ? orderData.postcode.trim() : ""}`.trim()
        : "";

    const docPayload = {
      restaurantId: "crrave_leyton",
      brand: "crrave",
      userId: orderData.userId || "guest_" + Date.now(),
      customerName: (orderData.customerName || "Customer").trim(),
      email: (orderData.email || "").trim(),
      items: orderData.items,
      subtotal: Number(orderData.subtotal) || Number(orderData.total) || 0,
      discountAmount: Number(orderData.discountAmount) || 0,
      discountPercentage: Number(orderData.discountPercentage) || 0,
      stampCardDiscount: Number(orderData.stampCardDiscount) || 0,
      stampCardPercentage: Number(orderData.stampCardPercentage) || 0,
      stampCardApplied: !!orderData.stampCardApplied,
      deliveryFee: isCollection ? 0 : (Number(orderData.deliveryFee) || 0),
      distance: isCollection ? null : (orderData.distance || null),
      total: Number(orderData.total) || 0,
      status: "pending",
      type: isCollection ? "collection" : "delivery",
      phone: (orderData.phone || "").trim(),
      address: isCollection ? "" : formattedAddress,
      houseNumber: isCollection ? "" : (orderData.houseNumber || "").trim(),
      houseName: isCollection ? "" : (orderData.houseName || "").trim(),
      streetName: isCollection ? "" : (orderData.streetName || "").trim(),
      areaName: isCollection ? "" : (orderData.areaName || "").trim(),
      postcode: isCollection ? "" : (orderData.postcode || "").trim(),
      timeSlot: orderData.selectedTimeSlot || orderData.timeSlot || "ASAP",
      paymentMethod: orderData.paymentMethod || "cash",
      paymentId: orderData.paymentId || null,
      notes: (orderData.orderNotes || orderData.notes || "").trim(),
      estimate: "",
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, docPayload, { merge: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: finalOrderId,
      }),
    };
  } catch (err: any) {
    console.error("Netlify create-order Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Failed to create order" }),
    };
  }
};
