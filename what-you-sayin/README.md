# What You Sayin — Expo app

A cheeky, personalised take on Articulate. This app runs the game in a
full-screen web view, so you can play it on your phone through Expo Go.

## Try it on your phone

1. Install **Expo Go** on your phone:
   [iOS](https://apps.apple.com/app/expo-go/id982107779) /
   [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. In a terminal (your Codespace is fine):

   ```bash
   cd what-you-sayin
   npm install
   npm run tunnel
   ```

   The first run of `npm run tunnel` offers to install `@expo/ngrok`; say yes.
   The tunnel lets your phone reach the app even when it isn't on the same
   network as the terminal (true for Codespaces). If your phone and computer
   share Wi-Fi, `npm start` is quicker.
3. Scan the QR code it prints. On iPhone, use the Camera app and tap the
   notification. On Android, use the scanner inside Expo Go.

Like `../mobile`, this targets **Expo SDK 54** so the app-store build of
Expo Go can open it.

## What works in the app

- Quick fire, and new games where you pass one phone around
- Preferences, saved and binned cards, and your own words. These stay on
  the phone between launches.
- The built-in bank of 1,206 cards, filtered by everyone's preferences

Not in the app yet. These rely on the Claude-hosted version's shared
storage and Claude access, so they need a backend first:

- Everyone playing on their own phone (join with a code)
- AI-written cards
- Loading a spreadsheet into the shared card bank

## Changing the game

The game lives in `web/index.html` (plus the logo images in `web/img/`).
After editing it, regenerate the embedded copy the app loads:

```bash
npm run build-html
```

That writes `src/gameHtml.ts`. Commit both files.
