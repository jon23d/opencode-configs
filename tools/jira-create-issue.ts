import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Create a new Jira issue in the configured project.",
  args: {
    title: tool.schema.string().describe("Issue summary/title"),
    description: tool.schema.string().optional().describe("Issue description (plain text)"),
    issue_type: tool.schema.string().optional().describe("Issue type, e.g. 'Bug', 'Story', 'Task' (default: Task)"),
    labels: tool.schema.string().optional().describe("Comma-separated labels to apply"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client, projectKey, host } = result

    try {
      const issue = await client.issues.createIssue({
        fields: {
          summary: args.title,
          issuetype: { name: args.issue_type ?? "Task" },
          project: { key: projectKey },
          ...(args.description ? { description: toAdf(args.description) } : {}),
          ...(args.labels ? { labels: args.labels.split(",").map((l) => l.trim()).filter(Boolean) } : {}),
        },
      })

      return `Created ${issue.key}: ${host}/browse/${issue.key}`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to create issue: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
