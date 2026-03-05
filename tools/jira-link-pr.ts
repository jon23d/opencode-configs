import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Link a pull request to a Jira issue by posting the PR URL as a comment. Optionally also create an issue-to-issue link (e.g. 'blocks', 'is blocked by', 'relates to', 'duplicates'). Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    pr_url: tool.schema.string().optional().describe("The pull request URL to link"),
    pr_title: tool.schema
      .string()
      .optional()
      .describe("PR title for display in the comment"),
    link_issue_key: tool.schema
      .string()
      .optional()
      .describe("Another issue key to link to (for issue-to-issue links)"),
    link_type: tool.schema
      .string()
      .optional()
      .describe(
        'Link type for issue-to-issue links, e.g. "blocks", "is blocked by", "relates to", "duplicates"'
      ),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

    const results: string[] = []

    // Post PR URL as a comment
    if (args.pr_url) {
      const title = args.pr_title ? `[${args.pr_title}](${args.pr_url})` : args.pr_url
      const commentBody = `🔀 PR opened: ${title}`
      const res = await fetch(`${client.apiBase}/issue/${args.issue_key}/comment`, {
        method: "POST",
        headers: client.headers,
        body: JSON.stringify({ body: toAdf(commentBody) }),
      })
      if (res.ok) {
        results.push(`PR link posted as comment on ${args.issue_key}`)
      } else {
        const err = await res.json().catch(() => ({}))
        results.push(
          `Failed to post PR comment: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
        )
      }
    }

    // Create issue-to-issue link
    if (args.link_issue_key && args.link_type) {
      const res = await fetch(`${client.apiBase}/issueLink`, {
        method: "POST",
        headers: client.headers,
        body: JSON.stringify({
          type: { name: args.link_type },
          inwardIssue: { key: args.issue_key },
          outwardIssue: { key: args.link_issue_key },
        }),
      })
      if (res.ok) {
        results.push(
          `Issue link created: ${args.issue_key} "${args.link_type}" ${args.link_issue_key}`
        )
      } else {
        const err = await res.json().catch(() => ({}))
        results.push(
          `Failed to create issue link: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
        )
      }
    }

    if (!results.length)
      return "No action taken — provide pr_url and/or link_issue_key + link_type"
    return results.join("\n")
  },
})
