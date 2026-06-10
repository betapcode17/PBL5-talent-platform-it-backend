import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('disconnects Prisma when the Nest application closes', async () => {
    const service = new PrismaService({
      get: jest.fn().mockReturnValue('postgresql://test:test@localhost/test'),
    } as never);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
