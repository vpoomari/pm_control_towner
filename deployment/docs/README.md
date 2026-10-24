> **v3.0 note (2026-09-19):** the canonical, updated version of this document lives in `README.md`. The v3.0 "Command Center" release added agile delivery, omni boards, clients & billing, field operations, strategy & knowledge and proofing — see `CHANGELOG.md` and `docs/COMMAND-CENTER-PRD.md`.

# PM Control Tower — Deployment Pack

One-folder Windows application for **PM CONTROL TOWER**, the enterprise Project,
Program & Portfolio management platform. Drop the folder anywhere, run
`deploy.cmd` once, and the app is live.

## Contents

| Item | Purpose |
|---|---|
| `PM-Control-Tower.exe` | **The application launcher** — embedded Node runtime + startup logic. Double-click to run. |
| `deploy.cmd` | First-run setup: creates `.env` with random secrets, prepares folders, starts the app. |
| `start.cmd` / `stop.cmd` | Start (background) / stop the app. |
| `backup.cmd` | Backup database + configuration to `backups\pmct-backup-<timestamp>.zip`. |
| `restore.cmd` | Restore from a backup (`restore.cmd -List` to browse, `restore.cmd` for latest). |
| `healthcheck.cmd` | Quick probe that the app responds. |
| `install-autostart.cmd` / `remove-autostart.cmd` | Start the app automatically at logon (Task Scheduler). |
| `app\` | The compiled application (Next.js standalone server + all dependencies). |
| `db\custom.db` | Bundled data snapshot (skipped when packed with `-NoDb`). |
| `prisma\schema.prisma` | Database schema. |
| `scripts\*.ps1` | The automation logic behind the `.cmd` files. |
| `docs\` | `DEPLOYMENT-GUIDE.md`, `BACKUP-AND-RECOVERY.md`, this file. |

## Quick start (3 steps)

1. **Extract** this folder anywhere (e.g. `D:\PM-Control-Tower`). Avoid `C:\Program Files`
   (the app writes to its own folder); a normal folder is fine.
2. **Run `deploy.cmd`** — creates the environment file with fresh random secrets and
   starts the application.
3. **Open** [http://localhost:3000](http://localhost:3000) and sign in.

> Requires Windows 10/11 or Windows Server 2016+ and Node.js 20+ on the PATH
> (only needed by the `.cmd` launchers; `PM-Control-Tower.exe` is self-contained).
> To start from an **empty** database instead of the bundled data:
> `deploy.cmd -Fresh` (needs internet on first run for the Prisma engine).

## Daily operation

| Task | How |
|---|---|
| Open the app | `http://localhost:3000` (port configurable in `.env`) |
| Start / stop | `start.cmd` / `stop.cmd` (or just run `PM-Control-Tower.exe`) |
| Auto-start at logon | `install-autostart.cmd` once |
| Backup now | `backup.cmd` |
| Restore | `restore.cmd` (latest) or `restore.cmd -Zip <file>` |
| Change port / bind | Edit `PORT` / `HOSTNAME` in `.env`, then `stop.cmd` + `start.cmd` |

## Documentation

- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** — install, configuration, running as a
  service, upgrades, reverse proxy/HTTPS, troubleshooting.
- **[BACKUP-AND-RECOVERY.md](BACKUP-AND-RECOVERY.md)** — what backups contain, scheduled
  backups, restore and disaster-recovery procedures.
