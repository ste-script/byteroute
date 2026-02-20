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

export type SignUpRequestBody = z.infer<typeof signUpRequestSchema>;
export type SignInRequestBody = z.infer<typeof signInRequestSchema>;
