import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user: AccessTokenPayload;
}
