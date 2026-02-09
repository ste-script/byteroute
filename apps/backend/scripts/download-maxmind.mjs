#!/usr/bin/env node
import { execSync } from 'child_process'; 
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// Load environment variables from .env file if present
dotenv.config();

// Required environment variables
const MAXMIND_API_KEY = process.env.MAXMIND_API_KEY;
const MAXMIND_USER_ID = process.env.MAXMIND_USER_ID;

if (!MAXMIND_API_KEY || !MAXMIND_USER_ID) {
  console.error('MAXMIND_API_KEY and MAXMIND_USER_ID must be set in environment');
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

async function downloadTarGz({ url, outFile, userId, apiKey }) {
  console.log(`Downloading ${url} -> ${outFile}`);

  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': 'byteroute/update-maxmind',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Download failed (${res.status} ${res.statusText}) ${body}`.trim());
  }

  if (!res.body) {
    throw new Error('Download failed (empty response body)');
  }

  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(outFile));

  if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
    throw new Error('Download failed (file missing or empty)');
  }
}

// Find the mmdb file
function findMmdbFile(dir, name) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findMmdbFile(fullPath, name);
      if (found) return found;
    } else if (file === name) {
      return fullPath;
    }
  }
  return null;
}

(async () => {
  try {
    // Check if databases already exist
    const asnDbPath = path.join('.', 'databases', 'GeoLite2-ASN.mmdb');
    const cityDbPath = path.join('.', 'databases', 'GeoLite2-City.mmdb');

    if (fs.existsSync(asnDbPath) && fs.existsSync(cityDbPath)) {
      console.log('MaxMind databases already exist. Skipping download.');
      console.log(`  - ${asnDbPath}`);
      console.log(`  - ${cityDbPath}`);
      process.exit(0);
    }

    console.log('Downloading GeoLite2-ASN database...');
    await downloadTarGz({
      url: 'https://download.maxmind.com/geoip/databases/GeoLite2-ASN/download?suffix=tar.gz',
      outFile: 'GeoLite2-ASN.tar.gz',
      userId: MAXMIND_USER_ID,
      apiKey: MAXMIND_API_KEY,
    });
    run('tar -xzf GeoLite2-ASN.tar.gz');
    const ASNmmdbFile = findMmdbFile('.', 'GeoLite2-ASN.mmdb');
    if (!ASNmmdbFile) {
      throw new Error('Could not find GeoLite2-ASN.mmdb in archive');
    }
    fs.rmSync('GeoLite2-ASN.tar.gz');
    fs.renameSync(ASNmmdbFile, path.join('.', 'databases', 'GeoLite2-ASN.mmdb'));
    fs.rmSync(path.dirname(ASNmmdbFile), { recursive: true });

    console.log('Downloading GeoLite2-City database...');
    await downloadTarGz({
      url: 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz',
      outFile: 'GeoLite2-City.tar.gz',
      userId: MAXMIND_USER_ID,
      apiKey: MAXMIND_API_KEY,
    });
    run('tar -xzf GeoLite2-City.tar.gz');
    const mmdbFile = findMmdbFile('.', 'GeoLite2-City.mmdb');
    if (!mmdbFile) {
      throw new Error('Could not find GeoLite2-City.mmdb in archive');
    }
    fs.rmSync('GeoLite2-City.tar.gz');
    fs.renameSync(mmdbFile, path.join('.', 'databases', 'GeoLite2-City.mmdb'));
    fs.rmSync(path.dirname(mmdbFile), { recursive: true });

    console.log('MaxMind databases updated successfully.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
