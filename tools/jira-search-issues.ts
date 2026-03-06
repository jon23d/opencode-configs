import { tool } from "@opencode-ai/plugin"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Search Jira issues using JQL (Jira Query Language). Examples: 'project = PROJ AND status = \"In Progress\"', 'assignee = currentUser() AND sprint in openSprints()'.",
  args: {
    jql: tool.schema.string().describe("JQL query string"),
    limit: tool.schema.number().optional().describe("Max results to return (default 20, max 50)"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    try {
      const data = await client.issueSearch.searchForIssuesUsingJql({
        jql: args.jql,
        maxResults: Math.min(args.limit ?? 20, 50),
        fields: ["summary", "status", "assignee", "priority", "issuetype", "labels"],
      })

      if (!data.issues?.length) return `No issues found for: ${args.jql}`

      const lines = data.issues.map(
        (i) =>
          `${i.key}  [${i.fields?.status?.name ?? "?"}]  ${i.fields?.summary ?? ""}  (assignee: ${i.fields?.assignee?.displayName ?? "none"})`
      )

      return [`${data.total} issue(s) — showing ${data.issues.length}`, "", ...lines].join("\n")
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Search failed (${e.status ?? ""}): ${e.message ?? String(error)}`
    }
  },
})
