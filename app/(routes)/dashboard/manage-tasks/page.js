"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { Button } from "@/components/ui/button";
import "react-toastify/dist/ReactToastify.css";

export default function ManageAllTasks() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const userId = searchParams.get("userId") || "";

const projectName = searchParams.get("projectName") || "";  

  useEffect(() => {
    async function fetchUserRole() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        setUserRole(user.role);
      } else {
        router.push("/login");
      }
    }
    fetchUserRole();
  }, [router]);


  // useEffect(()=>{
  //   async function fetchTasksForUser(){
       
  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       router.push("/login");
  //       return;
  //     }
  //     try {
  //         setTasksLoading(true);
  //       let apiUrl = "/api/tasks";
  //       if (projectName && projectName.trim() !== "") {
  //         apiUrl += `?projectName=${encodeURIComponent(projectName)}`;
  //       }

  //       const res = await fetch(apiUrl, {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });

  //       if (!res.ok) throw new Error("Failed to load tasks");
  //       const data = await res.json();

  //       const taskList = Array.isArray(data) ? data : data.tasks || [];
  //       setTasks(taskList);
  //       setError("");

  //       const allTickets = taskList.flatMap((task) => task.tickets || []);
  //       setTickets(allTickets);

        
  //     } catch (error) {
  //       console.error("Error fetching tasks for user:", error);
  //       setError("Failed to load tasks");
  //     }
  //   }
  // }, [router, userRole]);

useEffect(() => {
  async function fetchUserAndTasks() {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Fetch user session and role
      const resUser = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resUser.ok) {
        router.push("/login");
        return;
      }

      const user = await resUser.json();
      setUserRole(user.role);
      console.log("User session:", user);

      // Build API URL with optional projectName filter only
      let apiUrl = `/api/tasks`;
      if (projectName && projectName.trim() !== "") {
        apiUrl += `?projectId=${encodeURIComponent(projectName)}`; // Use 'projectId' if backend expects this
      }

      // Fetch tasks without userId, backend uses auth info
      const resTasks = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resTasks.ok) {
        setError("Failed to load tasks");
        return;
      }

      const tasksData = await resTasks.json();
      setTasks(tasksData);
          console.log("Fetched tasks:", tasksData);
  
      setError("");

      // Extract all tickets from tasks
      const allTickets = tasksData.flatMap((task) => task.tickets || []);
    console.log("Fetched tickets:", allTickets);
      setTickets(allTickets);
    } catch (error) {
      console.error("Error fetching user session or tasks:", error);
      setError("Failed to load data");
    } finally {
      setTasksLoading(false);
      setTicketsLoading(false);
    }
  }

  fetchUserAndTasks();
}, [router, projectName]);



  const switchTab = (tab) => setActiveTab(tab);

 

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex border-b border-gray-300 mb-6">
        <button
          className={`px-4 pb-2 font-semibold ${
            activeTab === "tasks"
              ? "border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => switchTab("tasks")}
        >
          Tasks
        </button>
        <button
          className={`ml-6 px-4 pb-2 font-semibold ${
            activeTab === "tickets"
              ? "border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => switchTab("tickets")}
        >
          Tickets
        </button>
      </div>

      {activeTab === "tasks" && (
        <>
          {tasksLoading ? (
            <p className="text-center text-gray-500">Loading tasks…</p>
          ) : error ? (
            <p className="text-center text-red-600">{error}</p>
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500">No tasks found.</p>
          ) : (
            <table className="w-full table-auto border border-gray-300 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Manager</th>
                  <th className="p-2 text-left">Members</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50">
                    <td className="p-2">{task.title}</td>
                    <td className="p-2">{task.manager?.email || "-"}</td>
                    <td className="p-2">
                      {(task.assignees || [])
                        .map((a) => a.user?.email || a.user?.name)
                        .join(", ") || "-"}
                    </td>
                    <td className="p-2 capitalize">{task.status || "open"}</td>
                   <td className="p-2">
  <Button
    onClick={() =>
      router.push(`/dashboard/manage-tasks/${task._id}/open`)
    }
  >
    Open
  </Button>
</td>
               </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === "tickets" && (
        <>
         {tickets.map((ticket) => (
  <div key={ticket._id || ticket.id} className="border p-4 mb-4 rounded bg-gray-50">
    <h3 className="font-semibold text-lg">{ticket.issueTitle}</h3>
    <p className="italic text-sm mb-2">Status: {ticket.status}</p>
    <p>Description : {ticket.description}</p>
    <p>
      Assigned to:{" "}
      {ticket.assignees && ticket.assignees.length > 0
        ? ticket.assignees.map((assignee, i) => (
            <span key={i}>
              {assignee.user?.username || assignee.user?.email || assignee.user?.name || "Unknown"}
              {i < ticket.assignees.length - 1 ? ", " : ""}
            </span>
          ))
        : ticket.assignedTo?.username || ticket.assignedTo?.email || "Unassigned"}
    </p>
    <p>Priority: {ticket.priority}</p>
    <p>
      Start:{" "}
      {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : "-"}
    </p>
    <p>
      Due:{" "}
      {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "-"}
    </p>
    <p>Tag: {ticket.tag}</p>
  </div>
))}

        </>
      )}

      <ToastContainer />
    </div>
  );
}
