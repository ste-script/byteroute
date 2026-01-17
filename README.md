# ByteRoute

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
