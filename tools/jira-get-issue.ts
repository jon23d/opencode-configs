import { tool } from "@opencode-ai/plugin"
import { getJiraClient, adfToText } from "./lib/jira-client"

export default tool({
  description:
    "Read a Jira issue by its key (e.g. PROJ-123). Returns the issue summary, description, status, assignee, labels, priority, and comments. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("The Jira issue key, e.g. 'PROJ-123'"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const res = await fetch(
      `${client.apiBase}/issue/${args.issue_key}?fields=summary,description,status,assignee,labels,priority,comment,issuetype,created,updated`,
      { headers: client.headers }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to fetch ${args.issue_key}: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    const issue = await res.json()
    const f = issue.fields
    const comments: { author: { displayName: string }; created: string; body: unknown }[] =
      f.comment?.comments ?? []

    const commentBlock =
      comments.length === 0
        ? "No comments."
        : comments
            .map(
              (c) => `@${c.author.displayName} (${c.created.slice(0, 10)}): ${adfToText(c.body)}`
            )
            .join("\n\n")

    const baseUrl = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "")

    return [
      `${issue.key}: ${f.summary}`,
      `Type: ${f.issuetype?.name ?? "—"} | Status: ${f.status?.name ?? "—"} | Priority: ${f.priority?.name ?? "—"}`,
      `Assignee: ${f.assignee?.displayName ?? "Unassigned"}`,
      `Labels: ${f.labels?.length ? f.labels.join(", ") : "none"}`,
      `Created: ${f.created?.slice(0, 10)} | Updated: ${f.updated?.slice(0, 10)}`,
      `URL: ${baseUrl}/browse/${issue.key}`,
      ``,
      `## Description`,
      adfToText(f.description) || "(no description)",
      ``,
      `## Comments (${comments.length})`,
      commentBlock,
    ].join("\n")
  },
})
