import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
} from "firebase/analytics";
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported as messagingIsSupported,
  type Messaging,
} from "firebase/messaging";

// Browser-facing configuration only. These are public identifiers (the same
// values already shipped in the bundle), never service-account credentials.
// Environment variables win when present; the literals keep the integration
// working on hosts where the VITE_FIREBASE_* variables are not configured yet.
const env = import.meta.env;

const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) ?? "AIzaSyC3oqtzIYWfKFJvkpU4ajYqWCFHO9iwA-s",
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? "javlin-1682b.firebaseapp.com",
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? "javlin-1682b",
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? "javlin-1682b.firebasestorage.app",
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? "202143687700",
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) ?? "1:202143687700:web:c0a25a48911bdad2157301",
  measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) ?? "G-GJEY9HP0QG",
};

export const FIREBASE_VAPID_KEY =
  (env.VITE_FIREBASE_VAPID_KEY as string | undefined) ??
  "BCELKL_3wUovK5DZmugJQGNvdxaql0lv5KX34xC31z4jeC7MrEC5BirCjU-Qq8nt0o8Wlm68qSQP-nydcc5X9-M";

let app: FirebaseApp | null = null;

/** Single initialization point for the whole app; null outside a browser. */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

let analyticsStarted = false;

/** Fire-and-forget analytics bootstrap; unsupported environments stay silent. */
export function initFirebaseAnalytics(): void {
  if (analyticsStarted || typeof window === "undefined") return;
  analyticsStarted = true;
  void (async () => {
    try {
      const supported = await analyticsIsSupported();
      const firebaseApp = getFirebaseApp();
      if (supported && firebaseApp && firebaseConfig.measurementId) {
        getAnalytics(firebaseApp);
      }
    } catch {
      // Analytics is optional; a failure must never affect the app.
    }
  })();
}

let messagingInstance: Messaging | null = null;
let messagingChecked = false;

/** Messaging only where the browser actually supports web push. */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return null;
  }
  if (messagingChecked) return messagingInstance;
  messagingChecked = true;
  try {
    const supported = await messagingIsSupported();
    const firebaseApp = getFirebaseApp();
    if (supported && firebaseApp) {
      messagingInstance = getMessaging(firebaseApp);
    }
  } catch {
    messagingInstance = null;
  }
  return messagingInstance;
}

export { getToken, deleteToken, onMessage };
export type { Messaging };