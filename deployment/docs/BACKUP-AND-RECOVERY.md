> **v3.0 note (2026-09-19):** the canonical, updated version of this document lives in `docs/09-OPERATIONS-RUNBOOK.md`. The v3.0 "Command Center" release added agile delivery, omni boards, clients & billing, field operations, strategy & knowledge and proofing — see `CHANGELOG.md` and `docs/COMMAND-CENTER-PRD.md`.

# PM Control Tower — Backup & Recovery Guide

Everything that defines your PM Control Tower instance lives **inside the application
folder**: the SQLite database (`db\custom.db`), the configuration (`.env`) and the
schema (`prisma\schema.prisma`). Backing those up backs up the entire system.

---

## 1. What a backup contains

`backup.cmd` produces `backups\pmct-backup-<yyyyMMdd-HHmmss>.zip`:

| Item | Why |
|---|---|
| `db\custom.db` | All portfolios, programs, projects, tasks, financials, RAID, audit trail, users… |
| `.env` | Secrets and configuration (needed to restore on a new machine) |
| `prisma\schema.prisma` | Exact schema version for compatibility |
| `manifest.json` | When/where the backup was made, app version, file list |

Snapshots are taken **offline**: if the app is running it is stopped, the copy is
made, and the app is restarted automatically. On a quiet system this takes ~10 s.

## 2. Taking backups

```bat
backup.cmd                      :: now (default retention: 30 days)
```

- Retention: zips older than 30 days are deleted automatically. Change with
  `powershell -File scripts\backup.ps1 -RetentionDays 90`.
- Filename tags: regular backups are `pmct-backup-*`; restore creates a
  `pmct-pre-restore-*` safety copy first, so a restore can always be undone.

## 3. Scheduled backups (recommended)

Windows Task Scheduler, daily at 19:00 (run as the account that owns the folder):

```bat
schtasks /Create /F /TN "PMCT daily backup" /SC DAILY /ST 19:00 ^
  /TR "\"D:\PM-Control-Tower\scripts\backup.ps1\""
```

(Adjust the path; run as Administrator if the account needs it. Backups only
restart the app if it was running when the backup began.)

## 4. Restoring

```bat
restore.cmd -List               :: see what is available (newest first)
restore.cmd                     :: restore the newest backup
restore.cmd -Zip backups\pmct-backup-20260916-120000.zip
restore.cmd -DataOnly           :: restore db + .env only (keep current schema)
```

What restore does, in order:

1. Stops the app (if running).
2. Takes a `pmct-pre-restore-*.zip` safety snapshot of the **current** state.
3. Extracts and copies `db\`, `.env` (and the schema, unless `-DataOnly`) into place.
4. Starts the app again if it was running.

Verify afterwards with `healthcheck.cmd` and a quick sign-in.

## 5. Moving to a new machine / disaster recovery

1. Install the same (or newer) deployment pack on the new machine — **or** copy the
   existing folder wholesale.
2. Restore the backup: `restore.cmd -Zip <backup-from-old-machine>`.
3. Start the app (`deploy.cmd` if `.env` generation is needed first — restore already
   brings its own `.env`, so `start.cmd` suffices).
4. Because `DATABASE_URL` in the backup is an absolute path, check `.env` on the new
   machine points at the new location (`file:D:/PM-Control-Tower/db/custom.db`).

RPO/RTO with the daily schedule: ≤ 24 h data loss, ~5 minutes to recover.

## 6. Off-machine copies

The zip in `backups\` is one copy. For real protection, sync `backups\` off the box:

```bat
robocopy backups\ \\fileserver\pmct-backups /MIR /ETA
```

or point your existing backup agent at `backups\`. The zips are self-contained —
no database engine needed to read them later.

## 7. Testing your recovery (do this once a quarter)

1. `backup.cmd`
2. Copy the whole app folder to a scratch location (e.g. `D:\pmct-dr-test`).
3. In the copy: `restore.cmd -Zip <latest>`, `start.cmd`, sign in, spot-check data.
4. Delete the scratch folder.

A backup that has never been restored is a hope, not a plan.
