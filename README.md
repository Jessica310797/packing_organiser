# Packing Organiser

An AI-assisted app for organising packing: identify items individually (by
photo and/or short description) and build up a packing list.

This is the first slice: **item identification**. Point the app at an item
(photo, text, or both) and it returns a structured item — name, category,
description, confidence — using Claude. Identified items can be saved to a
local packed list.

## Structure

- [`backend/`](backend) — Express API that calls Claude to identify an item.
- [`mobile/`](mobile) — Expo (React Native) app: take/choose a photo or type
  a description, see the identified item, save it to a local packed list.

## Running it

1. Start the backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env   # add your ANTHROPIC_API_KEY
   npm run dev
   ```

2. Point the mobile app at the backend — edit `mobile/src/config.ts` if
   you're not using the iOS simulator (Android emulator, physical device,
   etc. need a different host — see comments in that file).

3. Start the mobile app:

   ```bash
   cd mobile
   npm install
   npm run start
   ```

   Then open it in the iOS simulator, Android emulator, or Expo Go on your
   phone.

## What's next

Natural next steps once identification feels good: quantity per item,
grouping items into trips/bags, a packed/unpacked toggle, and persisting
items to a real backend datastore instead of on-device storage.
