"use client";
import React, { useEffect, useState } from "react";
import SideNav from "./_components/SideNav";
import DashboardHeader from "./_components/DashboardHeader";
import { useRouter } from "next/navigation";
import Loading from "./_components/Loading";

function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfileState, setUserProfileState] = useState("");

  useEffect(() => {
  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        setUser(null);
        router.push("/login");
        return;
      }
      const userData = await res.json();
      setUser(userData);
      setUserProfileState(userData.profileState);
    } catch {
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
        <div className="loader"><Loading message="Loading data..." />
</div>
        {/* Replace with your loader spinner/component */}
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
