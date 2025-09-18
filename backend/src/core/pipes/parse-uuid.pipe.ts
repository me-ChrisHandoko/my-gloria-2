import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUUID, version as getUUIDVersion } from 'uuid';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  constructor(private readonly acceptedVersions?: number[]) {}

  transform(value: string): string {
    // First check if it's a valid UUID
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid UUID format: ${value}`);
    }

    // If specific versions are required, validate the version
    if (this.acceptedVersions && this.acceptedVersions.length > 0) {
      try {
        const version = getUUIDVersion(value);
        if (!this.acceptedVersions.includes(version)) {
          throw new BadRequestException(
            `Invalid UUID version. Expected v${this.acceptedVersions.join(' or v')}, got v${version}: ${value}`,
          );
        }
      } catch (error) {
        // If we can't determine the version, just validate it's a valid UUID
        // This handles edge cases where version detection might fail
      }
    }

    return value;
  }
}
