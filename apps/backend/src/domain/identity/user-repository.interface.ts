import type { User } from "./types.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    tenantIds?: string[];
  }): Promise<User>;
}
