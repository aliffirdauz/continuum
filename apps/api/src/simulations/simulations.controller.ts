import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Roles } from "../common/decorators/roles.decorator";
import { ResourceIdPipe } from "../common/resource-id";
import { CreateSimulationDto, SimulationQueryDto } from "./simulations.dto";
import { SimulationsService } from "./simulations.service";

@ApiTags("simulations")
@ApiBearerAuth()
@Roles("MANAGER", "KNOWLEDGE_ADMIN")
@Controller("simulations")
export class SimulationsController {
  constructor(private readonly simulations: SimulationsService) {}

  @Post("unavailability")
  create(
    @Body() input: CreateSimulationDto,
    @Query() query: SimulationQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.simulations.create(input, request.user.sub, query);
  }

  @Get(":id")
  get(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: SimulationQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.simulations.get(id, request.user.sub, request.user.role, query);
  }
}
