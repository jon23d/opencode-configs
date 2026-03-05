import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Add a comment to a Jira issue. Use this to post opening notes when work starts, progress updates, blocker reports, and completion summaries. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    body: tool.schema
      .string()
      .describe("Comment text (plain text; basic paragraph formatting supported)"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const res = await fetch(`${client.apiBase}/issue/${args.issue_key}/comment`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ body: toAdf(args.body) }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to add comment to ${args.issue_key}: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    const comment = await res.json()
    return `Comment posted on ${args.issue_key} (comment ID: ${comment.id})`
  },
})
