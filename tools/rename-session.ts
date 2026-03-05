import { tool } from "@opencode-ai/plugin"

export default tool({
  description:
    "Rename the current OpenCode session. Call this once after the ticket number and slug are known — e.g. 'Issue #3 - add-user-auth'.",
  args: {
    title: tool.schema.string().describe("The new session title, e.g. 'Issue #3 - add-user-auth'"),
  },
  async execute(args, ctx) {
    const port = process.env.OPENCODE_PORT ?? "4096"
    const baseUrl = `http://localhost:${port}`
    const sessionID = ctx.sessionID

    const response = await fetch(`${baseUrl}/session/${sessionID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: args.title }),
    })

    if (!response.ok) {
      const text = await response.text()
      return `Failed to rename session: ${response.status} ${text}`
    }

    return `Session renamed to: ${args.title}`
  },
})
