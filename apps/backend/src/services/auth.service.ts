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
 * @module backend/services/auth.service
 */

import { normalizeTenantIds } from "../utils/tenant.js";
import type { IUserRepository } from "../domain/identity/user-repository.interface.js";
import type { ITenantRepository } from "../domain/identity/tenant-repository.interface.js";
import type { IPasswordService } from "../domain/identity/password-service.interface.js";
import type {
  Principal,
  SignInRequest,
  SignUpRequest,
} from "../domain/identity/types.js";
import type { AuthTokenClaims } from "../infrastructure/auth/jwt.js";

type JwtService = {
  signToken(claims: AuthTokenClaims, ttl?: string): string;
};

/**
 * Represents an auth service.
 */

export class AuthService {
  /**
   * Creates an auth service.
   * @param userRepository - The user repository input.
   * @param tenantRepository - The tenant repository input.
   * @param passwordService - The password service input.
   * @param jwt - The JWT input.
   */

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly passwordService: IPasswordService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Signs up.
   * @param input - The input input.
   * @returns The up result.
   */

  async signUp(input: SignUpRequest): Promise<{
    token: string;
    user: { id: string; email: string; name: string; tenantIds: string[] };
  } | null> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      return null;
    }

    const created = await this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: await this.passwordService.hash(input.password),
      tenantIds: [],
    });

    const token = this.jwt.signToken({
      sub: created.id,
      email: created.email,
      name: created.name,
      tenantIds: [],
    });

    return {
      token,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        tenantIds: [],
      },
    };
  }

  /**
   * Signs in.
   * @param input - The input input.
   * @returns The in result.
   */

  async signIn(input: SignInRequest): Promise<{
    token: string;
    user: { id: string; email: string; name: string; tenantIds: string[] };
  } | null> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user || typeof user.passwordHash !== "string") {
      return null;
    }

    const valid = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    );
    if (!valid) {
      return null;
    }

    const tenantIds = normalizeTenantIds(user.tenantIds);

    const token = this.jwt.signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantIds,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantIds,
      },
    };
  }

  /**
   * Creates client token.
   * @param principal - The principal input.
   * @param requestedTenantId - The requested tenant ID input.
   * @returns The client token result.
   */

  async createClientToken(
    principal: Principal,
    requestedTenantId?: string,
  ): Promise<{ token: string; expiresIn: string } | null> {
    const tenantIds = normalizeTenantIds(principal.tenantIds);
    if (tenantIds.length === 0) {
      return null;
    }

    const selectedTenantId =
      typeof requestedTenantId === "string" ? requestedTenantId.trim() : "";
    if (selectedTenantId && !tenantIds.includes(selectedTenantId)) {
      return null;
    }

    const orderedTenantIds = selectedTenantId
      ? [
          selectedTenantId,
          ...tenantIds.filter((tenantId) => tenantId !== selectedTenantId),
        ]
      : tenantIds;

    const ttl = process.env.AUTH_CLIENT_TOKEN_TTL ?? "12h";
    const token = this.jwt.signToken(
      {
        sub: principal.id,
        email: principal.email,
        name: principal.name,
        tenantId: orderedTenantIds[0],
        tenantIds: orderedTenantIds,
      },
      ttl,
    );

    return { token, expiresIn: ttl };
  }

  /**
   * Refreshes principal.
   * @param principal - The principal input.
   * @returns The principal result.
   */

  async refreshPrincipal(principal: Principal): Promise<Principal | null> {
    const user = await this.userRepository.findById(principal.id);
    if (!user) {
      return null;
    }

    const tenantIds = await this.tenantRepository.findOwnedTenantIds(
      principal.id,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantIds: normalizeTenantIds(tenantIds),
      scopes: principal.scopes,
    };
  }
}
