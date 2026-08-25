import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Renders a QR code for a given ticket code (e.g. "EVQ-42").
 * Scanning it with any phone camera app reveals the plain code text, which
 * staff can paste into the admin check-in screen — no camera library needed
 * on our end, and it also works with any USB barcode scanner (which types
 * the code + Enter automatically, like a keyboard).
 */
export default function QRTicket({ value, size = 120 }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(false);
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: '#453853', light: '#ffffff' } })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [value, size]);

  if (error) return null;

  return (
    <div className="qr-ticket" style={{ width: size, height: size }}>
      {dataUrl ? <img src={dataUrl} alt={`Ticket QR code ${value}`} width={size} height={size} /> : <div className="qr-ticket-loading" />}
    </div>
  );
}
