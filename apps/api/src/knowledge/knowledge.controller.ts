import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResourceIdPipe } from "../common/resource-id";
import { EvidenceService } from "../evidence/evidence.service";
import {
  KnowledgeEvidenceQueryDto,
  KnowledgeQueryDto,
} from "./dto/knowledge-query.dto";
import { KnowledgeService } from "./knowledge.service";

@ApiTags("knowledge")
@ApiBearerAuth()
@Controller("knowledge")
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly evidenceService: EvidenceService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Search, filter, and sort knowledge areas" })
  list(@Query() query: KnowledgeQueryDto) {
    return this.knowledgeService.list(query);
  }

  // Declared before `:id` so the literal path is not captured as an ID.
  @Get("categories")
  @ApiOperation({ summary: "List knowledge area categories" })
  categories() {
    return this.knowledgeService.categories();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a knowledge area with its business objects and evidence",
  })
  findOne(@Param("id", ResourceIdPipe) id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Get(":id/evidence")
  @ApiOperation({ summary: "List evidence for a knowledge area" })
  async evidence(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: KnowledgeEvidenceQueryDto,
  ) {
    await this.knowledgeService.assertExists(id);
    return this.evidenceService.list({ ...query, knowledgeAreaId: id });
  }
}
