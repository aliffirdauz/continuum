import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";

import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { BusinessObjectsModule } from "./business-objects/business-objects.module";
import { validateEnvironment } from "./config/environment";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { DepartmentsModule } from "./departments/departments.module";
import { EmployeesModule } from "./employees/employees.module";
import { EvidenceModule } from "./evidence/evidence.module";
import { ExpertiseModule } from "./expertise/expertise.module";
import { HealthModule } from "./health/health.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [".env", "../../.env"],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    DepartmentsModule,
    EmployeesModule,
    KnowledgeModule,
    BusinessObjectsModule,
    EvidenceModule,
    ExpertiseModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
