'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { IoMdSearch } from 'react-icons/io';
import { RiUserSettingsFill } from 'react-icons/ri';
import { MdDelete } from 'react-icons/md';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { FiTrash2 } from 'react-icons/fi';

const trimEmail = (email) => email.split('@')[0];

export default function AllProfiles() {
  const router = useRouter();
  const [users, setUsers] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('member');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const modalRef = useRef(null);

  // Hide modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowDeleteModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        setError(err?.message || 'Failed to load users');
      }
    }
    fetchUsers();

    // Fetch current user's role
    async function fetchUserRole() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/auth/session', {
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

  // Trigger delete modal on mobile/desktop
  const showDeleteConfirmation = (email) => {
    setSelectedUser(email);
    setShowDeleteModal(true);
  };

  // Robust delete handler
  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required.');
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/user/${encodeURIComponent(selectedUser)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      let errorMsg = 'Failed to delete user';
      if (!res.ok) {
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          errorMsg = res.statusText || errorMsg;
        }
        toast.error(errorMsg);
        return;
      }

      setUsers(users.filter((user) => user.email !== selectedUser));
      setFilteredUsers(filteredUsers.filter((user) => user.email !== selectedUser));
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error('Delete failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (error)
    return (
      <div className="text-center p-4 text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  if (!users)
    return <div className="text-center p-4 dark:text-white">Loading users...</div>;
  if (filteredUsers.length === 0)
    return (
      <div className="p-4">
        <div className="mb-6 relative">
          <Input
            type="text"
            placeholder="Search by name, email, or role"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <IoMdSearch className="absolute text-lg left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="text-center text-gray-600 dark:text-gray-400">No users found.</div>
      </div>
    );

  return (
    <div className="p-3 sm:p-4">
      <ToastContainer />
      <div className="mb-6 relative">
        <Input
          type="text"
          placeholder="Search by name, email, or role"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <IoMdSearch className="absolute text-lg left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.email} className="w-full">
            <CardContent className="flex gap-4 p-3 sm:p-4">
              <div className="flex gap-3 w-full items-start">
                <Avatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                  <AvatarImage src={user.profileImgUrl || '/user.png'} />
                  <AvatarFallback>
                    {user.name?.[0] || user.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-semibold truncate">
                    {user.name || 'Unnamed User'}
                  </h4>
                  <div className="text-xs sm:text-sm truncate">
                    {user.email}
                  </div>
                  <p className="text-xs sm:text-sm">{user.role}</p>
                  <div className="flex items-center gap-2 sm:gap-4 mt-2">
                    <button
                      onClick={() => router.push(`/dashboard/profiles/${encodeURIComponent(user.email)}`)}
                      aria-label="View profile"
                      className="flex items-center text-muted-foreground text-xs sm:text-sm cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none min-h-[44px]"
                    >
                      <RiUserSettingsFill className="mr-1 sm:mr-2 h-4 w-4 opacity-70" />
                      <span>View Profile</span>
                    </button>
                    {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                      <button
                        onClick={() => showDeleteConfirmation(user.email)}
                        aria-label="Delete user"
                        className="flex items-center text-xs sm:text-sm text-red-500 cursor-pointer hover:text-red-700 dark:hover:text-red-600 focus:outline-none min-h-[44px]"
                      >
                        <MdDelete className="mr-1 sm:mr-2 h-4 w-4" />
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

      {/* Creative Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-red-600">
                Delete User
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
                className="p-2 rounded-full hover:bg-gray-100 hover:dark:bg-slate-800 focus:outline-none"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-400" />
              </button>
            </div>
            <div className="text-gray-700 dark:text-gray-400 mb-6 text-sm md:text-base">
              Are you sure you want to delete user <strong>{selectedUser}</strong>?
              <p className="text-xs sm:text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-2 sm:px-4"
                aria-label="Cancel"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 sm:px-4"
                aria-label="Delete User"
              >
                <FiTrash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
