import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Create a new Jira issue in the configured project. Returns the issue key and URL. Requires Jira credentials and JIRA_PROJECT_KEY — see JIRA_SETUP.md.",
  args: {
    summary: tool.schema.string().describe("Issue title / summary"),
    description: tool.schema
      .string()
      .optional()
      .describe("Issue body (plain text; basic paragraph formatting supported)"),
    issue_type: tool.schema
      .string()
      .optional()
      .describe('Issue type name, e.g. "Story", "Bug", "Task" (default: "Task")'),
    labels: tool.schema.string().optional().describe("Comma-separated labels to apply"),
    priority: tool.schema
      .string()
      .optional()
      .describe('Priority name, e.g. "Highest", "High", "Medium", "Low"'),
    assignee_account_id: tool.schema
      .string()
      .optional()
      .describe("Jira accountId of the assignee (use jira-search-users to look up)"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    if (!client.projectKey) {
      return "No Jira project key configured — set JIRA_PROJECT_KEY or add issue_tracker.jira.project_key to agent-config.json"
    }

    const fields: Record<string, unknown> = {
      project: { key: client.projectKey },
      summary: args.summary,
      issuetype: { name: args.issue_type ?? "Task" },
    }

    if (args.description) fields.description = toAdf(args.description)
    if (args.labels) fields.labels = args.labels.split(",").map((l) => l.trim())
    if (args.priority) fields.priority = { name: args.priority }
    if (args.assignee_account_id) fields.assignee = { accountId: args.assignee_account_id }

    const res = await fetch(`${client.apiBase}/issue`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail = err.errors
        ? JSON.stringify(err.errors)
        : err.errorMessages?.join(", ") ?? res.statusText
      return `Failed to create issue: ${res.status} ${detail}`
    }

    const issue = await res.json()
    const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "")
    return `Created ${issue.key}: ${args.summary}\nURL: ${baseUrl}/browse/${issue.key}`
  },
})
