import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { join } from "path"

function getGiteaConfig() {
  const token = process.env.GITEA_ACCESS_TOKEN
  if (!token) return null

  // Prefer explicit env var; fall back to gitea.json in the config repo
  let repoUrl = process.env.GITEA_REPO_URL
  if (!repoUrl) {
    try {
      const configPath = join(process.cwd(), "gitea.json")
      const file = JSON.parse(readFileSync(configPath, "utf-8"))
      repoUrl = file.repoUrl
    } catch {
      // file missing or malformed — handled below
    }
  }

  if (!repoUrl) return null

  const url = new URL(repoUrl)
  const parts = url.pathname.split("/").filter(Boolean)
  return { baseUrl: url.origin, owner: parts[0], repo: parts[1], token }
}

export default tool({
  description:
    "Read a Gitea issue by its number. Returns the issue title, body, state, labels, assignees, and comments. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or a repoUrl set in ~/.opencode/gitea.json.",
  args: {
    issue_number: tool.schema
      .number()
      .describe("The issue number to retrieve"),
  },
  async execute(args) {
    const config = getGiteaConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add a repoUrl to gitea.json"
    }

    const { baseUrl, owner, repo, token } = config
    const headers = {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    }

    const issueRes = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues/${args.issue_number}`,
      { headers }
    )
    if (!issueRes.ok) {
      const err = await issueRes.json().catch(() => ({}))
      return `Failed to fetch issue #${args.issue_number}: ${issueRes.status} ${err.message ?? issueRes.statusText}`
    }
    const issue = await issueRes.json()

    const commentsRes = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues/${args.issue_number}/comments`,
      { headers }
    )
    const comments = commentsRes.ok ? await commentsRes.json() : []

    const labelNames = (issue.labels ?? []).map((l: { name: string }) => l.name)
    const assigneeNames = (issue.assignees ?? []).map(
      (a: { login: string }) => a.login
    )

    const commentBlock =
      comments.length === 0
        ? "No comments."
        : comments
            .map(
              (c: { user: { login: string }; created_at: string; body: string }) =>
                `@${c.user.login} (${c.created_at.slice(0, 10)}): ${c.body}`
            )
            .join("\n\n")

    return [
      `Issue #${issue.number}: ${issue.title}`,
      `State: ${issue.state}`,
      `Labels: ${labelNames.length ? labelNames.join(", ") : "none"}`,
      `Assignees: ${assigneeNames.length ? assigneeNames.join(", ") : "none"}`,
      `Created: ${issue.created_at?.slice(0, 10)} | Updated: ${issue.updated_at?.slice(0, 10)}`,
      `URL: ${issue.html_url}`,
      ``,
      `## Description`,
      issue.body || "(no description)",
      ``,
      `## Comments (${comments.length})`,
      commentBlock,
    ].join("\n")
  },
})
