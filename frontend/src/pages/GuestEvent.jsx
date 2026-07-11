import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import publicApiClient from "../api/publicClient";
import SelfieCapture from "../components/SelfieCapture";
import MatchedPhotoGrid from "../components/MatchedPhotoGrid";

// Simple state machine for the guest journey. Kept as one page rather
// than separate routes per step, since guests share this via a single
// link and shouldn't have to navigate anywhere - everything happens
// inline in one continuous flow.
const STEPS = {
  LOADING: "loading",
  NOT_FOUND: "not_found",
  PASSWORD: "password",
  CAPTURE: "capture",
  MATCHING: "matching",
  RESULTS: "results",
};

export default function GuestEvent() {
  const { shareSlug } = useParams();

  const [step, setStep] = useState(STEPS.LOADING);
  const [event, setEvent] = useState(null);
  const [guestToken, setGuestToken] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [matchedPhotos, setMatchedPhotos] = useState([]);

  useEffect(() => {
    async function loadEvent() {
      try {
        const { data } = await publicApiClient.get(`/public/events/${shareSlug}`);
        setEvent(data.event);
        setStep(data.event.requiresPassword ? STEPS.PASSWORD : STEPS.CAPTURE);
      } catch {
        setStep(STEPS.NOT_FOUND);
      }
    }
    loadEvent();
  }, [shareSlug]);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");
    try {
      const { data } = await publicApiClient.post(`/public/events/${shareSlug}/verify-password`, {
        password,
      });
      setGuestToken(data.guestToken);
      setStep(STEPS.CAPTURE);
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Incorrect password.");
    }
  }

  async function handleSelfieCapture(file) {
    setStep(STEPS.MATCHING);
    setMatchError("");

    const formData = new FormData();
    formData.append("selfie", file);

    try {
      const headers = guestToken ? { Authorization: `Bearer ${guestToken}` } : {};
      const { data } = await publicApiClient.post(
        `/public/events/${shareSlug}/match`,
        formData,
        { headers: { ...headers, "Content-Type": "multipart/form-data" } }
      );
      setMatchedPhotos(data.photos);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setMatchError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
      setStep(STEPS.CAPTURE);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 70% 50% at 50% 15%, rgba(63,140,130,0.10), transparent), radial-gradient(ellipse 60% 40% at 85% 85%, rgba(185,139,62,0.06), transparent), var(--ink)",
        padding: "60px 20px",
      }}
    >
      <div className="grain-overlay" />
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div className="serif" style={{ fontSize: "1.3rem" }}>
            Nikk <span style={{ color: "var(--brass-bright)" }}>Photography</span>
          </div>
        </div>
        <div className="eyebrow" style={{ textAlign: "center", marginBottom: "36px" }}>
          AI · Face Match
        </div>

        {step === STEPS.LOADING && (
          <p className="mono" style={{ textAlign: "center", color: "var(--muted)" }}>
            Loading event...
          </p>
        )}

        {step === STEPS.NOT_FOUND && (
          <div className="card" style={{ textAlign: "center" }}>
            <p className="serif" style={{ fontSize: "1.4rem", marginBottom: "10px" }}>
              This link isn't available.
            </p>
            <p className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              It may have expired, or the link may be incorrect. Check with whoever shared it
              with you.
            </p>
          </div>
        )}

        {step === STEPS.PASSWORD && event && (
          <div className="card">
            <div className="eyebrow" style={{ textAlign: "center", marginBottom: "8px" }}>
              {event.title}
            </div>
            <p
              className="mono"
              style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "24px" }}
            >
              This event is password-protected.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="field">
                <label htmlFor="event-password">Password</label>
                <input
                  id="event-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {passwordError && <p className="error-text">{passwordError}</p>}
              <button type="submit" className="btn" style={{ width: "100%" }}>
                Unlock
              </button>
            </form>
          </div>
        )}

        {step === STEPS.CAPTURE && event && (
          <div className="card fade-up-card card-glow">
            <div className="eyebrow" style={{ textAlign: "center", marginBottom: "8px" }}>
              {event.title}
            </div>
            <p
              className="serif"
              style={{ textAlign: "center", fontSize: "1.6rem", margin: "10px 0 8px" }}
            >
              Find your photos.
            </p>
            <p
              className="mono"
              style={{
                textAlign: "center",
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginBottom: "30px",
              }}
            >
              {event.photoCount
                ? `Searching through ${event.photoCount} photo${event.photoCount !== 1 ? "s" : ""}.`
                : "Take a selfie — we'll show you every photo you're in."}
            </p>
            <SelfieCapture onCapture={handleSelfieCapture} />
            <p
              className="mono"
              style={{
                textAlign: "center",
                fontSize: "0.68rem",
                color: "var(--muted)",
                marginTop: "22px",
              }}
            >
              🔒 Used only to find your photos — never shared or posted.
            </p>
            {matchError && (
              <p className="error-text" style={{ textAlign: "center", marginTop: "20px" }}>
                {matchError}
              </p>
            )}
          </div>
        )}

        {step === STEPS.MATCHING && (
          <div className="card fade-up-card card-glow" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 24px",
                borderRadius: "50%",
                border: "2px solid var(--border-soft)",
                borderTopColor: "var(--teal)",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <p className="serif" style={{ fontSize: "1.3rem", marginBottom: "10px" }}>
              Looking for you...
            </p>
            <p className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              This takes a few seconds.
            </p>
          </div>
        )}

        {step === STEPS.RESULTS && (
          <div className="card fade-up-card card-glow">
            <MatchedPhotoGrid photos={matchedPhotos} shareSlug={shareSlug} />
            <button
              className="btn ghost"
              style={{ width: "100%", marginTop: "24px" }}
              onClick={() => setStep(STEPS.CAPTURE)}
            >
              Try a Different Selfie
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <p className="mono" style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
            Powered by Nikk Photography
          </p>
          <a
            href="mailto:nikhilshivankar2002@gmail.com?subject=Booking%20Inquiry"
            className="mono"
            style={{ fontSize: "0.7rem", color: "var(--brass-bright)" }}
          >
            Want your own event photographed? Get in touch →
          </a>
        </div>
      </div>

      <style>{`
        .fade-up-card {
          animation: guestFadeUp 0.5s ease-out;
        }
        @keyframes guestFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
