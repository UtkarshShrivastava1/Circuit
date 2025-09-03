'use client'
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value || "N/A"}</p>
    </div>
  );
}

export default function UserProfile() {
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    gender: "",
    profileState: "",
    role: "",
    profileImgUrl: "",
    dateOfBirth: "",
  });

  // Fetch user, current auth session, and projects
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      try {
        // Fetch user being viewed
        const userRes = await fetch(
          `/api/user/${encodeURIComponent(decodedEmail)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!userRes.ok) throw new Error("User not found");
        const userData = await userRes.json();

        // Fetch current user (for permission checks)
        const sessionRes = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sessionRes.ok) throw new Error("Not authenticated");
        const sessionData = await sessionRes.json();

        // Fetch projects
        const projectsRes = await fetch("/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        const projectsData = await projectsRes.json();

        setCurrentUser(sessionData);
        setUser(userData);
        setForm({
          name: userData.name || "",
          phoneNumber: userData.phoneNumber || "",
          gender: userData.gender || "",
          profileState: userData.profileState || "",
          role: userData.role || "member",
          profileImgUrl: userData.profileImgUrl || "",
          dateOfBirth: userData.dateOfBirth || "",
        });
        setProjects(
          projectsData.map((p) => ({
            ...p,
            userRoleInProject:
              p.participants?.find((u) => u.email === decodedEmail)?.role ?? "",
          }))
        );
      } catch (err) {
        setError(err.message);
        if (err.message?.toLowerCase().includes("unauthorized")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [decodedEmail, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImg(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setUser((prev) => ({ ...prev, profileImgUrl: url }));
      setForm((prev) => ({ ...prev, profileImgUrl: url }));
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleDateChange = (e) => {
    setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }));
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required.");
      router.push("/login");
      return;
    }
    try {
      // Remove undefined/empty fields to avoid overwriting with blank values
      const submittedData = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v !== undefined && v !== "")
      );

      const res = await fetch(`/api/user/${encodeURIComponent(decodedEmail)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submittedData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      const updatedUser = await res.json();
      setUser(updatedUser);
      setForm({
        name: updatedUser.name || "",
        phoneNumber: updatedUser.phoneNumber || "",
        gender: updatedUser.gender || "",
        profileState: updatedUser.profileState || "",
        role: updatedUser.role || "member",
        profileImgUrl: updatedUser.profileImgUrl || "",
        dateOfBirth: updatedUser.dateOfBirth || "",
      });
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error("Update failed: " + err.message);
    }
  };

  if (loading) return <div className="p-8 text-lg">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!user) return <div className="p-8">User not found.</div>;

  return (
    <div className="p-6 sm:p-10">
      <Card className="max-w-3xl mx-auto shadow-lg rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex flex-wrap items-center space-x-4">
            <div className="relative">
              <img
                src={user.profileImgUrl || "/user.png"}
                alt="Profile"
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
                onError={(e) => (e.currentTarget.src = "/user.png")}
              />
              {isEditing && (
                <div className="mt-2 w-full">
                  <Label className="block mb-1">
                    <span className="sr-only">Change Profile Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block text-sm file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                      disabled={uploadingImg}
                    />
                  </Label>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.name || "N/A"}</h2>
              <p className="text-gray-100">{user.email || "N/A"}</p>
              <span className="px-3 py-1 text-sm rounded-full bg-white/20 capitalize">
                {user.role || "N/A"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="Phone"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer not to say">Prefer not to say</option>
                </Select>
              </div>
              <div>
                <Label>Profile State</Label>
                <Select
                  value={form.profileState}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, profileState: value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="banned">Banned</option>
                </Select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleDateChange}
                />
              </div>
              {(currentUser?.role === "admin" &&
                currentUser?.email !== user.email) && (
                <div>
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, role: value }))
                    }
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Info label="Phone" value={user.phoneNumber || "N/A"} />
              <Info label="Gender" value={user.gender || "N/A"} />
              <Info
                label="Date of Birth"
                value={
                  user.dateOfBirth
                    ? new Date(user.dateOfBirth).toLocaleDateString()
                    : "N/A"
                }
              />
              <Info label="Profile State" value={user.profileState || "N/A"} />
              <Info label="Role" value={user.role || "N/A"} />
              <Info
                label="Member Since"
                value={
                  user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"
                }
              />
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Projects Involved</h3>
            {projects.filter((p) => p.userRoleInProject).length > 0 ? (
              <ul className="space-y-3">
                {projects
                  .filter((p) => p.userRoleInProject)
                  .map((project) => (
                    <li
                      key={project._id}
                      className="p-4 border rounded-lg flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {project.projectName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Status:{" "}
                          <strong
                            className={`${
                              project.projectState === "completed"
                                ? "text-green-600"
                                : project.projectState === "ongoing"
                                ? "text-blue-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {project.projectState || "N/A"}
                          </strong>
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
                          project.userRoleInProject === "manager"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {project.userRoleInProject}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No projects assigned.</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={uploadingImg}>
                {uploadingImg ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full"></span>
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          ) : (
            (currentUser?.email === user.email ||
              currentUser?.role === "admin" ||
              currentUser?.role === "manager") && (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )
          )}
        </CardFooter>
      </Card>
      <ToastContainer />
    </div>
  );
}
