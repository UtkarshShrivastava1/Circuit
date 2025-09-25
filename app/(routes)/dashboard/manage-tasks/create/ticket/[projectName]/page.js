"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export default function ProjectTasksPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProjects() {
      try {
        // Fetch all projects
        const projectsRes = await fetch("/api/projects");
        if (!projectsRes.ok) throw new Error("Failed to fetch projects");
        const projectsData = await projectsRes.json();

        // For each project, fetch its tasks
        const projectsWithTasks = await Promise.all(
          projectsData.map(async (project) => {
            const tasksRes = await fetch(
              `/api/tasks?projectName=${encodeURIComponent(
                project.projectName
              )}`
            );
            const tasks = tasksRes.ok ? await tasksRes.json() : [];
            return { ...project, tasks };
          })
        );

        setProjects(projectsWithTasks);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load projects and tasks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [toast]);

  const handleTaskSelect = (projectName, taskId) => {
    router.push(
      `/dashboard/manage-tasks/create/ticket/${projectName}/${taskId}`
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Project Tasks</h1>

      <div className="space-y-8">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-gray-500">No projects found.</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{project.projectName}</span>
                  <Badge
                    variant={
                      project.projectState === "completed"
                        ? "success"
                        : "default"
                    }
                  >
                    {project.projectState}
                  </Badge>
                </CardTitle>
                <CardDescription>{project.projectDomain}</CardDescription>
              </CardHeader>
              <CardContent>
                {project.tasks.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">
                    No tasks in this project
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.tasks.map((task) => (
                      <Button
                        key={task._id}
                        variant="outline"
                        className="h-auto py-4 text-left justify-start flex flex-col items-start"
                        onClick={() =>
                          handleTaskSelect(project.projectName, task._id)
                        }
                      >
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Status: {task.status || "Not started"}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
