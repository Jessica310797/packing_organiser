# Packing Organiser

Software MVP for an AI-powered packing assistant. The long-term product is a
camera that clips onto a suitcase and tracks packing automatically; this MVP
has no hardware — the user takes sequential photos while packing and a vision
model builds up a persistent inventory from them.

See [`backend/README.md`](backend/README.md) for the API, architecture, and
how the inventory avoids double-counting items across photos.

See [`mobile/README.md`](mobile/README.md) for the Expo mobile app — the
actual product interface, run via Expo Go on a phone. `backend/public` is
also a minimal browser UI for exercising the API without a phone.

## Setup

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
claude
```
