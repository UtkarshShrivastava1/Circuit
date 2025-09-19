"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Loader2, X, Eye, Trash2, User, Calendar, Tag } from "lucide-react";

function ManageAllTasks() {
  const router = useRouter();
  const params = useParams();
  const { taskId } = params;
  const searchParams = useSearchParams();
  const taskIdfromserchaParam = searchParams.get("taskId");
  const projectName = searchParams.get("projectName") || "";

  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // User checking with better error handling
  useEffect(() => {
    async function fetchUserRole() {
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
          const data = await res.json();
          setUserRole(data.role);
        } else {
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth error:", error);
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    fetchUserRole();
  }, [router]);

  // Enhanced data fetching with retry logic
  useEffect(() => {
    async function fetchData(retryCount = 0) {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        setTasksLoading(true);
        setTicketsLoading(true);
        setError("");

        // Fetch tasks with proper error handling
        let apiUrl = "/api/tasks";
        if (projectName.trim()) {
          apiUrl += `?projectId=${encodeURIComponent(projectName)}`;
        }

        const resTasks = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!resTasks.ok) {
          if (resTasks.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`HTTP ${resTasks.status}: Failed to load tasks`);
        }

        const tasksData = await resTasks.json();
        setTasks(Array.isArray(tasksData) ? tasksData.slice().reverse() : []);

        // Extract tickets from all tasks
        const allTickets = tasksData.flatMap((task) => task.tickets || []);
        setTickets(allTickets.slice().reverse());

        setError("");
      } catch (err) {
        console.error("Fetch error:", err);
        const errorMessage = err.message || "Failed to load data";
        setError(errorMessage);

        // Retry logic for network errors
        if (
          retryCount < 2 &&
          (err.name === "NetworkError" || err.message.includes("fetch"))
        ) {
          setTimeout(() => fetchData(retryCount + 1), 2000);
          return;
        }

        toast.error(errorMessage);
      } finally {
        setTasksLoading(false);
        setTicketsLoading(false);
      }
    }

    if (userRole) {
      fetchData();
    }
  }, [router, projectName, userRole]);

  const switchTab = (tab) => setActiveTab(tab);

  // Show confirmation modal
  function confirmDeleteTicket(id) {
    setTicketToDelete(id);
    setShowDeleteModal(true);
  }

  // Cancel deletion
  function handleDeleteCancel() {
    setShowDeleteModal(false);
    setTicketToDelete(null);
    setDeleteError("");
  }

  // Enhanced delete function with better error handling
  async function handleDeleteConfirm() {
    if (!ticketToDelete) return;
    setDeletingTicket(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/ticket/${ticketToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `HTTP ${res.status}: Failed to delete ticket`
        );
      }

      toast.success("Ticket deleted successfully");
      setTickets((prev) =>
        prev.filter((t) => t._id !== ticketToDelete && t.id !== ticketToDelete)
      );
      setShowDeleteModal(false);
      setTicketToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      const errorMessage = err.message || "Network error deleting ticket";
      setDeleteError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeletingTicket(false);
    }
  }

  // Helper function to get project name from task
  const getProjectName = (task) => {
    return (
      task.projectName ||
      task.projectId?.projectName ||
      task.projectId?.name ||
      "Unknown Project"
    );
  };

  // Mobile card component for tasks
  const TaskCard = ({ task }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate pr-2">
          {task.title}
        </h3>
        <Button
          size="sm"
          className="flex-shrink-0"
          onClick={() =>
            router.push(`/dashboard/manage-tasks/${task._id}/open`)
          }
        >
          <Eye className="w-4 h-4 mr-1" />
          Open
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <Tag className="w-4 h-4 mr-2 text-blue-500" />
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
            📁 {getProjectName(task)}
          </span>
        </div>

        <div className="flex items-center text-sm">
          <User className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            {(task.assignees || [])
              .filter(Boolean)
              .map((a) => a.user?.name || a.user?.email || "")
              .join(", ") || "Unassigned"}
          </span>
        </div>

        <div className="flex items-center text-sm">
          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              task.status === "completed"
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
            }`}
          >
            {task.status
              ? task.status.charAt(0).toUpperCase() + task.status.slice(1)
              : "Pending"}
          </span>
        </div>
      </div>
    </div>
  );

  // Mobile card component for tickets
  const TicketCard = ({ ticket }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 pr-2">
          {ticket.issueTitle}
        </h3>
        <button
          onClick={() => confirmDeleteTicket(ticket._id)}
          className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors flex items-center"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center">
          <span className="font-medium mr-2">Status:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              ticket.status === "pending"
                ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
                : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
            }`}
          >
            {ticket.status
              ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)
              : "Open"}
          </span>
        </div>

        <div>
          <span className="font-medium">Description:</span>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {ticket.description || "No description"}
          </p>
        </div>

        <div className="flex justify-between">
          <span>
            <span className="font-medium">Priority:</span>{" "}
            {ticket.priority
              ? ticket.priority.charAt(0).toUpperCase() +
                ticket.priority.slice(1)
              : "Normal"}
          </span>
          <span>
            <span className="font-medium">Tag:</span> {ticket.tag || "None"}
          </span>
        </div>

        <div>
          <span className="font-medium">Assigned to:</span>{" "}
          {ticket.assignedTo
            ? ticket.assignedTo.name ||
              ticket.assignedTo.username ||
              ticket.assignedTo.email
            : "Unassigned"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Manage Tasks & Tickets
          </h1>
          {projectName && (
            <p className="text-gray-600 dark:text-gray-400">
              Project: <span className="font-medium">{projectName}</span>
            </p>
          )}
        </div>

        {/* Tabs - Enhanced for mobile */}
        <div className="flex border-b border-gray-300 dark:border-slate-700 mb-6 overflow-x-auto">
          <div className="flex space-x-1 min-w-full sm:min-w-0">
            <button
              className={`px-4 py-3 font-semibold text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === "tasks"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-slate-400"
              }`}
              onClick={() => switchTab("tasks")}
            >
              Tasks ({tasks.length})
            </button>
            <button
              className={`px-4 py-3 font-semibold text-sm sm:text-base transition-colors whitespace-nowrap ${
                activeTab === "tickets"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-slate-400"
              }`}
              onClick={() => switchTab("tickets")}
            >
              Tickets ({tickets.length})
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <X className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tasks Content */}
        {activeTab === "tasks" && (
          <>
            {tasksLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  Loading tasks...
                </span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-700">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                  📋
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No tasks found
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  Tasks will appear here when they are created
                </p>
              </div>
            ) : isMobile ? (
              // Mobile View - Cards
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard key={task._id} task={task} />
                ))}
              </div>
            ) : (
              // Desktop View - Table
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr className="text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                        <th className="p-4 min-w-[200px]">Title</th>
                        <th className="p-4 min-w-[150px]">Project</th>
                        <th className="p-4 min-w-[150px]">Assigned</th>
                        <th className="p-4 min-w-[100px]">Status</th>
                        <th className="p-4 min-w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {tasks.map((task) => (
                        <tr
                          key={task._id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {task.title}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                              📁 {getProjectName(task)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {(task.assignees || [])
                              .filter(Boolean)
                              .map((a) => a.user?.name || a.user?.email || "")
                              .join(", ") || "Unassigned"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.status === "completed"
                                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                                  : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
                              }`}
                            >
                              {task.status
                                ? task.status.charAt(0).toUpperCase() +
                                  task.status.slice(1)
                                : "Pending"}
                            </span>
                          </td>
                          <td className="p-4">
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/dashboard/manage-tasks/${task._id}/open`
                                )
                              }
                              className="flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Open
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tickets Content */}
        {activeTab === "tickets" && (
          <>
            {ticketsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  Loading tickets...
                </span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-700">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                  🎫
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No tickets found
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  Support tickets will appear here when they are created
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketCard key={ticket._id} ticket={ticket} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Enhanced Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
                    Delete Ticket
                  </h3>
                  <button
                    onClick={handleDeleteCancel}
                    aria-label="Close"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full mr-3">
                      <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Confirm deletion
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete this ticket? All associated
                    data will be permanently removed.
                  </p>
                </div>

                {deleteError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {deleteError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deletingTicket}
                    className={`px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center ${
                      deletingTicket ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {deletingTicket ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

     
      </div>
      

    </div>
  );
}

export default ManageAllTasks;
