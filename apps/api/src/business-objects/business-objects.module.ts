import { Module } from "@nestjs/common";

import { BusinessObjectsController } from "./business-objects.controller";
import { BusinessObjectsService } from "./business-objects.service";

@Module({
  controllers: [BusinessObjectsController],
  providers: [BusinessObjectsService],
})
export class BusinessObjectsModule {}
