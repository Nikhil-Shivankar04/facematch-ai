import { useState } from "react";
import apiClient from "../api/client";

export default function CreateEventForm({ onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/events", { title, eventDate });
      onCreated(data.event);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "32px" }}>
      <div className="eyebrow" style={{ marginBottom: "16px" }}>
        New Event
      </div>

      <div className="form-grid-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="title">Event title</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Sharma Wedding"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="eventDate">Event date</label>
          <input
            id="eventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="error-text" style={{ marginTop: "16px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Creating..." : "Create Event"}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
