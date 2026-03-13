/**
 * @module backend/domain/identity/types
 */

import { z } from "zod";

const normalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const signUpRequestSchema = z.object({
  email: normalizedEmailSchema,
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

export const signInRequestSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1),
});

export type SignUpRequest = z.infer<typeof signUpRequestSchema>;
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  tenantIds: string[];
}

export interface Tenant {
  tenantId: string;
  ownerId: string;
  name?: string;
}

export type Principal = {
  id: string;
  email: string;
  name?: string;
  tenantIds: string[];
  scopes: string[];
};
