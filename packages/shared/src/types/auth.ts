export type AuthUser = {
  id: string;
  email: string;
  name: string;
  tenantIds: string[];
};

export type AuthResponse = {
  csrfToken: string;
  user: AuthUser;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  email: string;
  name: string;
  password: string;
};
