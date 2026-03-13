/**
 * @module backend/config/composition-root
 */

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
import { metricsStore } from "../services/metrics.js";
import {
  getCompiledDomainDsl,
  type CompiledDomainDsl,
} from "../infrastructure/dsl/domain-dsl.js";
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
  domainDsl: CompiledDomainDsl;
  jwt: {
    signToken: (claims: AuthTokenClaims, ttl?: string) => string;
    verifyToken: typeof verifyToken;
    extractBearerTokenFromAuthorization: typeof extractBearerTokenFromAuthorization;
  };
}

export function createAppContext(io?: TypedSocketServer): AppContext {
  return {
    io,
    userRepository: new MongoUserRepository(),
    tenantRepository: new MongoTenantRepository(),
    connectionRepository: new MongoConnectionRepository(),
    passwordService: new ScryptPasswordService(),
    geoIpLookup: new MaxmindGeoIpLookup(),
    metricsStore,
    domainDsl: getCompiledDomainDsl(),
    jwt: {
      signToken,
      verifyToken,
      extractBearerTokenFromAuthorization,
    },
  };
}
