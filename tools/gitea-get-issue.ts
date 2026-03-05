import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Read a Gitea issue by its number. Returns the issue title, body, state, labels, assignees, and comments. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The issue number to retrieve"),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
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
    const assigneeNames = (issue.assignees ?? []).map((a: { login: string }) => a.login)

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
