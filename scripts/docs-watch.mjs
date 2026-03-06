import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const docsDir = path.join(repoRoot, "docs");

const WATCH_EXTENSIONS = new Set([".tex"]);

function isWatchedFile(filename) {
  if (!filename) return false;
  const ext = path.extname(filename);
  return WATCH_EXTENSIONS.has(ext);
}

function formatNow() {
  const dt = new Date();
  return dt.toISOString().replace("T", " ").slice(0, 19);
}

function runMakePdf() {
  return new Promise((resolve, reject) => {
    const child = spawn("make", ["pdf"], {
      cwd: docsDir,
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`make pdf exited with code ${code}`));
    });
  });
}

async function listAllDirectories(rootDir) {
  const dirs = [rootDir];
  const queue = [rootDir];

  while (queue.length) {
    const dir = queue.pop();
    let entries;

    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      dirs.push(full);
      queue.push(full);
    }
  }

  return dirs;
}

async function listAllTexFiles(rootDir) {
  const files = [];
  const queue = [rootDir];

  while (queue.length) {
    const dir = queue.pop();
    let entries;

    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        queue.push(full);
        continue;
      }

      if (isWatchedFile(entry.name)) files.push(full);
    }
  }

  return files;
}

const watchers = new Map();

function watchDirectory(dirPath, onChange) {
  if (watchers.has(dirPath)) return;

  try {
    const watcher = fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
      // filename can be null on some platforms / events.
      onChange({ eventType, dirPath, filename: filename ? String(filename) : null });
    });

    watcher.on("error", (err) => {
      // Non-fatal; just stop watching that directory.
      console.error(`[${formatNow()}] Watcher error in ${dirPath}:`, err.message);
      try {
        watcher.close();
      } catch {
        // ignore
      }
      watchers.delete(dirPath);
    });

    watchers.set(dirPath, watcher);
  } catch (err) {
    // If a directory disappears mid-run, ignore.
  }
}

let buildRunning = false;
let buildQueued = false;
let debounceTimer = null;

let texSnapshot = new Map();
let snapshotCheckInFlight = false;

async function takeTexSnapshot() {
  const next = new Map();
  const texFiles = await listAllTexFiles(docsDir);

  for (const filePath of texFiles) {
    try {
      const stat = await fs.promises.stat(filePath);
      next.set(filePath, stat.mtimeMs);
    } catch {
      // ignore
    }
  }

  return next;
}

function snapshotsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

async function maybeScheduleBuildFromSnapshot(reason) {
  if (snapshotCheckInFlight) return;
  snapshotCheckInFlight = true;

  try {
    const next = await takeTexSnapshot();
    if (!snapshotsEqual(texSnapshot, next)) {
      texSnapshot = next;
      scheduleBuild(reason);
    }
  } finally {
    snapshotCheckInFlight = false;
  }
}

async function buildOnce(reason) {
  if (buildRunning) {
    buildQueued = true;
    return;
  }

  buildRunning = true;
  buildQueued = false;

  console.log(`\n[${formatNow()}] Rebuilding PDFs (${reason})...`);

  try {
    await runMakePdf();
    console.log(`[${formatNow()}] Build succeeded.`);
  } catch (err) {
    console.error(`[${formatNow()}] Build failed: ${err?.message || err}`);
  } finally {
    buildRunning = false;
    if (buildQueued) {
      await buildOnce("queued change");
    }
  }
}

function scheduleBuild(reason) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void buildOnce(reason);
  }, 250);
}

function handleFsEvent({ eventType, dirPath, filename }) {
  if (!filename) {
    void maybeScheduleBuildFromSnapshot(".tex change");
    return;
  }

  if (!isWatchedFile(filename)) return;
  scheduleBuild(`${eventType}: ${path.join(path.relative(docsDir, dirPath), filename)}`);
}

async function main() {
  // Basic sanity check
  try {
    const stat = await fs.promises.stat(docsDir);
    if (!stat.isDirectory()) throw new Error("docs is not a directory");
  } catch {
    console.error(`docs directory not found at: ${docsDir}`);
    process.exit(1);
  }

  console.log("Watching docs/**/*.tex for changes...");
  console.log("Press Ctrl+C to stop.");

  texSnapshot = await takeTexSnapshot();

  const dirs = await listAllDirectories(docsDir);
  for (const dir of dirs) watchDirectory(dir, handleFsEvent);

  // Also rebuild if new directories appear (e.g., new images/ subfolder).
  // We only need this for future .tex files, so keep it lightweight.
  watchDirectory(docsDir, async ({ eventType, filename }) => {
    if (eventType !== "rename" || !filename) return;
    const fullPath = path.join(docsDir, filename);

    try {
      const stat = await fs.promises.stat(fullPath);
      if (stat.isDirectory()) {
        const newDirs = await listAllDirectories(fullPath);
        for (const dir of newDirs) watchDirectory(dir, handleFsEvent);
      }
    } catch {
      // deleted / moved
    }
  });

  await buildOnce("startup");

  const shutdown = () => {
    for (const watcher of watchers.values()) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    watchers.clear();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

await main();
