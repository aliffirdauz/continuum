import { UnauthorizedException } from "@nestjs/common";
import { Role, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";

import type { PrismaService } from "../database/prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const user = {
    id: "usr_northstar_manager",
    email: "manager@northstar.demo",
    name: "Budi Santoso",
    passwordHash: "",
    role: Role.MANAGER,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("returns a signed token and safe user details for valid credentials", async () => {
    const storedUser = {
      ...user,
      passwordHash: await hash("ContinuumDemo123!", 4),
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(storedUser),
        update: vi.fn().mockResolvedValue(storedUser),
      },
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue("signed-token") };
    const configService = { get: vi.fn().mockReturnValue(3600) };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as never,
      configService as never,
    );

    const result = await service.login({
      email: " Manager@Northstar.Demo ",
      password: "ContinuumDemo123!",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "manager@northstar.demo" },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { email: user.email, role: Role.MANAGER },
      { subject: user.id, expiresIn: 3600 },
    );
    expect(result).toEqual({
      accessToken: "signed-token",
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: Role.MANAGER,
      },
    });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("returns a generic error for an incorrect password", async () => {
    const storedUser = {
      ...user,
      passwordHash: await hash("ContinuumDemo123!", 4),
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(storedUser),
        update: vi.fn(),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: vi.fn() } as never,
      { get: vi.fn().mockReturnValue(3600) } as never,
    );

    await expect(
      service.login({ email: user.email, password: "incorrect-password" }),
    ).rejects.toThrow(new UnauthorizedException("Invalid email or password"));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects disabled accounts", async () => {
    const storedUser = {
      ...user,
      passwordHash: await hash("ContinuumDemo123!", 4),
      status: UserStatus.DISABLED,
    };
    const service = new AuthService(
      {
        user: {
          findUnique: vi.fn().mockResolvedValue(storedUser),
          update: vi.fn(),
        },
      } as unknown as PrismaService,
      { signAsync: vi.fn() } as never,
      { get: vi.fn().mockReturnValue(3600) } as never,
    );

    await expect(
      service.login({ email: user.email, password: "ContinuumDemo123!" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
