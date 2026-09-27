import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";

import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  function createContext(authorization?: string) {
    const request = { headers: { authorization } };
    const context = {
      getClass: vi.fn(),
      getHandler: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it("allows explicitly public routes without a token", async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) };
    const jwtService = { verifyAsync: vi.fn() };
    const guard = new JwtAuthGuard(reflector as never, jwtService as never);

    await expect(guard.canActivate(createContext().context)).resolves.toBe(
      true,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it("denies protected routes when a bearer token is missing", async () => {
    const guard = new JwtAuthGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(false) } as never,
      { verifyAsync: vi.fn() } as never,
    );

    await expect(
      guard.canActivate(createContext().context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches verified claims to a protected request", async () => {
    const claims = {
      sub: "usr_northstar_manager",
      email: "manager@northstar.demo",
      role: "MANAGER",
    };
    const guard = new JwtAuthGuard(
      { getAllAndOverride: vi.fn().mockReturnValue(false) } as never,
      { verifyAsync: vi.fn().mockResolvedValue(claims) } as never,
    );
    const { context, request } = createContext("Bearer valid-token");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty("user", claims);
  });
});
