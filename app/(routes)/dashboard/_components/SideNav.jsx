// 'use client';
// import React, { useEffect, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import Link from 'next/link';
// import Image from 'next/image';
// import { MdNotifications } from 'react-icons/md';
// import { ImUserPlus } from 'react-icons/im';
// import { FaFileCirclePlus, FaCopy } from 'react-icons/fa6';
// import { RiFolderChartFill } from 'react-icons/ri';
// import { HiMiniUserGroup } from 'react-icons/hi2';
// import { BsCalendarCheck, BsClipboardCheck } from 'react-icons/bs';

// function SideNav({ setIsMobileSidebarOpen }) {
//   const [userRole, setUserRole] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();
//   const path = usePathname();

//   // Fetch session and user role
//   useEffect(() => {
//     async function fetchSession() {
//       try {
//         const res = await fetch("/api/auth/session");
//         if (!res.ok) {
//           setUserRole(null);
//           router.push("/login");
//           return;
//         }
//         const data = await res.json();
//         setUserRole(data.role);
//       } catch (error) {
//         setUserRole(null);
//         router.push("/login");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchSession();
//   }, [router]);

//   // Menu entries for all roles
//   const baseMenu = [
//     { id: 1, name: "My Projects", path: "/dashboard", icon: <FaCopy className="text-xl" /> },
//     { id: 2, name: "All Projects", path: "/dashboard/projects", icon: <RiFolderChartFill className="text-xl" /> },
//     { id: 3, name: "Notifications", path: "/dashboard/notifications", icon: <MdNotifications className="text-xl" /> },
//     { id: 5, name: "Attendance", path: "/dashboard/attendance-management", icon: <BsClipboardCheck className="text-xl" /> },
//     { id: 4, name: "Members", path: "/dashboard/profiles", icon: <HiMiniUserGroup className="text-xl" /> },
//     { id: 7, name: "Manage Tasks", path: "/dashboard/manage-tasks", icon: <RiFolderChartFill className="text-xl" /> },
//     { id: 10, name: "Leave Management", path: "/dashboard/leave", icon: <BsCalendarCheck className="text-xl" /> },
//   ];


//   // Manager and admin only
//   const managerMenu = [
    
//     { id: 8, name: "Create Project", path: "/dashboard/create-project", icon: <FaFileCirclePlus className="text-xl" /> },
//     { id: 9, name: "Add New User", path: "/dashboard/create", icon: <ImUserPlus className="text-xl" /> },
//   ];

//   // Build menu list based on user role
//   let menuList = [...baseMenu];
//   if (userRole === "member") menuList = [...baseMenu, ];
//   if (userRole === "manager") menuList = [...baseMenu,  ...managerMenu];
//   if (userRole === "admin") menuList = [...baseMenu, ...managerMenu,];

//   // Loading state
//   if (loading) {
//     return (
//       <div className="h-full p-5 flex flex-col justify-between border bg-white dark:bg-slate-950 shadow-sm">
//         <div className="flex-grow flex justify-center items-center">
//           <div className="animate-pulse flex items-center space-x-2">
//             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
//             <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Close sidebar on mobile after menu click
//   const handleMenuClick = () => {
//     if (typeof window !== 'undefined' && window.innerWidth < 768) {
//       setIsMobileSidebarOpen(false);
//     }
//   };

//   return (
//     <nav className="h-full min-h-screen flex flex-col p-4 border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
//       {/* Logo & headline */}
//       <div className="py-4 mb-6 border-b border-gray-200 dark:border-gray-700">
//         <div className="flex items-center gap-3 ml-3">
//           <Image
//             src={"/Logo.png"}
//             className="rounded-full object-cover"
//             alt="Circuit Logo"
//             width={40}
//             height={40}
//             priority
//           />
//           <h1 
//             style={{ fontFamily: 'Big Shoulders Stencil, cursive' }}
//             className="text-xl font-bold text-gray-800 dark:text-white">
//             Circuit
//           </h1>
//         </div>
//       </div>

//       {/* Menu */}
//       <div className="flex-grow flex flex-col gap-1 overflow-y-auto">
//         {menuList.map((menu) => (
//           <Link
//             key={menu.id}
//             href={menu.path}
//             onClick={handleMenuClick}
//             className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-800 ${path === menu.path ? "bg-blue-500 text-white hover:bg-blue-600" : ""}`}
//           >
//             <span className="text-2xl">{menu.icon}</span>
//             <span className="font-medium text-sm md:text-base">{menu.name}</span>
//           </Link>
//         ))}
//       </div>
//     </nav>
//   );

// }

// export default SideNav;

"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MdNotifications } from "react-icons/md";
import { ImUserPlus } from "react-icons/im";
import { FaFileCirclePlus, FaCopy } from "react-icons/fa6";
import { RiFolderChartFill } from "react-icons/ri";
import { HiMiniUserGroup } from "react-icons/hi2";
import { BsCalendarCheck, BsClipboardCheck } from "react-icons/bs";
import { io } from "socket.io-client";

function SideNav({ setIsMobileSidebarOpen }) {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const router = useRouter();
  const path = usePathname();

  // Fetch session and user role
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          setUserRole(null);
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUserRole(data.role);
      } catch (error) {
        setUserRole(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  // 🔹 Setup socket listener for task notifications
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin);

    socket.on("taskCreated", (notif) => {
      // console.log("📢 Task notification:", notif);

      // Example: Only increment Manage Tasks notifications
      setNotifications((prev) => ({
        ...prev,
        "/dashboard/manage-tasks": (prev["/dashboard/manage-tasks"] || 0) + 1,
      }));
    });

    console.log('notifications.length',Object.keys(notifications).length );

    return () => socket.disconnect();
  }, []);

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

  // Menu entries
  const baseMenu = [
    { id: 1, name: "My Projects", path: "/dashboard", icon: <FaCopy className="text-xl" /> },
    { id: 2, name: "All Projects", path: "/dashboard/projects", icon: <RiFolderChartFill className="text-xl" /> },
    { id: 3, name: "Notifications", path: "/dashboard/notifications", icon: <MdNotifications className="text-xl" /> },
    { id: 5, name: "Attendance", path: "/dashboard/attendance-management", icon: <BsClipboardCheck className="text-xl" /> },
    { id: 4, name: "Members", path: "/dashboard/profiles", icon: <HiMiniUserGroup className="text-xl" /> },
    { id: 7, name: "Manage Tasks", path: "/dashboard/manage-tasks", icon: <RiFolderChartFill className="text-xl" /> },
    { id: 10, name: "Leave Management", path: "/dashboard/leave", icon: <BsCalendarCheck className="text-xl" /> },
  ];

  const managerMenu = [
    { id: 8, name: "Create Project", path: "/dashboard/create-project", icon: <FaFileCirclePlus className="text-xl" /> },
    { id: 9, name: "Add New User", path: "/dashboard/create", icon: <ImUserPlus className="text-xl" /> },
  ];

  let menuList = [...baseMenu];
  if (userRole === "manager") menuList = [...baseMenu, ...managerMenu];
  if (userRole === "admin") menuList = [...baseMenu, ...managerMenu];

  // Loading state
  if (loading) {
    return (
      <div className="h-full p-5 flex flex-col justify-between border bg-white dark:bg-slate-950 shadow-sm">
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <nav className="h-full min-h-screen flex flex-col p-4 border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      {/* Logo */}
      <div className="py-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 ml-3">
          <Image
            src={"/Logo.png"}
            className="rounded-full object-cover"
            alt="Circuit Logo"
            width={40}
            height={40}
            priority
          />
          <h1
            style={{ fontFamily: "Big Shoulders Stencil, cursive" }}
            className="text-xl font-bold text-gray-800 dark:text-white"
          >
            Circuit
          </h1>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-grow flex flex-col gap-1 overflow-y-auto">
        {menuList.map((menu) => (
          <Link
            key={menu.id}
            href={menu.path}
            onClick={handleMenuClick}
            className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-800 ${
              path === menu.path ? "bg-blue-500 text-white hover:bg-blue-600" : ""
            }`}
          >
            <span className="text-2xl">{menu.icon}</span>
            <span className="font-medium text-sm md:text-base">{menu.name}</span>

            {/* 🔔 Notification badge */}
            {notifications[menu.path] > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {notifications[menu.path]}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="block sm:hidden mt-auto px-3">
  <button
    onClick={handleSignOut}
    className="w-full py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
  >
    Sign Out
  </button>
</div>
    </nav>
  );
}

export default SideNav;
