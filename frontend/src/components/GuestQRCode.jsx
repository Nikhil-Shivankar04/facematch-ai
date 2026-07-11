import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function GuestQRCode({ url }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: {
        // Matches the design system: brass foreground on the dark
        // ink background, so the QR code doesn't look like a
        // generic black-on-white sticker.
        dark: "#15130f",
        light: "#ede7d9",
      },
    }).then((generated) => {
      if (!cancelled) setDataUrl(generated);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          Generating...
        </span>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <img
        src={dataUrl}
        alt="QR code linking to the guest gallery"
        style={{ width: "180px", height: "180px", borderRadius: "var(--radius)" }}
      />
      <a
        href={dataUrl}
        download="nikk-photography-guest-link-qr.png"
        className="mono"
        style={{
          display: "block",
          marginTop: "10px",
          fontSize: "0.72rem",
          color: "var(--brass-bright)",
        }}
      >
        Download QR
      </a>
    </div>
  );
}
