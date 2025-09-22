"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SelectProjectPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/projects", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const projectsData = await res.json();
          setProjects(projectsData);
        } else {
          throw new Error("Failed to fetch projects");
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [router]);

  const handleProjectSelect = (project) => {
    router.push(
      `/dashboard/manage-tasks/create?projectId=${
        project._id
      }&projectName=${encodeURIComponent(project.projectName)}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/manage-tasks")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Select Project
          </h1>
          <button
            onClick={() => router.push("/dashboard/manage-tasks")}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Tasks
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          {projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-700">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">
                📁
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No projects found
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Create a project first to assign tasks
              </p>
              <button
                onClick={() => router.push("/dashboard/create-project")}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => handleProjectSelect(project)}
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {project.projectName}
                  </h3>
                  <div className="flex items-center justify-between mt-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.projectState === "ongoing"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : project.projectState === "completed"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                      }`}
                    >
                      {project.projectState}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
