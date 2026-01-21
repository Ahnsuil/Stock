# Local Database Summary

## Database Tables

The local database contains the following tables:

1. **users** - User accounts and authentication
2. **stock_items** - Inventory items
3. **requests** - Stock requests from users
4. **issued_items** - Items issued to users
5. **assets** - Asset register
6. **purchase_history** - Purchase records
7. **overdue_items** - View for overdue items

## Current Data Counts

| Table | Row Count |
|-------|-----------|
| users | 3 |
| stock_items | 14 |
| requests | 12 |
| issued_items | 7 |
| assets | 1 |
| purchase_history | 2 |

## Required Users

### Current Users in Database

| Name | Email | Role | Password Type | Login Credentials |
|------|-------|------|--------------|------------------|
| admin | Anylmmohamed@gmail.com | admin | bcrypt | Username: `admin`, Password: `admin123` (hardcoded) |
| Anil | Anil@gmail.com | admin | demo_hash | Username: `Anil`, Password: `7917794` |
| guest | guest@stockflow.com | guest | bcrypt | Username: `guest`, Password: `guest123` (hardcoded) |

### Expected Users (from migrations)

According to the migration files, these users should exist:

1. **admin**
   - Email: `admin@stockflow.com`
   - Role: `admin`
   - Password: `admin123`
   - Password Hash: `demo_hash_admin123`

2. **guest**
   - Email: `guest@stockflow.com`
   - Role: `guest`
   - Password: `guest123`
   - Password Hash: `demo_hash_guest123`

3. **Anil**
   - Email: `anil@stockflow.com`
   - Role: `admin`
   - Password: `7917794`
   - Password Hash: `demo_hash_7917794`

## Login Credentials

### Working Login Credentials

1. **Admin Account**
   - Username: `admin`
   - Password: `admin123`
   - Note: Password validation is hardcoded in AuthContext

2. **Guest Account**
   - Username: `guest`
   - Password: `guest123`
   - Note: Password validation is hardcoded in AuthContext

3. **Anil Account**
   - Username: `Anil` (case-insensitive)
   - Password: `7917794`
   - Note: Uses demo_hash format validation

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `email` (TEXT, NOT NULL, UNIQUE)
- `role` (TEXT, NOT NULL, CHECK: 'admin' or 'guest')
- `password_hash` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Stock Items Table
- `id` (UUID, Primary Key)
- `name` (TEXT, NOT NULL)
- `type` (TEXT, NOT NULL)
- `quantity` (INTEGER, DEFAULT 0)
- `description` (TEXT)
- `purchase_vendor` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Requests Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `items` (JSONB, NOT NULL)
- `status` (TEXT, CHECK: 'pending', 'approved', 'rejected')
- `admin_notes` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Issued Items Table
- `id` (UUID, Primary Key)
- `item_id` (UUID, Foreign Key → stock_items.id)
- `user_id` (UUID, Foreign Key → users.id)
- `request_id` (UUID, Foreign Key → requests.id, nullable)
- `quantity_issued` (INTEGER, NOT NULL)
- `issued_date` (TIMESTAMPTZ)
- `return_due` (TIMESTAMPTZ, NOT NULL)
- `returned` (BOOLEAN, DEFAULT false)
- `return_date` (TIMESTAMPTZ)
- `admin_notes` (TEXT)
- `issued_to` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Password Validation

The authentication system supports two password formats:

1. **Demo Hash Format**: `demo_hash_<password>`
   - Example: `demo_hash_7917794` for password `7917794`
   - Used for: New users added via migrations

2. **Bcrypt Format**: `$2b$...`
   - Example: `$2b$10$rOzJqHqQzJKmHqHQzJKmHu7VzJKmHqHQzJKmHqHQzJKmHqHQzJKmH.`
   - Used for: Existing users (validation skipped for demo purposes)

3. **Hardcoded Accounts**: 
   - `admin` / `admin123`
   - `guest` / `guest123`
   - These are checked first before database validation

## Verifying Database

To check the current state of your database, you can run:

```sql
-- Check all users
SELECT name, email, role FROM public.users ORDER BY name;

-- Check table row counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'stock_items', COUNT(*) FROM public.stock_items
UNION ALL
SELECT 'requests', COUNT(*) FROM public.requests
UNION ALL
SELECT 'issued_items', COUNT(*) FROM public.issued_items;
```

## Resetting Database

To reset the database to initial state:

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

This will:
- Remove all data
- Re-run all migrations from `supabase/migrations/`
- Create fresh demo users

## Migration Files

Migrations are located in `supabase/migrations/` and run in alphabetical order:

1. `000_init_roles.sql` - Database roles and extensions
2. `001_initial_schema.sql` - Table definitions and RLS policies
3. `002_seed_demo_users.sql` - Demo users (admin, guest)
4. `003_add_user_anil.sql` - Anil user with admin role
