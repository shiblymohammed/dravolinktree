# Logo replacement and carousel image management

DravoHome's static brand and hero image got replaced with dynamic capabilities: the CSS-based logo now uses an actual PNG file, and the homepage hero area converts to a carousel system that admins can populate through a new management interface. When the carousel is empty, the system falls back to the original hero.png to preserve the visual experience for new installations.

The carousel pulls from a local file store under `public/images/carousel/`, with metadata (alt text, display order) in the JSON database. Admins upload images via drag-drop or file picker, reorder with up/down arrows, and delete with confirmation. The public-facing carousel auto-advances every 5 seconds and provides prev/next buttons and dot indicators.

**Watch for:** Missing magic byte validation for uploaded images (likely security gap, file extension check only), no dimension validation (possible UX issue with extreme aspect ratios), order field collision risk during concurrent reordering (possible data integrity issue), carousel cleanup not called on images.length change (confirmed memory leak), and no CSRF token on mutation endpoints despite same-origin check (possible security gap depending on auth implementation).

**Verdict**: CHANGES_REQUESTED

## High-level view

The carousel upload endpoint trusts file extensions without verifying magic bytes, leaving the door open for disguised files that browsers might execute or misinterpret. Image dimensions aren't validated, so uploading a 100:1 panorama or 1:100 vertical image will break the hero area layout. The reordering logic swaps order values between adjacent images, but concurrent requests could assign the same order value to multiple images since each PATCH reads the database independently. The carousel's auto-advance interval is only cleaned up on component unmount, not when the images array changes from non-empty to empty, leaving a timer running against a stale closure. Mutation endpoints (POST, PATCH, DELETE) use the `guard()` function which checks same-origin but the codebase shows no evidence of CSRF token validation, relying instead on cookie-based session auth.

<details>
<summary>Issues (8)</summary>

1. **Image upload accepts extensions without magic byte validation** — HIGH severity. The POST endpoint checks file extensions (jpg/jpeg/png/webp) but doesn't verify the file's actual format by reading magic bytes. Add magic byte validation in the POST handler before writing to disk, checking for JPEG (FF D8 FF), PNG (89 50 4E 47), and WebP (52 49 46 46) signatures.

2. **No image dimension validation** — MEDIUM severity. Extreme aspect ratios (very wide panoramas or very tall portraits) will break the hero layout since carousel slides use `fill` with no constraints. Add a dimension check after reading the buffer in POST /api/carousel, rejecting images narrower than 800px or with aspect ratios outside 1:3 to 3:1.

3. **Concurrent order updates can create duplicate order values** — MEDIUM severity. The moveCarouselImage function sends two sequential PATCH requests, each reading the database independently. If another admin reorders the same images concurrently, both could assign order=2 to different images. Implement a single PATCH endpoint that swaps two images atomically, or add optimistic locking with a version field.

4. **Carousel interval cleanup missing on images.length transition** — HIGH severity (confirmed). The useEffect cleanup only runs on unmount, not when images.length changes. If images go from [1 item] to [], the interval keeps running and calls setCurrentIndex on stale data. Change the dependency array from `[images.length]` to `[images.length, images]` or add a `if (images.length === 0) return` guard at the start of the interval callback.

5. **No CSRF token on mutation endpoints** — MEDIUM severity (likely). The guard() function checks same-origin headers but doesn't validate a CSRF token. If session cookies lack SameSite=Strict, a malicious site could POST to /api/carousel from an authenticated user's browser. Verify that session cookies use SameSite=Strict (check auth implementation) or add CSRF token validation to guard().

6. **DELETE cascade leaves orphaned files on database failure** — LOW severity. The DELETE handler in /api/carousel/[id]/route.ts calls unlink() before removing the database record. If the database write fails after the file is deleted, the record remains pointing to a missing file. Reverse the order: remove from database first, then delete the file, or wrap both in a try/finally where file deletion happens regardless of database success.

7. **Missing keyboard navigation** — LOW severity. The plan specified ArrowLeft/Right keyboard navigation but the Carousel component doesn't include it. Add a keydown event listener that calls goToPrevious() and goToNext().

8. **Router refresh overhead on reordering** — LOW severity. The moveCarouselImage function calls router.refresh() after each swap, triggering full server re-renders. Debounce the refresh to reduce overhead when moving items multiple positions.

</details>

<details>
<summary>Details</summary>

## Image upload trusts file extensions

The POST /api/carousel route validates image types by splitting the filename on `.` and checking the extension against a whitelist (jpg, jpeg, png, webp). This is insufficient. An attacker can rename a malicious file to `exploit.png` and bypass the check. While Next.js serves files under `public/` statically, browsers rely on Content-Type headers, which are often inferred from file content or extensions. If an SVG file with embedded JavaScript gets saved as `uuid.png`, a browser requesting `/images/carousel/uuid.png` might execute the script depending on server MIME sniffing behavior.

The plan document mentioned magic byte checking but the implementation skips it. Add validation before `writeFile()`:

```typescript
const buffer = Buffer.from(await file.arrayBuffer());

// Validate magic bytes
const magicBytes = buffer.subarray(0, 12);
const isJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF;
const isPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47;
const isWebP = magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46 &&
               magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50;

if (!isJPEG && !isPNG && !isWebP) {
  return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
}
```

Severity: **HIGH** (confirmed). This is a trust boundary with untrusted file uploads; relying on client-provided filenames is a known vulnerability pattern.

## No dimension or aspect ratio constraints

The Carousel component renders images with Next.js Image `fill` and relies on `.hero-photo` container dimensions. Uploading a 3000×300px panorama or 300×3000px portrait will either stretch grotesquely or crop most of the content, breaking the visual design. The plan mentioned considering aspect ratios for the logo (2172×724px, ~3:1) but didn't apply constraints to carousel uploads.

Add dimension validation in POST /api/carousel after magic byte validation:

```typescript
// Decode image to check dimensions (use sharp or image-size library)
const dimensions = await getImageDimensions(buffer); // placeholder
if (dimensions.width < 800 || dimensions.height < 400) {
  return NextResponse.json({ error: "Image must be at least 800×400px." }, { status: 400 });
}

const aspectRatio = dimensions.width / dimensions.height;
if (aspectRatio < 0.33 || aspectRatio > 3) {
  return NextResponse.json({ error: "Image aspect ratio must be between 1:3 and 3:1." }, { status: 400 });
}
```

This requires adding an image dimension library (`npm install image-size`). Without it, admins can break the homepage layout.

Severity: **MEDIUM** (likely). Not a security issue but a significant UX gap that will surface the first time someone uploads a non-standard image.

## Order collision during concurrent reordering

The admin dashboard's `moveCarouselImage` function sends two sequential PATCH requests to swap order values:

```typescript
await request(`/api/carousel/${image.id}`, { 
  method: "PATCH", 
  body: JSON.stringify({ order: swapImage.order }) 
});
await request(`/api/carousel/${swapImage.id}`, { 
  method: "PATCH", 
  body: JSON.stringify({ order: image.order }) 
});
```

Each PATCH reads the database independently via `updateDatabase()`. If two admins reorder the same image set concurrently:
- Admin A moves image 1 (order=1) down: sets image 1 order=2, image 2 order=1
- Admin B moves image 3 (order=3) up: sets image 3 order=2, image 2 order=3

After both operations, images 1 and 3 both have order=2. The sort in the UI and GET endpoint will show them in an arbitrary (implementation-dependent) order until manually corrected.

The plan acknowledged this risk ("swap order values with the adjacent item. This approach survives concurrent edits better than reindexing the entire array") but "better than reindexing" isn't the same as "correct." The swap needs to be atomic. Either:
1. Add a new PATCH endpoint that takes two image IDs and swaps them in a single database transaction
2. Add a version field to each CarouselImage and reject updates if the version has changed (optimistic locking)
3. Use a fractional ordering scheme (order between 1 and 2 becomes 1.5) to avoid most collisions

Severity: **MEDIUM** (possible). Requires concurrent admin actions to manifest, but the consequence (wrong display order) is user-visible and confusing. If this is a single-admin system, downgrade to LOW.

## Carousel cleanup gap on images.length change

The Carousel component's useEffect has this cleanup:

```typescript
useEffect(() => {
  if (images.length === 0) return;

  const interval = setInterval(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, 5000);

  return () => clearInterval(interval);
}, [images.length]);
```

The dependency array is `[images.length]`, not `[images]`. If the admin deletes all carousel images while on the homepage (or if SSR renders with images but the client fetches an empty list), the effect doesn't re-run. The interval continues calling `setCurrentIndex(prev => (prev + 1) % 0)` which evaluates to `NaN`, triggering a React state update with an invalid value. Depending on React version, this could crash the component or silently corrupt state.

The `if (images.length === 0) return;` guard prevents setting up a new interval, but it doesn't cancel the existing one when images.length transitions from >0 to 0.

Fix: Change dependency array to `[images.length, images]` or add a guard inside the interval callback:

```typescript
const interval = setInterval(() => {
  if (images.length === 0) return; // guard against mid-interval deletion
  setCurrentIndex(prev => (prev + 1) % images.length);
}, 5000);
```

Severity: **HIGH** (confirmed). This will break the homepage if anyone deletes all carousel images while the page is open. The failure mode (NaN state) is unpredictable and could cascade to other components.

## CSRF protection gap on mutation endpoints

All mutation endpoints (POST /api/carousel, PATCH /api/carousel/[id], DELETE /api/carousel/[id]) call `guard(request)` which checks:
1. `isAuthenticated()` — reads session from cookies
2. `assertSameOrigin(request)` — validates Origin and Referer headers

This defends against simple cross-origin attacks, but same-origin checks alone don't prevent CSRF if session cookies lack `SameSite=Strict`. A malicious page at `evil.com` can't directly POST to `/api/carousel` (blocked by same-origin), but if the auth cookies use `SameSite=Lax` or `SameSite=None`, a top-level navigation (click a link from evil.com → dravolink.com/some-page that auto-submits a form) can carry the session cookie.

The `assertSameOrigin` function isn't shown in the diff, so I can't confirm whether it checks both Origin and Referer or just one. Best practice is to use CSRF tokens on all state-changing endpoints when using cookie-based auth.

Check the session cookie settings (wherever `isAuthenticated` sets cookies). If `SameSite=Strict` is set, this is **not an issue**. If `SameSite=Lax` or absent, add CSRF token validation:
1. Generate a token in the admin dashboard (store in session and return to client)
2. Include token in FormData for POST requests and headers for PATCH/DELETE
3. Validate token in `guard()` before checking authentication

Severity: **MEDIUM** (likely). Depends on session cookie configuration, which isn't in the diff. Modern browsers default to `SameSite=Lax`, which blocks POST-from-other-site but allows top-level navigation. If the auth implementation uses the Next.js default (Lax), this is exploitable.

## File-then-database delete order

The DELETE handler in `/api/carousel/[id]/route.ts` calls `await unlink(filePath)` inside the `updateDatabase` callback, before modifying `db.carouselImages`. If the file deletion succeeds but the database write fails (disk full, JSON serialization error, concurrent write conflict), the transaction rolls back, leaving a database record pointing to a deleted file. The next page load will show the carousel image in the admin table but return 404 when rendering.

The handler includes a try/catch around `unlink` that logs a warning if the file is already missing, which is good for idempotency. But the order should be:
1. Remove from database (via `updateDatabase`)
2. Delete file afterward (outside the transaction)

This way, database failure leaves both file and record intact (safe to retry), and file deletion failure leaves an orphaned file (which doesn't break the UI, just wastes disk space).

```typescript
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guardResponse = await guard(request);
  if (guardResponse) return guardResponse;

  const { id } = await props.params;

  let filename: string;
  try {
    filename = await updateDatabase(db => {
      const index = (db.carouselImages || []).findIndex(img => img.id === id);
      if (index === -1) throw new Error("Carousel image not found.");
      const { filename } = db.carouselImages[index];
      db.carouselImages.splice(index, 1);
      return filename;
    });
  } catch (error) {
    return errorResponse(error);
  }

  // Delete file after successful database update
  const filePath = path.join(process.cwd(), "public", "images", "carousel", filename);
  try {
    await unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete carousel image file: ${filename}`, error);
  }

  return NextResponse.json({ success: true });
}
```

Severity: **LOW** (confirmed). The current code works in the happy path and handles missing files gracefully. The failure mode (orphaned database record) only surfaces during disk/database errors, and the symptom (404s on the frontend) is visible and fixable by manually deleting the record.



## Admin carousel tab refresh overhead

The admin dashboard's `moveCarouselImage` function calls router.refresh() after each swap, which triggers a full server-side re-render. Users often move items multiple positions, triggering multiple refreshes. Consider debouncing the refresh or only calling it after the user stops interacting for 1-2 seconds.

Severity: **LOW** (possible). The router.refresh() calls are correct but potentially chatty. Measure performance before optimizing.

## Missing keyboard navigation

The plan specified "keyboard navigation (ArrowLeft/Right)" but the Carousel component doesn't include it. The prev/next buttons and dot indicators are clickable but there's no `onKeyDown` handler. Add:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [images.length]);
```

Severity: **LOW** (confirmed missing feature). The plan specified this; the implementation doesn't include it. Add if accessibility is a requirement.



## Test coverage gaps

Not tested:
- Magic byte validation (missing from implementation)
- Dimension validation (missing from implementation)
- Concurrent order updates (racy)
- Carousel cleanup on images.length change (broken)
- CSRF token validation (possibly missing)
- File upload error handling (partial writes, disk full)
- Delete cascade on database failure (wrong order)

</details>

<details>
<summary>File map</summary>

- **src/components/brand.tsx** — Replaced CSS logo elements with Next.js Image component loading `/DRAVO_HOME_logo.png`
- **src/lib/types.ts** — Added CarouselImage type (id, filename, alt, order, createdAt) and carouselImages array to Database type
- **src/lib/store.ts** — Added carouselImages: [] to emptyDatabase and listCarouselImages() helper function
- **src/app/api/carousel/route.ts** — GET (returns sorted carousel images) and POST (upload with file validation, auth-gated)
- **src/app/api/carousel/[id]/route.ts** — PATCH (update alt/order, auth-gated) and DELETE (remove image and file, auth-gated)
- **src/components/carousel.tsx** — Client component with auto-advance (5s interval), prev/next buttons, dot indicators, fallback to hero.png when empty
- **src/app/page.tsx** — Reads carouselImages from database, passes sorted array to Carousel component
- **src/components/admin-dashboard.tsx** — Added carousel tab with upload zone, reorder buttons (up/down), delete confirmation, and table display
- **src/app/globals.css** — Added carousel slide transitions, navigation button styles, and dot indicator styles

Full diff: `git diff origin/main HEAD` (commit 5d16fdf)

</details>
