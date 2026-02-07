# ByteRoute

[![Release](https://github.com/ste-script/byteroute/actions/workflows/release.yml/badge.svg)](https://github.com/ste-script/byteroute/actions/workflows/release.yml)
[![Testing](https://github.com/ste-script/byteroute/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/ste-script/byteroute/actions/workflows/build-and-test.yml)
[![Version](https://img.shields.io/github/v/release/ste-script/byteroute)](https://github.com/ste-script/byteroute/releases)

**University Project for SPE (Software Performance Engineering) and ASW (Architetture Software per il Web)**

## Project Overview

The proposal focuses on the development of a network traffic monitoring platform called ByteRoute, which aims to provide users with real-time visibility into their internet traffic destinations, allowing them to identify which servers and services their computer connects to.

## Project Description

The project consists of a system composed of:

- **A lightweight Linux client** written in Go that captures network packets, extracts destination IPs, deduplicates them, and sends batches of connections to the backend
- **A Node.js/Express backend** that receives connections, performs enrichment (GeoIP lookup, reverse DNS, automatic categorization), stores data in MongoDB, and broadcasts in real-time via Socket.IO
- **A Vue.js dashboard** that displays a world map with traffic flows, live connection list, statistics by category/country, and time-based charts

## Technology Stack

- **Traffic Interceptor**: Go + libpcap
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: MongoDB
- **Frontend**: Vue.js 3 + Vite
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Releases

This repo uses `semantic-release` to generate GitHub Releases and (via `@semantic-release/git`) commit release artifacts (changelog + workspace version bumps).

If `main` is protected with “Changes must be made through a pull request”, the default `GITHUB_TOKEN` cannot push the release commit. In that case, add a repo secret named `RELEASE_TOKEN` containing a Personal Access Token for an admin/maintainer account (so it can bypass the restriction).

Set it with the GitHub CLI:

```bash
gh secret set DEPLOYMENT_TOKEN --repo ste-script/byteroute
```

The release workflow prefers `DEPLOYMENT_TOKEN`, but will fall back to `RELEASE_TOKEN` (if you already created it) and then to `GITHUB_TOKEN`.
