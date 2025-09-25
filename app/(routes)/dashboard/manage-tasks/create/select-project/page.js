"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  ChevronLeft,
  Plus,
  Users,
  Clock,
  Tag,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * SelectProjectPage — robust data mapping and normalization
 * - normalizes varied API shapes into a predictable project shape
 * - logs sample response for debugging when fields are missing
 * - shows fallbacks in UI when description/members/tags are missing
 */
export default function SelectProjectPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [previewProject, setPreviewProject] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const mountedRef = useRef(true);
  const fetchControllerRef = useRef(null);

  // Helper: normalize a project object from API into our UI shape
  function normalizeProject(p) {
    if (!p || typeof p !== "object") return null;

    const id = p._id || p.id || p.projectId || p._1d || p.uuid || null;

    const projectName =
      p.projectName ||
      p.name ||
      p.title ||
      p.project_title ||
      "Untitled Project";

    const description =
      p.description || p.desc || p.details || p.summary || p.about || "";

    const startDate =
      p.startDate ||
      p.start_date ||
      p.createdAt ||
      p.created_at ||
      p.created ||
      null;

    const progress =
      Number(p.progress ?? p.percent ?? p.percentage ?? p.completion ?? 0) || 0;

    // tags might be array or comma string
    let tags = p.tags || p.tagList || p.labels || p.categories || [];
    if (typeof tags === "string")
      tags = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!Array.isArray(tags)) tags = [];

    // members might be array of user objects, or number, or object map
    let members = p.members ?? p.team ?? p.participants ?? [];
    if (typeof members === "number") {
      // backend gave a count only
      members = new Array(members).fill({});
    } else if (
      members &&
      typeof members === "object" &&
      !Array.isArray(members)
    ) {
      // object map -> convert to array
      members = Object.values(members);
    } else if (!Array.isArray(members)) {
      members = [];
    }

    const projectState =
      p.projectState ||
      p.state ||
      p.status ||
      (progress >= 100 ? "completed" : "ongoing");

    return {
      // keep original object available for debug
      _raw: p,
      _id: id,
      id,
      projectName,
      description,
      startDate,
      progress,
      tags,
      members,
      projectState,
    };
  }

  useEffect(() => {
    mountedRef.current = true;
    loadProjects();
    return () => {
      mountedRef.current = false;
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProjects() {
    setLoading(true);
    setError("");

    if (fetchControllerRef.current) {
      try {
        fetchControllerRef.current.abort();
      } catch (e) {
        /* ignore */
      }
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
        signal: controller.signal,
      });

      if (!res.ok) {
        let parsed = null;
        try {
          parsed = await res.json();
        } catch (e) {
          /* ignore */
        }
        const msg =
          parsed?.message ||
          parsed?.error ||
          `Failed to fetch projects (status ${res.status})`;
        if (res.status === 401 || msg === "Invalid token") {
          router.push("/login");
          return;
        }
        throw new Error(msg);
      }

      const data = await res.json();

      // Accept different API shapes
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.projects)) list = data.projects;
      else if (Array.isArray(data.items)) list = data.items;
      else if (Array.isArray(data.data)) list = data.data;
      else if (Array.isArray(data.result)) list = data.result;
      else if (data && typeof data === "object") {
        // try to find an array inside object
        const possible = Object.values(data).find((v) => Array.isArray(v));
        if (Array.isArray(possible)) list = possible;
      }

      // normalize each project
      const normalized = list.map(normalizeProject).filter(Boolean);

      if (!mountedRef.current) return;

      // debug: if first item misses common fields, log a sample to console for developer to inspect
      if (normalized.length > 0) {
        const sample = normalized[0];
        const missing = [];
        if (!sample.description) missing.push("description");
        if (!sample.members || sample.members.length === 0)
          missing.push("members");
        if (!sample.tags || sample.tags.length === 0) missing.push("tags");
        if (missing.length) {
          console.debug(
            "SelectProjectPage — sample normalized project is missing fields:",
            missing,
            "raw:",
            sample._raw
          );
        }
      }

      setProjects(normalized);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error fetching projects:", err);
      setError(err?.message || "Failed to load projects");
      if (err?.message === "Invalid token") router.push("/login");
    } finally {
      if (mountedRef.current) setLoading(false);
      fetchControllerRef.current = null;
    }
  }

  // Derived list with search/filter/sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.slice();

    if (filter !== "all")
      list = list.filter(
        (p) =>
          p.projectState === filter ||
          p.state === filter ||
          (p._raw && (p._raw.state === filter || p._raw.status === filter))
      );

    if (q)
      list = list.filter(
        (p) =>
          (p.projectName || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tags || []).join(" ").toLowerCase().includes(q)
      );

    if (sortBy === "recent")
      list.sort(
        (a, b) =>
          new Date(
            b.startDate || b._raw?.createdAt || b._raw?.created_at || 0
          ) -
          new Date(a.startDate || a._raw?.createdAt || a._raw?.created_at || 0)
      );
    if (sortBy === "alpha")
      list.sort((a, b) =>
        (a.projectName || "").localeCompare(b.projectName || "")
      );
    if (sortBy === "progress")
      list.sort((a, b) => (b.progress || 0) - (a.progress || 0));

    return list;
  }, [projects, query, filter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openPreview(p) {
    setPreviewProject(p);
    document.documentElement.style.overflow = "hidden";
  }

  function closePreview() {
    setPreviewProject(null);
    document.documentElement.style.overflow = "";
  }

  function handleCreateProject() {
    router.push("/dashboard/create-project");
  }

  function handleSelect(project) {
    const id =
      project._id || project.id || project._raw?.id || project._raw?._id;
    const name =
      project.projectName || project._raw?.name || project._raw?.title || "";
    router.push(
      `/dashboard/manage-tasks/create?projectId=${id}&projectName=${encodeURIComponent(
        name
      )}`
    );
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-slate-50 to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Projects
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pick a project to create tasks for —{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {projects.length}
              </span>{" "}
              total
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/manage-tasks")}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 hover:scale-105 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-2 shadow-sm">
                <button
                  onClick={() => setSortBy("recent")}
                  className={`px-2 py-1 text-xs rounded ${
                    sortBy === "recent"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                      : ""
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy("progress")}
                  className={`px-2 py-1 text-xs rounded ${
                    sortBy === "progress"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                      : ""
                  }`}
                >
                  Top progress
                </button>
                <button
                  onClick={() => setSortBy("alpha")}
                  className={`px-2 py-1 text-xs rounded ${
                    sortBy === "alpha"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                      : ""
                  }`}
                >
                  A → Z
                </button>
              </div>

              <button
                onClick={handleCreateProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg shadow hover:brightness-105 transition-transform"
              >
                <Plus className="h-4 w-4" /> New Project
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="flex items-center gap-3 flex-1 bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-700 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search projects, tags or description..."
                className="w-full bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-xs px-2 py-1 bg-transparent"
                >
                  Clear
                </button>
              )}
            </label>

            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-transparent border border-gray-200 dark:border-slate-700 rounded-md text-sm"
              >
                <option value="all">All states</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 animate-pulse min-h-[180px]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="text-red-600 dark:text-red-300 text-3xl">⚠️</div>
            <p className="mt-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
            <div className="mt-4">
              <button
                onClick={loadProjects}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paged.map((project) => {
                const isExpanded =
                  expandedId === project._id || expandedId === project.id;
                return (
                  <article
                    key={project._id || project.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow hover:shadow-lg transition transform duration-150 ease-out`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-lg">
                        {(project.projectName || project.name || "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3
                              className="text-lg font-semibold text-gray-900 dark:text-white truncate"
                              title={project.projectName || project.name}
                            >
                              {project.projectName || project.name}
                            </h3>
                            <p
                              className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                              style={{
                                lineHeight: "1.15rem",
                                maxHeight: "3.5rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {project.description || "No description"}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {project.progress || 0}%
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {project.startDate
                                ? new Date(
                                    project.startDate
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="w-full bg-gray-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
                            <div
                              style={{ width: `${project.progress || 0}%` }}
                              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {(project.tags || []).slice(0, 8).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-300 truncate"
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-4 bg-gray-50 dark:bg-slate-900 rounded-md p-3">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Full description:</strong>
                              <div className="mt-2 text-sm">
                                {project.description ||
                                  "No description available"}
                              </div>
                            </div>

                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center gap-3">
                                <Users className="h-4 w-4" />
                                <div>
                                  {(project.members || []).length || 0} members
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <Clock className="h-4 w-4" />{" "}
                                <div>
                                  Start:{" "}
                                  {project.startDate
                                    ? new Date(
                                        project.startDate
                                      ).toLocaleDateString()
                                    : "—"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/dashboard/manage-tasks/create?projectId=${
                                      project._id || project.id
                                    }&projectName=${encodeURIComponent(
                                      project.projectName || project.name || ""
                                    )}`
                                  );
                                }}
                                className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm"
                              >
                                Create Task
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/dashboard/projects/${
                                      project._id || project.id
                                    }`
                                  );
                                }}
                                className="px-3 py-2 rounded-md border text-sm"
                              >
                                Open Project
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {project.members?.length || 0} members
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(project._id || project.id);
                          }}
                          className="px-3 py-1 text-sm rounded-md border bg-transparent flex items-center gap-2"
                        >
                          {expandedId === (project._id || project.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4" /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" /> Details
                            </>
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(project);
                          }}
                          className="px-3 py-1 text-sm rounded-md border bg-white dark:bg-slate-900"
                        >
                          Quick view
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/projects/${project._id || project.id}`
                            );
                          }}
                          className="px-3 py-1 text-sm rounded-md border"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-medium">
                  {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{" "}
                —{" "}
                <span className="font-medium">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-medium">{filtered.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  Prev
                </button>
                <div className="px-3 py-1 text-sm">
                  {page} / {totalPages}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Preview modal */}
        {previewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={closePreview}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            />
            <div className="relative z-50 max-w-2xl w-full sm:w-11/12 md:w-3/4 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-2xl transform transition-transform duration-200">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-xl font-semibold text-gray-900 dark:text-white truncate"
                    title={previewProject.projectName || previewProject.name}
                  >
                    {previewProject.projectName || previewProject.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-h-32 overflow-hidden">
                    {previewProject.description || "No description"}
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />{" "}
                      {previewProject.members?.length || 0} members
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />{" "}
                      {previewProject.startDate
                        ? new Date(
                            previewProject.startDate
                          ).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tags
                    </h4>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {(previewProject.tags || []).map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-900"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-stretch sm:items-end">
                  <button
                    onClick={() => {
                      router.push(
                        `/dashboard/manage-tasks/create?projectId=${
                          previewProject._id || previewProject.id
                        }&projectName=${encodeURIComponent(
                          previewProject.projectName ||
                            previewProject.name ||
                            ""
                        )}`
                      );
                    }}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={closePreview}
                    className="px-3 py-2 rounded-md border bg-transparent"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
