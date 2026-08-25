# Packing Organiser — mobile (Expo)

The real mobile app: create a trip, take/pick packing photos with your
phone's camera, and watch the same backend (`../backend`) build up a
deduplicated inventory. Same API, same reconciliation logic as the web
version in `backend/public` — this is the actual product interface.

## Prerequisites

- The backend (`../backend`) running and reachable from your phone (see
  below — this is the part that trips people up)
- **Expo Go** installed on your phone: [iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to a URL your **phone** can reach
— see `.env.example` for the different cases (Codespaces, local network,
simulators). `localhost` only works if the app itself is running in a
browser on the same machine as the backend — it does **not** work from a
physical phone or from Expo Go.

### If you're running the backend in a GitHub Codespace

1. Start the backend (`cd ../backend && npm run dev`)
2. In the **Ports** tab (bottom panel), find port 3000, right-click → **Port
   Visibility** → **Public** (it defaults to Private/GitHub-auth-only, which
   Expo Go on your phone can't get through)
3. Copy that port's forwarded URL (looks like
   `https://your-codespace-name-3000.app.github.dev`) into `.env` as
   `EXPO_PUBLIC_API_URL`

```bash
npm start
```

This prints a QR code. Scan it with Expo Go (Android: in-app scanner; iOS:
your regular Camera app, then tap the notification). The app opens on your
phone, live-reloading as you edit code.

## What's here

- `App.tsx` — navigation stack (Trips list → New trip → Trip detail)
- `src/api/client.ts` — typed client for the backend's REST API
- `src/screens/` — the three screens
- `src/components/` — inventory row, review-queue row, shared button

Camera and photo-library permissions are requested at the point you tap
**Take photo** / **Choose photo**, not on launch.

## Known gap

There's no native iOS/Android build here yet (no Xcode/EAS project) — this
runs through Expo Go for development. Producing an installable
`.ipa`/`.apk`, or a Play Store/App Store submission, is a separate step
(via `eas build`) once the app itself is further along.
