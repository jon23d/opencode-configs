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

async function getValidToken(): Promise<{ token: string } | { error: string }> {
  const existing = process.env.JIRA_ACCESS_TOKEN
  if (existing) return { token: existing }

  const refreshToken = process.env.JIRA_REFRESH_TOKEN
  const clientId = process.env.JIRA_CLIENT_ID
  const clientSecret = process.env.JIRA_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    return {
      error:
        "Jira not configured. Set JIRA_ACCESS_TOKEN, or set JIRA_REFRESH_TOKEN + JIRA_CLIENT_ID + JIRA_CLIENT_SECRET to enable auto-refresh. See JIRA_SETUP.md.",
    }
  }

  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 400 || res.status === 401) {
      return {
        error:
          "Your Jira refresh token has expired (tokens expire after 90 days of inactivity). " +
          "Re-authentication is required. See JIRA_SETUP.md for step-by-step instructions.",
      }
    }
    return {
      error: `Failed to refresh Jira access token: ${res.status} ${err.error_description ?? res.statusText}`,
    }
  }

  const data = await res.json()
  process.env.JIRA_ACCESS_TOKEN = data.access_token
  if (data.refresh_token) process.env.JIRA_REFRESH_TOKEN = data.refresh_token

  return { token: data.access_token }
}

async function resolveCloudId(
  baseUrl: string,
  token: string
): Promise<{ cloudId: string } | { error: string }> {
  if (process.env.JIRA_CLOUD_ID) return { cloudId: process.env.JIRA_CLOUD_ID }

  const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })

  if (!res.ok) {
    return { error: `Failed to fetch Jira accessible resources: ${res.status} ${res.statusText}` }
  }

  const resources: { id: string; url: string; name: string }[] = await res.json()
  const target = baseUrl.replace(/\/$/, "").toLowerCase()
  const site = resources.find((r) => r.url.replace(/\/$/, "").toLowerCase() === target)

  if (!site) {
    const available = resources.map((r) => r.url).join(", ")
    return {
      error: `No Jira site found matching "${baseUrl}". Sites accessible with current token: ${available || "none"}`,
    }
  }

  process.env.JIRA_CLOUD_ID = site.id
  return { cloudId: site.id }
}

export async function getJiraClient(): Promise<JiraClient | { error: string }> {
  const jiraConfig = readJiraConfig()
  const baseUrl = process.env.JIRA_BASE_URL ?? jiraConfig.base_url
  const projectKey = process.env.JIRA_PROJECT_KEY ?? jiraConfig.project_key ?? ""

  if (!baseUrl) {
    return {
      error:
        "Jira not configured — set JIRA_BASE_URL or add issue_tracker.jira.base_url to agent-config.json. See JIRA_SETUP.md.",
    }
  }

  const tokenResult = await getValidToken()
  if ("error" in tokenResult) return tokenResult

  const cloudResult = await resolveCloudId(baseUrl, tokenResult.token)
  if ("error" in cloudResult) return cloudResult

  return {
    apiBase: `https://api.atlassian.com/ex/jira/${cloudResult.cloudId}/rest/api/3`,
    projectKey,
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
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
