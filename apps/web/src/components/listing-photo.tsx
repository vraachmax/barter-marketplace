'use client';

import Image from 'next/image';
import { useState, type CSSProperties, type ReactNode } from 'react';
import ListingPlaceholder from '@/components/listing-placeholder';

/** A failed URL is remembered without replacing real photos or retrying forever. */
export function ListingPhoto({ src, alt, className, style, categoryTitle, categorySlug, fallback, eager = false }: {
  src: string | null;
  eager?: boolean;
  alt: string;
  className?: string;
  style?: CSSProperties;
  categoryTitle?: string;
  categorySlug?: string;
  fallback?: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return fallback ?? <ListingPlaceholder categoryTitle={categoryTitle} categorySlug={categorySlug} unavailable={Boolean(src)} />;
  }
  return <Image key={src} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} fill unoptimized sizes="(max-width: 768px) 50vw, 25vw"
    className={className ?? 'object-cover'} style={style} onError={() => setFailedSrc(src)} />;
}
