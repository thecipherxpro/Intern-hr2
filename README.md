# CipherX HR Docs

Modern HR document signing app for CipherX Rules of Engagement templates.

## Features

- Admin portal for minimal and professional RoE templates
- Role-based temporary signing links
- Signature capture with audit metadata
- HR-only document hash, final state, engagement state, and activation timestamp fields
- PDF export that preserves the template design and inserts completed names, dates, signatures, hashes, and audit records

## Development

```bash
npm install
npm run dev
```

The client runs at `http://localhost:5173` and the API runs at `http://localhost:8787`.

## Build

```bash
npm run build
```

Runtime document data is stored in `data/documents.json` and is intentionally ignored so local signatures and audit records are not committed.
