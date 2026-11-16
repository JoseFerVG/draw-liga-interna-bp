import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
}

export function QrCodeCanvas({ value, size = 210 }: QrCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    }).catch(() => {
      // ignore render failures on oversized strings
    });
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-label="Código QR para abrir el torneo en otro dispositivo"
      style={{
        display: 'block',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: '#ffffff',
      }}
    />
  );
}
