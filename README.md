# Trailer Counting Dashboard

React dashboard with a FastAPI service for real-time semi-trailer detection and tracking.

- Frontend: `npm run dev`
- Backend setup: see [backend/README.md](backend/README.md)
- Frontend connection settings: copy `.env.example` to `.env` if the API is not on `localhost:8000`

The dashboard keeps mock visual data as a fallback. When the backend WebSocket connects, camera status, annotated feeds, current detections, queue counts, crossing totals, and traffic utilization synchronize automatically.
