/* v8 ignore file */
export type { TypedSocketServer } from "./connections/types.js";

export { loadConnectionsFromDb } from "./connections/repository.js";

export {
  getConnectionsForTenant,
  getAllConnectionsSnapshot,
  getConnectionById,
  upsertConnectionsLocal,
  updateConnection,
  removeConnection,
  emitConnectionsBatch,
  emitTrafficFlows,
  emitTrafficFlowsAllTenants,
  emitStatisticsUpdate,
  emitStatisticsUpdateAllTenants,
  emitError,
} from "./connections/manager.js";

export { getKnownTenantIds } from "./connections/store.js";
