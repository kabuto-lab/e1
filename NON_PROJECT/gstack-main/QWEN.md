# QWEN.md — gstack for Qwen Code

## gstack Integration for Qwen Code

This project uses **gstack** — a virtual engineering team of specialist agents for Qwen Code.

### Available Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/office-hours` | Start a session — describe what you're building |
| `/plan-ceo-review` | CEO-style product review on feature ideas |
| `/plan-eng-review` | Engineering architecture review |
| `/plan-design-review` | Design/UX review |
| `/design-consultation` | Design feedback and suggestions |
| `/review` | Code review on any branch with changes |
| `/ship` | Prepare and ship a PR |
| `/land-and-deploy` | Deploy to production |
| `/canary` | Canary testing and validation |
| `/benchmark` | Performance benchmarking |
| `/browse` | Web browsing with headless browser |
| `/qa` | QA testing with browser automation |
| `/qa-only` | QA without other checks |
| `/setup-browser-cookies` | Import browser cookies |
| `/setup-deploy` | Setup deployment configuration |
| `/retro` | Retrospective on recent work |
| `/investigate` | Deep investigation of issues |
| `/document-release` | Generate release documentation |
| `/codex` | Codex-specific operations |
| `/cso` | Security officer review |
| `/autoplan` | Automatic planning |
| `/careful` | Careful mode for sensitive operations |
| `/freeze` | Freeze changes |
| `/guard` | Security guard checks |
| `/unfreeze` | Unfreeze changes |
| `/gstack-upgrade` | Upgrade gstack |

### Setup

Run this in Qwen Code chat:

```
Install gstack for Qwen Code: clone to .qwen/skills/gstack, run setup script, and add gstack section to QWEN.md listing all available slash commands
```

### Manual Install

```bash
# Install to project
git clone https://github.com/garrytan/gstack.git .qwen/skills/gstack
cd .qwen/skills/gstack && ./setup --host qwen

# Or install globally
git clone https://github.com/garrytan/gstack.git ~/.qwen/skills/gstack
cd ~/.qwen/skills/gstack && ./setup --host qwen
```

### Configuration

Add to your project's `QWEN.md`:

```markdown
## gstack

This project uses gstack for AI-assisted development.

**Available skills:** `/office-hours`, `/plan-ceo-review`, `/review`, `/ship`, `/qa`, `/browse`, `/retro`, `/investigate`, `/design-consultation`, `/plan-eng-review`, `/plan-design-review`, `/canary`, `/benchmark`, `/land-and-deploy`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/setup-browser-cookies`, `/setup-deploy`, `/qa-only`, `/design-review`

**Browser:** Use `/browse` skill for all web browsing tasks.

**Setup:** If skills aren't working, run `cd .qwen/skills/gstack && ./setup --host qwen`
```

### Requirements

- [Qwen Code](https://qwen.ai/)
- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/) v1.0+
- [Node.js](https://nodejs.org/) (Windows only)
- API key for your LLM provider (Anthropic, OpenAI, etc.)

### Usage Examples

```bash
# Start a new feature
/office-hours I want to add user authentication with OAuth

# Review a feature idea
/plan-ceo-review Add dark mode toggle to settings

# Code review before merge
/review

# QA test your staging URL
/qa https://staging.example.com

# Retrospective
/retro
```

### Troubleshooting

If skills aren't loading:
1. Check `.qwen/skills/gstack` exists
2. Run `cd .qwen/skills/gstack && ./setup --host qwen`
3. Restart Qwen Code

### License

MIT — Same as gstack original
