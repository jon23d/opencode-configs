import { readFileSync } from "fs"
import { join } from "path"

export interface JiraClient {
  apiBase: string
  projectKey: string
  headers: Record<string, string>
}

function readJiraConfig(): { base_url?: string; project_key?: string } {
  try {
    const file = JSON.parse(readFileSync(join(process.cwd(), "agent-config.json"), "utf-8"))
    return file.issue_tracker?.jira ?? {}
  } catch {
    return {}
  }
}

export async function getJiraClient(): Promise<JiraClient | { error: string }> {
  const jiraConfig = readJiraConfig()
  const baseUrl = (process.env.JIRA_BASE_URL ?? jiraConfig.base_url ?? "").replace(/\/$/, "")
  const projectKey = process.env.JIRA_PROJECT_KEY ?? jiraConfig.project_key ?? ""

  if (!baseUrl) {
    return {
      error:
        "Jira not configured — set JIRA_BASE_URL or add issue_tracker.jira.base_url to agent-config.json. See JIRA_SETUP.md.",
    }
  }

  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN

  if (!email || !apiToken) {
    return {
      error:
        "Jira credentials missing — set JIRA_EMAIL and JIRA_API_TOKEN in your shell profile. See JIRA_SETUP.md.",
    }
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString("base64")

  return {
    apiBase: `${baseUrl}/rest/api/3`,
    projectKey,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }
}

/** Convert plain text to Atlassian Document Format (ADF) for Jira API v3 */
export function toAdf(text: string) {
  const paragraphs = text.split(/\n\n+/).filter((s) => s.trim())
  if (!paragraphs.length) paragraphs.push(text || " ")
  return {
    version: 1,
    type: "doc",
    content: paragraphs.map((para) => ({
      type: "paragraph",
      content: [{ type: "text", text: para.trim() }],
    })),
  }
}

/** Extract plain text from an ADF document */
export function adfToText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return String(adf ?? "")
  const doc = adf as { content?: unknown[] }
  if (!doc.content) return ""

  function extractText(node: unknown): string {
    if (!node || typeof node !== "object") return ""
    const n = node as { type?: string; text?: string; content?: unknown[] }
    if (n.type === "text") return n.text ?? ""
    if (n.content) return n.content.map(extractText).join("")
    return ""
  }

  return doc.content.map(extractText).join("\n\n")
}
