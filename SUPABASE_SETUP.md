# Local Supabase Setup Guide

This guide will help you set up and run Supabase locally using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Setup Steps

### 1. Create Environment File

Create a `.env` file in the root directory with the following content:

```env
# Supabase Local Configuration
SUPABASE_URL=http://localhost:3000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Database Configuration
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
```

### 2. Create Vite Environment File

Create a `.env.local` file in the root directory for your Vite application:

```env
VITE_SUPABASE_URL=http://localhost:3000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 3. Start Supabase Services

Start all Supabase services using Docker Compose:

```bash
docker-compose up -d
```

This will start the following services:
- **PostgreSQL Database** on port `54322`
- **PostgREST API** on port `3000`
- **GoTrue Auth** on port `9999`
- **Storage API** on port `5000`
- **Realtime** on port `4000`
- **Postgres Meta** on port `8080`
- **Supabase Studio** on port `3001` (Web UI)

### 4. Access Supabase Studio

Once the services are running, you can access Supabase Studio (the web UI) at:
- **URL**: http://localhost:3001

This provides a visual interface to manage your database, view tables, run queries, and more.

### 5. Verify Services

Check if all services are running:

```bash
docker-compose ps
```

All services should show as "Up" or "healthy".

### 6. Run Your Application

Start your Vite development server:

```bash
npm run dev
```

Your application will now connect to the local Supabase instance.

## Useful Commands

### Stop Supabase Services
```bash
docker-compose down
```

### Stop and Remove Volumes (Wipes Database)
```bash
docker-compose down -v
```

### View Logs
```bash
docker-compose logs -f
```

### View Logs for Specific Service
```bash
docker-compose logs -f supabase-db
```

### Restart Services
```bash
docker-compose restart
```

## Database Migrations

Database migrations are automatically applied when the database container starts. Migration files are located in `supabase/migrations/` and are executed in alphabetical order.

To add a new migration:
1. Create a new SQL file in `supabase/migrations/` with a descriptive name (e.g., `002_add_new_table.sql`)
2. Restart the database service: `docker-compose restart supabase-db`

## Troubleshooting

### Port Already in Use
If you get port conflicts, you can modify the port mappings in `docker-compose.yml`.

### Database Not Initializing
- Check logs: `docker-compose logs supabase-db`
- Ensure the `supabase/migrations` directory exists
- Verify the migration files are valid SQL

### Services Not Starting
- Ensure Docker Desktop is running
- Check if ports are available: `netstat -an | findstr "3000 54322 9999"`
- Try stopping and removing containers: `docker-compose down -v` then `docker-compose up -d`

## Default Credentials

The local Supabase instance uses these default keys (safe for local development):
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **Service Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

## Switching Between Local and Remote

To switch between local and remote Supabase, simply update the environment variables in `.env.local`:
- **Local**: `VITE_SUPABASE_URL=http://localhost:3000`
- **Remote**: `VITE_SUPABASE_URL=https://your-project.supabase.co`
