import {assertImageSignature} from './image-signature';
function file(bytes:number[]):Buffer{return Buffer.from([...bytes,...Array(16).fill(0)]);}
describe('image signature validation',()=>{
  it('rejects HTML renamed to JPEG',()=>expect(()=>assertImageSignature('image/jpeg',Buffer.from('<script>alert(1)</script>'))).toThrow());
  it('rejects empty payload',()=>expect(()=>assertImageSignature('image/png',Buffer.alloc(0))).toThrow());
  it('accepts JPEG marker',()=>expect(()=>assertImageSignature('image/jpeg',file([0xff,0xd8,0xff,0xe0]))).not.toThrow());
  it('accepts PNG marker',()=>expect(()=>assertImageSignature('image/png',file([137,80,78,71,13,10,26,10]))).not.toThrow());
  it('accepts a webp RIFF signature',()=>expect(()=>assertImageSignature('image/webp',Buffer.from('RIFF1234WEBP0000'))).not.toThrow());
  it('rejects wrong claimed media MIME',()=>expect(()=>assertImageSignature('image/png',file([0xff,0xd8,0xff]))).toThrow());
});
