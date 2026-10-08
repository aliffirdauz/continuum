import { Module } from "@nestjs/common";
import {
  TransferCandidatesController,
  TransfersController,
} from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  controllers: [TransfersController, TransferCandidatesController],
  providers: [TransfersService],
})
export class TransfersModule {}
