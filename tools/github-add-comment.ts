import { tool } from "@opencode-ai/plugin"
import { getGithubIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Add a comment to an existing GitHub issue. Use this to post progress updates, questions, or resolution notes. Requires GITHUB_ACCESS_TOKEN env var and either GITHUB_REPO_URL env var or issue_tracker.github.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The issue number to comment on"),
    body: tool.schema.string().describe("The comment text (Markdown supported)"),
  },
  async execute(args) {
    const config = getGithubIssueConfig()
    if (!config) {
      return "GitHub not configured — set GITHUB_ACCESS_TOKEN and either GITHUB_REPO_URL or add issue_tracker.github.repo_url to agent-config.json"
    }

    const { apiBase, token } = config

    const res = await fetch(`${apiBase}/issues/${args.issue_number}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: args.body }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to add comment to issue #${args.issue_number}: ${res.status} ${err.message ?? res.statusText}`
    }

    const comment = await res.json()
    return `Comment posted on issue #${args.issue_number} (comment ID: ${comment.id})`
  },
})
