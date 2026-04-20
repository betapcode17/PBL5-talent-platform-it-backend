import { PartialType } from '@nestjs/swagger';
import { CreateFollowDto } from './create-follow.dto.js';

export class UpdateFollowDto extends PartialType(CreateFollowDto) {}
