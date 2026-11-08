import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('JWT session version revocation',()=>{
  const prisma={user:{findUnique:jest.fn()}};
  const strategy=new JwtStrategy(prisma as any);
  beforeEach(()=>prisma.user.findUnique.mockReset());
  it('allows pre-migration versionless tokens while user version is zero',async()=>{
    prisma.user.findUnique.mockResolvedValue({id:'u1',tokenVersion:0});
    await expect(strategy.validate({sub:'u1'})).resolves.toEqual({id:'u1'});
  });
  it('rejects an old token after password rotation',async()=>{
    prisma.user.findUnique.mockResolvedValue({id:'u1',tokenVersion:1});
    await expect(strategy.validate({sub:'u1',ver:0})).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('allows the rotated token',async()=>{
    prisma.user.findUnique.mockResolvedValue({id:'u1',tokenVersion:2});
    await expect(strategy.validate({sub:'u1',ver:2})).resolves.toEqual({id:'u1'});
  });
  it('rejects deleted users',async()=>{
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate({sub:'missing',ver:0})).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
