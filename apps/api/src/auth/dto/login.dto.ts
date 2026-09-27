import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "manager@northstar.demo" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "ContinuumDemo123!", minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}
