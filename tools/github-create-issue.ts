import { tool } from "@opencode-ai/plugin"
import { getGithubIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Create a new issue in the GitHub repository. Returns the number and URL of the created issue. Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or issue_tracker.github.repo_url set in the project's agent-config.json.",
  args: {
    title: tool.schema.string().describe("The issue title"),
    body: tool.schema
      .string()
      .optional()
      .describe("The issue body / description (Markdown supported)"),
    labels: tool.schema
      .string()
      .optional()
      .describe("Comma-separated label names to apply, e.g. 'bug,help wanted'"),
    assignees: tool.schema
      .string()
      .optional()
      .describe("Comma-separated GitHub usernames to assign, e.g. 'alice,bob'"),
  },
  async execute(args) {
    const config = getGithubIssueConfig()
    if (!config) {
      return "GitHub not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add issue_tracker.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config

    const payload: Record<string, unknown> = { title: args.title }
    if (args.body) payload.body = args.body
    if (args.labels) payload.labels = args.labels.split(",").map((l) => l.trim())
    if (args.assignees) payload.assignees = args.assignees.split(",").map((a) => a.trim())

    const res = await fetch(`${apiBase}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to create issue: ${res.status} ${err.message ?? res.statusText}`
    }

    const issue = await res.json()
    return `Created issue #${issue.number}: ${issue.title}\nURL: ${issue.html_url}`
  },
})
