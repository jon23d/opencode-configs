import { tool } from "@opencode-ai/plugin"
import { getGithubIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Read a GitHub issue by its number. Returns the issue title, body, state, labels, assignees, and comments. Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or issue_tracker.github.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The issue number to retrieve"),
  },
  async execute(args) {
    const config = getGithubIssueConfig()
    if (!config) {
      return "GitHub not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add issue_tracker.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }

    const issueRes = await fetch(`${apiBase}/issues/${args.issue_number}`, { headers })
    if (!issueRes.ok) {
      const err = await issueRes.json().catch(() => ({}))
      return `Failed to fetch issue #${args.issue_number}: ${issueRes.status} ${err.message ?? issueRes.statusText}`
    }
    const issue = await issueRes.json()

    const commentsRes = await fetch(`${apiBase}/issues/${args.issue_number}/comments`, {
      headers,
    })
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
