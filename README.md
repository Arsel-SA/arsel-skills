# Arsel skills

The Arsel plugin for Claude Code, Cursor and Codex: the [Arsel MCP server](https://docs.arsel.sa/ai/mcp) plus [agent skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) that help coding agents write correct [Arsel](https://arsel.sa) integrations.

## MCP server

The plugin connects `https://mcp.arsel.sa/mcp` (see [`.mcp.json`](.mcp.json)). Connecting opens an Arsel sign-in, where an organization admin approves the connection. The server reads and updates contacts, lists, segments, templates, campaigns and automations, reports campaign stats, and sends: transactional email, SMS, WhatsApp and push, campaigns now or on a schedule, and events that start automations. Your client asks you to approve every send. It cannot turn an automation on or off; you do that from the Arsel dashboard. The tool list and the API-key alternative are in the [MCP docs](https://docs.arsel.sa/ai/mcp); the source is [Arsel-SA/arsel-mcp](https://github.com/Arsel-SA/arsel-mcp).

## Skills

| Skill | Use it for |
| --- | --- |
| [`arsel-api`](skills/arsel-api/SKILL.md) | Server-side code against `api.arsel.sa`: transactional email, SMS, WhatsApp and push; events that trigger automations or count as conversions; contacts, lists, segments and campaigns; errors, rate limits and retries. |
| [`arsel-sdk`](skills/arsel-sdk/SKILL.md) | Adding Arsel to a website, Android app or iOS app: installing the SDK, tracking and identifying users, login and logout, and web push, FCM or APNs notifications. |
| [`arsel-content`](skills/arsel-content/SKILL.md) | Writing what goes in the message: email templates, SMS text and WhatsApp templates, in Arabic, English or both. Merge tags, SMS parts and cost, Saudi sender and timing rules, and getting WhatsApp templates approved. |

Each skill is a short `SKILL.md` plus reference files the agent reads only when a task needs them. They cover the parts of the API and SDKs that are easy to get wrong, and point to [docs.arsel.sa](https://docs.arsel.sa) for everything else.

## Install

**Claude Code**

```
/plugin marketplace add Arsel-SA/arsel-skills
/plugin install arsel@arsel-skills
```

**Cursor**

Install **Arsel** from the [Cursor Marketplace](https://cursor.com/marketplace), or clone this repo into `~/.cursor/plugins/local/arsel`.

**Codex**

```
codex plugin marketplace add Arsel-SA/arsel-skills
```

Then install **Arsel** from the Plugins Directory.

**Other agents**

Copy the folders under `skills/` into the directory your agent loads skills from, such as `.claude/skills/` in a project.

## Evals

`skill-evals/` holds the test prompts and assertions used to check each skill against an agent working from the public docs alone.

## License

[MIT](LICENSE)
