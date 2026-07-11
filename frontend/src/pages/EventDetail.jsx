import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api/client";
import AdminNav from "../components/AdminNav";
import PhotoGrid from "../components/PhotoGrid";
import PhotoUploader from "../components/PhotoUploader";
import GuestQRCode from "../components/GuestQRCode";

export default function EventDetail() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQR, setShowQR] = useState(false);

  async function loadEventAndPhotos() {
    setLoading(true);
    setError("");
    try {
      const [eventRes, photosRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/photos`),
      ]);
      setEvent(eventRes.data.event);
      setPhotos(photosRes.data.photos);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventAndPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Polls for status updates while any photo is still pending/processing,
  // so "matched ready" appears automatically once the AI service
  // finishes - instead of the admin having to manually refresh the page
  // to find out. Stops itself once nothing is left in flight.
  useEffect(() => {
    const hasPendingWork = photos.some(
      (p) => p.processingStatus === "pending" || p.processingStatus === "processing"
    );
    if (!hasPendingWork) return;

    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(`/events/${eventId}/photos`);
        setPhotos(data.photos);
      } catch {
        // A single failed poll shouldn't disrupt the page - it'll
        // just retry again once the next photos state change re-runs
        // this effect, or the admin can refresh manually as a fallback.
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [photos, eventId]);

  function handleUploaded(newPhotos) {
    setPhotos((prev) => [...newPhotos, ...prev]);
  }

  async function handleDeletePhoto(photoId) {
    const previous = photos;
    setPhotos((prev) => prev.filter((p) => p._id !== photoId));
    try {
      await apiClient.delete(`/events/${eventId}/photos/${photoId}`);
    } catch {
      // Roll back on failure so the UI doesn't lie about what's actually saved.
      setPhotos(previous);
    }
  }

  if (loading) {
    return (
      <div>
        <AdminNav />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
          <p className="mono" style={{ color: "var(--muted)" }}>Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div>
        <AdminNav />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
          <p className="error-text">{error || "Event not found."}</p>
          <Link to="/dashboard" className="btn ghost" style={{ marginTop: "16px", display: "inline-flex" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <AdminNav />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
        <Link to="/dashboard" className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          ← Back to events
        </Link>

        <div style={{ margin: "20px 0 8px" }}>
          <div className="eyebrow">{formattedDate}</div>
          <h1 className="serif" style={{ fontSize: "clamp(1.6rem, 6vw, 2.2rem)", marginTop: "8px" }}>
            {event.title}
          </h1>
        </div>

        <p className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "12px" }}>
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </p>

        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: "6px" }}>
              Guest Link
            </div>
            <a
              href={`${window.location.origin}/e/${event.shareSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: "0.85rem", color: "var(--teal)" }}
            >
              {window.location.origin}/e/{event.shareSlug}
            </a>
          </div>
          <button
            className="btn ghost"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/e/${event.shareSlug}`);
            }}
          >
            Copy Link
          </button>
          <button className="btn ghost" onClick={() => setShowQR((v) => !v)}>
            {showQR ? "Hide QR" : "Show QR"}
          </button>
        </div>

        {showQR && (
          <div className="card" style={{ textAlign: "center", marginBottom: "32px" }}>
            <GuestQRCode url={`${window.location.origin}/e/${event.shareSlug}`} />
            <p className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "14px" }}>
              Print this and place it at the venue for guests to scan.
            </p>
          </div>
        )}

        <PhotoUploader eventId={eventId} onUploaded={handleUploaded} />

        <PhotoGrid photos={photos} onDelete={handleDeletePhoto} />
      </div>
    </div>
  );
}
