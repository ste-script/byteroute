import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const nextVersion = process.argv[2];

if (!nextVersion) {
  console.error("Usage: node scripts/sync-workspace-versions.mjs <version>");
  process.exit(1);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listWorkspacePackageJsonPaths() {
  const packageJsonPaths = [path.join(repoRoot, "package.json")];

  for (const workspaceRoot of ["apps", "packages"]) {
    const workspaceRootPath = path.join(repoRoot, workspaceRoot);
    let entries;

    try {
      entries = await fs.readdir(workspaceRootPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = path.join(workspaceRootPath, entry.name, "package.json");
      if (await fileExists(pkgJsonPath)) packageJsonPaths.push(pkgJsonPath);
    }
  }

  return packageJsonPaths;
}

async function updatePackageJsonVersion(packageJsonPath, version) {
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const json = JSON.parse(raw);

  if (json.version === version) return false;

  json.version = version;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return true;
}

const packageJsonPaths = await listWorkspacePackageJsonPaths();

let changedCount = 0;
for (const packageJsonPath of packageJsonPaths) {
  const changed = await updatePackageJsonVersion(packageJsonPath, nextVersion);
  if (changed) changedCount += 1;
}

console.log(`Synced ${changedCount} package.json file(s) to version ${nextVersion}`);
