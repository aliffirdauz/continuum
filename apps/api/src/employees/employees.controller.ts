import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResourceIdPipe } from "../common/resource-id";
import { EvidenceService } from "../evidence/evidence.service";
import {
  EmployeeEvidenceQueryDto,
  EmployeeQueryDto,
} from "./dto/employee-query.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("employees")
@ApiBearerAuth()
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly evidenceService: EvidenceService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Search and filter the people directory" })
  list(@Query() query: EmployeeQueryDto) {
    return this.employeesService.list(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a person and the knowledge areas they have evidence in",
  })
  findOne(@Param("id", ResourceIdPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Get(":id/evidence")
  @ApiOperation({ summary: "List evidence recorded for a person" })
  async evidence(
    @Param("id", ResourceIdPipe) id: string,
    @Query() query: EmployeeEvidenceQueryDto,
  ) {
    await this.employeesService.assertExists(id);
    return this.evidenceService.list({ ...query, employeeId: id });
  }
}
