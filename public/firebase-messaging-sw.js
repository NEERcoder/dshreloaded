/* JAVLIN Firebase Cloud Messaging service worker.
 * Public browser-facing configuration only — no Supabase keys, no Firebase
 * Admin credentials. Served from the site root so its scope covers every route.
 * The compat SDK is the supported service-worker build; the version matches
 * the modular SDK the app bundles (13.4.0).
 */
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC3oqtzIYWfKFJvkpU4ajYqWCFHO9iwA-s",
  authDomain: "javlin-1682b.firebaseapp.com",
  projectId: "javlin-1682b",
  storageBucket: "javlin-1682b.firebasestorage.app",
  messagingSenderId: "202143687700",
  appId: "1:202143687700:web:c0a25a48911bdad2157301",
  measurementId: "G-GJEY9HP0QG",
});

const messaging = firebase.messaging();

function safeRoute(raw) {
  // Only same-origin relative paths survive; anything else lands on the inbox.
  if (typeof raw === "string" && /^\/[A-Za-z0-9\-/_]*$/.test(raw) && !raw.startsWith("//")) {
    return raw;
  }
  return "/notifications";
}

messaging.onBackgroundMessage(function (payload) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || data.title || "JAVLIN";
  const body = notification.body || data.body || "You have a new update.";
  const route = safeRoute(data.route);
  // One visible notification per event: the tag collapses repeats instead of
  // stacking duplicates when a delivery is retried.
  const tag = data.notificationId
    ? "javlin-" + data.notificationId
    : "javlin-" + (data.category || "update") + "-" + title;

  self.registration.showNotification(title, {
    body: body,
    tag: tag,
    icon: "/brand/javlin-favicon.png",
    badge: "/brand/javlin-favicon.png",
    data: { route: route },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const route = safeRoute(event.notification.data && event.notification.data.route);
  const target = self.location.origin + route;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          client.focus();
          // An open JAVLIN tab navigates in-app instead of reloading.
          client.postMessage({ type: "javlin-push-click", route: route });
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});