import { tool } from "@opencode-ai/plugin"
import { getJiraClient, resolveAccountIdByEmail } from "./lib/jira-client"

export default tool({
  description:
    "Assign a Jira issue to a user. Pass 'me' to assign to yourself (uses JIRA_EMAIL), a Jira accountId to assign to someone else, or empty string to unassign. Use jira-search-users to find accountIds by name or email. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    account_id: tool.schema
      .string()
      .describe(
        "Pass 'me' to assign to yourself, a Jira accountId to assign to a specific user, or empty string to unassign."
      ),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client, currentUserEmail } = result

    try {
      let accountId: string | null = args.account_id || null

      // Resolve "me" to the current user's accountId
      if (args.account_id === "me") {
        if (!currentUserEmail) {
          return "Cannot resolve 'me' — JIRA_EMAIL is not set."
        }
        accountId = await resolveAccountIdByEmail(client, currentUserEmail)
        if (!accountId) {
          return `Could not find a Jira account for ${currentUserEmail}. Check that this email matches a Jira user.`
        }
      }

      await client.issues.assignIssue({
        issueIdOrKey: args.issue_key,
        accountId,
      })

      if (!accountId) return `${args.issue_key} unassigned`
      if (args.account_id === "me") return `${args.issue_key} assigned to you (${currentUserEmail})`
      return `${args.issue_key} assigned to accountId ${accountId}`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to assign ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
