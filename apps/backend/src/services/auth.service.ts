import { normalizeTenantIds } from "../utils/tenant.js";
import type { IUserRepository } from "../domain/identity/user-repository.interface.js";
import type { ITenantRepository } from "../domain/identity/tenant-repository.interface.js";
import type { IPasswordService } from "../domain/identity/password-service.interface.js";
import type { Principal, SignInRequest, SignUpRequest } from "../domain/identity/types.js";
import type { AuthTokenClaims } from "../infrastructure/auth/jwt.js";

type JwtService = {
  signToken(claims: AuthTokenClaims, ttl?: string): string;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly passwordService: IPasswordService,
    private readonly jwt: JwtService
  ) {}

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

  async signIn(input: SignInRequest): Promise<{
    token: string;
    user: { id: string; email: string; name: string; tenantIds: string[] };
  } | null> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user || typeof user.passwordHash !== "string") {
      return null;
    }

    const valid = await this.passwordService.verify(input.password, user.passwordHash);
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

  async createClientToken(principal: Principal): Promise<{ token: string; expiresIn: string } | null> {
    const tenantIds = normalizeTenantIds(principal.tenantIds);
    if (tenantIds.length === 0) {
      return null;
    }

    const ttl = process.env.AUTH_CLIENT_TOKEN_TTL ?? "12h";
    const token = this.jwt.signToken(
      {
        sub: principal.id,
        email: principal.email,
        name: principal.name,
        tenantIds,
      },
      ttl
    );

    return { token, expiresIn: ttl };
  }

  async refreshPrincipal(principal: Principal): Promise<Principal | null> {
    const user = await this.userRepository.findById(principal.id);
    if (!user) {
      return null;
    }

    const tenantIds = await this.tenantRepository.findOwnedTenantIds(principal.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantIds: normalizeTenantIds(tenantIds),
      scopes: principal.scopes,
    };
  }
}
