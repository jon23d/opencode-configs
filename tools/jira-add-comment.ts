import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Add a comment to a Jira issue. Use this to post opening notes when work starts, progress updates, blocker reports, and completion summaries. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    body: tool.schema
      .string()
      .describe("Comment text (plain text; basic paragraph formatting supported)"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    try {
      const comment = await client.issueComments.addComment({
        issueIdOrKey: args.issue_key,
        comment: toAdf(args.body),
      })
      return `Comment posted on ${args.issue_key} (comment ID: ${comment.id})`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to add comment to ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
