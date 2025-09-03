'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoMdSearch } from "react-icons/io";
import { RiUserSettingsFill } from "react-icons/ri";
import { MdDelete } from "react-icons/md";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const trimEmail = (email) => email.split("@")[0];

export default function AllProfiles() {
  const router = useRouter();
  const [users, setUsers] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState("");

  // For permission checks (optional)
  const [currentUserRole, setCurrentUserRole] = useState("member");

  // Fetch all users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await axios.get("/api/user");
        if (res.status !== 200) throw new Error("Failed to fetch users");
        setUsers(res.data);
        setFilteredUsers(res.data);
      } catch (err) {
        setError(err?.message || "Failed to load users");
      }
    }
    fetchUsers();

    // Optional: Fetch current user's role for permission checks
    async function fetchUserRole() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUserRole(user.role);
        }
      } catch {}
    }
    fetchUserRole();
  }, []);

  // Filter by search
  useEffect(() => {
    if (!users) return;
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Robust delete handler
  const handleDelete = async (email) => {
    try {
      if (!confirm(`Are you sure you want to delete user '${email}'?`)) return;
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required.');
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/user/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Parse error message, falling back to a default
      let errorMsg = 'Failed to delete user';
      if (!res.ok) {
        try {
          // Try to read JSON error from response
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          // If response is not JSON, use status text or default
          errorMsg = res.statusText || errorMsg;
        }
        toast.error(errorMsg);
        return;
      }

      // Success! Update UI immediately
      setUsers(users.filter(user => user.email !== email));
      setFilteredUsers(filteredUsers.filter(user => user.email !== email));
      toast.success('User deleted successfully');

    } catch (err) {
      // Handle network errors, etc.
      toast.error('Delete failed: ' + (err?.message || 'Unknown error'));
    }
  };

  // Loading/error states
  if (error)
    return <div className="text-center p-4 text-red-600">Error: {error}</div>;
  if (!users)
    return <div className="text-center p-4">Loading users...</div>;
  if (filteredUsers.length === 0)
    return (
      <div className="p-4">
        <Input
          type="text"
          placeholder="Search by name, email, or role"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 mb-4"
        />
        <div className="text-center text-gray-600">No users found.</div>
      </div>
    );

  return (
    <div className="p-4">
      {/* Toast notifications */}
      <ToastContainer />
      <div className="mb-6 relative">
        <Input
          type="text"
          placeholder="Search by name, email, or role"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <IoMdSearch className="absolute text-lg left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.email} className="w-full">
            <CardContent className="flex gap-4 p-4 items-center">
              <div className="flex gap-3 w-full">
                <Avatar className="w-16 h-16 flex-shrink-0">
                  <AvatarImage src={user.profileImgUrl || "/user.png"} />
                  <AvatarFallback>{user.name?.[0] || user.email?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 overflow-hidden w-full">
                  <h4 className="text-sm font-semibold truncate">{user.name || "Unnamed User"}</h4>
                  <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">{user.email}</div>
                  <p className="text-sm">{user.role}</p>
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={() => router.push(`/dashboard/profiles/${encodeURIComponent(user.email)}`)}
                      className="flex items-center text-muted-foreground text-sm cursor-pointer hover:text-blue-500"
                    >
                      <RiUserSettingsFill className="mr-2 h-4 w-4 opacity-70" />
                      <span>View Profile</span>
                    </button>
                    {/* Only show delete button to admins/managers */}
                    {(currentUserRole === "admin" || currentUserRole === "manager") && (
                      <button
                        onClick={() => handleDelete(user.email)}
                        className="flex items-center text-red-500 text-sm cursor-pointer hover:text-red-700"
                        title="Delete User"
                      >
                        <MdDelete className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
