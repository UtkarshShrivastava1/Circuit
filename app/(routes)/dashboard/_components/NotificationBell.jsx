"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    socket.emit("join", userId);

    const handleNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    socket.on("notification", handleNotif);

    return () => {
      socket.off("notification", handleNotif);
    };
  }, [userId]);

  return (
    <div className="relative">
      <button className="relative">🔔
        {notifications.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
            {notifications.length}
          </span>
        )}
      </button>
    </div>
  );
}
