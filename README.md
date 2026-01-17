# ByteRoute

**University Project for SPE (Software Performance Engineering) and ASW (Architetture Software per il Web)**

---

## English Version (SPE - Software Performance Engineering)

### Project Overview

The proposal focuses on the development of a network traffic monitoring platform called ByteRoute, which aims to provide users with real-time visibility into their internet traffic destinations, allowing them to identify which servers and services their computer connects to.

### Project Description

The project consists of a system composed of:

- **A lightweight Linux client** written in Go that captures network packets, extracts destination IPs, deduplicates them, and sends batches of connections to the backend
- **A Node.js/Express backend** that receives connections, performs enrichment (GeoIP lookup, reverse DNS, automatic categorization), stores data in MongoDB, and broadcasts in real-time via Socket.IO
- **A Vue.js dashboard** that displays a world map with traffic flows, live connection list, statistics by category/country, and time-based charts

### Technology Stack

- **Traffic Interceptor**: Go + libpcap
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: MongoDB
- **Frontend**: Vue.js 3 + Vite
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

---

## Versione Italiana (ASW - Architetture Software per il Web)

### Panoramica del Progetto

La proposta si focalizza sullo sviluppo di una piattaforma di monitoraggio del traffico di rete chiamata ByteRoute, che si pone l'obiettivo di fornire agli utenti visibilità in tempo reale sulle destinazioni del proprio traffico internet, permettendo di identificare a quali server e servizi il proprio computer si connette.

### Descrizione del Progetto

Il progetto consiste in un sistema composto da:

- **Un client leggero per Linux** scritto in Go che cattura pacchetti di rete, estrae gli IP di destinazione, deduplica e invia batch di connessioni al backend
- **Un backend Node.js/Express** che riceve le connessioni, effettua enrichment (GeoIP lookup, reverse DNS, categorizzazione automatica), memorizza in MongoDB, e broadcast in tempo reale via Socket.IO
- **Una dashboard Vue.js** che visualizza mappa mondiale con flussi di traffico, lista connessioni live, statistiche per categoria/paese, grafici temporali

### Stack Tecnologico

- **Intercettatore di Traffico**: Go + libpcap
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: MongoDB
- **Frontend**: Vue.js 3 + Vite
- **Containerizzazione**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
