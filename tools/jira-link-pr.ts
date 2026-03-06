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
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    const results: string[] = []

    // Post PR URL as a comment
    if (args.pr_url) {
      const title = args.pr_title ? `[${args.pr_title}](${args.pr_url})` : args.pr_url
      const commentBody = `PR opened: ${title}`
      try {
        const comment = await client.issueComments.addComment({
          issueIdOrKey: args.issue_key,
          body: toAdf(commentBody),
        })
        results.push(`PR link posted as comment on ${args.issue_key} (comment ID: ${comment.id})`)
      } catch (error: unknown) {
        const e = error as { status?: number; message?: string }
        results.push(`Failed to post PR comment: ${e.status ?? ""} ${e.message ?? String(error)}`)
      }
    }

    // Create issue-to-issue link
    if (args.link_issue_key && args.link_type) {
      try {
        await client.issueLinks.linkIssues({
          type: { name: args.link_type },
          inwardIssue: { key: args.issue_key },
          outwardIssue: { key: args.link_issue_key },
        })
        results.push(
          `Issue link created: ${args.issue_key} "${args.link_type}" ${args.link_issue_key}`
        )
      } catch (error: unknown) {
        const e = error as { status?: number; message?: string }
        results.push(`Failed to create issue link: ${e.status ?? ""} ${e.message ?? String(error)}`)
      }
    }

    if (!results.length)
      return "No action taken — provide pr_url and/or link_issue_key + link_type"
    return results.join("\n")
  },
})
