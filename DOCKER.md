# Docker

## Run on another PC

You can run the app on any PC that has **Docker** (and Docker Compose) installed.

### Option A: Hosted Supabase (easiest — no .env)

Uses the built-in hosted Supabase. Data is in the cloud; no local database.

**On the new PC:**

1. Install [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/) (or Docker Engine + Compose).
2. Copy the project (e.g. `git clone`, or copy the folder).
3. In the project folder, run:

   ```bash
   npm run docker:standalone:up
   ```

   Or without npm:

   ```bash
   docker-compose -f docker-compose.standalone-frontend.yml up -d --build
   ```

4. Open **http://localhost:5173** in a browser. Do **not** run `npm run dev` — the container serves the app.

**Stop:**

```bash
npm run docker:standalone:stop
```

No `.env` file is needed. Log in with the same users as on your hosted Supabase (e.g. admin, Anil).

---

### Option B: Full stack with local Supabase

Runs PostgreSQL and Supabase on that PC. Each PC has its own database.

**On the new PC:**

1. Install Docker Desktop (or Docker Engine + Compose).
2. Copy the project.
3. Create a **`.env`** in the project root (copy from your first PC or from `SUPABASE_SETUP.md`). It must include:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `SUPABASE_URL` (e.g. `http://localhost:3001`)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. For the frontend to use local Supabase, add to `.env`:
   - `VITE_SUPABASE_URL=http://localhost:3001`
   - `VITE_SUPABASE_ANON_KEY=<same as SUPABASE_ANON_KEY>`
5. Run:

   ```bash
   docker-compose up -d
   ```

6. Open **http://localhost:5173**. Do **not** run `npm run dev` — the frontend container serves the app. The DB is created on first run and migrations in `supabase/migrations` are applied. You may need to add or seed users.

**Files to copy from the first PC (for Option B):**  
- The whole project (or `git clone`).  
- `.env` (or recreate it from `SUPABASE_SETUP.md`).

---

## Frontend in Docker

The **frontend** service builds the React app and serves it with nginx on **port 5173** (mapped from container port 80).

**You do not need to run `npm run dev` when using Docker.** The container is the server: it runs automatically when you start it with `docker-compose up -d` or `npm run docker:standalone:up`. Open **http://localhost:5173** in your browser. Use either Docker *or* `npm run dev`, not both.

### Update the frontend (rebuild with latest code)

Rebuild the image and start the container:

```bash
npm run docker:frontend:restart
```

Or manually:

```bash
docker-compose up -d --build frontend
```

For a clean rebuild (no cache):

```bash
npm run docker:frontend:rebuild
npm run docker:frontend:up
```

### Start the frontend

Starts the frontend (and its dependencies: supabase-proxy, supabase-auth, etc. if not already running):

```bash
npm run docker:frontend:up
```

### Stop the frontend

Stops only the frontend container. The Supabase/backend containers keep running.

```bash
npm run docker:frontend:stop
```

The frontend uses `restart: unless-stopped`, so it starts automatically with `docker-compose up -d` and restarts after a reboot like the other services.

### Other commands

| Command | Description |
|--------|-------------|
| `npm run docker:frontend:build` | Build the frontend image (no start) |
| `npm run docker:frontend:logs`  | Stream frontend container logs     |

### Supabase URL when building

The Docker build can use:

- **Hosted Supabase** (default): if you do not set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env`, the app uses its built-in fallback (hosted project).
- **Local Supabase** (e.g. `http://localhost:3001`): in `.env` set:
  ```env
  VITE_SUPABASE_URL=http://localhost:3001
  VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
  ```
  Then rebuild: `npm run docker:frontend:restart`.

## Full stack

To run the full stack (Supabase + frontend):

```bash
docker-compose up -d
```

Ensure `.env` (or `SUPABASE_SETUP.md`) is set up with `POSTGRES_PASSWORD`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
