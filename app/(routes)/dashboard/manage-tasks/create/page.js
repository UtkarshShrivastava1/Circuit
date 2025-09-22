"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateTaskForm from "../CreateTaskForm.jsx";
import { io } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CreateTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const projectName = searchParams.get("projectName");

  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);

    // Fetch current user data
    async function fetchCurrentUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
        } else {
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data");
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentUser();

    // Cleanup socket connection
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [router]);

  const handleTaskCreated = () => {
    toast.success("Task created successfully!");
    // Redirect to manage tasks page after a short delay
    setTimeout(() => {
      router.push("/dashboard/manage-tasks");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/manage-tasks")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (!projectId || !projectName) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Missing Project Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please select a project before creating a task.
          </p>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Browse Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Create New Task
          </h1>
          <button
            onClick={() => router.push("/dashboard/manage-tasks")}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Tasks
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          <CreateTaskForm
            projectId={projectId}
            projectName={projectName}
            currentUser={currentUser}
            onTaskCreated={handleTaskCreated}
            socket={socket}
          />
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
