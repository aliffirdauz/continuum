import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResourceIdPipe } from "../common/resource-id";
import { DepartmentsService } from "./departments.service";

@ApiTags("departments")
@ApiBearerAuth()
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: "List departments with record counts" })
  list() {
    return this.departmentsService.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one department with record counts" })
  findOne(@Param("id", ResourceIdPipe) id: string) {
    return this.departmentsService.findOne(id);
  }
}
