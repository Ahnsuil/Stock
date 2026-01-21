# 📦 StockFlow - Medical & General Stock Management System

A modern web-based inventory management system built with React, TypeScript, and Supabase. Features comprehensive stock management for both general and medical items with advanced tracking, expiry monitoring, and user collaboration features.

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
- **Unit type specification** (Box/PCS) displayed with quantities
- **Batch number tracking** (optional)
- **Expiry date monitoring** with notifications
- **Expiry alerts** for items expiring within one month
- **Discard functionality** for damaged, broken, or expired items
- Low stock alerts
- Batch upload via CSV
- Request management system

### Medical Stock Management
- All general features PLUS:
- **Required batch number tracking**
- **Required expiry date monitoring** 
- Medical-specific item types
- Compliance-ready reporting

### User Management
- Admin and guest user roles
- **Department assignment** for users
- Request approval workflow
- Asset management
- Site settings configuration

### Guest User Features
- Browse available stock with **batch numbers and expiry dates**
- View issued items with **batch and expiry information**
- **Transfer items** between users
- **Department-based filtering** of stock items
- Request management
- Track overdue items

### Advanced Features
- **Item Transfer System**: Guest users can transfer items to other users
- **Discard Management**: Track and deduct damaged/broken/expired items
- **Expiry Notifications**: Visual alerts for expiring and expired items
- **Department Organization**: Organize users and filter by departments

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

## 🆕 Latest Features (v2.0)

### General Stock Enhancements
- ✅ **Expiry tracking** for general stock items
- ✅ **Batch number** support for all stock types
- ✅ **Unit type** (Box/PCS) specification and display
- ✅ **Expiry notifications** with visual alerts
- ✅ **Discard system** for damaged/broken/expired items

### User Collaboration
- ✅ **Item transfers** between guest users
- ✅ **Department management** for user organization
- ✅ **Department filtering** in stock browser

### Improved Visibility
- ✅ **Batch numbers** visible to guest users
- ✅ **Expiry dates** displayed in all views
- ✅ **Unit types** shown with quantities

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

## 📊 Database Schema

The system includes the following main tables:
- `users` - User accounts with department assignment
- `stock_items` - Inventory items with expiry, batch, and unit tracking
- `requests` - Stock request workflow
- `issued_items` - Items issued to users
- `discarded_items` - Tracked discarded items (damaged/broken/expired)
- `item_transfers` - History of item transfers between users
- `assets` - Asset register
- `purchase_history` - Purchase records

## 🔄 Migration Notes

When updating from a previous version, the system will automatically run database migrations including:
- Migration `011`: Adds unit types, department fields, discard tracking, and transfer functionality

---

*Built with ❤️ for efficient inventory management*