import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RunAiScreeningDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  applicationId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsIn(['fast', 'deep'])
  mode?: 'fast' | 'deep';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  judgeTopN?: number;
}
