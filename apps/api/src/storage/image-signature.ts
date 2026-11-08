import { BadRequestException } from '@nestjs/common';
/** Checks basic container signatures. It is not a malware scanner or a decoder. */
export function assertImageSignature(mime:string,buffer:Buffer):void {
  if (!Buffer.isBuffer(buffer) || buffer.length<12)
    throw new BadRequestException('invalid_image_signature');
  const header=buffer.subarray(0,16);
  const ascii=(a:number,b:number)=>buffer.toString('ascii',a,b);
  let valid=false;
  switch(mime) {
    case 'image/jpeg': valid=header[0]===0xff && header[1]===0xd8 && header[2]===0xff;break;
    case 'image/png': valid=header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));break;
    case 'image/gif': valid=['GIF87a','GIF89a'].includes(ascii(0,6));break;
    case 'image/webp': valid=ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP';break;
    case 'image/avif': valid=ascii(4,8)==='ftyp' && ['avif','avis'].includes(ascii(8,12));break;
    case 'image/heic':
    case 'image/heif': valid=ascii(4,8)==='ftyp' && ['heic','heix','hevc','hevx','mif1','msf1'].includes(ascii(8,12));break;
    default: valid=false;
  }
  if (!valid) throw new BadRequestException('invalid_image_signature');
}
