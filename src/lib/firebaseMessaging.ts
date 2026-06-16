// Firebase Cloud Messaging client — opt-in push for the signed-in user.
// Registers the device token in public.fcm_tokens; the send-push edge fn reads it.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  };
}

function isConfigured() {
  const c = getConfig();
  return !!(c.apiKey && c.projectId && c.appId && c.messagingSenderId);
}

async function ensureMessaging(): Promise<Messaging | null> {
  if (!isConfigured()) return null;
  if (!(await isSupported())) return null;
  if (!app) app = getApps()[0] ?? initializeApp(getConfig());
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  try {
    if (!isConfigured()) return { ok: false, reason: "Firebase not configured" };
    if (!("serviceWorker" in navigator)) return { ok: false, reason: "No service worker support" };
    if (Notification.permission === "denied") return { ok: false, reason: "Permission denied" };

    const m = await ensureMessaging();
    if (!m) return { ok: false, reason: "Messaging unsupported" };

    const perm = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "Permission not granted" };

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: "No FCM token returned" };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "Not signed in" };

    const platform = navigator.userAgent.includes("Mobile") ? "mobile-web" : "web";
    await supabase.from("fcm_tokens").upsert(
      { user_id: user.id, token, platform, device_label: navigator.userAgent.slice(0, 80) },
      { onConflict: "user_id,token" },
    );

    onMessage(m, (payload) => {
      console.info("[fcm] foreground", payload);
    });

    return { ok: true };
  } catch (e: any) {
    console.error("[fcm] enable failed", e);
    return { ok: false, reason: e?.message ?? "unknown" };
  }
}

export function isFcmConfigured() {
  return isConfigured();
}
