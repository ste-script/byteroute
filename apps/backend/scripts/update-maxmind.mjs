#!/usr/bin/env node
import { execSync } from 'child_process'; 
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

console.log('Downloading GeoLite2-ASN database...');
run(`curl -fsSL -o GeoLite2-ASN.tar.gz -u "${MAXMIND_USER_ID}:${MAXMIND_API_KEY}" "https://download.maxmind.com/geoip/databases/GeoLite2-ASN/download?suffix=tar.gz"`);

if (!fs.existsSync('GeoLite2-ASN.tar.gz') || fs.statSync('GeoLite2-ASN.tar.gz').size === 0) {
  console.error('Download failed or file is empty');
  process.exit(1);
}
run('tar -xzf GeoLite2-ASN.tar.gz');
const ASNmmdbFile = findMmdbFile('.', 'GeoLite2-ASN.mmdb');
if (!ASNmmdbFile) {
  console.error('Could not find GeoLite2-ASN.mmdb in archive');
  process.exit(1);
}
fs.rmSync('GeoLite2-ASN.tar.gz');
fs.renameSync(ASNmmdbFile, path.join('.', 'databases', 'GeoLite2-ASN.mmdb'));
fs.rmSync(path.dirname(ASNmmdbFile), { recursive: true });
console.log('Downloading GeoLite2-City database...');
run(`curl -fsSL -o GeoLite2-City.tar.gz -u "${MAXMIND_USER_ID}:${MAXMIND_API_KEY}" "https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz"`);
if (!fs.existsSync('GeoLite2-City.tar.gz') || fs.statSync('GeoLite2-City.tar.gz').size === 0) {
  console.error('Download failed or file is empty');
  process.exit(1);
}
run('tar -xzf GeoLite2-City.tar.gz');
const mmdbFile = findMmdbFile('.', 'GeoLite2-City.mmdb');
if (!mmdbFile) {
  console.error('Could not find GeoLite2-City.mmdb in archive');
  process.exit(1);
}
fs.rmSync('GeoLite2-City.tar.gz');
fs.renameSync(mmdbFile, path.join('.', 'databases', 'GeoLite2-City.mmdb'));
fs.rmSync(path.dirname(mmdbFile), { recursive: true });
console.log('MaxMind databases updated successfully.');
