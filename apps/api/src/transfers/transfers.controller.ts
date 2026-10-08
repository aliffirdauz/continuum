import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { Roles } from "../common/decorators/roles.decorator";
import { ResourceIdPipe } from "../common/resource-id";
import {
  CompleteActivityDto,
  CreateActivityDto,
  CreateTransferDto,
  TransferListQueryDto,
  UpdateTransferDto,
} from "./transfers.dto";
import { TransfersService } from "./transfers.service";

@ApiTags("transfers")
@ApiBearerAuth()
@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  @ApiOperation({ summary: "List knowledge transfer plans with live coverage" })
  list(@Query() query: TransferListQueryDto) {
    return this.transfers.list(query);
  }

  @Post()
  @Roles("MANAGER", "KNOWLEDGE_ADMIN")
  @ApiOperation({
    summary: "Create a transfer plan and its baseline checkpoint",
  })
  create(
    @Body() input: CreateTransferDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.transfers.create(input, request.user.sub);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a plan with activities, checkpoints, and recommendations",
  })
  get(@Param("id", ResourceIdPipe) id: string) {
    return this.transfers.get(id);
  }

  @Patch(":id")
  @Roles("MANAGER", "KNOWLEDGE_ADMIN")
  @ApiOperation({ summary: "Change a plan's status or target date" })
  update(
    @Param("id", ResourceIdPipe) id: string,
    @Body() input: UpdateTransferDto,
  ) {
    return this.transfers.update(id, input);
  }

  @Post(":id/activities")
  @Roles("MANAGER", "KNOWLEDGE_ADMIN")
  @ApiOperation({ summary: "Add a planned transfer activity" })
  addActivity(
    @Param("id", ResourceIdPipe) id: string,
    @Body() input: CreateActivityDto,
  ) {
    return this.transfers.addActivity(id, input);
  }

  @Patch(":id/activities/:activityId")
  @HttpCode(200)
  @Roles("MANAGER", "KNOWLEDGE_ADMIN")
  @ApiOperation({
    summary: "Complete an activity, recording evidence for the backup",
  })
  completeActivity(
    @Param("id", ResourceIdPipe) id: string,
    @Param("activityId", ResourceIdPipe) activityId: string,
    @Body() input: CompleteActivityDto,
  ) {
    // The body is validated to make completion an explicit request.
    void input;
    return this.transfers.completeActivity(id, activityId);
  }
}

@ApiTags("transfers")
@ApiBearerAuth()
@Controller("knowledge")
export class TransferCandidatesController {
  constructor(private readonly transfers: TransfersService) {}

  @Get(":id/transfer-candidates")
  @Roles("MANAGER", "KNOWLEDGE_ADMIN")
  @ApiOperation({
    summary: "List current holders and possible backups for one area",
  })
  candidates(@Param("id", ResourceIdPipe) id: string) {
    return this.transfers.candidates(id);
  }
}
