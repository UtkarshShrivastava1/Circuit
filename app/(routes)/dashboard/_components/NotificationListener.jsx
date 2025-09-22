"use client";

import { useEffect } from "react";
import { toast } from "react-toastify";

export default function PushNotificationManager() {
  useEffect(() => {
    async function registerPush() {
      if (!("serviceWorker" in navigator)) {
        console.warn("Service workers not supported");
        return;
      }
      if (!("PushManager" in window)) {
        console.warn("Push messaging not supported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("lib/sw.js");
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          toast.error("Please allow notifications to receive alerts");
          return;
        }

        const existingSubscription = await registration.pushManager.getSubscription();

        if (!existingSubscription) {
          const publicVapidKey = process.env.VAPID_PUBLIC_KEY; // Replace with your VAPID public key
          const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });

          await sendSubscriptionToServer(newSubscription);
        } else {
          await sendSubscriptionToServer(existingSubscription);
        }
      } catch (error) {
        console.error("Failed to register push", error);
      }
    }

    function urlBase64ToUint8Array(base64String) {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
    }

    async function sendSubscriptionToServer(subscription) {
      try {
        await fetch("/api/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        });
        toast.success("Push subscription registered");
      } catch (e) {
        console.error("Failed to send subscription to server", e);
      }
    }

    registerPush();
  }, []);

  return null;
}
