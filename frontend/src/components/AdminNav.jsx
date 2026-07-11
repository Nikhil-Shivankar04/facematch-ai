import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav
      className="admin-nav"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <Link to="/dashboard" className="serif" style={{ fontSize: "1.3rem" }}>
        Nikk <span style={{ color: "var(--brass-bright)" }}>Photography</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {user && (
          <span
            className="mono admin-nav-email"
            style={{ fontSize: "0.8rem", color: "var(--muted)" }}
          >
            {user.email}
          </span>
        )}
        <button className="btn ghost" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </nav>
  );
}
