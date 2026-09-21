import { brandIconResponse } from '@/lib/brand-icon-response';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  return brandIconResponse(512, 512, 0.84, false);
}
