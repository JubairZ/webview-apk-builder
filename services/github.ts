const GH_API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface WorkflowRun {
  id: number;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  html_url: string;
  created_at: string;
}

export interface Artifact {
  id: number;
  name: string;
  archive_download_url: string;
  size_in_bytes: number;
  expired: boolean;
}

export interface BuildStatus {
  runId: number | null;
  status: "idle" | "queued" | "in_progress" | "completed" | "failed";
  conclusion: string | null;
  htmlUrl: string | null;
  artifacts: Artifact[];
  repoUrl: string | null;
}

function headers(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

export async function getUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GH_API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error("Invalid GitHub token");
  return res.json() as Promise<GitHubUser>;
}

export async function createRepo(
  token: string,
  repoName: string
): Promise<{ full_name: string; html_url: string; default_branch: string }> {
  const res = await fetch(`${GH_API}/user/repos`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      name: repoName,
      private: false,
      auto_init: false,
      description: "WebView APK built with WebView APK Builder",
    }),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? "Failed to create repo");
  }
  return res.json() as Promise<{ full_name: string; html_url: string; default_branch: string }>;
}

export async function deleteRepo(
  token: string,
  owner: string,
  repo: string
): Promise<void> {
  await fetch(`${GH_API}/repos/${owner}/${repo}`, {
    method: "DELETE",
    headers: headers(token),
  });
}

export async function repoExists(
  token: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, {
    headers: headers(token),
  });
  return res.ok;
}

interface FileEntry {
  path: string;
  content: string;
}

export async function pushFiles(
  token: string,
  owner: string,
  repo: string,
  files: FileEntry[],
  message = "Initial commit"
): Promise<void> {
  const base = `${GH_API}/repos/${owner}/${repo}/git`;

  // 1. Create blobs
  const blobs = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(`${base}/blobs`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      const blob = await res.json() as { sha: string };
      return { path: f.path, sha: blob.sha, mode: "100644", type: "blob" };
    })
  );

  // 2. Create tree
  const treeRes = await fetch(`${base}/trees`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ tree: blobs }),
  });
  const tree = await treeRes.json() as { sha: string };

  // 3. Create commit
  const commitRes = await fetch(`${base}/commits`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ message, tree: tree.sha, parents: [] }),
  });
  const commit = await commitRes.json() as { sha: string };

  // 4. Create/update ref
  const refRes = await fetch(`${base}/refs`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ ref: "refs/heads/main", sha: commit.sha }),
  });

  if (!refRes.ok) {
    // Branch exists, force push
    await fetch(`${base}/refs/heads/main`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
  }
}

export async function getLatestWorkflowRun(
  token: string,
  owner: string,
  repo: string
): Promise<WorkflowRun | null> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/actions/runs?per_page=1`, {
    headers: headers(token),
  });
  if (!res.ok) return null;
  const data = await res.json() as { workflow_runs: WorkflowRun[] };
  return data.workflow_runs[0] ?? null;
}

export async function getArtifacts(
  token: string,
  owner: string,
  repo: string,
  runId: number
): Promise<Artifact[]> {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`, {
    headers: headers(token),
  });
  if (!res.ok) return [];
  const data = await res.json() as { artifacts: Artifact[] };
  return data.artifacts;
}

export function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40) || "my-webview-app";
}
