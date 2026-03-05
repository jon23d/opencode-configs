import { tool } from "@opencode-ai/plugin"
import { getGithubIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "List issues in the GitHub repository. Can filter by state (open, closed, all). Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or issue_tracker.github.repo_url set in the project's agent-config.json.",
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
    const config = getGithubIssueConfig()
    if (!config) {
      return "GitHub not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add issue_tracker.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config
    const state = args.state ?? "open"
    const limit = Math.min(args.limit ?? 20, 50)

    const params = new URLSearchParams({
      state,
      per_page: String(limit),
      // Exclude pull requests (GitHub returns PRs in issues endpoint by default)
      // Filter via type would require GraphQL; we filter client-side instead
    })

    const res = await fetch(`${apiBase}/issues?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to list issues: ${res.status} ${err.message ?? res.statusText}`
    }

    const all = await res.json()
    // GitHub's issues endpoint includes PRs; filter them out
    const issues = all.filter((i: { pull_request?: unknown }) => !i.pull_request)

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
