"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";

let socket;

export function useSocket(userId, onNotification) {
  useEffect(() => {
    if (!userId) return;

    socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
      socket.emit("register", userId); // register this user
    });

    socket.on("notification", (data) => {
      console.log("🔔 New Notification:", data);
      if (onNotification) onNotification(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return socket;
}
