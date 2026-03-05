import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { basename } from "path"
import { getJiraClient } from "./lib/jira-client"

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
    "Upload a file as an attachment to a Jira issue. Returns the attachment URL for embedding in descriptions or comments (e.g. screenshots for PR-as-log). Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    file_path: tool.schema.string().describe("Absolute path to the file to upload"),
  },
  async execute(args) {
    const client = await getJiraClient()
    if ("error" in client) return client.error

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
    formData.append("file", new Blob([fileContent], { type: mimeType }), fileName)

    // Jira requires X-Atlassian-Token: no-check to prevent XSRF on attachment uploads
    const { "Content-Type": _ct, ...headersWithoutContentType } = client.headers
    const res = await fetch(`${client.apiBase}/issue/${args.issue_key}/attachments`, {
      method: "POST",
      headers: {
        ...headersWithoutContentType,
        "X-Atlassian-Token": "no-check",
      },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Failed to upload ${fileName}: ${res.status} ${err.errorMessages?.join(", ") ?? res.statusText}`
    }

    const attachments = await res.json()
    const attachment = Array.isArray(attachments) ? attachments[0] : attachments
    const url: string = attachment?.content ?? ""
    return `Uploaded: ${fileName}\nURL: ${url}\nMarkdown: ![${fileName}](${url})`
  },
})
