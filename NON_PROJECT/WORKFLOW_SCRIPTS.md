# 🚀 Development Workflow Scripts

This folder contains automated scripts to streamline your development workflow.

---

## 📜 Available Scripts

### 1. `dev-ultimate.bat` ⭐ RECOMMENDED
**All-in-one development workflow script**

**What it does:**
1. ✅ Checks if API/Web servers are running
2. ✅ Starts servers automatically if needed
3. ✅ Launches Docker containers if required
4. ✅ Opens Qwen Code with ultra-detailed context
5. ✅ Asks about yesterday's progress
6. ✅ Shows complete roadmap and current position
7. ✅ Provides feature specification for CMS + Fade Slider + Shader

**When to use:** Every morning to start your development session

**Usage:**
```bat
dev-ultimate.bat
```

---

### 2. `qwen-session.bat`
**Interactive progress tracking session**

**What it does:**
- Opens Qwen Code with detailed questionnaire
- Tracks what you accomplished yesterday
- Shows roadmap position
- Helps plan today's tasks

**When to use:** When you want focused progress tracking without server management

**Usage:**
```bat
qwen-session.bat
```

---

### 3. `dev-workflow.bat`
**Original workflow script (legacy)**

**What it does:**
- Basic server status check
- Server auto-start
- Opens Qwen with context prompt

**When to use:** If you prefer the simpler version

**Usage:**
```bat
dev-workflow.bat
```

---

## 🎯 Recommended Workflow

### Morning Routine:
1. Run `dev-ultimate.bat`
2. Answer Qwen's questions about yesterday's progress
3. Review the roadmap and today's goals
4. Start implementing features with Qwen's help

### During Development:
- Servers run automatically in background
- Access API Swagger: http://localhost:3000/api/docs
- Access Web App: http://localhost:3001
- Access MinIO: http://localhost:9001

### Focus Areas (Current Phase):
- ✅ Profile editor completion
- ✅ Image visibility toggles
- ✅ Album/category system
- ✅ Background fade slider
- ✅ Water shader overlay integration

---

## 🔧 Technical Details

### Server Ports:
| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Web | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| MinIO | 9000/9001 | http://localhost:9001 |
| Mailhog | 8025 | http://localhost:8025 |

### Docker Containers:
- `escort-postgres` - PostgreSQL 16 database
- `escort-redis` - Redis 7 cache
- `escort-minio` - MinIO storage
- `escort-mailhog` - Email testing

---

## 📝 Current Roadmap

### Phase 1: Core CMS (60% Complete)
**Focus:** Make CMS fully working with profile editing and image management

**Tasks:**
- [ ] Profile editor with all fields
- [ ] Image visibility toggles (show/hide on guest profile)
- [ ] Album/category organization
- [ ] Background fade slider component
- [ ] Water shader overlay integration

### Phase 2: Public Profile Pages (0% Complete)
**Focus:** Guest-facing profiles with visual effects

**Tasks:**
- [ ] Public profile page at `/models/[slug]`
- [ ] Fade slider background with selected images
- [ ] Water shader overlay
- [ ] Image gallery with lightbox
- [ ] Contact/booking form

### Phase 3: Booking System (0% Complete)
### Phase 4: Advanced Features (Future)

---

## 🐛 Troubleshooting

### Servers won't start?
```bat
# Stop everything
docker-compose -f docker-compose.dev.yml down

# Clean restart
docker-compose -f docker-compose.dev.yml up -d

# Then run dev-ultimate.bat again
```

### Database connection errors?
```bat
# Reset database volume (WARNING: deletes data!)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Qwen doesn't open?
```bat
# Try manual launch
qwen --prompt-file "path\to\prompt.md"

# Or just run qwen and paste the context manually
```

---

## 📞 Need Help?

1. Run `dev-ultimate.bat`
2. Tell Qwen what's broken
3. Get step-by-step debugging help

---

**Last Updated:** %DATE%
**Project:** Lovnge Escort Platform CMS
