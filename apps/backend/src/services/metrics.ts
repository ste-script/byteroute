/**
 * @module backend/services/metrics
 */

import { InMemoryMetricsStore } from "../infrastructure/metrics/in-memory-metrics-store.js";

export const metricsStore = new InMemoryMetricsStore();
