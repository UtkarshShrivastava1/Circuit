"use client";
import { useEffect, useState } from "react";

const NotificationPermission = () => {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Fetch current logged-in user email from your session API
    const fetchUserEmail = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          return data.email || null;
        }
      } catch (error) {
        console.error("Failed to fetch user session", error);
      }
      return null;
    };


    const requestAndSavePermission = async (userEmail) => {
      if (!userEmail) return;

      try {
        if ("Notification" in window && !isRegistered) {
          const permission = await Notification.requestPermission();

          if (permission === "granted") {
            await fetch("/api/notificationsPermission", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: userEmail,
                notificationPermission: permission, // expected to be 'granted'
                time: new Date().toISOString(),
              }),
            });
          } else {
            console.log("Notification permission denied.");
          }

          setIsRegistered(true);
        }
      } catch (error) {
        console.error("Error requesting notification permission or saving to MongoDB:", error);
      }
    };

    if (!isRegistered) {
      fetchUserEmail().then((email) => requestAndSavePermission(email));
    }
  }, [isRegistered]);

  return null;
};

export default NotificationPermission;
