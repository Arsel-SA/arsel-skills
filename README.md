# Arsel skills

[Agent skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) that help coding agents write correct [Arsel](https://arsel.sa) integrations.

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

**Other agents**

Copy the folders under `skills/` into the directory your agent loads skills from, such as `.claude/skills/` in a project.

## Evals

`skill-evals/` holds the test prompts and assertions used to check each skill against an agent working from the public docs alone.

## License

[MIT](LICENSE)
