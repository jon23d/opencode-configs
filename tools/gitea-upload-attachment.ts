import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { basename } from "path"
import { getGiteaHostConfig } from "./lib/agent-config"

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
}

export default tool({
  description:
    "Upload a file as an attachment to a Gitea issue or pull request. Returns the attachment URL suitable for embedding in markdown (e.g. screenshots). Requires GITEA_ACCESS_TOKEN env var and either GITEA_REPO_URL env var or git_host.gitea.repo_url set in the project's agent-config.json.",
  args: {
    issue_number: tool.schema
      .number()
      .describe("The issue or PR number to attach the file to"),
    file_path: tool.schema.string().describe("Absolute path to the file to upload"),
  },
  async execute(args) {
    const config = getGiteaHostConfig()
    if (!config) {
      return "Gitea git host not configured — set GITEA_ACCESS_TOKEN and either GITEA_REPO_URL or add git_host.gitea.repo_url to agent-config.json"
    }

    const { baseUrl, owner, repo, token } = config

    let fileContent: Buffer
    try {
      fileContent = readFileSync(args.file_path)
    } catch (err) {
      return `Could not read file at ${args.file_path}: ${err}`
    }

    const fileName = basename(args.file_path)
    const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
    const mimeType = MIME_TYPES[ext] ?? "application/octet-stream"

    const formData = new FormData()
    formData.append("attachment", new Blob([fileContent], { type: mimeType }), fileName)

    const res = await fetch(
      `${baseUrl}/api/v1/repos/${owner}/${repo}/issues/${args.issue_number}/assets`,
      {
        method: "POST",
        headers: { Authorization: `token ${token}` },
        body: formData,
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to upload ${fileName}: ${res.status} ${err.message ?? res.statusText}`
    }

    const attachment = await res.json()
    const url: string = attachment.browser_download_url ?? attachment.download_url ?? ""
    return `Uploaded: ${fileName}\nURL: ${url}\nMarkdown: ![${fileName}](${url})`
  },
})
