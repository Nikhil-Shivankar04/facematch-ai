import { useEffect, useState } from "react";
import apiClient from "../api/client";
import AdminNav from "../components/AdminNav";
import EventCard from "../components/EventCard";
import CreateEventForm from "../components/CreateEventForm";

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function fetchEvents() {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/events");
      setEvents(data.events);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  function handleCreated(newEvent) {
    setEvents((prev) => [newEvent, ...prev]);
    setShowCreateForm(false);
  }

  return (
    <div>
      <AdminNav />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div>
            <div className="eyebrow">Your Events</div>
            <h1 className="serif" style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", marginTop: "8px" }}>
              Every shoot, in one place.
            </h1>
          </div>
          {!showCreateForm && (
            <button className="btn" onClick={() => setShowCreateForm(true)}>
              + New Event
            </button>
          )}
        </div>

        {showCreateForm && (
          <CreateEventForm onCreated={handleCreated} onCancel={() => setShowCreateForm(false)} />
        )}

        {loading && <p className="mono" style={{ color: "var(--muted)" }}>Loading events...</p>}

        {error && <p className="error-text">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <p className="serif" style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              No events yet.
            </p>
            <p className="mono" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Create your first event to start uploading photos.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
