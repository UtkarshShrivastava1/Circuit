"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SideNav from "./SideNav";
import { ModeToggle } from "@/app/_components/DarkModeBtn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HiMenuAlt3 } from "react-icons/hi";
import { Bell } from "lucide-react"; 
import axios from "axios";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
// ✅ React Toastify
import { toast } from "react-toastify";
import { io } from "socket.io-client";

function DashboardHeader() {
  const [userData, setUserData] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0); 
  const router = useRouter();

useEffect(() => {
    async function fetchSession() {
      try {
        const res = await axios.get("/api/auth/session");
        if (res.status === 200) {
          setUserData(res.data);
        }
      } catch (error) {
        console.log("Session error:", error);
        setUserData(null);
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
  if (!userData?._id) return;

  const socket = io("http://localhost:3000");

  socket.on("connect", () => {
    console.log("✅ Connected:", socket.id);
    socket.emit("register", userData._id); // register this user
  });

  socket.on("notification", (notif) => {
    console.log("📢 Notification received:", notif);

    setNotifications((prev) => [...prev, notif]);
    setUnreadCount((prev) => prev + 1);

    toast.info(notif.message, {
      position: "top-right",
      autoClose: 4000,
      theme: "colored",
    });
  });

  return () => socket.disconnect();
}, [userData]);


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

  const handleNotificationClick = () => {
    // ✅ Reset unread count after showing them
    setUnreadCount(0);
  };

  return (
    <div className="p-3 bg-white dark:bg-slate-950 shadow-sm border-b flex justify-between items-center">
      {/* Left - Profile */}
      <div className="flex items-center gap-2">
        <div
          onClick={() => {
            if (userData?.email) {
              router.push(`/dashboard/profiles/${encodeURIComponent(userData.email)}`);
            }
          }}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
        >
          <Avatar className="w-14 h-14 flex-shrink-0">
            <AvatarImage src={userData?.profileImgUrl || '/user.png'} />
            <AvatarFallback>
              {userData?.name?.[0] || userData?.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <p className="text-md font-bold truncate">{userData?.name}</p>
            <p className="text-sm text-gray-600">{userData?.role}</p>
          </div>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex gap-3 items-center justify-center">
     <div className="relative">
  <button
    onClick={handleNotificationClick}
    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    <Bell className="h-6 w-6" />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
        {unreadCount}
      </span>
    )}
  </button>

  {/* Dropdown */}
  {notifications.length > 0 && (
    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 shadow-lg rounded-lg z-50">
      <ul className="max-h-60 overflow-y-auto">
        {notifications.map((n, i) => (
          <li key={i} className="p-2 border-b dark:border-gray-700">
            {n.message}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>

        <ModeToggle />
        <Button onClick={handleSignOut} variant="outline" className="ml-2">
          Sign Out
        </Button>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button>
                <HiMenuAlt3 className="text-4xl" />
              </button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle>Menu</SheetTitle>
              <SideNav />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;
