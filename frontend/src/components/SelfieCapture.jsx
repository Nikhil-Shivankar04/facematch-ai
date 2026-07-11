import { useEffect, useRef, useState } from "react";

// Modes this component can be in:
// idle       - nothing happening yet, showing the placeholder circle
// requesting - waiting on the browser's camera permission prompt
// live       - camera stream is active, showing a live preview
// error      - camera unavailable (denied, no camera, insecure context)
// captured   - a photo has been taken/selected and is shown as a preview
const MODES = {
  IDLE: "idle",
  REQUESTING: "requesting",
  LIVE: "live",
  ERROR: "error",
  CAPTURED: "captured",
};

export default function SelfieCapture({ onCapture, disabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState(MODES.IDLE);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraError, setCameraError] = useState("");

  // Always release the camera when this component unmounts (e.g. guest
  // navigates away mid-flow) - otherwise the camera light stays on and
  // the browser keeps holding the hardware.
  useEffect(() => {
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setCameraError("");
    setMode(MODES.REQUESTING);

    try {
      // getUserMedia requires a secure context (HTTPS, or localhost
      // specifically) - if a guest opens this page over plain HTTP on
      // another device (e.g. your phone hitting your computer's local
      // IP during development), the browser blocks camera access
      // entirely and this will throw. The catch block below handles
      // that gracefully by falling back to file upload.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      setMode(MODES.LIVE);

      // The <video> element only exists once we're in LIVE mode, so we
      // attach the stream on the next tick once it's actually mounted.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. You can upload a photo instead."
          : "Couldn't access your camera. You can upload a photo instead."
      );
      setMode(MODES.ERROR);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        setPreviewUrl(URL.createObjectURL(blob));
        setMode(MODES.CAPTURED);
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92
    );
  }

  function handleFileUpload(file) {
    if (!file) return;
    stopStream();
    setPreviewUrl(URL.createObjectURL(file));
    setMode(MODES.CAPTURED);
    onCapture(file);
  }

  function retake() {
    setPreviewUrl(null);
    setCameraError("");
    setMode(MODES.IDLE);
  }

  const showBrackets = mode === MODES.LIVE || mode === MODES.CAPTURED || mode === MODES.IDLE;

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "220px",
          margin: "0 auto 20px",
        }}
      >
        {mode === MODES.IDLE && (
          <>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid var(--teal)",
                animation: "readyPulse 2.4s ease-out infinite",
              }}
            />
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "1px dashed var(--border-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface)",
                position: "relative",
                zIndex: 1,
                overflow: "hidden",
              }}
            >
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                <circle cx="12" cy="12" r="10" stroke="var(--brass)" strokeWidth="1.2" opacity="0.5" />
                <circle cx="12" cy="12" r="3.4" stroke="var(--brass-bright)" strokeWidth="1.4" />
                <path
                  d="M12 2.5 L12 5.5 M21.5 12 L18.5 12 M12 21.5 L12 18.5 M2.5 12 L5.5 12"
                  stroke="var(--brass)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              {/* Scanning line sweeping through the circle - reinforces
                  "AI ready to work" before the guest even taps anything. */}
              <span className="scan-line" />
            </div>
          </>
        )}

        {mode === MODES.REQUESTING && (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "1px solid var(--border-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface)",
            }}
          >
            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              Requesting camera...
            </span>
          </div>
        )}

        {mode === MODES.LIVE && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid var(--teal)",
              // Mirror the preview so it feels like a mirror, not a
              // security camera - matches what people expect from a
              // front-facing selfie view.
              transform: "scaleX(-1)",
              position: "relative",
              zIndex: 1,
            }}
          />
        )}

        {mode === MODES.ERROR && (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "1px solid var(--danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface)",
              padding: "20px",
            }}
          >
            <span className="mono" style={{ fontSize: "1.6rem" }}>
              ⚠
            </span>
          </div>
        )}

        {mode === MODES.CAPTURED && previewUrl && (
          <img
            src={previewUrl}
            alt="Your selfie"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid var(--teal)",
              position: "relative",
              zIndex: 1,
            }}
          />
        )}

        {showBrackets && (
          <>
            <span className="vf-bracket vf-tl" />
            <span className="vf-bracket vf-tr" />
            <span className="vf-bracket vf-bl" />
            <span className="vf-bracket vf-br" />
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileUpload(e.target.files?.[0])}
      />

      {cameraError && (
        <p className="error-text" style={{ marginBottom: "16px" }}>
          {cameraError}
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          alignItems: "center",
          maxWidth: "260px",
          margin: "0 auto",
        }}
      >
        {mode === MODES.LIVE ? (
          <button className="btn" onClick={capturePhoto} disabled={disabled} style={{ width: "100%" }}>
            Capture
          </button>
        ) : mode === MODES.CAPTURED ? (
          <button className="btn" onClick={retake} disabled={disabled} style={{ width: "100%" }}>
            Retake Selfie
          </button>
        ) : (
          <button
            className="btn"
            onClick={startCamera}
            disabled={disabled || mode === MODES.REQUESTING}
            style={{ width: "100%" }}
          >
            {mode === MODES.REQUESTING ? "Opening Camera..." : "Take a Selfie"}
          </button>
        )}

        <button
          className="btn ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          style={{ width: "100%" }}
        >
          Upload a Photo Instead
        </button>
      </div>

      <style>{`
        .vf-bracket {
          position: absolute;
          width: 24px;
          height: 24px;
          border-color: var(--brass);
          z-index: 2;
        }
        .vf-tl { top: -6px; left: -6px; border-top: 2px solid; border-left: 2px solid; }
        .vf-tr { top: -6px; right: -6px; border-top: 2px solid; border-right: 2px solid; }
        .vf-bl { bottom: -6px; left: -6px; border-bottom: 2px solid; border-left: 2px solid; }
        .vf-br { bottom: -6px; right: -6px; border-bottom: 2px solid; border-right: 2px solid; }

        .scan-line {
          position: absolute;
          left: 8%;
          right: 8%;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, var(--teal), transparent);
          animation: scanSweep 2.6s ease-in-out infinite;
          opacity: 0.7;
        }
        @keyframes scanSweep {
          0% { top: 20%; opacity: 0; }
          15% { opacity: 0.7; }
          50% { top: 78%; opacity: 0.7; }
          85% { opacity: 0; }
          100% { top: 20%; opacity: 0; }
        }

        @keyframes readyPulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vf-bracket, .scan-line, [style*="readyPulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
