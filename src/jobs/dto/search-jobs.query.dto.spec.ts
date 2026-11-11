import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchJobsQueryDto } from './search-jobs.query.dto.js';

describe('SearchJobsQueryDto', () => {
  it('passes validation when q is omitted or within 100 characters', async () => {
    const dtoOmitted = plainToInstance(SearchJobsQueryDto, {});
    const errorsOmitted = await validate(dtoOmitted);
    expect(errorsOmitted.length).toBe(0);

    const dtoValid = plainToInstance(SearchJobsQueryDto, {
      q: 'a'.repeat(100),
    });
    const errorsValid = await validate(dtoValid);
    expect(errorsValid.length).toBe(0);
  });

  it('fails validation when q exceeds 100 characters (101 characters)', async () => {
    const dtoInvalid = plainToInstance(SearchJobsQueryDto, {
      q: 'a'.repeat(101),
    });
    const errors = await validate(dtoInvalid);
    expect(errors.length).toBeGreaterThan(0);
    const qError = errors.find((e) => e.property === 'q');
    expect(qError).toBeDefined();
    expect(qError?.constraints?.maxLength).toBe(
      'Từ khóa tìm kiếm không được vượt quá 100 ký tự',
    );
  });
});
