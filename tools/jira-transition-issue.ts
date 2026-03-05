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
    const client = await getJiraClient()
    if ("error" in client) return client.error

    // Fetch available transitions
    const transRes = await fetch(`${client.apiBase}/issue/${args.issue_key}/transitions`, {
      headers: client.headers,
    })

    if (!transRes.ok) {
      const err = await transRes.json().catch(() => ({}))
      return `Failed to fetch transitions for ${args.issue_key}: ${transRes.status} ${err.errorMessages?.join(", ") ?? transRes.statusText}`
    }

    const { transitions } = await transRes.json()

    // List mode
    if (!args.transition_name) {
      const list = transitions
        .map((t: { id: string; name: string }) => `- ${t.name}`)
        .join("\n")
      return `Available transitions for ${args.issue_key}:\n${list}`
    }

    // Find matching transition (case-insensitive)
    const match = transitions.find(
      (t: { name: string }) =>
        t.name.toLowerCase() === args.transition_name!.toLowerCase()
    )

    if (!match) {
      const available = transitions.map((t: { name: string }) => t.name).join(", ")
      return `Transition "${args.transition_name}" not found for ${args.issue_key}. Available: ${available}`
    }

    // Apply transition
    const res = await fetch(`${client.apiBase}/issue/${args.issue_key}/transitions`, {
      method: "POST",
      headers: client.headers,
      body: JSON.stringify({ transition: { id: match.id } }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to transition ${args.issue_key}: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    return `${args.issue_key} transitioned to "${args.transition_name}"`
  },
})
