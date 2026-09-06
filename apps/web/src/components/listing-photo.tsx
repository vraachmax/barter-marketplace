'use client';

import Image from 'next/image';
import { useState, type CSSProperties, type ReactNode } from 'react';
import ListingPlaceholder from '@/components/listing-placeholder';

/** A failed URL is remembered without replacing real photos or retrying forever. */
export function ListingPhoto({ src, alt, className, style, categoryTitle, categorySlug, fallback }: {
  src: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  categoryTitle?: string;
  categorySlug?: string;
  fallback?: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) {
    return src ? <ListingPlaceholder categoryTitle={categoryTitle} categorySlug={categorySlug} unavailable />
      : fallback ?? <ListingPlaceholder categoryTitle={categoryTitle} categorySlug={categorySlug} />;
  }
  return <Image key={src} src={src} alt={alt} fill unoptimized sizes="(max-width: 768px) 50vw, 25vw"
    className={className ?? 'object-cover'} style={style} onError={() => setFailedSrc(src)} />;
}
