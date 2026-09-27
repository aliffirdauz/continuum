import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";

// Matches seeded IDs such as `ka_line4_troubleshooting` and generated CUIDs.
export const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

@Injectable()
export class ResourceIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!RESOURCE_ID_PATTERN.test(value)) {
      throw new BadRequestException("Invalid resource identifier");
    }

    return value;
  }
}
