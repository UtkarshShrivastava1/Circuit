// app/dashboard/manage-tasks/page.jsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Loader2, X, Eye, Trash2, User, Calendar, Tag } from "lucide-react";

function ManageAllTasks() {
  const router = useRouter();
  const params = useParams();
  const { taskId } = params || {};
  const searchParams = useSearchParams();
  const taskIdFromSearchParam = searchParams?.get("taskId");
  const projectName = searchParams?.get("projectName") || "";

  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null); // logged in user's id

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Ref to hold the latest fetch function for polling
  const fetchRef = useRef(null);
  // Poll interval (ms)
  const POLL_INTERVAL = 10000;

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Load user role + id
  useEffect(() => {
    let mounted = true;
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
          if (mounted) {
            setUserRole(data.role);
            const id = data.id || data._id || data.userId || null;
            setUserId(id ? String(id) : null);
          }
        } else {
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    fetchUserRole();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Helper: find parent task id for a ticket by scanning tasks (coerce to string)
  const findParentTaskId = useCallback(
    (ticketId) => {
      if (!ticketId) return null;
      const tid = String(ticketId);
      for (const t of tasks) {
        if (
          Array.isArray(t.tickets) &&
          t.tickets.some((tt) => String(tt._id || tt.id) === tid)
        ) {
          return String(t._id || t.id);
        }
      }
      return null;
    },
    [tasks]
  );

  // Helper to transform and filter tickets for UI
  const transformAndFilterTickets = useCallback(
    (tasksList) => {
      const allTickets = (tasksList || []).flatMap((task) =>
        (task.tickets || []).map((ticket) => ({
          ...ticket,
          parentTaskId: task._id || task.id || null,
        }))
      );

      // if user is admin/manager -> see all
      if (!userRole || userRole !== "member" || !userId) {
        return allTickets.slice().reverse();
      }

      // member -> only assigned tickets
      const visible = allTickets.filter((t) => {
        if (!t) return false;
        const assigned = t.assignedTo;
        if (!assigned) return false;
        const aid =
          (assigned._id && String(assigned._id)) ||
          (assigned.id && String(assigned.id)) ||
          (typeof assigned === "string" ? String(assigned) : null);
        return aid && String(aid) === String(userId);
      });
      return visible.slice().reverse();
    },
    [userRole, userId]
  );

  // Primary fetch logic (kept in a ref to reuse from polling/visibility)
  const fetchData = useCallback(
    async (retryCount = 0, signal = undefined) => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        setTasksLoading(true);
        setTicketsLoading(true);
        setError("");

        const resTasks = await fetch("/api/tasks", {
          method: "GET",
          signal,
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
        const tasksList = Array.isArray(tasksData)
          ? tasksData.slice().reverse()
          : [];
        setTasks(tasksList);

        const effectiveTaskId = taskId || taskIdFromSearchParam || null;
        if (effectiveTaskId) {
          // Try to fetch tickets for that task specifically (server may enforce permissions)
          try {
            const resTickets = await fetch(
              `/api/tasks/${effectiveTaskId}/tickets`,
              {
                method: "GET",
                signal,
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (resTickets.ok) {
              const ticketsData = await resTickets.json();
              const withParent = (
                Array.isArray(ticketsData) ? ticketsData : []
              ).map((t) => ({
                ...t,
                parentTaskId: effectiveTaskId,
              }));
              setTickets(
                transformAndFilterTickets([
                  { _id: effectiveTaskId, tickets: withParent },
                ])
              );
            } else if (resTickets.status === 401) {
              localStorage.removeItem("token");
              router.push("/login");
              return;
            } else {
              setTickets(transformAndFilterTickets(tasksList));
            }
          } catch (err) {
            console.warn("Error fetching task-specific tickets:", err);
            setTickets(transformAndFilterTickets(tasksList));
          }
        } else {
          setTickets(transformAndFilterTickets(tasksList));
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Fetch error:", err);
        const errorMessage = err.message || "Failed to load data";
        setError(errorMessage);

        // retry network-like errors (up to 2)
        if (
          retryCount < 2 &&
          (err.name === "TypeError" || err.message.includes("fetch"))
        ) {
          setTimeout(() => fetchData(retryCount + 1, signal), 2000);
          return;
        }
        toast.error(errorMessage);
      } finally {
        setTasksLoading(false);
        setTicketsLoading(false);
      }
    },
    [router, taskId, taskIdFromSearchParam, transformAndFilterTickets]
  );

  // store fetchData ref for polling use
  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);

  // initial load + polling with visibility pause
  useEffect(() => {
    const ac = new AbortController();
    // call immediately
    fetchData(0, ac.signal);

    let intervalId = null;
    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        // call latest fetch function
        if (fetchRef.current) fetchRef.current(0);
      }, POLL_INTERVAL);
    };
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // start polling
    startPolling();

    // pause on visibility hidden to save bandwidth
    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ac.abort();
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // userRole included because we shouldn't start polling before we know role (transform)
  }, [fetchData, userRole]);

  const switchTab = (tab) => setActiveTab(tab);

  // Show confirmation modal
  const confirmDeleteTicket = useCallback((id) => {
    setTicketToDelete(id);
    setShowDeleteModal(true);
  }, []);

  // Cancel deletion
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setTicketToDelete(null);
    setDeleteError("");
  }, []);

  // Delete ticket
  const handleDeleteConfirm = useCallback(async () => {
    if (!ticketToDelete) return;
    setDeletingTicket(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const effectiveTaskId =
        taskId || taskIdFromSearchParam || findParentTaskId(ticketToDelete);
      if (!effectiveTaskId)
        throw new Error("Unable to determine parent task for this ticket");

      const res = await fetch(
        `/api/tasks/${effectiveTaskId}/tickets/${ticketToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

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

      // update local state quickly (optimistic)
      setTickets((prev) =>
        prev.filter((t) => String(t._id || t.id) !== String(ticketToDelete))
      );
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          const tid = String(t._id || t.id);
          if (tid === String(effectiveTaskId)) {
            return {
              ...t,
              tickets: (t.tickets || []).filter(
                (tt) => String(tt._id || tt.id) !== String(ticketToDelete)
              ),
            };
          }
          return t;
        })
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
  }, [ticketToDelete, router, taskId, taskIdFromSearchParam, findParentTaskId]);

  // Change ticket status (PUT to API)
  const handleChangeTicketStatus = async (ticket, newStatus) => {
    if (!ticket || !ticket.parentTaskId)
      return toast.error("Missing parent task id");
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    try {
      const res = await fetch(`/api/tasks/${ticket.parentTaskId}/tickets`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: ticket._id || ticket.id,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to update status (${res.status})`);
      }

      // update local state
      setTickets((prev) =>
        prev.map((t) => {
          if (String(t._id || t.id) === String(ticket._id || ticket.id)) {
            return { ...t, status: newStatus };
          }
          return t;
        })
      );
      toast.success("Ticket status updated");
    } catch (err) {
      console.error("Change status error:", err);
      toast.error(err.message || "Failed to change ticket status");
    }
  };

  // Edit ticket: navigate to task view (you can change to an edit modal if desired)
  const handleEditTicket = (ticket) => {
    const parent =
      ticket.parentTaskId || findParentTaskId(ticket._id || ticket.id);
    if (parent)
      router.push(
        `/dashboard/manage-tasks/${parent}/open?ticketId=${
          ticket._id || ticket.id
        }`
      );
    else toast.error("Unable to locate parent task for editing");
  };

  // Helper to get project name
  const getProjectName = (task) =>
    task?.projectName ||
    task?.projectId?.projectName ||
    task?.projectId?.name ||
    "Unknown Project";

  // Determine permissions:
  // - members: only change status on tickets assigned to them
  // - admin/manager: full control (edit/delete/change status)
  const canEditOrDelete = (ticket) => {
    if (!ticket) return false;
    return ["admin", "manager"].includes(userRole);
  };
  const canChangeStatus = (ticket) => {
    if (!ticket) return false;
    if (["admin", "manager"].includes(userRole)) return true;
    if (userRole === "member" && userId) {
      const assigned = ticket.assignedTo;
      if (!assigned) return false;
      const aid =
        (assigned._id && String(assigned._id)) ||
        (assigned.id && String(assigned.id)) ||
        (typeof assigned === "string" ? String(assigned) : null);
      return aid && String(aid) === String(userId);
    }
    return false;
  };

  // Task card (mobile)
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
          aria-label={`Open task ${task.title}`}
        >
          <Eye className="w-4 h-4 mr-1" /> Open
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

  // Ticket card (mobile)
  const TicketCard = ({ ticket }) => {
    const allowStatus = canChangeStatus(ticket);
    const allowEditDelete = canEditOrDelete(ticket);
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 pr-2">
            {ticket.issueTitle}
          </h3>
          <div className="flex items-center gap-2">
            {allowStatus ? (
              <select
                value={ticket.status || "open"}
                onChange={(e) =>
                  handleChangeTicketStatus(ticket, e.target.value)
                }
                className="rounded px-2 py-1 text-sm"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            ) : (
              <span className="text-xs text-gray-500">Status</span>
            )}

            {allowEditDelete && (
              <>
                <button
                  onClick={() => handleEditTicket(ticket)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => confirmDeleteTicket(ticket._id || ticket.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
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
  };

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

        {/* Tabs */}
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

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <X className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tasks content */}
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
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard key={task._id || task.id} task={task} />
                ))}
              </div>
            ) : (
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
                          key={task._id || task.id}
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

        {/* Tickets content */}
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
                  {userRole === "member"
                    ? "You have no tickets assigned to you."
                    : "Support tickets will appear here when they are created"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketCard key={ticket._id || ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete confirmation modal */}
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

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default ManageAllTasks;
