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
    "Create a new issue in the Gitea repository. Returns the number and URL of the created issue. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or a repoUrl set in ~/.opencode/gitea.json.",
  args: {
    title: tool.schema.string().describe("The issue title"),
    body: tool.schema
      .string()
      .optional()
      .describe("The issue body / description (Markdown supported)"),
    labels: tool.schema
      .string()
      .optional()
      .describe("Comma-separated label names to apply, e.g. 'bug,help wanted'"),
    assignees: tool.schema
      .string()
      .optional()
      .describe("Comma-separated usernames to assign, e.g. 'alice,bob'"),
  },
  async execute(args) {
    const config = getGiteaConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add a repoUrl to gitea.json"
    }

    const { baseUrl, owner, repo, token } = config

    const payload: Record<string, unknown> = { title: args.title }
    if (args.body) payload.body = args.body
    if (args.labels) payload.labels = args.labels.split(",").map((l) => l.trim())
    if (args.assignees) payload.assignees = args.assignees.split(",").map((a) => a.trim())

    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to create issue: ${res.status} ${err.message ?? res.statusText}`
    }

    const issue = await res.json()
    return `Created issue #${issue.number}: ${issue.title}\nURL: ${issue.html_url}`
  },
})
