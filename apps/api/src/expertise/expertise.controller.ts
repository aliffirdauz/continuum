import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ResourceIdPipe } from "../common/resource-id";
import {
  ExpertisePageQueryDto,
  ExpertSearchQueryDto,
} from "./expertise-query.dto";
import { ExpertiseService } from "./expertise.service";

@ApiTags("expertise")
@ApiBearerAuth()
@Controller("expert-search")
export class ExpertSearchController {
  constructor(private readonly expertise: ExpertiseService) {}
  @Get()
  @ApiOperation({
    summary: "Find knowledge areas and their leading contributors",
  })
  search(@Query() query: ExpertSearchQueryDto) {
    return this.expertise.search(query);
  }
}

@ApiTags("expertise")
@ApiBearerAuth()
@Controller("knowledge")
export class KnowledgeExpertsController {
  constructor(private readonly expertise: ExpertiseService) {}
  @Get(":id/experts")
  @ApiOperation({
    summary: "Show expertise distribution and evidence explanations",
  })
  list(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: ExpertisePageQueryDto,
  ) {
    return this.expertise.forKnowledge(id, query);
  }
}

@ApiTags("expertise")
@ApiBearerAuth()
@Controller("employees")
export class EmployeeExpertiseController {
  constructor(private readonly expertise: ExpertiseService) {}
  @Get(":id/expertise")
  @ApiOperation({
    summary: "Show a person's expertise in individual knowledge areas",
  })
  list(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: ExpertisePageQueryDto,
  ) {
    return this.expertise.forEmployee(id, query);
  }
}
