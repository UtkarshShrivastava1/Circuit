"use client";
import { useState, useEffect, useRef } from "react";
// import Image from "next/image";
import { useRouter } from "next/navigation";
import SideNav from "./SideNav";
import { ModeToggle } from "@/app/_components/DarkModeBtn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HiMenuAlt3 } from "react-icons/hi";
import { Bell } from "lucide-react";
import axios from "axios";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "react-toastify";
// import { io } from "socket.io-client";
import { getSocket } from "@/lib/socket"
// import { messaging } from "firebase-admin";

export default function DashboardHeader() {
  const [userData, setUserData] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const router = useRouter();

  // 🔹 Fetch logged-in session
  useEffect(() => {
    let mounted = true;
    async function fetchSession() {
      try {
        const res = await axios.get("/api/auth/session");
        // console.log("response : ",res.data)
        if (!mounted) return;
        if (res.status === 200)
          { setUserData(res.data);}
        // console.log(userData);
      } catch (error) {
        console.log("Session error:", error);
        setUserData(null);
      }
    }
    fetchSession();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔹 Setup socket
useEffect(() => {
    if (!userData?._id) return;

    const socket = getSocket();

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
      socket.emit("register", userData._id);
    });

    // ✅ attach listener only once
    const handleNotif = (notif) => {
      console.log("📢 Notification received:", notif);
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast.info(notif.message, { autoClose: 4000, theme: "colored" });
    };

    socket.on("notification", handleNotif);

    // cleanup
    return () => {
      socket.off("notification", handleNotif);
    };
  }, [userData?._id]);

  // 🔹 Outside click handler for dropdown
  useEffect(() => {
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  const handleSignOut = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUserData(null);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      router.push("/login");
    }
  };

  const toggleNotif = () => {
    setNotifOpen((s) => !s);
    if (!notifOpen) setUnreadCount(0);
  };

  return (
    <header className="w-full bg-white dark:bg-slate-950 border-b shadow-sm px-3 py-2 md:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Avatar + nav */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open menu"
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <HiMenuAlt3 className="text-2xl" />
                </button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetTitle>Menu</SheetTitle>
                <SideNav />
              </SheetContent>
            </Sheet>
          </div>

          <div
            onClick={() =>
              userData?.email &&
              router.push(`/dashboard/profiles/${encodeURIComponent(userData.email)}`)
            }
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors"
            title={userData?.name || userData?.email}
          >
            <Avatar className="flex-shrink-0" style={{ width: "48px", height: "48px" }}>
              <AvatarImage src={userData?.profileImgUrl || "/user.png"} />
              <AvatarFallback className="text-sm">
                {userData?.name?.[0] || userData?.email?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="hidden sm:flex flex-col overflow-hidden">
              <p className="text-sm md:text-base font-semibold truncate">
                {userData?.name || userData?.email}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {userData?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
            Welcome back{userData?.name ? `, ${userData.name.split(" ")[0]}` : ""}.
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotif}
              aria-expanded={notifOpen}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 shadow-lg rounded-lg z-50">
                <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                  <div className="font-semibold">Notifications</div>
                  <button
                    className="text-xs opacity-70"
                    onClick={() => {
                      setNotifications([]);
                      setUnreadCount(0);
                    }}
                  >
                    Clear
                  </button>
                </div>
                <ul className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      No notifications
                    </li>
                  ) : (
                    notifications.map((n, i) => (
                      <li
                        key={i}
                        className="p-3 border-b dark:border-gray-800 text-sm truncate"
                      >
                        <div className="font-medium">{n.title || "Update"}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {n.message}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          <ModeToggle />

          <div className="hidden sm:block">
            <Button onClick={handleSignOut} variant="outline" className="ml-2">
              Sign Out
            </Button>
          </div>

          <div className="sm:hidden">
            <Button onClick={handleSignOut} variant="ghost" className="p-2">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
