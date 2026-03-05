import { tool } from "@opencode-ai/plugin"
import { getGithubHostConfig } from "./lib/agent-config"

export default tool({
  description:
    "Open a pull request on GitHub. Use this after all quality gates pass to request review and merge of a feature branch into a base branch. Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or git_host.github.repo_url set in the project's agent-config.json.",
  args: {
    head: tool.schema
      .string()
      .describe(
        "The branch to merge from (e.g. 'feature/42-add-auth'). For forks, use 'owner:branch'."
      ),
    base: tool.schema.string().describe("The branch to merge into (e.g. 'main')"),
    title: tool.schema.string().describe("Pull request title"),
    body: tool.schema
      .string()
      .optional()
      .describe("Pull request description (Markdown supported)"),
    draft: tool.schema
      .boolean()
      .optional()
      .describe("Open as a draft PR (default: false)"),
  },
  async execute(args) {
    const config = getGithubHostConfig()
    if (!config) {
      return "GitHub git host not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add git_host.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config

    const res = await fetch(`${apiBase}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        head: args.head,
        base: args.base,
        title: args.title,
        body: args.body ?? "",
        draft: args.draft ?? false,
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
