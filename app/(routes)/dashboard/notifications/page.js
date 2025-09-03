"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import UserHoverCard from "@/app/_components/UserHoverCard";

// ✅ Utility: check if file is image
const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url);

export default function NotificationPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSendNotifications =
    currentUser && ["admin", "manager"].includes(currentUser.role);

  // ✅ Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.email) setCurrentUser(data);
      } catch (err) {
        toast.error("Failed to load user session");
      }
    }
    fetchUser();
  }, []);

  // ✅ Fetch all users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/user/");
        const data = await res.json();
        if (Array.isArray(data)) setAllUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    }
    fetchUsers();
  }, []);

  // ✅ Fetch notifications
  useEffect(() => {
    if (!currentUser?.email) return;

    async function fetchNotifications() {
      try {
        const res = await fetch(
          `/api/notifications?email=${encodeURIComponent(currentUser.email)}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch notifications");
        }
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      } catch (err) {
        setError(err);
        toast.error("Failed to load notifications");
      }
    }

    fetchNotifications();
  }, [currentUser]);

  // ✅ File upload handler
  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await res.json();
      return url || "No Files";
    } catch {
      return "No Files";
    }
  };

  // ✅ Send notification handler
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!currentUser?.email) {
      toast.error("You must be logged in to send notifications.");
      return;
    }

    setLoading(true);
    try {
      let fileURL = "No Files";
      if (selectedFile) fileURL = await handleFileUpload(selectedFile);

      const eligibleUsers = allUsers.filter((u) =>
        ["admin", "manager"].includes(u.role)
      );

      const toEmail = isPublic
        ? eligibleUsers.map((u) => ({ email: u.email, state: "unread" }))
        : selectedUsers
            .filter((u) => ["admin", "manager","member"].includes(u.role))
            .map((u) => ({ email: u.email, state: "unread" }));

      if (toEmail.length === 0) {
        toast.error("No eligible recipients found.");
        return;
      }

      const notificationData = {
        fromEmail: currentUser.email,
        msg: { msgcontent: message, source: fileURL },
        dataTo: isPublic ? "public" : "private",
        toEmail,
        date: new Date().toISOString(),
      };

      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationData),
      });



      if (!res.ok) throw new Error("Failed to send notification");
      toast.success("Notification sent successfully");
      setMessage("");
      setSelectedFile(null);
      setSelectedUsers([]);
    } catch (err) {
      toast.error(err.message || "Error sending notification");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Error UI
  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 text-red-600 rounded-lg shadow">
        <h2 className="font-bold text-lg">Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="md:p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Notifications
      </h1>

      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="view">View</TabsTrigger>
            {canSendNotifications && <TabsTrigger value="send">Send</TabsTrigger>}
          </TabsList>

          {/* ✅ Send Notification */}
          {canSendNotifications && (
            <TabsContent value="send">
              <Card className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl mt-4">
                <form onSubmit={handleSendNotification} className="space-y-6">
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message"
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="file">Attach File</Label>
                    <input
                      id="file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-2 block w-full text-sm border rounded-md p-2"
                    />
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={isPublic}
                        onChange={() => setIsPublic(true)}
                      />
                      Public
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!isPublic}
                        onChange={() => setIsPublic(false)}
                      />
                      Private
                    </label>
                  </div>

                  {!isPublic && (
                    <div>
                      <Label>Select Users</Label>
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                        {allUsers.map((user) => (
                          <label
                            key={user.email}
                            className="flex items-center gap-2 p-2 border rounded-md"
                          >
                            <input
                              type="checkbox"
                              value={user.email}
                              checked={selectedUsers.some(
                                (u) => u.email === user.email
                              )}
                              onChange={(e) => {
                                setSelectedUsers((prev) =>
                                  e.target.checked
                                    ? [...prev, user]
                                    : prev.filter((u) => u.email !== user.email)
                                );
                              }}
                            />
                            {user.email}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send Notification"}
                  </Button>
                </form>
              </Card>
            </TabsContent>
          )}

          {/* ✅ View Notifications */}
          <TabsContent value="view">
            <Card className="p-6 mt-4">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center">
                  📭 No notifications yet.
                </p>
              ) : (
                <ul className="grid gap-4">
                  {notifications.map((n) => (
                    <li key={n._id}>
                      <Card className="p-4 hover:shadow-md transition">
                        <CardHeader className="flex flex-row gap-3 p-0 mb-2">
                          <UserHoverCard email={n.fromEmail} />
                          <div className="flex-grow">
                            <p className="font-semibold">{n.fromEmail}</p>
                            <p className="text-xs text-gray-500">{n.date}</p>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                n.dataTo === "public"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {n.dataTo}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p>{n.msg?.msgcontent}</p>
                          {n.msg?.source &&
                            n.msg.source !== "No Files" &&
                            (isImage(n.msg.source) ? (
                              <img
                                src={n.msg.source}
                                alt="file"
                                className="mt-3 rounded-md max-h-48"
                              />
                            ) : (
                              <Link
                                href={n.msg.source}
                                target="_blank"
                                className="text-blue-600 hover:underline mt-3 block"
                              >
                                📎 View File
                              </Link>
                            ))}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </Card>

      <ToastContainer />
    </div>
  );
}
