import { tool } from "@opencode-ai/plugin"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Assign a Jira issue to a user by their accountId. Use jira-search-users to find the accountId for a user by display name or email. Pass empty string to unassign. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    account_id: tool.schema
      .string()
      .describe(
        "The Jira accountId of the user to assign. Use jira-search-users to find this. Pass empty string to unassign."
      ),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const res = await fetch(`${client.apiBase}/issue/${args.issue_key}/assignee`, {
      method: "PUT",
      headers: client.headers,
      body: JSON.stringify({ accountId: args.account_id || null }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to assign ${args.issue_key}: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    return args.account_id
      ? `${args.issue_key} assigned to accountId ${args.account_id}`
      : `${args.issue_key} unassigned`
  },
})
