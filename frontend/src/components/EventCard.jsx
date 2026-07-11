import { Link } from "react-router-dom";

const statusColors = {
  draft: "var(--muted)",
  active: "var(--teal)",
  archived: "var(--muted)",
};

export default function EventCard({ event }) {
  const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to={`/events/${event._id}`}
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        transition: "border-color 0.2s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brass)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
        }}
      >
        <h3 className="serif" style={{ fontSize: "1.25rem" }}>
          {event.title}
        </h3>
        <span
          className="mono"
          style={{
            fontSize: "0.68rem",
            textTransform: "uppercase",
            color: statusColors[event.status] || "var(--muted)",
            border: `1px solid ${statusColors[event.status] || "var(--muted)"}`,
            borderRadius: "var(--radius)",
            padding: "3px 8px",
          }}
        >
          {event.status}
        </span>
      </div>
      <p className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
        {formattedDate}
      </p>
    </Link>
  );
}
