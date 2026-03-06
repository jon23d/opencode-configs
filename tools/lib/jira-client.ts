import { Version3Client } from "jira.js"
import { readFileSync } from "fs"
import { join } from "path"

function readJiraConfig(): { base_url?: string; project_key?: string } {
  try {
    const file = JSON.parse(readFileSync(join(process.cwd(), "agent-config.json"), "utf-8"))
    return file.issue_tracker?.jira ?? {}
  } catch {
    return {}
  }
}

export function getJiraClient():
  | { client: Version3Client; projectKey: string; host: string; currentUserEmail: string | null }
  | { error: string } {
  const jiraConfig = readJiraConfig()
  const host = (process.env.JIRA_BASE_URL ?? jiraConfig.base_url ?? "").replace(/\/$/, "")
  const projectKey = process.env.JIRA_PROJECT_KEY ?? jiraConfig.project_key ?? ""
  const email = process.env.JIRA_EMAIL
  const apiToken = process.env.JIRA_API_TOKEN
  // The auth email is the current user
  const currentUserEmail = process.env.JIRA_EMAIL ?? null

  if (!host) {
    return {
      error:
        "Jira not configured — set JIRA_BASE_URL or add issue_tracker.jira.base_url to agent-config.json. See JIRA_SETUP.md.",
    }
  }

  if (!email || !apiToken) {
    return {
      error:
        "Jira credentials missing — set JIRA_EMAIL and JIRA_API_TOKEN in your shell profile. See JIRA_SETUP.md.",
    }
  }

  const client = new Version3Client({
    host,
    authentication: { basic: { email, apiToken } },
  })

  return { client, projectKey, host, currentUserEmail }
}

/**
 * Resolve the accountId for a given email by searching Jira users.
 * Returns null if not found.
 */
export async function resolveAccountIdByEmail(
  client: Version3Client,
  email: string
): Promise<string | null> {
  try {
    const users = await client.userSearch.findUsers({ query: email, maxResults: 5 })
    const match = users.find(
      (u) => u.emailAddress?.toLowerCase() === email.toLowerCase()
    ) ?? users[0]
    return match?.accountId ?? null
  } catch {
    return null
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
