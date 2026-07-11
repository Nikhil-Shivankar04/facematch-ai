const statusLabel = {
  pending: "pending",
  processing: "processing",
  done: "matched ready",
  failed: "failed",
};

const statusColor = {
  pending: "var(--muted)",
  processing: "var(--brass-bright)",
  done: "var(--teal)",
  failed: "var(--danger)",
};

export default function PhotoGrid({ photos, onDelete }) {
  if (photos.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "50px 24px" }}>
        <p className="serif" style={{ fontSize: "1.3rem", marginBottom: "8px" }}>
          No photos yet.
        </p>
        <p className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          Upload photos above to get started.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "10px",
      }}
    >
      {photos.map((photo) => {
        const isInProgress =
          photo.processingStatus === "pending" || photo.processingStatus === "processing";

        return (
          <div
            key={photo._id}
            style={{
              position: "relative",
              aspectRatio: "1",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              border: `1px solid ${isInProgress ? "var(--brass)" : "var(--border-soft)"}`,
              background: "var(--surface)",
            }}
          >
            <img
              src={photo.thumbnailUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: isInProgress ? 0.55 : 1,
                animation: isInProgress ? "photoPulse 1.8s ease-in-out infinite" : "none",
              }}
            />
            <div
              className="mono"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "6px 8px",
                fontSize: "0.62rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: statusColor[photo.processingStatus] || "var(--warm-white)",
                background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
              }}
            >
              {statusLabel[photo.processingStatus] || photo.processingStatus}
            </div>
            <button
              onClick={() => onDelete(photo._id)}
              aria-label="Delete photo"
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(21,19,15,0.7)",
                color: "var(--warm-white)",
                fontSize: "0.9rem",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes photoPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
