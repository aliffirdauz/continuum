import { Module } from "@nestjs/common";
import {
  TransferCandidatesController,
  TransferDashboardController,
  TransfersController,
} from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  controllers: [
    TransfersController,
    TransferCandidatesController,
    TransferDashboardController,
  ],
  providers: [TransfersService],
})
export class TransfersModule {}
