import { brandIconResponse } from '@/lib/brand-icon-response';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  return brandIconResponse(160, 192, 0.94, true);
}
