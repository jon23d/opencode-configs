import { tool } from "@opencode-ai/plugin"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Change the status of a Jira issue by applying a workflow transition. Omit transition_name to list all available transitions for the issue first. Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    transition_name: tool.schema
      .string()
      .optional()
      .describe(
        'Name of the transition to apply, e.g. "In Progress", "In Review", "Done". Omit to list available transitions.'
      ),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    try {
      // Fetch available transitions
      const data = await client.issues.getTransitions({ issueIdOrKey: args.issue_key })
      const transitions = data.transitions ?? []

      // List mode
      if (!args.transition_name) {
        const list = transitions.map((t) => `- ${t.name}`).join("\n")
        return `Available transitions for ${args.issue_key}:\n${list}`
      }

      // Find matching transition (case-insensitive)
      const match = transitions.find(
        (t) => (t.name ?? "").toLowerCase() === args.transition_name!.toLowerCase()
      )

      if (!match) {
        const available = transitions.map((t) => t.name).join(", ")
        return `Transition "${args.transition_name}" not found for ${args.issue_key}. Available: ${available}`
      }

      // Apply transition
      await client.issues.transitionIssue({
        issueIdOrKey: args.issue_key,
        transition: { id: match.id },
      })

      return `${args.issue_key} transitioned to "${args.transition_name}"`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to transition ${args.issue_key}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
