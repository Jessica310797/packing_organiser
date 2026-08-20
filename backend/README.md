# Packing organiser — backend

A small Express API that identifies a packing item from a text description
and/or a photo, using Claude (Anthropic API), and returns it as structured
data: `{ name, category, description, confidence }`.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Server runs on `http://localhost:3000` by default.

## API

### `POST /api/identify`

Either JSON:

```json
{ "text": "blue rain jacket" }
```

```json
{ "imageBase64": "<base64 data, no data: prefix>", "imageMediaType": "image/jpeg" }
```

Or `multipart/form-data` with an `image` file field and/or a `text` field
(what the mobile app sends).

Response:

```json
{
  "item": {
    "name": "Blue rain jacket",
    "category": "Clothing",
    "description": "A waterproof navy blue jacket with a hood.",
    "confidence": "high"
  }
}
```
