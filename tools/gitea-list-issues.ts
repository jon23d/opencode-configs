import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { join } from "path"

function getGiteaConfig() {
  const token = process.env.GITEA_ACCESS_TOKEN
  if (!token) return null

  let repoUrl = process.env.GITEA_REPO_URL
  if (!repoUrl) {
    try {
      const configPath = join(process.cwd(), "gitea.json")
      const file = JSON.parse(readFileSync(configPath, "utf-8"))
      repoUrl = file.repoUrl
    } catch {
      // file missing or malformed — handled below
    }
  }

  if (!repoUrl) return null

  const url = new URL(repoUrl)
  const parts = url.pathname.split("/").filter(Boolean)
  return { baseUrl: url.origin, owner: parts[0], repo: parts[1], token }
}

export default tool({
  description:
    "List issues in the Gitea repository. Can filter by state (open, closed, all). Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or a repoUrl set in ~/.opencode/gitea.json.",
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
    const config = getGiteaConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add a repoUrl to gitea.json"
    }

    const { baseUrl, owner, repo, token } = config
    const state = args.state ?? "open"
    const limit = Math.min(args.limit ?? 20, 50)

    const params = new URLSearchParams({ state, limit: String(limit), type: "issues" })
    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues?${params}`,
      {
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to list issues: ${res.status} ${err.message ?? res.statusText}`
    }

    const issues = await res.json()
    if (!issues.length) {
      return `No ${state} issues found.`
    }

    const lines = issues.map(
      (i: { number: number; title: string; state: string; labels: { name: string }[] }) => {
        const labels = i.labels?.map((l) => l.name).join(", ") || "—"
        return `#${i.number}  [${i.state}]  ${i.title}  (labels: ${labels})`
      }
    )

    return [`${issues.length} issue(s) — state: ${state}`, "", ...lines].join("\n")
  },
})
