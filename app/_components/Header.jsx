"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserHoverCard from "./UserHoverCard";
import { ModeToggle } from "@/app/_components/DarkModeBtn";
import axios from "axios";

export default function Header() {
  const [userData, setUserData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserSession() {
      try {
        const res = await axios.get("/api/auth/session");
        if (res.status !== 200) {
          setUserData(null);
          return;
        }
        const data = res.data;
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        console.error("Error fetching user data and message:", error.message);
        setUserData(null);
      }
    }

    fetchUserSession();
  }, []);

  return (
    <div className="p-5 flex bg-white dark:bg-slate-950 justify-between items-center border shadow-sm">
      <div className="flex flex-row items-center justify-center gap-2">
        <Image
          src={"/Logo.png"}
          className="rounded-full"
          alt="logo" 
          width={40}
          height={25}
        />
        <span style={{ fontFamily: 'Big Shoulders Stencil, cursive' }}
        className="text-blue-800 font-bold dark:text-white text-3xl">
          Circuit
        </span>
      </div>

      <div className="flex gap-3 items-center">
        <ModeToggle />
        <Link href={"/dashboard"}>
          {userData && (
            <button className="rounded-full bg-transparent border border-blue-800 text-blue-800 px-4 py-2 hover:bg-blue-100">
              Dashboard
            </button>
          )}
        </Link>
        {userData ? (
          <div className="relative w-10 h-10">
            <UserHoverCard email={userData.email} />
          </div>
        ) : (
          // Show Login button only if the user is not authenticated
          <Link href={"/login"}>
            <button className="rounded-full bg-blue-800 text-white px-4 py-2 hover:bg-blue-900">
              Login
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

