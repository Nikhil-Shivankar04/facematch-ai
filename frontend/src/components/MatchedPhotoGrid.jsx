import { useState } from "react";
import publicApiClient from "../api/publicClient";

export default function MatchedPhotoGrid({ photos, shareSlug }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function handleDownloadAll() {
    setDownloading(true);
    setDownloadError("");
    try {
      const photoIds = photos.map((p) => p._id);
      const response = await publicApiClient.post(
        `/public/events/${shareSlug}/download-zip`,
        { photoIds },
        { responseType: "blob" }
      );

      // Trigger a browser download from the blob response - there's no
      // real "file" on disk to link to, so we build a temporary object
      // URL, click it programmatically, then clean it up.
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-photos.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Couldn't prepare the download. Try again, or download photos individually.");
    } finally {
      setDownloading(false);
    }
  }

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <p className="serif" style={{ fontSize: "1.3rem", marginBottom: "10px" }}>
          No photos found.
        </p>
        <p className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          We couldn't find you in this event's photos yet. Try a different selfie, or check back
          later if photos are still being added.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        <p className="mono" style={{ fontSize: "0.8rem", color: "var(--teal)", margin: 0 }}>
          ✓ Found you in {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </p>
        {photos.length > 1 && (
          <button className="btn ghost" onClick={handleDownloadAll} disabled={downloading}>
            {downloading ? "Preparing ZIP..." : "Download All"}
          </button>
        )}
      </div>
      {downloadError && <p className="error-text">{downloadError}</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={photo._id}
            style={{
              position: "relative",
              aspectRatio: "1",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              border: "1px solid var(--teal)",
              boxShadow: "0 0 12px rgba(63,140,130,0.25)",
              animation: `lockOnReveal 0.5s ease-out ${i * 0.06}s backwards`,
            }}
          >
            <img
              src={photo.thumbnailUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <a
              href={photo.imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{
                position: "absolute",
                bottom: "6px",
                right: "6px",
                background: "rgba(21,19,15,0.75)",
                color: "var(--warm-white)",
                fontSize: "0.65rem",
                padding: "4px 8px",
                borderRadius: "var(--radius)",
                textDecoration: "none",
              }}
            >
              ↓
            </a>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes lockOnReveal {
          from { opacity: 0; transform: scale(1.08); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
