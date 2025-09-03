"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MdNotifications } from "react-icons/md";
import { ImUserPlus } from "react-icons/im";
import { FaFileCirclePlus, FaCopy } from "react-icons/fa6";
import { RiFolderChartFill } from "react-icons/ri";
import { HiMiniUserGroup } from "react-icons/hi2";
import { BsCalendarCheck, BsClipboardCheck } from "react-icons/bs";

function SideNav() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const path = usePathname();

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
        setUserRole(data.role); // "member" | "manager" | "admin"
      } catch (error) {
        setUserRole(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  const baseMenu = [

    {
      id: 2,
      name: "All Projects",
      path: "/dashboard/projects",
      icon: <RiFolderChartFill className="text-xl" />,
    },
    {
      id: 3,
      name: "Notifications",
      path: "/dashboard/notifications",
      icon: <MdNotifications className="text-xl" />,
    },
    {
      id: 4,
      name: "Members",
      path: "/dashboard/profiles",
      icon: <HiMiniUserGroup className="text-xl" />,
    },
      {
    id: 7,
    name: "Manage Tasks",
    path: "/dashboard/manage-tasks",
    icon: <RiFolderChartFill className="text-xl" />,
  },
  ];

  // 📌 Only for member + manager
  const attendanceMenu = [
    {
      id: 5,
      name: "Mark Attendance",
      path: "/dashboard/attendance",
      icon: <BsCalendarCheck className="text-xl" />,
    },
        {
      id: 1,
      name: "My Projects",
      path: "/dashboard",
      icon: <FaCopy className="text-xl" />,
    },
  ];

  // 📌 Manager-only menu
  const managerMenu = [
  {
    id: 6,
    name: "Attendance",
    path: "/dashboard/attendance-management",
    icon: <BsClipboardCheck className="text-xl" />,
  },

  {
    id: 8,
    name: "Create Project",
    path: "/dashboard/create-project",
    icon: <FaFileCirclePlus className="text-xl" />,
  },
  {
    id: 9,
    name: "Add New User",
    path: "/dashboard/create",
    icon: <ImUserPlus className="text-xl" />,
  },
  ];



  // Build final menu depending on role
  let menuList = [...baseMenu];

  if (userRole === "member") menuList = [...baseMenu, ...attendanceMenu,];
  if (userRole === "manager") menuList = [...baseMenu,  ...attendanceMenu, ...managerMenu,];
  if (userRole === "admin") menuList = [...baseMenu,  ...managerMenu, ];

  if (loading) {
    return (
      <div className="h-full md:h-screen p-5 flex flex-col justify-between border bg-white dark:bg-slate-950 shadow-sm">
        <div className="flex-grow flex justify-center items-center">
          <div className="loader">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full md:h-screen p-5 flex flex-col justify-between border dark:bg-slate-950 bg-white shadow-sm">
      {/* Logo Section */}
      <div className="border-b">
        <div className="flex flex-row gap-2 mb-2 w-full justify-center items-center">
          <Image
            src={"/Logo.jpeg"}
            className="rounded-full"
            alt="logo"
            width={50}
            height={50}
          />
          <Link href={"/"}>
            <span className="text-slate-800 dark:text-white font-bold text-xl">
              Circuit
            </span>
          </Link>
        </div>
      </div>

      {/* Menu Section */}
      <div className="flex-grow flex flex-col justify-center">
        {menuList.map((menu) => (
          <Link href={menu.path} key={menu.id}>
            <h2
              className={`flex gap-2 text-gray-600 font-medium mb-4 p-3 cursor-pointer rounded-lg
                hover:bg-blue-50 items-center hover:text-blue-800 transition-colors duration-200
                ${path === menu.path && "text-white bg-blue-500 dark:bg-blue-500"}`}
            >
              {menu.icon}
              {menu.name}
            </h2>
          </Link>
        ))}
      </div>

      {/* Sign Out Section */}
      <div className="flex justify-center items-center">
        {/* <Button
          onClick={handleSignOut}
          className="w-full py-2 px-4 text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Sign Out
        </Button> */}
      </div>
    </div>
  );
}

export default SideNav;
