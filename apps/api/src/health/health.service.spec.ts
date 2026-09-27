import { ServiceUnavailableException } from "@nestjs/common";

import type { PrismaService } from "../database/prisma.service";
import type { RedisService } from "../redis/redis.service";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("reports both dependencies when they are ready", async () => {
    const service = new HealthService(
      {
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
      } as unknown as PrismaService,
      { ping: vi.fn().mockResolvedValue("PONG") } as unknown as RedisService,
    );

    await expect(service.readiness()).resolves.toMatchObject({
      status: "ok",
      checks: { database: "up", redis: "up" },
    });
  });

  it("returns service unavailable when a dependency is down", async () => {
    const service = new HealthService(
      {
        $queryRawUnsafe: vi
          .fn()
          .mockRejectedValue(new Error("database unavailable")),
      } as unknown as PrismaService,
      { ping: vi.fn().mockResolvedValue("PONG") } as unknown as RedisService,
    );

    await expect(service.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
