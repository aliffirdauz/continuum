import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResourceIdPipe } from "../common/resource-id";
import { BusinessObjectsService } from "./business-objects.service";
import { BusinessObjectQueryDto } from "./dto/business-object-query.dto";

@ApiTags("business objects")
@ApiBearerAuth()
@Controller("business-objects")
export class BusinessObjectsController {
  constructor(
    private readonly businessObjectsService: BusinessObjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Search and filter business objects" })
  list(@Query() query: BusinessObjectQueryDto) {
    return this.businessObjectsService.list(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a business object and the knowledge areas it depends on",
  })
  findOne(@Param("id", ResourceIdPipe) id: string) {
    return this.businessObjectsService.findOne(id);
  }
}
