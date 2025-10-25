"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/app/(routes)/dashboard/_components/ProjectCard";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Loading from "./_components/Loading";
import { FolderX } from "lucide-react";
import { io } from "socket.io-client";

const MyProjects = ({ customEmail, heading }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const displayHeading = heading || "My Projects";

  // ✅ Socket.io setup
  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
    });

    socket.on("hello", (msg, callback) => {
      console.log("👋 Server says:", msg);
      callback("got it"); // ack back
    });

    // Example: send event to server
    socket.emit("ping", "Hello server!");

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ Fetch projects
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // ✅ Check user session
        const sessionRes = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!sessionRes.ok) {
          router.push("/login");
          return;
        }

        const userData = await sessionRes.json();
        const userEmail = customEmail || userData.email;

        // ✅ Fetch all projects
        const projectsRes = await fetch("/api/projects/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        const allProjects = await projectsRes.json();

        // ✅ Filter projects where user is participant
        const userProjects = allProjects.filter((project) =>
          project.participants.some(
            (participant) => participant.email === userEmail
          )
        );

        // ✅ Sort projects: ongoing first, then completed
        const statePriority = { ongoing: 1, completed: 2 };
        const sortedProjects = userProjects.sort((a, b) => {
          const stateComp =
            (statePriority[a.projectState] ?? 99) -
            (statePriority[b.projectState] ?? 99);
          if (stateComp !== 0) return stateComp;
          return new Date(b.startDate) - new Date(a.startDate);
        });

        setProjects(sortedProjects);
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("⏹️ Fetch aborted (component unmounted)");
          return;
        }
        console.error("❌ Error fetching projects or user data:", error);
        toast.error("Error loading projects");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Cleanup → abort fetch if component unmounts
    return () => controller.abort();
  }, [customEmail, router]);

  if (loading)
    return (
      <div className="flex justify-center">
        <Loading message="Loading data..." />
      </div>
    );

  return (
    <>
      <h2 className="text-xl py-2 px-2 font-bold pt-1">{displayHeading}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project._id || project.id} project={project} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white shadow-md border border-gray-100">
            <FolderX className="w-14 h-14 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No projects available
            </h2>
            <p className="text-gray-500 mb-6">
              You haven’t created any projects yet.
              <br />
              Start your first project to see it appear here!
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default MyProjects;

// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import {
//   BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
//   CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
// } from "recharts";
// import {
//   Calendar, Users, CheckCircle, Clock, TrendingUp, TrendingDown,
//   Target, Activity, Award, AlertTriangle, Briefcase, FileText,
//   User, Home, Building2, Timer, CalendarDays, BookOpen
// } from "lucide-react";

// const ModernDashboard = () => {
//   const [userRole, setUserRole] = useState("");
//   const [userId, setUserId] = useState(null);
//   const [userName, setUserName] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [dashboardData, setDashboardData] = useState({
//     attendance: [],
//     tasks: [],
//     projects: [],
//     leaves: [],
//     overview: {}
//   });

//   // Mock data generator - in real app, this would come from API calls
//   const generateMockData = useCallback((role, userId) => {
//     const today = new Date();
//     const last30Days = Array.from({ length: 30 }, (_, i) => {
//       const date = new Date(today);
//       date.setDate(date.getDate() - i);
//       return date;
//     }).reverse();

//     // Attendance data for last 30 days
//     const attendanceData = last30Days.map((date) => ({
//       date: date.toISOString().split("T")[0],
//       present: Math.random() > 0.15 ? 1 : 0,
//       wfh: Math.random() > 0.7 ? 1 : 0,
//       office: Math.random() > 0.3 ? 1 : 0
//     }));

//     // Task completion data
//     const taskData = [
//       { month: "Jan", completed: 12, pending: 3, overdue: 1 },
//       { month: "Feb", completed: 15, pending: 2, overdue: 0 },
//       { month: "Mar", completed: 18, pending: 4, overdue: 2 },
//       { month: "Apr", completed: 22, pending: 1, overdue: 0 },
//       { month: "May", completed: 25, pending: 3, overdue: 1 }
//     ];

//     // Project distribution
//     const projectData =
//       role === "member"
//         ? [
//             { name: "E-commerce Platform", value: 40, color: "#3b82f6" },
//             { name: "Mobile App", value: 35, color: "#10b981" },
//             { name: "Analytics Dashboard", value: 25, color: "#f59e0b" }
//           ]
//         : [
//             { name: "E-commerce Platform", value: 25, color: "#3b82f6" },
//             { name: "Mobile App", value: 20, color: "#10b981" },
//             { name: "Analytics Dashboard", value: 15, color: "#f59e0b" },
//             { name: "CRM System", value: 20, color: "#8b5cf6" },
//             { name: "Marketing Site", value: 20, color: "#ef4444" }
//           ];

//     // Performance metrics
//     const performanceData = [
//       { week: "W1", efficiency: 85, quality: 92 },
//       { week: "W2", efficiency: 88, quality: 94 },
//       { week: "W3", efficiency: 82, quality: 90 },
//       { week: "W4", efficiency: 91, quality: 96 }
//     ];

//     // Overview stats based on role
//     const overview =
//       role === "member"
//         ? {
//             totalTasks: 28,
//             completedTasks: 25,
//             pendingTasks: 3,
//             overdueTask: 0,
//             attendance: "96%",
//             projectsAssigned: 3,
//             leaveBalance: 18,
//             avgRating: 4.2
//           }
//         : {
//             totalEmployees: 45,
//             totalProjects: 12,
//             activeProjects: 8,
//             completedProjects: 4,
//             teamAttendance: "92%",
//             totalTasks: 284,
//             pendingApprovals: 7,
//             monthlyBudget: "$85,000"
//           };

//     return {
//       attendance: attendanceData,
//       tasks: taskData,
//       projects: projectData,
//       performance: performanceData,
//       overview
//     };
//   }, []);

//   // Simulate API calls and authentication
//   useEffect(() => {
//     const initializeDashboard = async () => {
//       setLoading(true);

//       // Safe access to localStorage (file is client but guard is harmless)
//       const token = typeof window !== "undefined" ? localStorage.getItem("token") || "mock-token" : "mock-token";

//       // Mock user session - replace with real API call
//       const mockUserSession = {
//         id: "12345",
//         name: "John Doe",
//         role: "member", // Change this to 'admin' or 'manager' to see different views
//         email: "john.doe@company.com"
//       };

//       setUserId(mockUserSession.id);
//       setUserName(mockUserSession.name);
//       setUserRole(mockUserSession.role);

//       // Generate mock data based on user role
//       const data = generateMockData(mockUserSession.role, mockUserSession.id);
//       setDashboardData(data);

//       setLoading(false);
//     };

//     initializeDashboard();
//   }, [generateMockData]);

//   // Custom components
//   const StatCard = ({ title, value, icon: Icon, change, changeType, color = "blue" }) => {
//     const colorMap = {
//       blue: "from-blue-500 to-blue-600",
//       green: "from-green-500 to-green-600",
//       yellow: "from-yellow-500 to-yellow-600",
//       purple: "from-purple-500 to-purple-600",
//       red: "from-red-500 to-red-600"
//     };

//     return (
//       <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-200 dark:border-slate-700">
//         <div className="flex items-center justify-between">
//           <div>
//             <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
//             <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
//             {change && (
//               <div
//                 className={`flex items-center mt-2 text-sm ${
//                   changeType === "positive" ? "text-green-600" : "text-red-600"
//                 }`}
//               >
//                 {changeType === "positive" ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
//                 {change}
//               </div>
//             )}
//           </div>
//           <div className={`p-3 rounded-full bg-gradient-to-r ${colorMap[color]}`}>
//             <Icon className="w-6 h-6 text-white" />
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const ChartCard = ({ title, children, className = "" }) => (
//     <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
//       {children}
//     </div>
//   );

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   const renderMemberDashboard = () => (
//     <div className="space-y-6">
//       {/* Personal Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard
//           title="Tasks Completed"
//           value={dashboardData.overview.completedTasks}
//           icon={CheckCircle}
//           change="+12% this month"
//           changeType="positive"
//           color="green"
//         />
//         <StatCard
//           title="Pending Tasks"
//           value={dashboardData.overview.pendingTasks}
//           icon={Clock}
//           change="-25% from last week"
//           changeType="positive"
//           color="yellow"
//         />
//         <StatCard
//           title="Attendance Rate"
//           value={dashboardData.overview.attendance}
//           icon={Calendar}
//           change="+2% this month"
//           changeType="positive"
//           color="blue"
//         />
//         <StatCard
//           title="Leave Balance"
//           value={`${dashboardData.overview.leaveBalance} days`}
//           icon={CalendarDays}
//           color="purple"
//         />
//       </div>

//       {/* Charts Row */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <ChartCard title="Monthly Task Completion">
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={dashboardData.tasks}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="month" stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//               />
//               <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
//               <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
//               <Bar dataKey="overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Project Distribution">
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie data={dashboardData.projects} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value">
//                 {dashboardData.projects.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.color} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="mt-4 space-y-2">
//             {dashboardData.projects.map((project, index) => (
//               <div key={index} className="flex items-center justify-between">
//                 <div className="flex items-center">
//                   <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: project.color }}></div>
//                   <span className="text-sm text-gray-600 dark:text-gray-400">{project.name}</span>
//                 </div>
//                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.value}%</span>
//               </div>
//             ))}
//           </div>
//         </ChartCard>
//       </div>

//       {/* Attendance and Performance */}
//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//         <ChartCard title="Attendance Overview (Last 30 Days)">
//           <ResponsiveContainer width="100%" height={250}>
//             <AreaChart data={dashboardData.attendance.slice(-15)}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="date" stroke="#6b7280" tickFormatter={(value) => new Date(value).getDate()} />
//               <YAxis domain={[0, 1]} stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//                 labelFormatter={(value) => `Date: ${value}`}
//                 formatter={(value) => [value === 1 ? "Present" : "Absent", "Status"]}
//               />
//               <Area type="monotone" dataKey="present" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Performance Metrics">
//           <ResponsiveContainer width="100%" height={250}>
//             <LineChart data={dashboardData.performance}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="week" stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//               />
//               <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }} />
//               <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", strokeWidth: 2, r: 6 }} />
//             </LineChart>
//           </ResponsiveContainer>
//         </ChartCard>
//       </div>
//     </div>
//   );

//   const renderManagerAdminDashboard = () => (
//     <div className="space-y-6">
//       {/* Management Overview */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard
//           title="Total Employees"
//           value={dashboardData.overview.totalEmployees}
//           icon={Users}
//           change="+3 this month"
//           changeType="positive"
//           color="blue"
//         />
//         <StatCard
//           title="Active Projects"
//           value={dashboardData.overview.activeProjects}
//           icon={Briefcase}
//           change="+2 this quarter"
//           changeType="positive"
//           color="green"
//         />
//         <StatCard
//           title="Team Attendance"
//           value={dashboardData.overview.teamAttendance}
//           icon={Activity}
//           change="+1.5% this month"
//           changeType="positive"
//           color="purple"
//         />
//         <StatCard
//           title="Pending Approvals"
//           value={dashboardData.overview.pendingApprovals}
//           icon={AlertTriangle}
//           change="-3 from yesterday"
//           changeType="positive"
//           color="yellow"
//         />
//       </div>

//       {/* Extended Management Charts */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <ChartCard title="Project Progress" className="lg:col-span-2">
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={dashboardData.tasks}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="month" stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//               />
//               <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
//               <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
//               <Bar dataKey="overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Resource Allocation">
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie data={dashboardData.projects} cx="50%" cy="50%" outerRadius={80} paddingAngle={5} dataKey="value">
//                 {dashboardData.projects.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.color} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="mt-4 space-y-1">
//             {dashboardData.projects.map((project, index) => (
//               <div key={index} className="flex items-center justify-between text-xs">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: project.color }}></div>
//                   <span className="text-gray-600 dark:text-gray-400 truncate">{project.name}</span>
//                 </div>
//                 <span className="font-medium text-gray-900 dark:text-gray-100">{project.value}%</span>
//               </div>
//             ))}
//           </div>
//         </ChartCard>
//       </div>

//       {/* Team Performance and Attendance Analytics */}
//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//         <ChartCard title="Team Performance Trends">
//           <ResponsiveContainer width="100%" height={300}>
//             <AreaChart data={dashboardData.performance}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="week" stroke="#6b7280" />
//               <YAxis stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//               />
//               <Area type="monotone" dataKey="efficiency" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
//               <Area type="monotone" dataKey="quality" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Attendance Analytics">
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={dashboardData.attendance.slice(-14)}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
//               <XAxis dataKey="date" stroke="#6b7280" tickFormatter={(value) => new Date(value).getDate()} />
//               <YAxis stroke="#6b7280" />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "#1f2937",
//                   border: "none",
//                   borderRadius: "8px",
//                   color: "#fff"
//                 }}
//                 labelFormatter={(value) => `Date: ${value}`}
//               />
//               <Line type="monotone" dataKey="office" stroke="#3b82f6" strokeWidth={2} name="Office" />
//               <Line type="monotone" dataKey="wfh" stroke="#10b981" strokeWidth={2} name="WFH" />
//             </LineChart>
//           </ResponsiveContainer>
//         </ChartCard>
//       </div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
//       <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
//               <p className="text-gray-600 dark:text-gray-400 mt-1">
//                 Welcome back, {userName} • {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ""}
//               </p>
//             </div>
//             <div className="flex items-center space-x-4">
//               <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
//                 <div className="flex items-center space-x-2">
//                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//                   <span className="text-sm text-gray-600 dark:text-gray-400">Live Data</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Role-based Dashboard Content */}
//         {userRole === "member" ? renderMemberDashboard() : renderManagerAdminDashboard()}

//         {/* Quick Actions Footer */}
//         <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
//           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
//           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
//             {userRole === "member" ? (
//               <>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
//                   <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
//                   <span className="text-sm text-blue-700 dark:text-blue-300">Mark Attendance</span>
//                 </button>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
//                   <FileText className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
//                   <span className="text-sm text-green-700 dark:text-green-300">View Tasks</span>
//                 </button>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
//                   <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
//                   <span className="text-sm text-purple-700 dark:text-purple-300">Request Leave</span>
//                 </button>
//               </>
//             ) : (
//               <>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
//                   <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
//                   <span className="text-sm text-blue-700 dark:text-blue-300">Manage Team</span>
//                 </button>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
//                   <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
//                   <span className="text-sm text-green-700 dark:text-green-300">Projects</span>
//                 </button>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors">
//                   <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mb-2" />
//                   <span className="text-sm text-yellow-700 dark:text-yellow-300">Approvals</span>
//                 </button>
//                 <button className="flex flex-col items-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
//                   <Activity className="w-6 h-6 text-red-600 dark:text-red-400 mb-2" />
//                   <span className="text-sm text-red-700 dark:text-red-300">Reports</span>
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ModernDashboard;
