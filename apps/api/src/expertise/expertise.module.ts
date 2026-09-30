import { Module } from "@nestjs/common";
import {
  EmployeeExpertiseController,
  ExpertSearchController,
  KnowledgeExpertsController,
} from "./expertise.controller";
import { ExpertiseService } from "./expertise.service";

@Module({
  controllers: [
    ExpertSearchController,
    KnowledgeExpertsController,
    EmployeeExpertiseController,
  ],
  providers: [ExpertiseService],
  exports: [ExpertiseService],
})
export class ExpertiseModule {}
