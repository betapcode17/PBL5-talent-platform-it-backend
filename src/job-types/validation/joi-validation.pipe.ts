import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  transform(value: unknown) {
    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new BadRequestException(
        error.details.map((detail) => detail.message).join(', '),
      );
    }

    return validatedValue;
  }
}
