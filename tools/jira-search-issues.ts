import { tool } from "@opencode-ai/plugin"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Search Jira issues using JQL (Jira Query Language). Examples: 'project = PROJ AND status = \"In Progress\"', 'assignee = currentUser() AND sprint in openSprints()'. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    jql: tool.schema.string().describe("JQL query string"),
    limit: tool.schema
      .number()
      .optional()
      .describe("Max results to return (default 20, max 50)"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const res = await fetch(`${client.apiBase}/issue/search`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({
        jql: args.jql,
        maxResults: Math.min(args.limit ?? 20, 50),
        fields: ["summary", "status", "assignee", "priority", "issuetype", "labels"],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Search failed (${res.status}): ${err.errorMessages?.join(", ") ?? err.message ?? res.statusText}`
    }

    const data = await res.json()
    if (!data.issues?.length) return `No issues found for: ${args.jql}`

    const lines = data.issues.map(
      (i: {
        key: string
        fields: {
          summary: string
          status: { name: string }
          assignee?: { displayName: string }
          priority?: { name: string }
        }
      }) =>
        `${i.key}  [${i.fields.status.name}]  ${i.fields.summary}  (assignee: ${i.fields.assignee?.displayName ?? "none"})`
    )

    return [`${data.total} issue(s) — showing ${data.issues.length}`, "", ...lines].join("\n")
  },
})
