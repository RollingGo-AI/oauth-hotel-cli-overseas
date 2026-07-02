import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_NAME = '@rollinggo/hotel-global';

// Reading current version from package.json
function getCurrentVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// Fetching latest version from npm
async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { version?: string };
    return data.version || null;
  } catch {
    return null;
  }
}

// Comparing versions
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

// Checking for updates
export async function checkForUpdates(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    const latestVersion = await getLatestVersion();

    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      console.log('\n┌──────────────────────────────────────────────┐');
      console.log('│  New version available!                      │');
      console.log(`│  Current: v${currentVersion.padEnd(33)}│`);
      console.log(`│  Latest: v${latestVersion.padEnd(34)}│`);
      console.log('│                                              │');
      console.log('│  Run the following command to update:        │');
      console.log('│  npm install -g @rollinggo/hotel-global@latest │');
      console.log('└──────────────────────────────────────────────┘\n');
    }
  } catch {
    // Version check failed (ignored)
  }
}
