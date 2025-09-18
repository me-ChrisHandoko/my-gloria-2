import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  private isObj(obj: any): boolean {
    return typeof obj === 'object' && obj !== null;
  }

  private trim(values: any): any {
    if (typeof values === 'string') {
      return values.trim();
    }

    if (Array.isArray(values)) {
      return values.map((value) => this.trim(value));
    }

    if (this.isObj(values)) {
      const trimmed: any = {};
      Object.keys(values).forEach((key) => {
        trimmed[key] = this.trim(values[key]);
      });
      return trimmed;
    }

    return values;
  }

  transform(values: any, metadata: ArgumentMetadata): any {
    const { type } = metadata;

    // Only trim body and query parameters
    if (type === 'body' || type === 'query') {
      return this.trim(values);
    }

    return values;
  }
}
