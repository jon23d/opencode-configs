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
    "Open a pull request on Gitea. Use this after all quality gates pass to request review and merge of a feature branch into a base branch. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or a repoUrl set in the project's gitea.json.",
  args: {
    head: tool.schema
      .string()
      .describe("The branch to merge from (e.g. 'feature/42-add-auth')"),
    base: tool.schema
      .string()
      .describe("The branch to merge into (e.g. 'main')"),
    title: tool.schema.string().describe("Pull request title"),
    body: tool.schema
      .string()
      .optional()
      .describe("Pull request description (Markdown supported)"),
  },
  async execute(args) {
    const config = getGiteaConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add a repoUrl to gitea.json"
    }

    const { baseUrl, owner, repo, token } = config

    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          head: args.head,
          base: args.base,
          title: args.title,
          body: args.body ?? "",
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to create pull request: ${res.status} ${err.message ?? res.statusText}`
    }

    const pr = await res.json()
    return `Created PR #${pr.number}: ${pr.title}\nURL: ${pr.html_url}`
  },
})
