import { tool } from "@opencode-ai/plugin"
import { getGiteaHostConfig } from "./lib/agent-config"

export default tool({
  description:
    "Open a pull request on Gitea. Use this after all quality gates pass to request review and merge of a feature branch into a base branch. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or git_host.gitea.repo_url set in the project's agent-config.json.",
  args: {
    head: tool.schema
      .string()
      .describe("The branch to merge from (e.g. 'feature/42-add-auth')"),
    base: tool.schema.string().describe("The branch to merge into (e.g. 'main')"),
    title: tool.schema.string().describe("Pull request title"),
    body: tool.schema
      .string()
      .optional()
      .describe("Pull request description (Markdown supported)"),
  },
  async execute(args) {
    const config = getGiteaHostConfig()
    if (!config) {
      return "Gitea git host not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add git_host.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config

    const res = await fetch(`${baseUrl}/api/v1/repos/${owner}/${repo}/pulls`, {
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
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to create pull request: ${res.status} ${err.message ?? res.statusText}`
    }

    const pr = await res.json()
    return `Created PR #${pr.number}: ${pr.title}\nURL: ${pr.html_url}`
  },
})
