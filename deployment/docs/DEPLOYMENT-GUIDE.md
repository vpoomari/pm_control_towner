> **v3.0 note (2026-09-19):** the canonical, updated version of this document lives in `docs/01-DEPLOYMENT-GUIDE.md`. The v3.0 "Command Center" release added agile delivery, omni boards, clients & billing, field operations, strategy & knowledge and proofing — see `CHANGELOG.md` and `docs/COMMAND-CENTER-PRD.md`.

# PM Control Tower — Deployment Guide (Windows Pack)

This guide covers deploying the **PM Control Tower deployment pack** on Windows.
The pack is self-contained: the compiled application, its dependencies, a data
snapshot, the launcher executable and all operational scripts ship in one folder.

---

## 1. Requirements

| Component | Requirement |
|---|---|
| OS | Windows 10/11 or Windows Server 2016+ (x64) |
| Runtime | Node.js ≥ 20.9 on PATH — required by `.cmd` launchers and scripts. `PM-Control-Tower.exe` embeds its own runtime and does not need it. |
| Disk | ~1.5 GB free (pack ≈ 450 MB extracted) |
| RAM | 512 MB steady-state, 2 GB recommended |
| Network | Port 3000 inbound (configurable); internet only for `-Fresh` DB init or optional gateway |

> The bundled **realtime gateway** (Socket.IO mini service) is not part of the Windows
> pack. The app runs fully without it — cross-session live refresh degrades to a
> per-session refresh (the "LIVE/OFF" indicator shows OFF). See §10 to enable it.

---

## 2. Install

1. Copy `PM-Control-Tower-*.zip` to the target machine and extract, e.g. to `D:\PM-Control-Tower`.
   - Avoid `C:\Program Files` and OneDrive-synced folders — the app writes to its own
     folder (`db\`, `logs\`, `backups\`, `run\`).
2. Right-click `PM-Control-Tower.exe` → **Properties** → tick **Unblock** if present
   (unsigned executable; SmartScreen shows "More info → Run anyway" the first time).
3. Run **`deploy.cmd`**. It:
   - generates `.env` with strong random secrets (`JWT_SECRET`, `REALTIME_*`),
   - creates `db\`, `logs\`, `run\`, `backups\`,
   - starts the application.
4. Browse to `http://localhost:3000`.

**First sign-in** (with the bundled data snapshot — sandbox seeds, rotate immediately):

| Account | Role |
|---|---|
| `ceo@pmct.io` | Executive |
| `pmo@pmct.io` | PMO Admin |
| `pm.sarah@pmct.io` | Project Manager |
| `liam@pmct.io` | Team Member |

Password for all: `Pmct@2026` — **change these in Administration → Users before
production use.** For a clean install use `deploy.cmd -Fresh` and create the
administrator account in the app's first-run sign-up.

---

## 3. Configuration (`.env`)

`deploy.cmd` generates a working `.env`; edit it to customise. Restart after changes
(`stop.cmd`, then `start.cmd`).

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `file:<pack>\db\custom.db` | Absolute SQLite file URL. Keep absolute. |
| `PORT` | `3000` | HTTP port. |
| `HOSTNAME` | `127.0.0.1` | Bind address. `0.0.0.0` = reachable from other machines. |
| `JWT_SECRET` | random | Auth-token signing key (rotate for production). |
| `REALTIME_SECRET_KEY` | random | Must equal `JWT_SECRET` when the gateway is enabled. |
| `REALTIME_SECRET` | random | Internal publish secret for the gateway. |
| `REALTIME_URL` / `REALTIME_PORT` | `127.0.0.1:3003` | Gateway address (optional service). |

---

## 4. Running the application

| Mode | How | Notes |
|---|---|---|
| Foreground (console) | Double-click `PM-Control-Tower.exe` | Live logs in the window; close it or Ctrl+C to stop. |
| Background | `start.cmd` | Minimised window, logs in `logs\`. Stop with `stop.cmd`. |
| Auto-start at logon | `install-autostart.cmd` once | Registers Task Scheduler entry `PM-Control-Tower`; remove with `remove-autostart.cmd`. |
| Service-like (server) | See §9 — Task Scheduler ONSTART under a service account. |

### Verifying

- `healthcheck.cmd` → "app is responding"
- or: `curl http://localhost:3000/api/health` (any response = server up)

---

## 5. Exposing to the network

- Set `HOSTNAME=0.0.0.0` in `.env` and restart.
- Open the port: `netsh advfirewall firewall add rule name="PM Control Tower" dir=in action=allow protocol=TCP localport=3000`
- Prefer a reverse proxy for production TLS. IIS (ARR) or Caddy in front of
  `127.0.0.1:3000` works; see the repo's `deploy/Caddyfile.prod` for a template.

---

## 6. Upgrades

1. `backup.cmd` (always).
2. `stop.cmd`.
3. Extract the new pack over the folder **except** `db\`, `.env`, `backups\`, `logs\`
   (keep those — they are your state and configuration).
4. `start.cmd`, verify `healthcheck.cmd`.

The schema evolves with the app; if a release changes it, run
`npx prisma@6 db push --schema prisma\schema.prisma` after replacing `prisma\schema.prisma`
(internet required on first run).

---

## 7. Where things live

```
PM-Control-Tower\
├── .env                  configuration (created by deploy.cmd)
├── app\                  compiled application (replace on upgrade)
├── db\custom.db          THE database — all business data
├── backups\              backup zips (retained 30 days by default)
├── logs\                 server logs (server-YYYYMMDD.log, console-*.log)
└── run\app.pid           current process id
```

---

## 8. Uninstall

`stop.cmd`, (optionally `backup.cmd` first), delete the folder, and
`remove-autostart.cmd` if registered. Nothing is written outside the folder.

---

## 9. Running as a Windows service (advanced)

The pack intentionally has no service wrapper dependency. Two supported options:

- **Task Scheduler (simplest)**: `install-autostart.cmd`, or create an ONSTART task
  under a dedicated account:
  `schtasks /Create /TN "PMCT" /SC ONSTART /RU DOMAIN\svc-pmct /RP <password> /TR "D:\PM-Control-Tower\start.cmd"`
- **NSSM / WinSW** (third-party): wrap `PM-Control-Tower.exe` as the application,
  `AppDirectory` = pack root. The launcher handles its own logs and PID file.

---

## 10. Optional: live realtime updates

The Socket.IO gateway adds cross-session live refresh. On the same machine with
Node + tsx available (`npm i -g tsx`):

```
set REALTIME_SECRET=<same as .env> & set REALTIME_PORT=3003 & set JWT_SECRET=<same as .env>
tsx <repo>\mini-services\realtime\index.ts
```

Then set `REALTIME_URL=http://127.0.0.1:3003` in `.env` and restart. The indicator in
the sidebar switches to **LIVE**. This is optional — skip it for single-user or
small-team use.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Window closes instantly on launch | Run `start.cmd` and read `logs\console-*.log`; usually a missing `app\server.js` (incomplete extract) or a port conflict. |
| `EADDRINUSE` / port busy | Another app uses `PORT`. Change `PORT` in `.env` or `stop.cmd` the running instance. |
| "App did not report a listener" | Check `logs\`; verify Node.js ≥ 20 with `node --version` when using `.cmd` launchers. |
| Login fails / "Authentication required" on API | `.env` missing — run `deploy.cmd`. |
| Database errors after upgrade | Run `npx prisma@6 db push --schema prisma\schema.prisma`; if worse, `restore.cmd`. |
| SmartScreen blocks the .exe | Properties → Unblock, or "More info → Run anyway". |
| Forgot admin password | Restore a backup, or reset directly: `npx tsx scripts/reset-password.ts <email> 'NewPass#2026'` from the repo (see Ops Runbook). |
