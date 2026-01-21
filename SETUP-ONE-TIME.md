# One-time setup (for the person you give this to)

**Goal:** Run the app once at setup. After that, it starts automatically when they sign in to Windows. No need to run anything after a restart.

---

## What they need

1. **Node.js** – If it’s not installed: https://nodejs.org (LTS). Then restart the PC.
2. **This project** – e.g. in `C:\Stock` or on the Desktop. Avoid moving the folder after setup.

---

## One-time setup

1. Open the **project folder** (where you see `setup-once.bat`).
2. **Double‑click `setup-once.bat`**.
3. Wait for it to finish (install, build, add to startup, start the app). A window will stay open with the app running – they can minimize it.
4. In the browser, open: **http://localhost:5173**

After that, every time they **sign in to Windows**, the app will start and be available at http://localhost:5173. They don’t need to run anything.

---

## If they want to stop auto‑start

Double‑click **`remove-startup.bat`**. The app will no longer start at sign‑in. They can still run `start-app.bat` when they want to use it.

---

## If they need to run the app manually (without auto‑start)

Double‑click **`start-app.bat`** in the project folder, then open http://localhost:5173.

---

## Notes

- **Login / data:** The app uses the hosted Supabase. They use the same logins you use (e.g. admin, Anil).
- **Moving the project:** If they move the project to another folder, they should run `setup-once.bat` again so startup uses the new path.
- **Updates:** If you give them an updated project, they should run `setup-once.bat` again (it will rebuild and keep using the same startup).
