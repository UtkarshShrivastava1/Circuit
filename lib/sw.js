/* /public/sw.js */

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error("Push event data parsing failed:", err);
    return;
  }

  const title = data.title || "New Notification";
  const options = {
    body: data.message || "",
    icon: "/icons/Logo.png", // put your app icon in /public/icons/
    badge: "/icons/icon-72x72.png",  // optional small badge
    data: { url: data.url || "/" },  // store URL for click handling
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus if already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ action: "navigate", url: targetUrl });
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
