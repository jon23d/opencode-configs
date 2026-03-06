import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { basename } from "path"
import { getJiraClient } from "./lib/jira-client"

export default tool({
  description:
    "Upload a file as an attachment to a Jira issue. Returns the attachment URL for embedding in descriptions or comments (e.g. screenshots for PR-as-log). Requires Jira credentials — see JIRA_SETUP.md.",
  args: {
    issue_key: tool.schema.string().describe("Issue key, e.g. 'PROJ-123'"),
    file_path: tool.schema.string().describe("Absolute path to the file to upload"),
  },
  async execute(args) {
    const result = getJiraClient()
    if ("error" in result) return result.error
    const { client } = result

    let fileContent: Buffer
    try {
      fileContent = readFileSync(args.file_path)
    } catch (err) {
      return `Could not read file at ${args.file_path}: ${err}`
    }

    const fileName = basename(args.file_path)

    try {
      const attachments = await client.issueAttachments.addAttachment({
        issueIdOrKey: args.issue_key,
        attachment: {
          filename: fileName,
          file: fileContent,
        },
      })

      const attachment = Array.isArray(attachments) ? attachments[0] : attachments
      const url: string = (attachment as { content?: string })?.content ?? ""
      return `Uploaded: ${fileName}\nURL: ${url}\nMarkdown: ![${fileName}](${url})`
    } catch (error: unknown) {
      const e = error as { status?: number; message?: string }
      return `Failed to upload ${fileName}: ${e.status ?? ""} ${e.message ?? String(error)}`
    }
  },
})
