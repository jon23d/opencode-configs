import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "List, add, or remove dependencies between Gitea issues. Gitea's dependency API uses internal issue IDs rather than display numbers — this tool resolves display numbers to IDs automatically. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
  args: {
    action: tool.schema
      .string()
      .describe('Action to perform: "list", "add", or "remove"'),
    issue_number: tool.schema
      .number()
      .describe("The display number of the issue to manage dependencies for"),
    dependency_issue_number: tool.schema
      .number()
      .optional()
      .describe(
        'The display number of the issue to add or remove as a dependency. Required for "add" and "remove" actions.'
      ),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config
    const headers = {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    }
    const base = `${baseUrl}/api/v1/repos/${owner}/${repo}`

    if (args.action === "list") {
      const res = await fetch(`${base}/issues/${args.issue_number}/dependencies`, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return `Failed to list dependencies for #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
      }
      const deps = await res.json()
      if (!deps.length) return `Issue #${args.issue_number} has no dependencies.`
      const lines = deps.map(
        (d: { number: number; title: string; state: string }) =>
          `#${d.number} [${d.state}] ${d.title}`
      )
      return [`Dependencies of #${args.issue_number}:`, ...lines].join("\n")
    }

    if (args.action === "add" || args.action === "remove") {
      if (args.dependency_issue_number === undefined) {
        return `dependency_issue_number is required for the "${args.action}" action`
      }

      // Gitea's dependency endpoint requires the internal issue ID, not the
      // display number. Fetch the dependency issue first to resolve its ID.
      const lookupRes = await fetch(
        `${base}/issues/${args.dependency_issue_number}`,
        { headers }
      )
      if (!lookupRes.ok) {
        const err = await lookupRes.json().catch(() => ({}))
        return `Failed to look up issue #${args.dependency_issue_number}: ${lookupRes.status} ${err.message ?? lookupRes.statusText}`
      }
      const depIssue = await lookupRes.json()
      const depId: number = depIssue.id

      const method = args.action === "add" ? "POST" : "DELETE"
      const res = await fetch(`${base}/issues/${args.issue_number}/dependencies`, {
        method,
        headers,
        body: JSON.stringify({ issue_id: depId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return `Failed to ${args.action} dependency on #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
      }

      const verb = args.action === "add" ? "Added" : "Removed"
      return `${verb} dependency: #${args.issue_number} now ${args.action === "add" ? "depends on" : "no longer depends on"} #${args.dependency_issue_number}`
    }

    return `Unknown action "${args.action}" — use "list", "add", or "remove"`
  },
})
