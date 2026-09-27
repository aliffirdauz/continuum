import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import { compare } from "bcryptjs";

import type { Environment } from "../config/environment";
import { PrismaService } from "../database/prisma.service";
import type { LoginDto } from "./dto/login.dto";

const INVALID_CREDENTIALS = "Invalid email or password";
const FALLBACK_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.yrb4T5Yf6hYwN4x8QwJgMml5IVT1p76";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Environment, true>,
  ) {}

  async login(credentials: LoginDto) {
    const email = credentials.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = await compare(
      credentials.password,
      user?.passwordHash ?? FALLBACK_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const expiresIn = this.configService.get("JWT_EXPIRES_IN_SECONDS", {
      infer: true,
    });
    const accessToken = await this.jwtService.signAsync(
      { email: user.email, role: user.role },
      { subject: user.id, expiresIn },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
