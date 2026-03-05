import { tool } from "@opencode-ai/plugin"
import { getGiteaIssueConfig } from "./lib/agent-config"

export default tool({
  description:
    "Add a comment to an existing Gitea issue. Use this to post progress updates, questions, or resolution notes. Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or issue_tracker.gitea.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema.number().describe("The issue number to comment on"),
    body: tool.schema.string().describe("The comment text (Markdown supported)"),
  },
  async execute(args) {
    const config = getGiteaIssueConfig()
    if (!config) {
      return "Gitea not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add issue_tracker.gitea.repo_url to agent-config.json"
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
