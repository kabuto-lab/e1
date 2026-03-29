# ✅ gstack for Qwen Code — Installation Complete!

## What Was Done

### 1. Created Qwen-Compatible Configuration
- ✅ `agents/qwen.yaml` — Qwen agent interface config
- ✅ `QWEN.md` — Full documentation for Qwen Code users
- ✅ `setup-qwen` — Dedicated setup script for Qwen

### 2. Installed to Project
- ✅ Copied `gstack-main` → `.qwen/skills/gstack`
- ✅ Installed dependencies with Bun
- ✅ Built all binaries and generated skill docs
- ✅ Updated `.qwen/entity.md` with gstack integration

### 3. Windows-Compatible Tools
- ✅ Created `gstack-config.js` — Node.js version for Windows
- ✅ Works with CMD, PowerShell, Git Bash

## Available Skills (28 Slash Commands)

### Planning & Strategy
- `/office-hours` — Start a session
- `/plan-ceo-review` — CEO product review
- `/plan-eng-review` — Engineering architecture review
- `/plan-design-review` — Design/UX review
- `/autoplan` — Automatic planning

### Code & Review
- `/review` — Code review
- `/ship` — Prepare and ship PR
- `/land-and-deploy` — Deploy to production
- `/document-release` — Generate release docs

### Quality & Testing
- `/qa` — QA testing with browser
- `/qa-only` — QA without other checks
- `/canary` — Canary testing
- `/benchmark` — Performance benchmarking
- `/browse` — Web browsing with headless browser

### Design
- `/design-consultation` — Design feedback
- `/design-review` — Design review

### Security & Compliance
- `/cso` — Security officer review
- `/guard` — Security guard checks
- `/freeze` — Freeze changes
- `/unfreeze` — Unfreeze changes
- `/careful` — Careful mode

### Operations
- `/retro` — Retrospective
- `/investigate` — Deep investigation
- `/setup-browser-cookies` — Import cookies
- `/setup-deploy` — Setup deployment
- `/codex` — Codex operations
- `/gstack-upgrade` — Upgrade gstack

## Usage

### In Qwen Code Chat

Simply use any slash command:

```
/office-hours I want to add user authentication

/review

/qa https://staging.example.com

/plan-ceo-review Add dark mode to settings
```

### Manual Setup (If Needed)

```bash
cd .qwen/skills/gstack
bun install
bun run build
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.qwen/skills/gstack/` | gstack installation |
| `.qwen/entity.md` | Updated with gstack skills |
| `.qwen/skills/gstack/QWEN.md` | Full gstack documentation |
| `.qwen/skills/gstack/agents/qwen.yaml` | Qwen agent config |

## Next Steps

1. **Restart Qwen Code** to load the new skills
2. **Try your first skill:** `/office-hours`
3. **Read the docs:** `.qwen/skills/gstack/QWEN.md`

## Troubleshooting

### Skills Not Loading?

```bash
cd .qwen/skills/gstack
bun install
bun run build
```

### Browse Skill Not Working?

```bash
cd .qwen/skills/gstack
./setup --host qwen
```

### Config Issues?

```bash
# Test gstack-config
node .qwen/skills/gstack/bin/gstack-config.js list
```

## Credits

- **Original:** [gstack by Garry Tan](https://github.com/garrytan/gstack)
- **Qwen Port:** Created for this project
- **License:** MIT

---

**Happy Coding with Qwen + gstack! 🚀**
