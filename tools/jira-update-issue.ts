import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Update fields on an existing Jira issue. Only provided fields are changed. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    summary: tool.schema.string().optional().describe("New summary"),
    description: tool.schema
      .string()
      .optional()
      .describe("New description (plain text; replaces existing body)"),
    labels: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated labels (replaces existing labels). Pass empty string to clear all."
      ),
    priority: tool.schema
      .string()
      .optional()
      .describe('New priority, e.g. "Highest", "High", "Medium", "Low"'),
    assignee_account_id: tool.schema
      .string()
      .optional()
      .describe("accountId of the new assignee, or empty string to unassign"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const fields: Record<string, unknown> = {}
    if (args.summary !== undefined) fields.summary = args.summary
    if (args.description !== undefined) fields.description = toAdf(args.description)
    if (args.labels !== undefined)
      fields.labels = args.labels ? args.labels.split(",").map((l) => l.trim()) : []
    if (args.priority !== undefined) fields.priority = { name: args.priority }
    if (args.assignee_account_id !== undefined) {
      fields.assignee = args.assignee_account_id
        ? { accountId: args.assignee_account_id }
        : null
    }

    if (!Object.keys(fields).length) return "No fields provided — nothing to update"

    const res = await fetch(`${client.apiBase}/issue/${args.issue_key}`, {
      method: "PUT",
      headers: client.headers,
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail = err.errors
        ? JSON.stringify(err.errors)
        : err.errorMessages?.join(", ") ?? res.statusText
      return `Failed to update ${args.issue_key}: ${res.status} ${detail}`
    }

    const updated = Object.keys(fields).join(", ")
    const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "")
    return `Updated ${args.issue_key} (${updated})\nURL: ${baseUrl}/browse/${args.issue_key}`
  },
})
