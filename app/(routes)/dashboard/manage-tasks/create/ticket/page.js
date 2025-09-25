"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ProjectTasksPage() {
  const { projectName } = useParams(); // next/navigation params from folder route
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        // 1) Fetch all projects
        const projectsRes = await fetch("/api/projects");
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        const projectsRaw = await projectsRes.json();
        const projectsList = Array.isArray(projectsRaw)
          ? projectsRaw
          : projectsRaw?.projects || [];

        // Find the requested project by projectName
        const found = projectsList.find((p) => p.projectName === projectName);
        if (!found) {
          throw new Error(`Project "${projectName}" not found`);
        }

        // 2) Try to get tasks for the found project
        let tasks = [];
        const projectId = found._id || found.id || found.projectId;

        // Try endpoint that accepts projectName
        try {
          const tasksRes = await fetch(
            `/api/tasks?projectName=${encodeURIComponent(projectName)}`
          );
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            tasks = Array.isArray(tasksData)
              ? tasksData
              : tasksData?.tasks || tasksData?.data || [];
          }
        } catch (err) {
          console.warn("tasks by projectName failed:", err);
        }

        // If still no tasks, try by projectId
        if ((!tasks || tasks.length === 0) && projectId) {
          try {
            const tasksRes2 = await fetch(`/api/tasks?projectId=${projectId}`);
            if (tasksRes2.ok) {
              const tasksData2 = await tasksRes2.json();
              tasks = Array.isArray(tasksData2)
                ? tasksData2
                : tasksData2?.tasks || tasksData2?.data || [];
            }
          } catch (err) {
            console.warn("tasks by projectId failed:", err);
          }
        }

        // If still empty, try fetching all tasks and filter (last resort)
        if (!tasks || tasks.length === 0) {
          try {
            const allTasksRes = await fetch("/api/tasks");
            if (allTasksRes.ok) {
              const allTasks = await allTasksRes.json();
              const list = Array.isArray(allTasks)
                ? allTasks
                : allTasks?.tasks || [];
              tasks = list.filter((t) => {
                // match by projectName or project id depending on tasks schema
                if (!t) return false;
                if (t.projectName && t.projectName === projectName) return true;
                if (
                  t.project &&
                  (t.project.projectName === projectName ||
                    t.project === projectId)
                )
                  return true;
                return false;
              });
            }
          } catch (err) {
            console.warn("fallback tasks fetch failed:", err);
          }
        }

        if (mounted) {
          // Keep the project object and attached tasks
          setProjects([{ ...found, tasks }]);
        }
      } catch (err) {
        console.error("Failed loading project/tasks:", err);
        toast({
          title: "Error",
          description: err?.message || "Failed to load project or tasks",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [projectName, toast]);

  const handleCreateTicket = (taskId) => {
    // navigate to create-ticket for selected task
    router.push(
      `/dashboard/manage-tasks/create/ticket/${encodeURIComponent(
        projectName
      )}/${taskId}`
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(2)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-gray-500">
              Project not found or no tasks available.
            </p>
            <div className="mt-4">
              <Link href="/dashboard/manage-tasks" className="underline">
                Back to projects
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projects[0];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">
        Create Ticket — {project.projectName}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{project.projectName}</span>
            <Badge
              variant={
                project.projectState === "completed" ? "success" : "default"
              }
            >
              {project.projectState || "active"}
            </Badge>
          </CardTitle>
          {project.projectDomain ? (
            <CardDescription>{project.projectDomain}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {!project.tasks || project.tasks.length === 0 ? (
            <p className="text-center py-4 text-gray-500">
              No tasks in this project
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.tasks.map((task) => (
                <Button
                  key={task._id || task.id}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start flex flex-col items-start w-full"
                  onClick={() => handleCreateTicket(task._id || task.id)}
                >
                  <div className="font-medium">
                    {task.title || task.name || `Task ${task._id || task.id}`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Status: {task.status || task.state || "Not started"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Click to create ticket for this task
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
