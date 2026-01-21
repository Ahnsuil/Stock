# 📦 StockFlow - Medical & General Stock Management System

A modern web-based inventory management system built with React, TypeScript, and Supabase. Features separate management for general and medical stock items with batch tracking and expiry dates.

## 🚀 Quick Start

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop/
2. **Run the application:**
   ```cmd
   START_DOCKER.bat
   ```
3. **Open browser:** http://localhost:5173
4. **Login:** admin / admin123

📖 **For detailed instructions, see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)**

## ✨ Features

### General Stock Management
- Add, edit, delete stock items
- Track quantities and vendors
- Low stock alerts
- Batch upload via CSV
- Request management system

### Medical Stock Management
- All general features PLUS:
- **Batch number tracking**
- **Expiry date monitoring** 
- Medical-specific item types
- Compliance-ready reporting

### User Management
- Admin and guest user roles
- Request approval workflow
- Asset management
- Site settings configuration

## 🏥 Sample Medical Items Included

- Paracetamol 500mg tablets
- Medical bandages  
- Antiseptic wipes
- Blood pressure monitors

## 🔐 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Guest | `anil` | `anil123` |

## 📋 System Requirements

- Docker Desktop
- 4GB RAM minimum
- 2GB free disk space
- Modern web browser

## 🛠️ Technology Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + API)
- **Deployment:** Docker + Docker Compose
- **Icons:** Lucide React

## 📞 Support

See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for troubleshooting and detailed setup instructions.

---

*Built with ❤️ for efficient inventory management*