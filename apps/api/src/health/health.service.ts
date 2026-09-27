import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import { RedisService } from "../redis/redis.service";

type CheckStatus = "up" | "down";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async readiness() {
    const [databaseResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRawUnsafe("SELECT 1"),
      this.redis.ping(),
    ]);

    const checks: Record<"database" | "redis", CheckStatus> = {
      database: databaseResult.status === "fulfilled" ? "up" : "down",
      redis: redisResult.status === "fulfilled" ? "up" : "down",
    };
    const response = {
      status:
        checks.database === "up" && checks.redis === "up" ? "ok" : "error",
      checks,
      timestamp: new Date().toISOString(),
    };

    if (response.status === "error") {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
