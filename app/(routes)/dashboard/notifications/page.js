'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import UserHoverCard from '@/app/_components/UserHoverCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DeleteNotificationModal from "@/app/(routes)/dashboard/_components/DeleteNotificationModal";
import { Input } from '@/components/ui/input'

// Utility: check if file is image
const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)

export default function NotificationPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isPublic, setIsPublic] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // existing states...
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [showModal, setShowModal] = useState(false)
   const [selectedId, setSelectedId] = useState(null);

  // Only admin/manager can send notifications
  const canSendNotifications = currentUser && ['admin', 'manager'].includes(currentUser.role)

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data?.email) setCurrentUser(data)
      } catch (err) {
        toast.error('Failed to load user session')
      }
    }
    fetchUser()
  }, [])

  // Fetch all users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/user/')
        const data = await res.json()
        if (Array.isArray(data)) setAllUsers(data)
          // console.log('AllUsers data :',data)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()
  }, [])

  // Fetch notifications
  useEffect(() => {
    if (!currentUser?.email && !currentUser?.role ) return
    async function fetchNotifications() {
      try {
        const res = await fetch(`/api/notifications?email=${encodeURIComponent(currentUser.email)}&role=${currentUser.role}`)
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to fetch notifications')
        }
        const data = await res.json()
        // console.log("Notification data :",data)

        if (Array.isArray(data)) setNotifications(data)
      } catch (err) {
        setError(err)
        toast.error('Failed to load notifications')
      }
    }
    fetchNotifications()
  }, [currentUser])

  // File upload handler
  const handleFileUpload = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      return url || 'No Files'
    } catch {
      return 'No Files'
    }
  }

  // Send notification handler
  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!currentUser?.email) {
      toast.error('You must be logged in to send notifications.')
      return
    }

    setLoading(true)
    try {
      let fileURL = 'No Files'
      if (selectedFile) fileURL = await handleFileUpload(selectedFile)

      const eligibleUsers = allUsers.filter((u) => ['admin', 'manager'].includes(u.role))

      const toEmail = isPublic
        ? eligibleUsers.map((u) => ({ email: u.email, state: 'unread' }))
        : selectedUsers
            .filter((u) => ['admin', 'manager', 'member'].includes(u.role))
            .map((u) => ({ email: u.email, state: 'unread' }))

      if (toEmail.length === 0) {
        toast.error('No eligible recipients found.')
        return
      }

      const notificationData = {
        fromEmail: currentUser.email,
        msg: { msgcontent: message, source: fileURL },
        dataTo: isPublic ? 'public' : 'private',
        toEmail,
        date: new Date().toISOString(),
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      })
      if (!res.ok) throw new Error('Failed to send notification')
      toast.success('Notification sent successfully')

      // ⭐️ Dynamically update the UI
      const newNotification = {
        ...notificationData,
        _id: Date.now().toString(), // Temporary ID for local UI
      }
      setNotifications(prev => [newNotification, ...prev])
      setMessage('')
      setSelectedFile(null)
      setSelectedUsers([])
    } catch (err) {
      toast.error(err.message || 'Error sending notification')
    } finally {
      setLoading(false)
    }
  }

  // Delete handler
  const handleDeleteNotification = async (id) => {
     if (!selectedId) return;
       setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete notification')

      setNotifications((prev) => prev.filter((n) => n._id !== id))
      toast.success('Notification deleted successfully')
    } catch (err) {
      toast.error(err.message || 'Error deleting notification')
    }  finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  }

  // Error UI
  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-100 rounded-lg shadow">
        <h2 className="font-bold text-lg">Error</h2>
        <p>{error.message}</p>
      </div>
    )
  }

  // ✅ Beautiful, responsive outer layout
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 px-4 sm:px-6 py-10 flex justify-center">
      <div className="w-full max-w-2xl flex flex-col">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center">
            Notifications
          </h1>
        </div>

        {/* Main Card */}
        <Card className="w-full flex-shrink bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700">
          <Tabs defaultValue="view" className="w-full">
            {/* Tabs Navigation */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view" className="text-sm sm:text-base font-medium py-3">
                View
              </TabsTrigger>
              {canSendNotifications && (
                <TabsTrigger value="send" className="text-sm sm:text-base font-medium py-3">
                  Send
                </TabsTrigger>
              )}
            </TabsList>

            {/* Send Notification */}
            {canSendNotifications && (
              <TabsContent value="send" className="mt-0">
                <Card className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-400 shadow-sm mt-4">
                  <form onSubmit={handleSendNotification} className="w-full p-4 sm:p-6 space-y-4">
                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Message
                      </Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your message"
                        required
                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-300 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Attach File
                      </Label>
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md p-2 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-4">
                      <Label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Input
                          type="radio"
                          checked={isPublic}
                          onChange={() => setIsPublic(true)}
                          className="h-4 w-4 accent-blue-500"
                        />
                        Public
                      </Label>
                      <Label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Input
                          type="radio"
                          checked={!isPublic}
                          onChange={() => setIsPublic(false)}
                          className="h-4 w-4 accent-blue-500"
                        />
                        Private
                      </Label>
                    </div>

                    {!isPublic && (
                      <div>
                        <Label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select Users
                        </Label>
                        <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {allUsers.map((user) => (
                            <Label
                              key={user.email}
                              className="flex items-center gap-2 p-2 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.some((u) => u.email === user.email)}
                                onChange={(e) => {
                                  setSelectedUsers((prev) =>
                                    e.target.checked
                                      ? [...prev, user]
                                      : prev.filter((u) => u.email !== user.email)
                                  )
                                }}
                                className="h-4 w-4 accent-blue-500"
                              />
                              <span className="text-sm truncate">{user.name}</span>
                            </Label>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || (!message.trim() && !selectedFile)}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {loading ? 'Sending...' : 'Send Notification'}
                    </Button>
                  </form>
                </Card>
              </TabsContent>
            )}

            {/* View Notifications */}
            <TabsContent value="view" className="mt-0">
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm rounded-xl  mt-4">
                <CardContent className="p-4 sm:p-6">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-10 h-10"
                      >
                        <path d="M18 9.55l-5.24-6.35a4 4 0 00-6.44 0L1.15 9.55a1 1 0 00.78 1.63h16a1 1 0 00.82-1.63z"></path>
                        <path d="M6 9v2a3 3 0 003 3h6a3 3 0 003-3V9"></path>
                      </svg>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        No notifications yet.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {notifications.map((n) => (
                        <li
                          key={n._id}
                          className="flex flex-col sm:flex-row gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow transition-all"
                        >
                          <div className="flex-shrink-0">
                            <UserHoverCard email={n.fromEmail} />
                          </div>
                          <div className="flex-1 flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                {n.fromEmail}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(n.date).toLocaleDateString().split("T")[0]}
                              </p>
                              <span
                                className={`inline-block w-fit px-2 py-1 rounded-full text-xs ${
                                  n.dataTo === 'public'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                }`}
                              >
                                {n.dataTo}
                              </span>
                            </div>
                            <p className="mt-1 mb-2 text-gray-700 dark:text-gray-300">
                              {n.msg?.msgcontent}
                            </p>
                             {/* Buttons: Open + Delete */}
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedNotification(n)
                              setShowModal(true)
                            }}
                          >
                            Open
                          </Button>
                          {['admin', 'manager'].includes(currentUser?.role) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                  setSelectedId(n._id);
                                  setDeleteModalOpen(true);
                                  }}

                            >
                              Delete
                            </Button>
                          )}
                        </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Modal for open */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <strong>From:</strong> {selectedNotification.fromEmail}
              </p>
              <p>{selectedNotification.msg?.msgcontent}</p>
              {selectedNotification.msg?.source &&
              selectedNotification.msg.source !== 'No Files' ? (
                isImage(selectedNotification.msg.source) ? (
                  <img
                    src={selectedNotification.msg.source}
                    alt="file"
                    className="rounded-lg max-w-full h-auto max-h-60"
                  />
                ) : (
                  <Link
                    href={selectedNotification.msg.source}
                    target="_blank"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View File
                  </Link>
                )
              ) : null}
              <p className="text-xs text-gray-500">
                {new Date(selectedNotification.date).toLocaleString().split("T")[0]}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
       <DeleteNotificationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => handleDeleteNotification(selectedId)}
        loading={loading}
      />
      <ToastContainer position="top-center" autoClose={5000} />
    </div>
  )
}