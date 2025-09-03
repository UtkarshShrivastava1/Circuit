'use client';
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SideNav from "./SideNav";
import UserHoverCard from "@/app/_components/UserHoverCard";
import { ModeToggle } from "@/app/_components/DarkModeBtn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HiMenuAlt3 } from "react-icons/hi";
import axios from "axios";

function DashboardHeader() {
  const [userData, setUserData] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await axios.get("/api/auth/session");
        if (res.status !== 200) {
          setUserData(null);
          return;
        }
        setUserData(res.data);
      } catch (error) {
        setUserData(null);
      }
    }
    fetchSession();
  }, []);

  const handleSignOut = async () => {
    try {
      await axios.post("/api/auth/logout"); // <-- Use POST, consistent endpoint
      setUserData(null);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      router.push("/login"); // <-- Always redirect, even if logout fails
    }
  };

  return (
    <div className="p-3 bg-white dark:bg-slate-950 shadow-sm border-b flex justify-between items-center">
      <div className="flex items-center gap-2">
        {userData?.profileImgUrl ? (
          <div className="relative w-14 h-14">
            <UserHoverCard email={userData.email} />
          </div>
        ) : (
          <Image
            src="/user.png"
            className="rounded-full border-2 border-slate-300"
            alt="Default Profile"
            width={56}
            height={56}
          />
        )}
        <div className="flex flex-col overflow-hidden">
          <p className="text-md font-bold truncate">{userData?.name}</p>
          <p className="text-sm text-gray-600">{userData?.role}</p>
        </div>
      </div>
      <div className="flex gap-1 items-center justify-center">
        <ModeToggle />
        <Button onClick={handleSignOut} variant="outline" className="ml-2">
          Sign Out
        </Button>
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
