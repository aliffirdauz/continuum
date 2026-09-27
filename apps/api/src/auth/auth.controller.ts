import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedRequest } from "./auth.types";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @ApiOperation({
    summary: "Exchange demo credentials for an API access token",
  })
  login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the current authenticated API identity" })
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
