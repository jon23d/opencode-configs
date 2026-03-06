import { tool } from "@opencode-ai/plugin"
import { getJiraClient, toAdf } from "./lib/jira-client"

export default tool({
  description:
    "Update fields on an existing Jira issue. Only provided fields are changed.",
  args: {
    issue_key: tool.schema.string().describe("The Jira issue key, e.g. 'PROJ-123'"),
    title: tool.schema.string().optional().describe("New summary/title"),
    description: tool.schema.string().optional().describe("New description (plain text)"),
    labels: tool.schema.string().optional().describe("Comma-separated labels (replaces existing labels)"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    const fields: Record<string, unknown> = {}
    if (args.title) fields.summary = args.title
    if (args.description) fields.description = toAdf(args.description)
    if (args.labels) fields.labels = args.labels.split(",").map((l) => l.trim()).filter(Boolean)

    if (!Object.keys(fields).length) return "No fields provided to update."

    try {
      await client.issues.editIssue({ issueIdOrKey: args.issue_key, fields })
      return `Updated ${args.issue_key}`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to update ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
