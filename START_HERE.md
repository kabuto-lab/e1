# 🚀 START HERE - Lovnge Platform Development Workflow

**Quick Start:** Double-click `LAUNCHER.bat` to begin!

---

## 📋 What You Got

I've created **automated development workflow scripts** that:

1. ✅ **Check server status** automatically
2. ✅ **Start servers** if they're not running (Docker + API + Web)
3. ✅ **Open Qwen Code** with ultra-detailed context about your project
4. ✅ **Ask about yesterday's progress** through structured questions
5. ✅ **Show detailed roadmap** with current position
6. ✅ **Guide you** through implementing CMS features step-by-step

---

## 🎯 Recommended Daily Workflow

### Morning Routine (Start Here Every Day):

```
1. Double-click: LAUNCHER.bat
2. Choose: [1] Ultimate Dev Workflow
3. Answer Qwen's questions about yesterday's progress
4. Review roadmap and today's goals
5. Start coding with AI assistance
```

That's it! The scripts handle everything else.

---

## 📜 Available Scripts

### ⭐ LAUNCHER.bat (MAIN)
**Interactive menu with all options**

**Use this:** Every day to start your development session

**Features:**
- 🚀 Ultimate Dev Workflow
- 🤖 Qwen Session Only
- 📝 View Roadmap
- 🔧 Start Servers
- 🛑 Stop All Servers
- 📊 Check Status

---

### 🎯 dev-ultimate.bat (RECOMMENDED)
**All-in-one automated workflow**

**What it does:**
1. Checks if API/Web servers are running
2. Starts Docker containers if needed
3. Launches API and Web servers
4. Opens Qwen Code with detailed context
5. Shows yesterday's progress questions
6. Displays complete roadmap
7. Provides feature specifications

**Use when:** You want the full automated experience

---

### 🤖 qwen-session.bat
**Qwen Code with progress tracking**

**What it does:**
- Opens Qwen Code
- Shows detailed questionnaire about progress
- Displays roadmap position
- Helps plan today's tasks

**Use when:** Servers are already running, just need Qwen

---

### 📊 CURRENT_ROADMAP.md
**Detailed roadmap documentation**

**Contains:**
- Current phase status (Phase 1: 60% complete)
- Completed features list
- In-progress tasks
- TODO items with priorities
- Feature specifications
- Implementation plans
- Code examples

**Open with:** Any markdown viewer or web browser

---

## 🎯 Current Development Focus

### Phase 1: Core CMS (60% Complete)

**What we're building:**

#### 1️⃣ Image Visibility System
- Toggle for each image: "Show on public profile" ✓/✗
- Album/category organization (Portfolio, VIP, Elite)
- Bulk selection and filtering
- Sort order management

#### 2️⃣ Background Fade Slider
- Smooth crossfade between profile images
- Configurable transition speed (default: 5s)
- Mobile-responsive
- Performance optimized

#### 3️⃣ Water Shader Overlay
- Port from `water_shader_stacked.html`
- Apply as overlay on fade slider
- Intensity/speed controls
- Mobile fallback (auto-disable)

#### 4️⃣ Public Profile Pages
- Guest-facing profiles at `/models/[slug]`
- Background fade slider + shader effect
- Image gallery with lightbox
- Contact/booking form

---

## 🏃 Quick Start Guide

### First Time Setup:

```bat
# 1. Install dependencies (if not already done)
npm install

# 2. Start Docker containers
docker-compose -f docker-compose.dev.yml up -d

# 3. Run database migrations
cd packages/db && npx drizzle-kit push

# 4. Launch the workflow
LAUNCHER.bat
```

### Daily Use:

```bat
# Just run this every morning
LAUNCHER.bat

# Then choose:
# [1] Ultimate Dev Workflow
```

---

## 🎓 How to Use the Workflow

### Step 1: Run LAUNCHER.bat
Double-click the file or run from command prompt.

### Step 2: Choose Option 1
Select `[1] Ultimate Dev Workflow` from the menu.

### Step 3: Wait for Servers
The script will:
- Check if servers are running
- Start Docker if needed
- Launch API and Web servers
- Open Qwen Code

### Step 4: Answer Questions in Qwen
Qwen will ask you:
1. What did you accomplish yesterday?
2. What is currently working vs broken?
3. What do you want to focus on today?
4. Any bugs or blockers?

### Step 5: Get Personalized Guidance
Based on your answers, Qwen will:
- Review current implementation status
- Identify what needs to be built next
- Help you implement features step-by-step
- Test and verify everything works

---

## 📊 Server Status

### Ports Used:
| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Web (Frontend) | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO (Storage) | 9000/9001 | http://localhost:9001 |
| Mailhog (Email) | 8025 | http://localhost:8025 |

### Quick Links:
- **API Swagger:** http://localhost:3000/api/docs
- **Web App:** http://localhost:3001
- **MinIO Console:** http://localhost:9001
- **Mailhog UI:** http://localhost:8025

---

## 🛠️ Troubleshooting

### Servers Won't Start?
```bat
# Stop everything
docker-compose -f docker-compose.dev.yml down

# Clean restart (WARNING: deletes database!)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Then run LAUNCHER.bat again
```

### Database Connection Errors?
```bat
# Check Docker is running
docker ps

# Restart PostgreSQL container
docker restart escort-postgres

# Wait 10 seconds, then try again
```

### Qwen Doesn't Open?
```bat
# Try manual launch
qwen

# Or paste context manually from CURRENT_ROADMAP.md
```

### Port Already in Use?
```bat
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Find and kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

---

## 📁 Project Structure

```
ES/
├── LAUNCHER.bat              ← START HERE
├── dev-ultimate.bat          ← Full workflow automation
├── qwen-session.bat          ← Qwen with progress tracking
├── dev-workflow.bat          ← Original workflow (legacy)
├── CURRENT_ROADMAP.md        ← Detailed roadmap
├── WORKFLOW_SCRIPTS.md       ← Script documentation
├── docker-compose.dev.yml    ← Docker services
│
├── apps/
│   ├── api/                  ← NestJS backend
│   └── web/                  ← Next.js frontend
│
├── packages/
│   └── db/                   ← Database schema
│
└── water_shader_stacked.html ← Shader reference
```

---

## 🎯 Today's Goals

When you run the workflow, you'll be working on:

### Priority Tasks:
1. **Image Visibility Toggles** - Let users select which images show on public profile
2. **Album/Category System** - Organize images into Portfolio, VIP, Elite
3. **Fade Slider Component** - Background image slider with smooth transitions
4. **Water Shader Integration** - Overlay the ripple effect from reference file

### Choose Your Focus:
- **Option A:** Finish Profile Editor (add visibility controls)
- **Option B:** Build Fade Slider (background transitions)
- **Option C:** Integrate Water Shader (visual effects)
- **Option D:** Create Public Profile Page (guest-facing)

---

## 💡 Tips for Best Results

### 1. Be Specific About Progress
When Qwen asks what you did yesterday:
- ✅ Good: "Completed the edit form UI, added all physical attribute fields"
- ❌ Bad: "Stuff"

### 2. Test Before Reporting
Try the features yourself before telling Qwen:
- Can you edit a model profile? Test it.
- Can you upload images? Try it.
- What's broken? Note the exact error.

### 3. Choose One Focus Per Session
Don't try to build everything at once:
- ✅ Good: "Today I'll build the image visibility toggle"
- ❌ Bad: "Everything"

### 4. Ask for Code Reviews
After implementing:
- "Can you review my implementation?"
- "Are there any bugs or improvements?"
- "Is this the best approach?"

---

## 📞 Need Help?

### If Something Breaks:
1. Run `LAUNCHER.bat`
2. Choose `[6] Check Server Status`
3. Screenshot the error
4. Show it to Qwen in the next session

### If You Get Stuck:
1. Run `LAUNCHER.bat`
2. Choose `[1] Ultimate Dev Workflow`
3. Tell Qwen: "I'm stuck on [specific issue]"
4. Follow the step-by-step guidance

---

## 🎓 Learning Resources

### Key Technologies:
- **Next.js 15:** React framework with App Router
- **NestJS 10:** Node.js backend framework
- **Drizzle ORM:** TypeScript ORM for PostgreSQL
- **Three.js:** WebGL shader effects
- **TailwindCSS:** Utility-first CSS framework

### Documentation:
- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Drizzle Docs](https://orm.drizzle.team)
- [Three.js Docs](https://threejs.org/docs)

---

## ✅ Checklist for Each Session

### Before Starting:
- [ ] Run `LAUNCHER.bat`
- [ ] Choose Ultimate Dev Workflow
- [ ] Wait for servers to start

### During Session:
- [ ] Answer progress questions honestly
- [ ] Choose ONE feature to focus on
- [ ] Implement with Qwen's help
- [ ] Test the implementation
- [ ] Commit working code

### Before Ending:
- [ ] Verify all changes work
- [ ] Note what's incomplete
- [ ] Plan tomorrow's focus
- [ ] Commit and push code

---

## 🚀 Success Metrics

### You're Making Good Progress When:
- ✅ You can create and edit model profiles
- ✅ Images upload successfully to MinIO
- ✅ Visibility toggles work per image
- ✅ Fade slider transitions smoothly
- ✅ Water shader overlay applies correctly
- ✅ Public profile page displays properly

### Red Flags (Ask for Help):
- ❌ Database errors persist after restart
- ❌ Images won't upload
- ❌ Shader crashes browser
- ❌ Same bug after 3+ attempts

---

**Last Updated:** %DATE%  
**Current Phase:** Phase 1 - Core CMS (60% Complete)  
**Next Milestone:** Image Visibility System + Fade Slider  
**Estimated Launch:** 2-3 days

---

## 🎯 Ready to Start?

### Just run: `LAUNCHER.bat`

Good luck with your development! 🚀
