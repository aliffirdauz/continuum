import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  PickType,
} from "@nestjs/swagger";
import { ResourceIdPipe } from "../common/resource-id";
import { Roles } from "../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../common/pagination";
import { ExpertisePageQueryDto } from "../expertise/expertise-query.dto";
import { RiskService } from "./risk.service";

export class RiskAsOfQueryDto extends PickType(ExpertisePageQueryDto, [
  "asOf",
] as const) {}

@ApiTags("risk")
@ApiBearerAuth()
@Controller("knowledge")
export class KnowledgeRiskController {
  constructor(private readonly risk: RiskService) {}

  @Get(":id/risk")
  @ApiOperation({
    summary:
      "Calculate current knowledge-area risk without persisting a snapshot",
  })
  forKnowledge(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: RiskAsOfQueryDto,
  ) {
    return this.risk.forKnowledge(id, query);
  }

  @Get(":id/risk/snapshots")
  @ApiOperation({ summary: "List actual captured risk snapshots" })
  history(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.risk.history(id, query);
  }

  @Post(":id/risk/snapshots")
  @Roles("KNOWLEDGE_ADMIN")
  @ApiOperation({
    summary:
      "Capture present knowledge risk once per UTC date; knowledge admins only",
  })
  capture(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: Record<string, unknown>,
    @Body() body?: Record<string, unknown>,
  ) {
    if (Object.keys(query).length || (body && Object.keys(body).length)) {
      throw new BadRequestException(
        "Snapshot capture does not accept query or body parameters",
      );
    }
    return this.risk.capture(id);
  }
}

@ApiTags("risk")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardRiskController {
  constructor(private readonly risk: RiskService) {}

  @Get("risk-overview")
  overview(@Query() query: RiskAsOfQueryDto) {
    return this.risk.overview(query);
  }

  @Get("risk-distribution")
  distribution(@Query() query: RiskAsOfQueryDto) {
    return this.risk.distribution(query);
  }

  @Get("departments-risk")
  departments(@Query() query: ExpertisePageQueryDto) {
    return this.risk.departments(query);
  }

  @Get("high-risk-knowledge")
  highRisk(@Query() query: ExpertisePageQueryDto) {
    return this.risk.highRisk(query);
  }
}
