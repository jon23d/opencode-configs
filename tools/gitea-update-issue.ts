import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Update an existing Gitea issue. Can change title, body, state (open/closed), and assignees. Only provided fields are changed. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The number of the issue to update"),
    title: tool.schema.string().optional().describe("New title for the issue"),
    body: tool.schema
      .string()
      .optional()
      .describe("New body / description for the issue (replaces existing body)"),
    state: tool.schema.string().optional().describe('New state: "open" or "closed"'),
    assignees: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated usernames to set as assignees (replaces existing assignees). Pass empty string to clear all."
      ),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config

    const payload: Record<string, unknown> = {}
    if (args.title !== undefined) payload.title = args.title
    if (args.body !== undefined) payload.body = args.body
    if (args.state !== undefined) payload.state = args.state
    if (args.assignees !== undefined) {
      payload.assignees = args.assignees ? args.assignees.split(",").map((a) => a.trim()) : []
    }

    if (Object.keys(payload).length === 0) return "No fields provided — nothing to update"

    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues/${args.issue_number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to update issue #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
    }

    const issue = await res.json()
    const updated = Object.keys(payload).join(", ")
    return `Updated issue #${issue.number} (${updated})\nState: ${issue.state} | URL: ${issue.html_url}`
  },
})
