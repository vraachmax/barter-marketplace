import { checkAuthRateLimit } from './auth-abuse.guard';

describe('auth rate limits',()=>{
 it('throttles repeated guesses for the same identity and source',()=>{
   const ip='test-unique-IP-1';
   for(let i=0;i<12;i++) expect(checkAuthRateLimit({address:ip,identity:'victim@example.test',now:10000})).toBe(true);
   expect(checkAuthRateLimit({address:ip,identity:'victim@example.test',now:10000})).toBe(false);
 });
 it('normalizes identifier casing, and resets after window',()=>{
   const ip='test-unique-IP-2';
   for(let i=0;i<12;i++) expect(checkAuthRateLimit({address:ip,identity:i%2?'TEST@example.test':'test@example.test',now:10000})).toBe(true);
   expect(checkAuthRateLimit({address:ip,identity:'test@example.test',now:10000})).toBe(false);
   expect(checkAuthRateLimit({address:ip,identity:'test@example.test',now:10000+15*60000})).toBe(true);
 });
 it('limits distributed username spraying from one source',()=>{
   const ip='test-unique-IP-3';
   for(let i=0;i<150;i++) expect(checkAuthRateLimit({address:ip,identity:'user'+i,now:20000})).toBe(true);
   expect(checkAuthRateLimit({address:ip,identity:'user151',now:20000})).toBe(false);
 });
});
