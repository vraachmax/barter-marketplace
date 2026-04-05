/**
 * PNG-иконка из `/public/icons` (желательно с прозрачным фоном).
 * Обработка файлов: `npm run icons:strip-bg` в каталоге apps/web.
 */
export function AppIconImg({
  src,
  alt = '',
  size = 18,
  className = '',
}: {
  src: string;
  alt?: string;
  /** Сторона квадрата в px */
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`app-icon-img object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}
