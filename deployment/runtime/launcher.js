"use strict";
// PM CONTROL TOWER — Embedded launcher (baked into PM-Control-Tower.exe via Node SEA).
// Runs from the pack root (the folder containing the .exe): loads .env, applies safe
// defaults, prepares runtime folders, then starts the bundled standalone server.
// NOTE: SEA scripts cannot require() external files (the embedder only allows
// builtins) — createRequire() is used to load app\server.js from the real filesystem.

const { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");

const root = path.dirname(process.execPath);
process.chdir(root);

// ---- Quick version probe: PM-Control-Tower.exe --version -----------------------
if (process.argv.includes("--version")) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "app", "package.json"), "utf8"));
    console.log(`PM Control Tower deployment pack v${pkg.version}`);
  } catch {
    console.log("PM Control Tower deployment pack (app\\package.json not found)");
  }
  process.exit(0);
}

// ---- .env loader (real environment variables always win) --------------------
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] === undefined) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

// ---- Defaults ----------------------------------------------------------------
process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
// DATABASE_URL: default to <root>/db/custom.db as an absolute file URL (Prisma-safe).
if (!process.env.DATABASE_URL) {
  const dbFile = path.join(root, "db", "custom.db");
  if (existsSync(dbFile)) process.env.DATABASE_URL = pathToFileURL(dbFile).href;
}

// ---- Runtime folders ----------------------------------------------------------
for (const dir of ["logs", "db", "run", "backups"]) {
  mkdirSync(path.join(root, dir), { recursive: true });
}

// ---- Logging: console + logs\server-YYYYMMDD.log -------------------------------
const logFile = path.join(root, "logs", `server-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.log`);
for (const stream of [process.stdout, process.stderr]) {
  const original = stream.write.bind(stream);
  stream.write = (chunk, ...rest) => {
    try { appendFileSync(logFile, typeof chunk === "string" ? chunk : String(chunk)); } catch { /* best effort */ }
    return original(chunk, ...rest);
  };
}

// ---- PID file (lets stop.cmd / backup.ps1 manage the process) -------------------
try { writeFileSync(path.join(root, "run", "app.pid"), String(process.pid)); } catch { /* best effort */ }

const banner = [
  "===============================================================",
  "  PM CONTROL TOWER  —  starting",
  `  Folder : ${root}`,
  `  Port   : ${process.env.PORT}   (bind ${process.env.HOSTNAME})`,
  `  Log    : ${logFile}`,
  "  Stop   : close this window, press Ctrl+C, or run stop.cmd",
  "===============================================================",
].join("\n");
console.log(banner);

// ---- Start the bundled Next.js standalone server -------------------------------
const serverPath = path.join(root, "app", "server.js");
if (!existsSync(serverPath)) {
  console.error(`FATAL: bundled server not found at ${serverPath}`);
  console.error("The deployment pack is incomplete — re-extract the full package.");
  process.exit(1);
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

// Load the server from the real filesystem (SEA-safe external require).
const serverRequire = createRequire(serverPath);
serverRequire("./server.js");
