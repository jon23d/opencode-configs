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
    "Add a comment to an existing Gitea issue. Use this to post progress updates, questions, or resolution notes. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or a repoUrl set in ~/.opencode/gitea.json.",
  args: {
    issue_number: tool.schema
      .number()
      .describe("The issue number to comment on"),
    body: tool.schema
      .string()
      .describe("The comment text (Markdown supported)"),
  },
  async execute(args) {
    const config = getGiteaConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add a repoUrl to gitea.json"
    }

    const { baseUrl, owner, repo, token } = config

    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues/${args.issue_number}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: args.body }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to add comment to issue #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
    }

    const comment = await res.json()
    return `Comment posted on issue #${args.issue_number} (comment ID: ${comment.id})`
  },
})
