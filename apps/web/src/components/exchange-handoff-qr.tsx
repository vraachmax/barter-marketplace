'use client';

import { useMemo } from 'react';
import { qrcodegen } from '@/lib/vendor/qrcodegen';

/** Offline QR generation: keys never go to an external QR image service. */
export function ExchangeHandoffQr({ code }: { code: string }) {
  const qr = useMemo(() => qrcodegen.QrCode.encodeText(code, qrcodegen.QrCode.Ecc.MEDIUM), [code]);
  const quiet = 4;
  const size = qr.size + quiet * 2;
  const cells: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) cells.push(`M${x + quiet},${y + quiet}h1v1h-1z`);
    }
  }
  return (
    <svg className="exchange-handoff-qr" viewBox={`0 0 ${size} ${size}`}
      role="img" aria-label="Одноразовый QR-код подтверждения обмена"
      shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="#fff" />
      <path d={cells.join('')} fill="#101115" />
    </svg>
  );
}
