# 📦 StockFlow - Installation Guide

Welcome! This guide will help you install and run the StockFlow Stock Management Application on your computer.

## 🚀 Quick Start (5 minutes)

### Step 1: Install Docker Desktop

1. **Download Docker Desktop** from: https://www.docker.com/products/docker-desktop/
   - For Windows: Choose "Docker Desktop for Windows"
   - For Mac: Choose "Docker Desktop for Mac"
   - For Linux: Follow instructions for your distribution

2. **Install Docker Desktop**
   - Run the downloaded installer
   - Follow the installation wizard
   - **Restart your computer** when prompted

3. **Start Docker Desktop**
   - Open Docker Desktop from your applications
   - Wait for it to start (you'll see "Docker Desktop is running" in the system tray)

### Step 2: Get the Application Files

**Option A: From ZIP file**
1. Extract the project ZIP file to a folder (e.g., `C:\StockFlow` or `~/StockFlow`)
2. Open command prompt/terminal in that folder

**Option B: From Git (if you have Git installed)**
```bash
git clone [YOUR_REPOSITORY_URL]
cd Stock
```

### Step 3: Start the Application

1. **Double-click** `START_DOCKER.bat` (Windows) or run it from command prompt:
   ```cmd
   START_DOCKER.bat
   ```

2. **Choose your setup:**
   - Press `1` for **Frontend only** (Recommended - easiest setup)
   - Press `2` for **Full stack** (if you need local database)

3. **Wait for startup** (first time takes 2-3 minutes)
   - You'll see Docker downloading and building the application
   - Wait for "✅ Application started successfully!"

### Step 4: Access the Application

1. **Open your web browser**
2. **Go to:** http://localhost:5173
3. **Login with default credentials:**
   - Username: `admin`
   - Password: `admin123`

🎉 **You're done!** The application is now running.

---

## 📋 Default User Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |
| `anil` | `anil123` | Guest User |

---

## 🏥 Using the Stock Management Features

1. **Login** as admin
2. **Go to Stock Management**
3. **Click the "Medical" tab** (💊 icon) to manage medical items
4. **Click the "General" tab** (📦 icon) for regular stock items

### Key Features:

**Adding Stock Items:**
- Specify **unit type** (Box or PCS) - shown next to quantity
- Add **batch numbers** (required for medical, optional for general)
- Set **expiry dates** (required for medical, optional for general)
- Items expiring within one month show orange warnings
- Expired items are highlighted in red

**Discarding Items:**
- Click the discard button (⚠️ icon) on any stock item
- Select reason: Damaged, Broken, or Expired
- Quantity is automatically deducted from stock
- Discard history is maintained

**User Management:**
- Assign **departments** to users for better organization
- Departments can be used to filter items in guest view

### Sample Medical Items Included:
- Paracetamol 500mg (Batch: B2024-001)
- Bandages (Batch: B2024-002) 
- Antiseptic Wipes (Batch: B2024-003)
- Blood Pressure Monitor (Batch: B2024-004)

## 👥 Guest User Features

**Stock Browser:**
- View all available items with batch numbers and expiry dates
- Filter by type and department
- See unit types (Box/PCS) with quantities

**My Items:**
- View issued items with batch numbers and expiry dates
- Transfer items to other users using the Transfer button
- Track return due dates and overdue items

**Item Transfers:**
1. Go to "My Items"
2. Click "Transfer" on any active (non-returned) item
3. Select the recipient user
4. Add optional notes
5. Confirm transfer

---

## 🛑 How to Stop the Application

**Frontend only setup:**
```cmd
npm run docker:standalone:stop
```

**Full stack setup:**
```cmd
docker-compose down
```

**Or simply close Docker Desktop to stop everything.**

---

## 🔧 Troubleshooting

### Problem: "Docker command not found"
**Solution:** Make sure Docker Desktop is installed and running. Restart your computer if needed.

### Problem: Port 5173 is already in use
**Solution:** Stop any other applications using port 5173, or change the port in `docker-compose.yml`:
```yaml
ports:
  - "5174:80"  # Change 5173 to 5174
```

### Problem: Application won't start
**Solutions:**
1. Make sure Docker Desktop is running
2. Try stopping and starting again:
   ```cmd
   docker-compose down
   START_DOCKER.bat
   ```
3. Check Docker Desktop for error messages

### Problem: Can't login
**Solution:** Use the default credentials:
- Username: `admin`
- Password: `admin123`

### Problem: Changes don't appear
**Solution:** Rebuild the frontend:
```cmd
docker-compose up -d --build frontend
```

---

## 📁 Project Structure

```
StockFlow/
├── START_DOCKER.bat          # Easy startup script
├── docker-compose.yml        # Full stack configuration  
├── docker-compose.standalone-frontend.yml  # Frontend only
├── Dockerfile                # Frontend container setup
├── src/                      # Application source code
├── supabase/migrations/      # Database setup
└── package.json             # Dependencies
```

---

## 🌐 Ports Used

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Supabase Studio | 3003 | http://localhost:3003 |
| Supabase API | 3001 | http://localhost:3001 |

---

## 💡 Tips for Administrators

1. **Backup Data:** The database is stored in Docker volumes. To backup:
   ```cmd
   docker-compose exec supabase-db pg_dump -U supabase_admin postgres > backup.sql
   ```

2. **Update Application:** When you receive new code:
   ```cmd
   docker-compose down
   START_DOCKER.bat
   ```

3. **View Logs:** To see what's happening:
   ```cmd
   docker-compose logs -f frontend
   ```

4. **Add New Users:** Login as admin → User Management → Add User

---

## 📞 Support

If you encounter issues:

1. **Check Docker Desktop** is running
2. **Try restarting** the application
3. **Check the logs** for error messages
4. **Ensure ports 5173, 3001, 3003** are not being used by other applications

---

## ✅ System Requirements

- **Operating System:** Windows 10/11, macOS, or Linux
- **RAM:** 4GB minimum (8GB recommended)
- **Disk Space:** 2GB free space
- **Internet:** Required for initial Docker image download

---

## 🔄 Updating the Application

When updating to a new version:

1. **Stop the application:**
   ```cmd
   docker-compose down
   ```

2. **Pull/update the code** with new features

3. **Start the application:**
   ```cmd
   START_DOCKER.bat
   ```

4. **Database migrations run automatically** - no manual steps needed!

The system will automatically apply new database migrations (like adding unit types, departments, discard tracking, etc.)

*Last updated: January 2026 - v2.0 with expiry tracking, transfers, and discard management*