import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "List issues in the Gitea repository. Can filter by state (open, closed, all). Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
  args: {
    state: tool.schema
      .string()
      .optional()
      .describe('Filter by issue state: "open" (default), "closed", or "all"'),
    limit: tool.schema
      .number()
      .optional()
      .describe("Maximum number of issues to return (default 20, max 50)"),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config
    const state = args.state ?? "open"
    const limit = Math.min(args.limit ?? 20, 50)

    const params = new URLSearchParams({ state, limit: String(limit), type: "issues" })
    const res = await fetch(`${baseUrl}/api/v1/repos/${owner}/${repo}/issues?${params}`, {
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to list issues: ${res.status} ${err.message ?? res.statusText}`
    }

    const issues = await res.json()
    if (!issues.length) return `No ${state} issues found.`

    const lines = issues.map(
      (i: { number: number; title: string; state: string; labels: { name: string }[] }) => {
        const labels = i.labels?.map((l) => l.name).join(", ") || "—"
        return `#${i.number}  [${i.state}]  ${i.title}  (labels: ${labels})`
      }
    )

    return [`${issues.length} issue(s) — state: ${state}`, "", ...lines].join("\n")
  },
})
