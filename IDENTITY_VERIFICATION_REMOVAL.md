# Identity Verification Feature Removal

## Summary

All identity verification features have been completely removed from both frontend and backend. The system no longer requires reference photos, face matching, or identity enrollment.

## Files Deleted

### Frontend
1. `client/hooks/useFaceVerification.ts` - Face verification hook using face-api.js
2. `client/components/ReferencePhotoCapture.tsx` - Component for capturing reference photos
3. `client/components/ConsentNotice.tsx` - Consent notice for identity verification

### Backend
1. `procturing_backend/services/proctoring/identity_detection.py` - Identity verification service using DeepFace
2. `procturing_backend/router/enrollment.py` - REST API endpoints for photo enrollment
3. `procturing_backend/test_identity.py` - Identity verification test file

## Files Modified

### Frontend

#### `client/app/interview/page.tsx`
- Removed identity verification imports
- Removed setup phase (was only for identity verification)
- Removed consent and reference photo state
- Removed face verification hook initialization
- Simplified interview start flow - now goes directly from form submission to interview
- Removed identity verification constants (ID_CHECK_INTERVAL_MS, ID_SIMILARITY_THRESHOLD, ID_MAX_VIOLATIONS)

#### `client/components/interview/ProctoringPanel.tsx`
- Removed face verification status section
- Removed faceVerification prop from interface
- Simplified component to only show proctoring violations

#### `client/package.json`
- Removed `@vladmandic/face-api` dependency
- Removed `copy-models` script (was for copying face-api.js models)

### Backend

#### `procturing_backend/WebSockets/proctoring_ws.py`
- Removed `IdentityVerifier` import
- Removed `enroll` message type handling
- Removed `_handle_enroll` function
- Simplified WebSocket connection - orchestrator is created immediately on connection
- Updated message type documentation
- No longer requires enrollment before sending frames

#### `procturing_backend/services/proctoring/orchestrator.py`
- Removed `identity_verifier` parameter from constructor
- Removed identity verification from CV pipeline

#### `procturing_backend/main.py`
- Removed `IdentityVerifier` import
- Removed identity verifier initialization in lifespan
- Removed enrollment router registration
- Updated health check to remove identity_verifier status

#### `procturing_backend/services/proctoring/violation_builder.py`
- Removed `IDENTITY_MISMATCH` violation type from VIOLATION_MESSAGES

### Configuration

#### `.env.example`
- Removed all client-side identity verification environment variables:
  - `NEXT_PUBLIC_ID_CHECK_INTERVAL`
  - `NEXT_PUBLIC_ID_SIMILARITY_THRESHOLD`
  - `NEXT_PUBLIC_ID_MAX_VIOLATIONS`
  - `NEXT_PUBLIC_FACEAPI_MODEL_URL`

## Impact on User Flow

### Before (With Identity Verification)
1. User fills interview setup form
2. Camera initializes
3. User accepts consent notice
4. User captures/uploads reference photo
5. Face-api.js models load
6. Interview starts
7. Periodic face verification during interview

### After (Without Identity Verification)
1. User fills interview setup form
2. Interview starts immediately
3. Only proctoring violations are monitored (no identity checks)

## Remaining Proctoring Features

The following proctoring features are still active:

1. **Face Detection** - Detects if face is visible and centered
2. **Gaze Analysis** - Monitors if user is looking at screen
3. **Object Detection** - Detects unauthorized objects (phones, books, etc.)
4. **Multiple Face Detection** - Detects if multiple people are visible
5. **Client-side Violations** - Tab switching, fullscreen exit, copy-paste attempts

## Dependencies Removed

### Frontend
- `@vladmandic/face-api` (v1.7.13) - Face recognition library

### Backend
- No dependencies removed (DeepFace was already installed for other purposes)

## Testing Recommendations

1. Test interview flow from start to finish
2. Verify camera still works for proctoring
3. Verify WebSocket connection establishes without enrollment
4. Verify proctoring violations are still detected
5. Test that interview can start immediately after form submission

## Migration Notes

If you have existing sessions or data that reference identity verification:

1. **Database**: Remove any `reference_photo` or `identity_verification` fields from session schemas
2. **S3/Storage**: Clean up any stored reference photos if applicable
3. **Frontend**: Clear any cached face-api.js models from `/public/models/`
4. **Environment**: Remove identity verification environment variables from `.env` files

## Rollback Instructions

If you need to restore identity verification:

1. Restore deleted files from git history
2. Reinstall `@vladmandic/face-api` in client
3. Restore environment variables in `.env.example`
4. Restore imports and initialization code in modified files
5. Run `npm run copy-models` to copy face-api.js models

## Next Steps

1. Run `npm install` in the client directory to update dependencies
2. Remove `/public/models/` directory if it exists (face-api.js models)
3. Update any documentation that references identity verification
4. Test the complete interview flow
