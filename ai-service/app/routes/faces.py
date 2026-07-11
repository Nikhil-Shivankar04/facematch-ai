import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.core.face_engine import (
    detect_faces_and_encodings,
    compute_blur_score,
    is_blurry,
    find_matches,
)

router = APIRouter()


@router.post("/detect-faces")
async def detect_faces(photo: UploadFile = File(...)):
    """
    Called by the Node backend's background job for every uploaded
    event photo. Returns every face found (as embeddings + bounding
    boxes) plus a blur score, so Node can store both the face data
    and flag the photo as blurry if needed.
    """
    image_bytes = await photo.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        faces = detect_faces_and_encodings(image_bytes)
        blur_score = compute_blur_score(image_bytes)
    except Exception as exc:
        # Corrupt or unreadable images shouldn't crash the whole batch -
        # Node's job queue will mark this one photo as "failed" and move on.
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")

    return {
        "faceCount": len(faces),
        "faces": faces,
        "blurScore": blur_score,
        "isBlurry": is_blurry(blur_score),
    }


@router.post("/match-selfie")
async def match_selfie(
    selfie: UploadFile = File(...),
    candidates: str = Form(...),
):
    """
    Called when a guest uploads a selfie. `candidates` is a JSON string
    (sent as a form field, since multipart doesn't support nested JSON
    bodies directly) containing every face embedding for the event:

        [{"photoId": "...", "embedding": [0.12, -0.04, ...]}, ...]

    Returns the list of photoIds that contain a matching face.
    """
    selfie_bytes = await selfie.read()

    if not selfie_bytes:
        raise HTTPException(status_code=400, detail="Selfie file is empty")

    try:
        candidate_list = json.loads(candidates)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="candidates must be valid JSON")

    selfie_faces = detect_faces_and_encodings(selfie_bytes)

    if len(selfie_faces) == 0:
        raise HTTPException(status_code=422, detail="No face detected in the selfie. Try again with better lighting.")

    # If multiple faces appear in the selfie (e.g. someone else walked
    # into frame), use the first detected face - a guest submitting a
    # selfie is overwhelmingly likely to have themselves as the primary
    # subject.
    selfie_embedding = selfie_faces[0]["embedding"]

    matched_photo_ids = find_matches(selfie_embedding, candidate_list)

    return {"matchedPhotoIds": matched_photo_ids}
