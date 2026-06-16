// Firebase Cloud Messaging service worker — runs background push.
// Must be served from origin root: /firebase-messaging-sw.js
/* eslint-disable */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// NOTE: these placeholders are replaced at runtime via the page postMessage,
// OR you can hard-code your public Firebase web config below.
// For now they remain empty; push will silently no-op until configured.
firebase.initializeApp({
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
  messagingSenderId: "",
});

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    const link = payload.data?.link || "/";
    self.registration.showNotification(title || "FinTrack AI", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link },
    });
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || "/";
    event.waitUntil(clients.openWindow(link));
  });
} catch (e) {
  // Firebase not configured yet — service worker stays inert.
}
