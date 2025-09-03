"use client";
// import { useEffect, useRef, useState } from "react";
// import { getMessaging, getToken } from "firebase/messaging";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged } from "firebase/auth";

const NotificationPermission = () => {
  // const registrationRef = useRef(null);
  // const [isRegistered, setIsRegistered] = useState(false);

  // useEffect(() => {
  //   const registerServiceWorkerAndRequestToken = async (user) => {
  //     try {
  //       if (!registrationRef.current) {
  //         registrationRef.current = await navigator.serviceWorker.register(
  //           "/firebase-messaging-sw.js"
  //         );
  //       }

  //       const messaging = getMessaging();
  //       const permission = await Notification.requestPermission();

  //       if (permission === "granted") {
  //         const fcmToken = await getToken(messaging, {
  //           vapidKey:
  //             "BJDlK88EZFINwvRvsoze11NcYHC_pbQ8SX5faZUqfYxO77m8IiBs_ZBgmuACiy-XDMMdAtYqCZxTrZjDAs09qlE",
  //           serviceWorkerRegistration: registrationRef.current,
  //         });

  //         if (fcmToken) {
  //           // Call your backend API to store token in MongoDB
  //           // F:\Projects\Circuit\TaskZ\app\(routes)\dashboard\notifications
  //           await fetch("/api/notifications", {
  //             method: "POST",
  //             headers: {
  //               "Content-Type": "application/json",
  //             },
  //             body: JSON.stringify({
  //               email: user.email,
  //               token: fcmToken,
  //             }),
  //           });
  //         } else {
  //           console.log("No FCM token received.");
  //         }
  //       } else {
  //         console.log("Notification permission denied.");
  //       }

  //       setIsRegistered(true);
  //     } catch (error) {
  //       console.error("Error requesting permission or storing token:", error);
  //     }
  //   };

  //   const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
  //     if (user && !isRegistered) {
  //       registerServiceWorkerAndRequestToken(user);
  //     }
  //   });

  //   return () => {
  //     if (unsubscribeFromAuth) unsubscribeFromAuth();
  //   };
  // }, [isRegistered]);

  // return null;
};

export default NotificationPermission;
