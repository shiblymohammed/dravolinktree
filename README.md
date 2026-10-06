# DravoHome

A premium furniture experience centre website built with **Next.js 16, React 19, TypeScript, and Tailwind CSS 4**. Warm ivory, espresso, editorial typography, and a custom interior photograph create a branded link-tree experience.

## Run locally

Requires Node.js 20.9 or later.

```powershell
npm install --registry=https://registry.npmjs.org
npm run setup:admin
npm run dev
```

Open **http://localhost:3001**. Port 3001 keeps this project separate from the parent application's preview. This workspace already has a generated `.env.local`; `setup:admin` never overwrites existing credentials.

The setup command creates a random admin password and a random session signing secret. It prints the local credentials once; they are also available in `.env.local`. Keep that file private and out of source control. Sign in at **/admin/login** with the configured username and password.

## Pages and features

- `/`: responsive branded landing page, Instagram, WhatsApp, Facebook, phone call buttons, brochure CTA, and showroom details.
- `/brochures`: searchable PDF library with collection filters, browser previews, and downloads.
- `/admin/login`: username/password sign-in.
- `/admin`: PDF upload, title/description/category editing, draft/published visibility, preview, search, status filters, and deletion with confirmation.
- Admin **Contact & links**: update social URLs, WhatsApp/phone numbers, showroom address, and opening hours.

Real contact details and PDFs were not supplied, so the initial brochure library is empty and contact fields are blank. Blank contact links open an informative dialog. Enter the business's details in **Contact & links** and upload the first PDF to activate the content. No fictional brochures or business contact information are seeded.

## Admin configuration

See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `ADMIN_USERNAME` | Admin sign-in name |
| `ADMIN_PASSWORD` | Unique password, at least 12 characters |
| `SESSION_SECRET` | Random signing secret, at least 32 characters |
| `APP_URL` | Exact public origin, e.g. `https://your-domain.com`; locally `http://localhost:3001` |
| `DATA_DIR` | Optional absolute path on a persistent disk; defaults to `./data` |
| `STORAGE_DRIVER` | `local` (default) or `r2` for Cloudflare R2 PDF storage |
| `R2_ACCOUNT_ID` | 32-character Cloudflare account ID |
| `R2_BUCKET` | Private R2 bucket name |
| `R2_ACCESS_KEY_ID` | Bucket-scoped R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | Bucket-scoped R2 API token secret |

Changing the password invalidates existing sessions. Restart the server after changing environment variables. To use a different local port, change `APP_URL` and run `npm run dev -- --port 4000`. Admin mutations validate the configured origin, so access the preview using the exact `APP_URL`.

## Storage and deployment

Brochure metadata and contact settings persist in `data/database.json`. By default, PDF files persist in `data/uploads/`. Writes are serialized within one Node process and metadata is replaced atomically. PDFs are served through guarded routes, keeping drafts private.

### Cloudflare R2 for PDF uploads

1. Create a **private** bucket in [Cloudflare R2](https://developers.cloudflare.com/r2/buckets/create-buckets/). Keep it in the Standard storage class if you intend to use the free allowance.
2. Create an [R2 API token](https://developers.cloudflare.com/r2/api/tokens/) with Object Read & Write access limited to that bucket. Copy its Access Key ID and Secret Access Key into `.env.local` or your host's secret manager. Never put these values in `NEXT_PUBLIC_` variables.
3. Set `STORAGE_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. Restart the server.
4. Run `npm run check:r2` to test the live bucket with a temporary PDF. The script removes the test object when finished.

New PDFs now upload to R2 through the authenticated admin API. Public previews of published PDFs redirect to five-minute signed R2 URLs; draft previews require admin sign-in first. Downloads stream through the application to preserve the download filename. Deleting a brochure removes its R2 object. The bucket does **not** need public access or browser CORS because upload and download requests pass through the Next.js server.

Each brochure records its storage location, so existing local PDFs continue to work after switching to R2 while the original disk remains available. To move old local PDFs to R2, reupload them through admin and remove the old records after checking the replacements. Keep a backup of `data/` before removing any brochure.

**R2 stores only the PDF bytes.** The brochure list, publication status, and contact settings remain in `data/database.json`. A production server still needs persistent `DATA_DIR` and one Node instance. Moving the app to serverless or multiple replicas requires migrating this metadata to a shared database; R2 alone does not solve that.

This implementation is intended for **one Node.js server instance with persistent disk**. Back up the entire data directory. Do not deploy to ephemeral serverless hosting such as Vercel without replacing the metadata store with a database and selecting R2 for PDF storage. Multiple server processes or replicas also require a shared database/store and shared rate limiting.

```powershell
npm run build
npm start
```

Configure production credentials and the HTTPS `APP_URL`, and mount a persistent `DATA_DIR` before starting. The production session cookie is HTTPS-only. If a reverse proxy sits in front of the app, allow multipart request bodies of at least 21 MB and configure it to replace client-supplied forwarded IP headers.

The project uses Next.js's supported Webpack mode because Turbopack's CSS worker failed in this Windows environment. The installed Next.js docs are available at `node_modules/next/dist/docs`.

## Security and validation

HMAC-signed, HttpOnly, SameSite=Strict sessions expire after eight hours. Admin pages and mutation APIs enforce authentication. Mutations validate the request origin. Login attempts have an in-memory 15-minute rate limit. Sessions are invalidated on password changes. PDF uploads are capped at 20 MB and checked for `.pdf`, PDF header, and EOF marker; this is basic format validation, not malware scanning or a full PDF parser. Stored file names are generated UUIDs. Social URLs are limited to HTTPS URLs on the relevant platform's domain.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
# With the local server running:
npm run test:smoke
npm run test:browser
# After configuring Cloudflare R2:
npm run check:r2
```

The smoke check exercises authentication, origin validation, PDF uploads, draft privacy, editing/publication, downloads, settings validation, deletion, and logout. It cleans up its temporary brochure.

Browser checks use installed Microsoft Edge by default and capture desktop/mobile previews in `test-results/previews`. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome instead. Tests expect the initial blank contact details. For CI without an installed browser, install a Playwright browser and adjust the channel configuration.

`npm audit` currently reports an unpatched `braces` issue reached through the Next.js ESLint development tooling. The production dependency audit is checked separately. Do not run `npm audit fix --force`: its proposed fix downgrades the framework's lint configuration to Next.js 14. Recheck when a compatible patched dependency becomes available.

## Image asset

The hero is a custom photograph generated using the built-in image generation tool and saved in `public/images/hero.png`. Its exact prompt and provenance are in [docs/hero-image.md](docs/hero-image.md). Replace it with actual showroom photography when available; it is illustrative rather than a photograph of the business's real showroom. The brochure cards use a decorative category cover, not a rendered first page of the uploaded PDF.

Implementation follows the official [Next.js App Router documentation](https://nextjs.org/docs/app) and [Tailwind CSS Next.js integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
#   d r a v o l i n k t r e e  
 