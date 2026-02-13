import { ConnectionModel } from "@byteroute/shared";
import { DEFAULT_TENANT_ID } from "../../utils/tenant.js";
import { resetConnectionStore, setConnection } from "./store.js";

export async function loadConnectionsFromDb(limit = 500): Promise<number> {
  const docs = await ConnectionModel.find(
    {},
    {
      _id: 0,
      tenantId: 1,
      id: 1,
      sourceIp: 1,
      destIp: 1,
      sourcePort: 1,
      destPort: 1,
      protocol: 1,
      status: 1,
      enriched: 1,
      country: 1,
      countryCode: 1,
      city: 1,
      latitude: 1,
      longitude: 1,
      asn: 1,
      asOrganization: 1,
      category: 1,
      bandwidth: 1,
      bytesIn: 1,
      bytesOut: 1,
      packetsIn: 1,
      packetsOut: 1,
      startTime: 1,
      lastActivity: 1,
      duration: 1,
    }
  )
    .sort({ lastActivity: -1 })
    .limit(limit)
    .lean();

  resetConnectionStore();

  for (const doc of docs) {
    setConnection(doc as never, DEFAULT_TENANT_ID);
  }

  return docs.length;
}
