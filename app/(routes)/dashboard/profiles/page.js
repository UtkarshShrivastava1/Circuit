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

      const res = await fetch(`/api/user?email=${encodeURIComponent(selectedUser)}`, {
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
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
      
{/* Responsive grid with auto-fit */}
<div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 md:gap-6">
  {filteredUsers.map((user) => (
    <Card 
      key={user.email} 
      className="w-full min-w-0 hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800"
    >
      <CardContent className="p-0">
{/* Profile Section - Accessible and Touch-Friendly */}
<div
  onClick={() => {
    if (currentUserRole === 'admin' || currentUserRole === 'manager') {
      router.push(`/dashboard/profiles/${encodeURIComponent(user.email)}`);
    }
  }}
  onKeyDown={(e) => {
    if ((e.key === 'Enter' || e.key === ' ') && (currentUserRole === 'admin' || currentUserRole === 'manager')) {
      e.preventDefault();
      router.push(`/dashboard/profiles/${encodeURIComponent(user.email)}`);
    }
  }}
  role={currentUserRole === 'admin' || currentUserRole === 'manager' ? 'button' : undefined}
  tabIndex={currentUserRole === 'admin' || currentUserRole === 'manager' ? 0 : undefined}
  aria-label={currentUserRole === 'admin' || currentUserRole === 'manager' ? `View profile for ${user.name}` : undefined}
  className={`p-4 transition-all duration-300 rounded-t-lg select-none ${
    (currentUserRole === 'admin' || currentUserRole === 'manager')
      ? 'cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
      : 'cursor-default'
  }`}
>
  {/* Header with Avatar and Status */}
  <div className="flex items-start gap-4 mb-3">
    <div className="relative">
      <Avatar className="w-16 h-16 ring-2 ring-blue-100 dark:ring-blue-800">
        <AvatarImage src={user.profileImgUrl || '/user.png'} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          {user.name?.[0] || user.email?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      {/* Status Indicator */}
      <div className="absolute -top-1 -right-1">
        <div
          className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${
            user.profileState === 'active' ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </div>
    </div>

    {/* User Info */}
    <div className="flex-1 min-w-0">
      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate mb-1">
        {user.name || 'Unnamed User'}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
        {user.email}
      </p>
      
      {/* Role Badge */}
      <div className="inline-flex items-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
          user.role === 'admin' 
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : user.role === 'manager'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {user.role}
        </span>
      </div>
    </div>

    {/* Status Badge */}
    <div className="flex-shrink-0">
      <span
        className={`inline-block px-2 py-1 rounded-full text-white text-xs font-medium ${
          user.profileState === 'active' ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        {user.profileState || 'Unknown'}
      </span>
    </div>
  </div>

  {/* Click to View Hint - Only for Admin/Manager */}
  {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
    <div className="flex items-center justify-center py-2 border-t border-gray-100 dark:border-gray-700 mt-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        👁️ Tap to view profile
      </span>
    </div>
  )}
</div>

{/* Action Buttons Section - Enhanced for Mobile */}
{(currentUserRole === 'admin' || currentUserRole === 'manager') && (
  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
    <div className="flex gap-2 pt-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/dashboard/profiles/${encodeURIComponent(user.email)}`);
        }}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:active:bg-blue-900/70 rounded-lg transition-colors min-h-[44px] touch-manipulation"
        aria-label={`View profile for ${user.name}`}
      >
        <RiUserSettingsFill className="w-4 h-4" />
        <span>Manage Profile</span>
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          showDeleteConfirmation(user.email);
        }}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 dark:active:bg-red-900/70 rounded-lg transition-colors min-h-[44px] touch-manipulation"
        aria-label={`Delete user ${user.name}`}
      >
        <MdDelete className="w-4 h-4" />
        <span>Delete</span>
      </button>
    </div>
  </div>
)}

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
