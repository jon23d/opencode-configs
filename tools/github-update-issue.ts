import { tool } from "@opencode-ai/plugin"
import { getGithubIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Update an existing GitHub issue. Can change title, body, state (open/closed), labels, and assignees. Only provided fields are changed. Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or issue_tracker.github.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The number of the issue to update"),
    title: tool.schema.string().optional().describe("New title for the issue"),
    body: tool.schema
      .string()
      .optional()
      .describe("New body / description for the issue (replaces existing body)"),
    state: tool.schema.string().optional().describe('New state: "open" or "closed"'),
    labels: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated label names to set (replaces existing labels). Pass empty string to clear all."
      ),
    assignees: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated usernames to set as assignees (replaces existing assignees). Pass empty string to clear all."
      ),
  },
  async execute(args) {
    const config = getGithubIssueConfig()
    if (!config) {
      return "GitHub not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add issue_tracker.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config

    const payload: Record<string, unknown> = {}
    if (args.title !== undefined) payload.title = args.title
    if (args.body !== undefined) payload.body = args.body
    if (args.state !== undefined) payload.state = args.state
    if (args.labels !== undefined)
      payload.labels = args.labels ? args.labels.split(",").map((l) => l.trim()) : []
    if (args.assignees !== undefined)
      payload.assignees = args.assignees ? args.assignees.split(",").map((a) => a.trim()) : []

    if (Object.keys(payload).length === 0) return "No fields provided — nothing to update"

    const res = await fetch(`${apiBase}/issues/${args.issue_number}`, {
      method: "PATCH",
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
      return `Failed to update issue #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
    }

    const issue = await res.json()
    const updated = Object.keys(payload).join(", ")
    return `Updated issue #${issue.number} (${updated})\nState: ${issue.state} | URL: ${issue.html_url}`
  },
})
