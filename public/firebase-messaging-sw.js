importScripts(
  "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js"
);

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDFT5dqJOXtsObZrWmCq2M_BVOfoiCfUhQ",
  authDomain: "zagers-stream.firebaseapp.com",
  projectId: "zagers-stream",
  storageBucket: "zagers-stream.appspot.com",
  messagingSenderId: "14310151385",
  appId: "1:14310151385:web:4df3397d3cbdb1bde99ac8",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  // console.log("Received background message", payload);

  // Ensure notification data is available
  const notificationTitle = payload.data.title || "ZagerStream";
  const notificationBody = payload.data.body || "Received New Update";
  let notificationUrl = "https://zagerstream.vercel.app/dashboard/notifications";

  // Determine URL based on title
  if (notificationTitle.startsWith("New Announcement")) {
    const projectName = notificationTitle.split("at ")[1];
    notificationUrl = `https://zagerstream.vercel.app/dashboard/projects/${projectName}`;
  }

  const notificationOptions = {
    body: notificationBody,
    icon: "/logo.png",
    data: {
      url: notificationUrl
    }
  };

  // console.log("Notification Title:", notificationTitle);
  // console.log("Notification Body:", notificationBody);

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const url = notification.data?.url || '/'; // Default URL or fallback

  event.waitUntil(
    clients.openWindow(url) // Open the URL in a new window/tab
  );
});
