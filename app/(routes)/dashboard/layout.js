"use client";
import React, { useEffect, useState } from "react";
import SideNav from "./_components/SideNav";
import DashboardHeader from "./_components/DashboardHeader";
import { useRouter } from "next/navigation";
import Loading from "./_components/Loading";
import axios from 'axios'

function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfileState, setUserProfileState] = useState("");

useEffect(() => {
  async function fetchSession() {
    try {
      const res = await axios.get("/api/auth/session");

      if (res.status !== 200) {
        setUser(null);
        router.push("/login");
        return;
      }

      const userData = res.data;
      setUser(userData);
      setUserProfileState(userData.profileState);
    } catch (error) {
      console.error("Session fetch error:", error);
      setUser(null);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  fetchSession();
}, [router]);


  useEffect(() => {
    if (userProfileState === "deactived") {
      setLoading(true);
      router.push("/not-allowed");
    }
  }, [userProfileState, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader"><Loading message="Please wait, fetching data..." />
</div>
       
      </div>
    );
  }

  return (
    <div>
      <div className="fixed md:w-64 hidden md:block">
        <SideNav />
      </div>
      <div className="md:ml-64">
        <DashboardHeader />
        <div className="p-2 md:p-5">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
