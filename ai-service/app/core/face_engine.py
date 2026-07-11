"""
Core face recognition logic - detection, embedding generation, and
blur scoring. Kept separate from the FastAPI route handlers so this
logic is easy to test or swap out later (e.g. upgrading from
face_recognition/dlib to InsightFace, per our documented Phase 2
upgrade path).
"""
import io
import numpy as np
import face_recognition
import cv2
from PIL import Image
import pillow_heif

# Registers HEIC/HEIF support with Pillow - without this, Image.open()
# fails on iPhone-format photos even though Pillow loads normally for
# JPEG/PNG. This must run once at import time, before any Image.open()
# calls happen.
pillow_heif.register_heif_opener()

# How similar two face embeddings need to be to count as the same
# person. Lower = stricter (fewer false positives, more false
# negatives). face_recognition's own docs recommend ~0.6 as a
# reasonable default for its embedding model.
MATCH_DISTANCE_THRESHOLD = 0.6

# Below this score, a photo is flagged as blurry. This is a Laplacian
# variance measurement - lower variance means fewer sharp edges,
# which correlates with blur. This threshold is a reasonable starting
# point; it may need tuning against real event photos.
BLUR_VARIANCE_THRESHOLD = 100.0


def _load_image_rgb(image_bytes: bytes) -> np.ndarray:
    """Loads image bytes into an RGB numpy array, the format
    face_recognition expects."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)


def detect_faces_and_encodings(image_bytes: bytes) -> list[dict]:
    """
    Detects every face in an image and returns its embedding (a
    128-dimension vector "fingerprint") plus its bounding box.

    Returns a list because a single event photo commonly contains
    multiple people - each one becomes its own entry, all pointing
    back to the same photo on the Node side.
    """
    rgb_image = _load_image_rgb(image_bytes)

    # face_locations finds bounding boxes; face_encodings turns each
    # located face into a comparable numeric vector. Doing both in one
    # pass (encodings computed from the already-found locations) avoids
    # detecting faces twice.
    face_locations = face_recognition.face_locations(rgb_image, model="hog")
    face_encodings = face_recognition.face_encodings(rgb_image, known_face_locations=face_locations)

    results = []
    for location, encoding in zip(face_locations, face_encodings):
        top, right, bottom, left = location
        results.append({
            "embedding": encoding.tolist(),
            "box": {"top": top, "right": right, "bottom": bottom, "left": left},
        })

    return results


def compute_blur_score(image_bytes: bytes) -> float:
    """
    Measures image sharpness using Laplacian variance - a standard,
    lightweight blur-detection technique. Sharp images have lots of
    high-frequency edge detail (high variance); blurry images don't.
    """
    rgb_image = _load_image_rgb(image_bytes)
    gray = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return float(variance)


def is_blurry(blur_score: float) -> bool:
    return blur_score < BLUR_VARIANCE_THRESHOLD


def find_matches(selfie_embedding: list[float], candidates: list[dict]) -> list[str]:
    """
    Compares one selfie embedding against a list of candidate faces
    from event photos, returns the photoIds of every photo containing
    a matching face.

    `candidates` is a list of {"photoId": str, "embedding": list[float]}
    - one entry per detected face (not per photo), since a single
    photo can have multiple faces/candidates.

    We use face_distance (not compare_faces) so we control the
    threshold explicitly rather than relying on the library's default.
    """
    if not candidates:
        return []

    selfie_vector = np.array(selfie_embedding)
    candidate_vectors = np.array([c["embedding"] for c in candidates])

    distances = face_recognition.face_distance(candidate_vectors, selfie_vector)

    matched_photo_ids = set()
    for candidate, distance in zip(candidates, distances):
        if distance <= MATCH_DISTANCE_THRESHOLD:
            matched_photo_ids.add(candidate["photoId"])

    return list(matched_photo_ids)
