import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResourceIdPipe } from "../common/resource-id";
import { EvidenceQueryDto } from "./dto/evidence-query.dto";
import { EvidenceService } from "./evidence.service";

@ApiTags("evidence")
@ApiBearerAuth()
@Controller("evidence")
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @ApiOperation({ summary: "List evidence records, newest first" })
  list(@Query() query: EvidenceQueryDto) {
    return this.evidenceService.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one evidence record" })
  findOne(@Param("id", ResourceIdPipe) id: string) {
    return this.evidenceService.findOne(id);
  }
}
