import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Create a new issue in the Gitea repository. Returns the number and URL of the created issue. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
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
      .describe("Comma-separated usernames to assign, e.g. 'alice,bob'"),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config

    const payload: Record<string, unknown> = { title: args.title }
    if (args.body) payload.body = args.body
    if (args.labels) payload.labels = args.labels.split(",").map((l) => l.trim())
    if (args.assignees) payload.assignees = args.assignees.split(",").map((a) => a.trim())

    const res = await fetch(`${baseUrl}/api/v1/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
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
