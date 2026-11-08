import { AuthService } from './auth.service';
import { ConflictException } from '@nestjs/common';

describe('Yandex email account linking', () => {
  const jwt = { sign: jest.fn(({sub,ver}) => sub+':'+ver) };
  const tx = {user:{findUnique:jest.fn(),create:jest.fn()},oAuthAccount:{create:jest.fn()}};
  const prisma = {
    oAuthAccount:{findUnique:jest.fn()},
    $transaction:jest.fn((callback:(tx:any)=>Promise<any>)=>callback(tx)),
  };
  const service = new AuthService(prisma as any,jwt as any);
  beforeEach(()=>{jest.clearAllMocks(); prisma.oAuthAccount.findUnique.mockResolvedValue(null)});
  it('never links an unverified external identity to an existing local user by email',async()=>{
    tx.user.findUnique.mockResolvedValue({id:'existing'});
    await expect(service.loginWithYandex({id:'attacker',default_email:'user@example.test'})).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.oAuthAccount.create).not.toHaveBeenCalled();
  });
  it('keeps login for the already linked Yandex identity',async()=>{
    prisma.oAuthAccount.findUnique.mockResolvedValue({userId:'existing',user:{tokenVersion:4}});
    await expect(service.loginWithYandex({id:'linked',default_email:'user@example.test'})).resolves.toEqual({token:'existing:4'});
  });
  it('creates a separate new user only when no email collision exists',async()=>{
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({id:'new',tokenVersion:0});
    tx.oAuthAccount.create.mockResolvedValue({});
    await expect(service.loginWithYandex({id:'new-yandex',default_email:'new@example.test'})).resolves.toEqual({token:'new:0'});
    expect(tx.oAuthAccount.create).toHaveBeenCalledWith({data:{provider:'yandex',providerAccountId:'new-yandex',userId:'new'}});
  });
});
