"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react"; // Loader icon
import UserHoverCard from "@/app/_components/UserHoverCard";

const ProjectCard = ({ project, onDeleted }) => {
  const {
    projectName,
    projectState,
    projectDomain,
    startDate,
    endDate,
    participants,
  } = project;

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleRedirect = (e) => {
    e.preventDefault();
    setLoading(true);
    router.push(`/dashboard/projects/${projectName}`);
  };

  const handleDelete = async () => {
  if (!confirm(`Are you sure you want to delete project "${projectName}"?`)) {
    return;
  }
  setDeleting(true);
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to delete projects.");
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/projects/${projectName}`, {  // Use projectName instead of _id
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      alert(`Failed to delete: ${data?.error || "Unknown error"}`);
      setDeleting(false);
      return;
    }

    alert(`Project "${projectName}" deleted successfully.`);
    setDeleting(false);
    if (onDeleted) onDeleted(projectName); // Pass projectName to parent
  } catch (error) {
    alert("Network error deleting the project.");
    console.error(error);
    setDeleting(false);
  }
};


  const projectManager = participants.find(
    (participant) => participant.roleInProject === "project-manager"
  );

  const projectMembers = participants.filter(
    (participant) => participant.roleInProject === "project-member"
  );

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
      <CardHeader className="bg-gray-100 p-4 rounded-t-lg dark:bg-slate-950">
        <CardTitle className="text-xl font-bold text-center">{projectName}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <strong>State:</strong>{" "}
          <h1
            className={`px-2 w-min rounded-xl ${
              projectState === "ongoing"
                ? "bg-yellow-600 text-yellow-50"
                : projectState === "completed"
                ? "bg-green-800 text-green-50"
                : ""
            }`}
          >
            {projectState}
          </h1>
        </div>
        <div>
          <strong>Domain:</strong> {projectDomain || "N/A"}
        </div>
        <div>
          <strong>Duration:</strong> {formatDate(startDate)} to {formatDate(endDate)}
        </div>
        {projectManager && (
          <div className="mt-4">
            <strong>Project Manager:</strong>
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 flex-shrink-0">
                <UserHoverCard email={projectManager.email} />
              </div>
              <div>
                <div className="font-medium truncate w-40">{projectManager.username}</div>
                <div className="text-sm text-gray-500 truncate w-44">{projectManager.email}</div>
                <div className="text-sm">{projectManager.responsibility}</div>
              </div>
            </div>
          </div>
        )}
        {projectMembers.length > 0 && (
          <div className="mt-4">
            <strong>Members:</strong>
            <div className="grid grid-cols-6 gap-1 mt-2 justify-items-center">
              {projectMembers.map((member, idx) => (
                <div key={idx} className="w-full">
                  <UserHoverCard email={member.email} />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 dark:bg-slate-900 rounded-b-lg flex gap-2">
        <button
          onClick={handleRedirect}
          disabled={loading || deleting}
          className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Go to Details"}
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || deleting}
          className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Delete"}
        </button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
