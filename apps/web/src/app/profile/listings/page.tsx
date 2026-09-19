import { redirect } from 'next/navigation';

/** Keep saved profile links on the same listings screen as the mobile hub. */
export default async function ProfileListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const value = Array.isArray(tab) ? tab[0] : tab;
  const target = value === 'NEEDS_ACTION' ? 'NEEDS_ACTION'
    : value === 'COMPLETED' || value === 'ARCHIVED' || value === 'SOLD' ? 'COMPLETED' : 'ACTIVE';
  redirect(`/listings?tab=${target}`);
}
