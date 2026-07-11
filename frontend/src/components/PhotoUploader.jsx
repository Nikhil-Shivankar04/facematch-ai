import { useRef, useState } from "react";
import apiClient from "../api/client";

export default function PhotoUploader({ eventId, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));

    try {
      const { data } = await apiClient.post(`/events/${eventId}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      onUploaded(data.photos);
      if (data.failedCount > 0) {
        setError(`${data.failedCount} photo(s) failed to upload. The rest succeeded.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1px dashed ${isDragging ? "var(--brass-bright)" : "var(--border-soft)"}`,
          borderRadius: "var(--radius)",
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: isDragging ? "rgba(185,139,62,0.06)" : "transparent",
          transition: "border-color 0.2s ease, background 0.2s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          style={{ display: "none" }}
          onChange={(e) => uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div>
            <p className="mono" style={{ fontSize: "0.85rem", color: "var(--teal)", marginBottom: "10px" }}>
              Uploading... {progress}%
            </p>
            <div
              style={{
                height: "4px",
                background: "var(--surface)",
                borderRadius: "2px",
                overflow: "hidden",
                maxWidth: "240px",
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "var(--teal)",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="serif" style={{ fontSize: "1.15rem", marginBottom: "6px" }}>
              Drop photos here, or click to browse
            </p>
            <p className="mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              JPEG, PNG, WEBP, or HEIC — upload as many as you need
            </p>
          </>
        )}
      </div>
      {error && <p className="error-text" style={{ marginTop: "12px" }}>{error}</p>}
    </div>
  );
}
