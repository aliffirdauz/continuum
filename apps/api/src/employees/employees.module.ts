import { Module } from "@nestjs/common";

import { EvidenceModule } from "../evidence/evidence.module";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

@Module({
  imports: [EvidenceModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
