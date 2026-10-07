import { Module } from "@nestjs/common";
import {
  DashboardRiskController,
  KnowledgeRiskController,
} from "./risk.controller";
import { RiskService } from "./risk.service";

@Module({
  controllers: [DashboardRiskController, KnowledgeRiskController],
  providers: [RiskService],
})
export class RiskModule {}
