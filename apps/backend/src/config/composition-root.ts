import type { TypedSocketServer } from "../services/connections/types.js";
import type { IUserRepository } from "../domain/identity/user-repository.interface.js";
import type { ITenantRepository } from "../domain/identity/tenant-repository.interface.js";
import type { IPasswordService } from "../domain/identity/password-service.interface.js";
import type { IConnectionRepository } from "../domain/connection/connection-repository.interface.js";
import type { IGeoIpLookup } from "../domain/connection/geoip-service.interface.js";
import type { IMetricsStore } from "../domain/metrics/metrics-store.interface.js";
import { MongoUserRepository } from "../infrastructure/persistence/user.repository.js";
import { MongoTenantRepository } from "../infrastructure/persistence/tenant.repository.js";
import { MongoConnectionRepository } from "../infrastructure/persistence/connection.repository.js";
import { ScryptPasswordService } from "../infrastructure/auth/scrypt-password.service.js";
import { MaxmindGeoIpLookup } from "../infrastructure/geoip/maxmind-geoip.service.js";
import { InMemoryMetricsStore } from "../infrastructure/metrics/in-memory-metrics-store.js";
import {
  signToken,
  verifyToken,
  extractBearerTokenFromAuthorization,
  type AuthTokenClaims,
} from "../infrastructure/auth/jwt.js";

export interface AppContext {
  io?: TypedSocketServer;
  userRepository: IUserRepository;
  tenantRepository: ITenantRepository;
  connectionRepository: IConnectionRepository;
  passwordService: IPasswordService;
  geoIpLookup: IGeoIpLookup;
  metricsStore: IMetricsStore;
  jwt: {
    signToken: (claims: AuthTokenClaims, ttl?: string) => string;
    verifyToken: typeof verifyToken;
    extractBearerTokenFromAuthorization: typeof extractBearerTokenFromAuthorization;
  };
}

let sharedMetricsStore: InMemoryMetricsStore | undefined;

export function createAppContext(io?: TypedSocketServer): AppContext {
  if (!sharedMetricsStore) {
    sharedMetricsStore = new InMemoryMetricsStore();
  }

  return {
    io,
    userRepository: new MongoUserRepository(),
    tenantRepository: new MongoTenantRepository(),
    connectionRepository: new MongoConnectionRepository(),
    passwordService: new ScryptPasswordService(),
    geoIpLookup: new MaxmindGeoIpLookup(),
    metricsStore: sharedMetricsStore,
    jwt: {
      signToken,
      verifyToken,
      extractBearerTokenFromAuthorization,
    },
  };
}
