import { tool } from "@opencode-ai/plugin"
import { getJiraClient, adfToText } from "./lib/jira-client"

export default tool({
  description:
    "Read a Jira issue by its key (e.g. PROJ-123). Returns the issue summary, description, status, assignee, labels, priority, and comments.",
  args: {
    issue_key: tool.schema.string().describe("The Jira issue key, e.g. 'PROJ-123'"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client, host } = result

    try {
      const issue = await client.issues.getIssue({
        issueIdOrKey: args.issue_key,
        fields: ["summary", "description", "status", "assignee", "labels", "priority", "comment", "issuetype", "created", "updated"],
      })

      const f = issue.fields!
      const comments = f.comment?.comments ?? []

      const commentBlock =
        comments.length === 0
          ? "No comments."
          : comments
              .map((c) => `@${c.author?.displayName ?? "unknown"} (${(c.created ?? "").slice(0, 10)}): ${adfToText(c.body)}`)
              .join("\n\n")

      return [
        `${issue.key}: ${f.summary}`,
        `Type: ${f.issuetype?.name ?? "—"} | Status: ${f.status?.name ?? "—"} | Priority: ${(f.priority as { name?: string } | undefined)?.name ?? "—"}`,
        `Assignee: ${f.assignee?.displayName ?? "Unassigned"}`,
        `Labels: ${f.labels?.length ? f.labels.join(", ") : "none"}`,
        `Created: ${(f.created ?? "").slice(0, 10)} | Updated: ${(f.updated ?? "").slice(0, 10)}`,
        `URL: ${host}/browse/${issue.key}`,
        ``,
        `## Description`,
        adfToText(f.description) || "(no description)",
        ``,
        `## Comments (${comments.length})`,
        commentBlock,
      ].join("\n")
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to fetch ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
