// _components/NotificationBell.js
"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

let socket;

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    socket = io();
    socket.emit("join", userId);

    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [userId]);

  return (
    <div className="relative">
      <button className="relative">
        🔔
        {notifications.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
            {notifications.length}
          </span>
        )}
      </button>
      <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg">
        {notifications.map((n, idx) => (
          <div key={idx} className="p-2 border-b">
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
