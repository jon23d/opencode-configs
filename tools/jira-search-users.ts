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
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const params = new URLSearchParams({ query: args.query, maxResults: "10" })
    const res = await fetch(`${client.apiBase}/user/search?${params}`, {
      headers: client.headers,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to search users: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    const users: {
      accountId: string
      displayName: string
      emailAddress?: string
      active: boolean
    }[] = await res.json()

    if (!users.length) return `No users found matching "${args.query}"`

    const lines = users.map(
      (u) =>
        `${u.displayName}${u.emailAddress ? ` <${u.emailAddress}>` : ""}${u.active ? "" : " (inactive)"}\n  accountId: ${u.accountId}`
    )

    return [`Users matching "${args.query}":`, "", ...lines].join("\n")
  },
})
