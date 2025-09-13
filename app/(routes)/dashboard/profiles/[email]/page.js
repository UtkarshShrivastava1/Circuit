'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardCompact,
  CardSkeleton } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

// Enhanced Info helper component with icons
function Info({ label, value, icon }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
      </p>
      <p className="font-medium text-gray-800 dark:text-gray-200">{value || 'N/A'}</p>
    </div>
  );
}

// Status Badge Component for consistent styling
function StatusBadge({ status, variant = "default" }) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'active':
        return 'bg-green-500/20 text-green-100';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-100';
      case 'manager':
        return 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900 dark:text-green-300';
      case 'member':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-white/20 capitalize font-medium';
    }
  };

  return (
    <span className={`px-3 py-1 text-sm rounded-full font-medium capitalize whitespace-nowrap ${getVariantClasses()}`}>
      {status || 'Unknown Status'}
    </span>
  );
}

// Main UserProfile component
export default function UserProfile() {
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    gender: '',
    profileState: '',
    role: '',
    profileImgUrl: '',
    dateOfBirth: '',
  });

  // Fetch user, session, and projects (once)
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      setLoading(true);
      setError('');

      try {
        // 1. Fetch the user being viewed
        const userRes = await fetch(`/api/user?email=${encodeURIComponent(decodedEmail)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-cache',
        });
        if (!userRes.ok) {
          if (userRes.status === 404) throw new Error('User not found');
          if (userRes.status === 403) throw new Error('Access denied');
          throw new Error('Failed to fetch user data');
        }
        const userData = await userRes.json();

        // 2. Fetch the current logged-in user (for edit perms)
        const sessionRes = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-cache',
        });
        if (!sessionRes.ok) throw new Error('Not authenticated');
        const sessionData = await sessionRes.json();

        // 3. Fetch all projects (for assignment display)
        const projectsRes = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-cache',
        });
        const projectsData = projectsRes.ok ? await projectsRes.json() : [];

        setCurrentUser(sessionData);
        setUser(userData);
        setForm({
          name: userData.name || '',
          phoneNumber: userData.phoneNumber || '',
          gender: userData.gender || '',
          profileState: userData.profileState || '',
          role: userData.role || 'member',
          profileImgUrl: userData.profileImgUrl || '',
          dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        });

        // 4. Assign "userRoleInProject" for each project this user is in
        setProjects(
          projectsData.map((p) => ({
            ...p,
            userRoleInProject:
              p.participants?.find((u) => u.email === decodedEmail)?.roleInProject ?? '',
          }))
        );
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        if (
          err.message.toLowerCase().includes('unauthorized') ||
          err.message.toLowerCase().includes('not authenticated')
        ) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [decodedEmail, router]);

  // Handle edits to the form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle date input (special case)
  const handleDateChange = (e) => {
    setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }));
  };

  // Handle avatar upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImg(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      const { url } = await res.json();
      setUser((prev) => ({ ...prev, profileImgUrl: url }));
      setForm((prev) => ({ ...prev, profileImgUrl: url }));
      toast.success('Image uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Image upload failed: ' + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  // Submit profile updates
  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required.');
      router.push('/login');
      return;
    }

    setUpdating(true);

    try {
      // Clean and validate form
      const trimmedForm = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === 'string' ? value.trim() : value,
        ])
      );
      if (trimmedForm.name && trimmedForm.name.length < 2)
        throw new Error('Name must be at least 2 characters long');
      if (trimmedForm.phoneNumber && !/^\+?[\d\s\-()]+$/.test(trimmedForm.phoneNumber))
        throw new Error('Please enter a valid phone number');

      // Only send fields that have values
      const submittedData = Object.fromEntries(
        Object.entries(trimmedForm).filter(([_, v]) => v !== undefined && v !== '')
      );

      // PATCH to backend
      const res = await fetch(`/api/user?email=${encodeURIComponent(decodedEmail)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submittedData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }

      // Success: update UI
      const updatedUser = await res.json();
      setUser(updatedUser);
      setForm({
        name: updatedUser.name || '',
        phoneNumber: updatedUser.phoneNumber || '',
        gender: updatedUser.gender || '',
        profileState: updatedUser.profileState || '',
        role: updatedUser.role || 'member',
        profileImgUrl: updatedUser.profileImgUrl || '',
        dateOfBirth: updatedUser.dateOfBirth ? updatedUser.dateOfBirth.split('T')[0] : '',
      });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Update failed: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Edit permissions
  const canEditProfile = () => {
    return (
      currentUser &&
      (currentUser.email === user?.email ||
        currentUser.role === 'admin' ||
        currentUser.role === 'manager')
    );
  };

  // Role edit permissions (admin only, not self)
  const canEditRole = () => {
    return currentUser?.role === 'admin' && currentUser?.email !== user?.email;
  };

  // Loading state - Enhanced with CardSkeleton
  if (loading) {
    return (
      <div className="p-6 sm:p-10 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto space-y-6">
          <CardSkeleton className="h-64" />
          <CardSkeleton className="h-96" />
          <CardSkeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Error state - Enhanced with Card variants
  if (error) {
    return (
      <div className="p-6 sm:p-10 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card variant="destructive" className="max-w-md">
          <CardHeader>
            <CardTitle size="lg">Error Loading Profile</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter justify="center">
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Not found - Enhanced with proper Card structure
  if (!user) {
    return (
      <div className="p-6 sm:p-10 min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>The requested user profile could not be found.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main render
  return (
    <div className="p-6 sm:p-10 min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-4xl mx-auto shadow-xl rounded-2xl overflow-hidden">
        <CardHeader 
          className="bg-[#051224] text-white p-6"
          action={
            isEditing && (
              <div className="mt-3">
                <Label className="block">
                  <span className="sr-only">Change Profile Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-white file:mr-2 file:px-3 file:py-1 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-white/20 file:text-white hover:file:bg-white/30 file:cursor-pointer cursor-pointer"
                    disabled={uploadingImg}
                  />
                </Label>
                {uploadingImg && (
                  <div className="flex items-center mt-2 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                )}
              </div>
            )
          }
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative flex-shrink-0">
              <Image
                src={user.profileImgUrl || '/user.png'}
                alt={`${user.name || 'User'}'s profile`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => (e.currentTarget.src = '/user.png')}
              />
            </div>
            <div className="flex-grow">
              <CardTitle size="lg" as="h1" className="text-white mb-1">
                {user.name || 'Unnamed User'}
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg mb-2">
                {user.email}
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={user.role || 'Member'} />
                <StatusBadge 
                  status={user.profileState || 'Unknown Status'}
                  variant={user.profileState === 'active' ? 'active' : 'inactive'}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          <div>
            <CardTitle size="default" as="h2" className="mb-4 text-gray-800 dark:text-gray-200">
              Personal Information
            </CardTitle>
            <CardDescription className="mb-6">
              {isEditing ? 'Edit the information below to update the profile' : 'View detailed personal information'}
            </CardDescription>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium mb-2 block">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-sm font-medium mb-2 block">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    type="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="gender" className="text-sm font-medium mb-2 block">
                    Gender
                  </Label>
                  <select
                    id="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium mb-2 block">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleDateChange}
                  />
                </div>
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <div>
                    <Label htmlFor="profileState" className="text-sm font-medium mb-2 block">
                      Profile Status
                    </Label>
                    <select
                      id="profileState"
                      name="profileState"
                      value={form.profileState}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
                {canEditRole() && (
                  <div>
                    <Label htmlFor="role" className="text-sm font-medium mb-2 block">
                      Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Info label="Phone Number" value={user.phoneNumber} icon="📞" />
                <Info label="Gender" value={user.gender} icon="⚧️" />
                <Info
                  label="Date of Birth"
                  value={
                    user.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : null
                  }
                  icon="🎂"
                />
                <Info label="Profile Status" value={user.profileState} icon="🟢" />

                {/* Show status change date only when user is inactive */}
                {user.profileState === 'inactive' && user.stateChangedAt && (
                  <Info 
                    label="Set Inactive On" 
                    value={new Date(user.stateChangedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                    icon="📅"
                  />
                )}

                <Info label="Role" value={user.role} icon="👤" />
                <Info
                  label="Member Since"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })
                      : null
                  }
                  icon="📆"
                />
              </div>
            )}
          </div>

          <div>
            <CardTitle size="default" as="h3" className="mb-4 text-gray-800 dark:text-gray-200">
              Projects & Involvement
            </CardTitle>
            <CardDescription className="mb-6">
              Current project assignments and role information
            </CardDescription>
            {projects.filter((p) => p.userRoleInProject).length > 0 ? (
              <div className="grid gap-4">
                {projects
                  .filter((p) => p.userRoleInProject)
                  .map((project) => (
                    <CardCompact
                      key={project._id}
                      hoverable
                      className="bg-white dark:bg-gray-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-grow">
                          <CardTitle size="sm" className="text-gray-800 dark:text-gray-100 mb-1">
                            {project.projectName}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Status:{' '}
                            <span
                              className={`font-medium ${
                                project.projectState === 'completed'
                                  ? 'text-green-600 dark:text-green-400'
                                  : project.projectState === 'ongoing'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-yellow-600 dark:text-yellow-400'
                              }`}
                            >
                              {project.projectState || 'Unknown'}
                            </span>
                          </CardDescription>
                        </div>
                        <StatusBadge 
                          status={project.userRoleInProject}
                          variant={project.userRoleInProject === 'manager' ? 'manager' : 'member'}
                        />
                      </div>
                    </CardCompact>
                  ))}
              </div>
            ) : (
              <Card variant="warning">
                <CardContent noPadding className="text-center py-8 px-6">
                  <div className="text-6xl mb-4">📋</div>
                  <CardTitle size="sm" className="mb-2">No Projects Assigned</CardTitle>
                  <CardDescription>
                    This user is not currently involved in any projects.
                  </CardDescription>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>

        <CardFooter justify="between" className="flex flex-col sm:flex-row items-center gap-3 p-6 bg-gray-50 dark:bg-gray-800">
          <Button variant="outline" onClick={() => router.back()}>
            ← Go Back
          </Button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={updating || uploadingImg}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updating || uploadingImg}
                  className="min-w-[80px]"
                >
                  {updating ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            ) : (
              canEditProfile() && (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )
            )}
          </div>
        </CardFooter>
      </Card>
      <ToastContainer position="bottom-right" autoClose={5000} theme="colored" />
    </div>
  );
}
