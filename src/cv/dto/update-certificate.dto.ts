import { PartialType } from '@nestjs/swagger';
import { CreateCertificateDto } from './create-certificate.dto.js';

export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {}
