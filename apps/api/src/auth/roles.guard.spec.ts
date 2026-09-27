import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Role } from "@prisma/client";

import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  function createContext(role: Role) {
    return {
      getClass: vi.fn(),
      getHandler: vi.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext;
  }

  it("allows a route that has no role restriction", () => {
    const guard = new RolesGuard({
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as never);

    expect(guard.canActivate(createContext(Role.EMPLOYEE))).toBe(true);
  });

  it("rejects an identity without a required role", () => {
    const guard = new RolesGuard({
      getAllAndOverride: vi.fn().mockReturnValue([Role.KNOWLEDGE_ADMIN]),
    } as never);

    expect(() => guard.canActivate(createContext(Role.MANAGER))).toThrow(
      ForbiddenException,
    );
  });
});
