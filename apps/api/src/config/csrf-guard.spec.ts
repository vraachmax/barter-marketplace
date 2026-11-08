import {isAllowedCookieMutation} from './csrf-guard';
const allowedOrigins = new Set(['https://web.example.test']);
const base = { method:'POST', allowedOrigins, ownOrigin:'https://api.example.test', cookies:{token:'valid'} };
describe('cookie CSRF guard',()=>{
  it('allows a trusted web origin',()=>expect(isAllowedCookieMutation({...base,headers:{origin:'https://web.example.test','sec-fetch-site':'same-site'}})).toBe(true));
  it('allows the API own origin',()=>expect(isAllowedCookieMutation({...base,headers:{origin:'https://api.example.test','sec-fetch-site':'same-origin'}})).toBe(true));
  it('rejects forged external origin',()=>expect(isAllowedCookieMutation({...base,headers:{origin:'https://attacker.example'}})).toBe(false));
  it('rejects missing and null origins',()=>{expect(isAllowedCookieMutation({...base,headers:{}})).toBe(false);expect(isAllowedCookieMutation({...base,headers:{origin:'null'}})).toBe(false)});
  it('allows a trusted cross-site front end (Vercel to Render)',()=>expect(isAllowedCookieMutation({...base,headers:{origin:'https://web.example.test','sec-fetch-site':'cross-site'}})).toBe(true));
  it('does not protect bearer-only API clients with cookie rules',()=>expect(isAllowedCookieMutation({...base,cookies:{},headers:{authorization:'Bearer xxx'}})).toBe(true));
  it('does not reject safe read requests',()=>expect(isAllowedCookieMutation({...base,method:'GET',headers:{}})).toBe(true));
});
