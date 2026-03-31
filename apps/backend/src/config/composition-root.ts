/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

/**
 * Creates app context.
 * @param io - The IO input.
 * @returns The app context result.
 */

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
