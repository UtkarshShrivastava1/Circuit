"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Edit, Plus, ArrowLeft } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Task Detail + Tickets Page
 * Path: /dashboard/manage-tasks/[taskId]
 *
 * Responsibilities:
 * - fetch task detail (GET /api/tasks/:taskId)
 * - fetch tickets for that task (GET /api/tasks/:taskId/tickets)
 * - show task summary and tickets list
 * - allow create-ticket nav, ticket edit/view nav
 * - allow delete (admin) via DELETE /api/tasks/:taskId/tickets/:ticketId
 * - auto-refresh tickets on window focus
 */

export default function TaskDetailPage({ params }) {
  const router = useRouter();
  const { taskId } = params || {};

  const [task, setTask] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [deletingTicketId, setDeletingTicketId] = useState(null);

  // load role from session endpoint (same pattern as ManageAllTasks)
  useEffect(() => {
    async function getRole() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const res = await fetch("/api/auth/session", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUserRole(data.role || "");
      } catch (err) {
        console.error("Error getting session:", err);
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
    getRole();
  }, [router]);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoadingTask(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to fetch task (status ${res.status})`
        );
      }
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error("fetchTask error:", err);
      setError(err.message || "Failed to load task");
      toast.error(err.message || "Failed to load task");
    } finally {
      setLoadingTask(false);
    }
  }, [taskId, router]);

  const fetchTickets = useCallback(async () => {
    if (!taskId) return;
    setLoadingTickets(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/tasks/${taskId}/tickets`, {
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to fetch tickets (status ${res.status})`
        );
      }
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchTickets error:", err);
      setError(err.message || "Failed to load tickets");
      toast.error(err.message || "Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  }, [taskId, router]);

  // initial load after role known
  useEffect(() => {
    if (userRole) {
      fetchTask();
      fetchTickets();
    }
  }, [userRole, fetchTask, fetchTickets]);

  // auto-refresh tickets when window/tab gets focus (helps after returning from create/edit)
  useEffect(() => {
    function handleFocus() {
      // only refetch if we already loaded once and have a taskId
      if (taskId && userRole) {
        fetchTickets();
      }
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchTickets, taskId, userRole]);

  // Delete ticket (admin only)
  const handleDeleteTicket = async (ticketId) => {
    if (!ticketId) return;
    if (
      !confirm(
        "Are you sure you want to delete this ticket? This action cannot be undone."
      )
    )
      return;

    setDeletingTicketId(ticketId);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/tasks/${taskId}/tickets/${ticketId}`, {
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Failed to delete ticket (status ${res.status})`
        );
      }

      // Remove from local state
      setTickets((prev) => prev.filter((t) => (t._id || t.id) !== ticketId));
      // also update task tickets if present
      setTask((prev) =>
        prev
          ? {
              ...prev,
              tickets: (prev.tickets || []).filter(
                (tt) => (tt._id || tt.id) !== ticketId
              ),
            }
          : prev
      );

      toast.success("Ticket deleted");
    } catch (err) {
      console.error("delete ticket error:", err);
      toast.error(err.message || "Failed to delete ticket");
    } finally {
      setDeletingTicketId(null);
    }
  };

  // small helpers for display
  const getProjectName = (taskObj) =>
    taskObj?.projectName ||
    taskObj?.projectId?.projectName ||
    taskObj?.projectId?.name ||
    "Unknown Project";

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard/manage-tasks")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to tasks
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-3">
              Task Details
            </h1>
            {task && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {getProjectName(task)} • {task.title}
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Link href={`/dashboard/manage-tasks/${taskId}/create-ticket`}>
              <Button className="flex items-center">
                <Plus className="w-4 h-4 mr-2" /> Create Ticket
              </Button>
            </Link>

            {/* Edit Task button if you have task edit route */}
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/manage-tasks/${taskId}/edit`)
              }
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
          </div>
        </div>

        {/* Task card */}
        <div className="mb-6">
          {loadingTask ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <Loader2 className="animate-spin w-6 h-6 mr-3 text-gray-500" />
                <span className="text-gray-600">Loading task...</span>
              </div>
            </div>
          ) : !task ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
              <p className="text-gray-600">Task not found.</p>
            </div>
          ) : (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {task.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {task.description || "No task description"}
                  </p>

                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      <strong>Project:</strong> {getProjectName(task)}
                    </div>
                    <div>
                      <strong>Assignees:</strong>{" "}
                      {(task.assignees || [])
                        .filter(Boolean)
                        .map((a) => a.user?.name || a.user?.email || "")
                        .join(", ") || "Unassigned"}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      {task.status
                        ? task.status.charAt(0).toUpperCase() +
                          task.status.slice(1)
                        : "Pending"}
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Created by:{" "}
                    {task.createdBy?.name || task.createdBy?.email || "Unknown"}
                  </div>
                  <div>
                    Created at:{" "}
                    {task.createdAt
                      ? new Date(task.createdAt).toLocaleString("en-IN")
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tickets list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tickets
            </h3>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {loadingTickets ? "Loading..." : `${tickets.length} ticket(s)`}
              </div>

              {/* Quick Create Ticket button inside Tickets header */}
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/manage-tasks/${taskId}/create-ticket`)
                }
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Create Ticket
              </Button>
            </div>
          </div>

          {loadingTickets ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <Loader2 className="animate-spin w-6 h-6 mr-3 text-gray-500" />
                <span className="text-gray-600">Loading tickets...</span>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
              <p className="text-gray-600">No tickets for this task.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const tid = ticket._id || ticket.id;
                return (
                  <div
                    key={tid}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {ticket.issueTitle}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {ticket.description || "No description"}
                        </p>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                          <div>
                            <strong>Priority:</strong>{" "}
                            {ticket.priority
                              ? ticket.priority.charAt(0).toUpperCase() +
                                ticket.priority.slice(1)
                              : "Normal"}
                          </div>
                          <div>
                            <strong>Status:</strong>{" "}
                            {ticket.status
                              ? ticket.status.charAt(0).toUpperCase() +
                                ticket.status.slice(1)
                              : "Open"}
                          </div>
                          <div>
                            <strong>Assigned:</strong>{" "}
                            {ticket.assignedTo
                              ? ticket.assignedTo.name ||
                                ticket.assignedTo.email ||
                                ticket.assignedTo
                              : "Unassigned"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/manage-tasks/${taskId}/tickets/${tid}`
                              )
                            }
                          >
                            View
                          </Button>

                          {/* Delete for admin only */}
                          {userRole === "admin" && (
                            <button
                              onClick={() => handleDeleteTicket(tid)}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                              disabled={deletingTicketId === tid}
                            >
                              {deletingTicketId === tid ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" /> Delete
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Created:{" "}
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleString("en-IN")
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}
