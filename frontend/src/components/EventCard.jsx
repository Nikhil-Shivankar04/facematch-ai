import { Link } from "react-router-dom";

const statusColors = {
  draft: "var(--muted)",
  active: "var(--teal)",
  archived: "var(--muted)",
};

export default function EventCard({ event, onDelete }) {
  const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function handleDeleteClick(e) {
    // Stop the click from bubbling up to the card's own Link, which
    // would otherwise navigate into the event instead of deleting it.
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${event.title}"? This permanently deletes the event and all its photos. This can't be undone.`
    );
    if (confirmed) {
      onDelete(event._id);
    }
  }

  return (
    <Link
      to={`/events/${event._id}`}
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        position: "relative",
        transition: "border-color 0.2s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brass)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
    >
      <button
        onClick={handleDeleteClick}
        aria-label={`Delete ${event.title}`}
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          border: "none",
          background: "rgba(21,19,15,0.55)",
          color: "var(--warm-white)",
          fontSize: "0.9rem",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        ×
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
          paddingRight: "30px",
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
