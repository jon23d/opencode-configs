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
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    try {
      await client.issues.assignIssue({
        issueIdOrKey: args.issue_key,
        accountId: args.account_id || null,
      })

      return args.account_id
        ? `${args.issue_key} assigned to accountId ${args.account_id}`
        : `${args.issue_key} unassigned`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to assign ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
