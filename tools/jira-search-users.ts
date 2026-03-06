import { tool } from "@opencode-ai/plugin"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Search for Jira users by display name or email address. Returns accountIds needed for issue assignment — Jira Cloud uses accountIds (not usernames) for all user references. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    query: tool.schema
      .string()
      .describe(
        "Name or email to search for, e.g. 'jonathon' or 'jon@example.com'"
      ),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    try {
      const users = await client.userSearch.findUsers({ query: args.query, maxResults: 10 })

      if (!users.length) return `No users found matching "${args.query}"`

      const lines = users.map(
        (u) =>
          `${u.displayName}${u.emailAddress ? ` <${u.emailAddress}>` : ""}${u.active ? "" : " (inactive)"}\n  accountId: ${u.accountId}`
      )

      return [`Users matching "${args.query}":`, "", ...lines].join("\n")
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to search users: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
