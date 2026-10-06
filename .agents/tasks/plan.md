# Implementation Plan

## Logo Replacement and Carousel Image Management System

This plan implements two features: (1) Replace the CSS-based brand logo with the actual DRAVO_HOME_logo.png image, and (2) Add a full carousel image management system with admin upload/reorder/delete capabilities and a client-side carousel component that replaces the static hero image on the homepage.

---

- [ ] 1. Replace CSS-based logo with DRAVO_HOME_logo.png image in the Brand component.
      Update src/components/brand.tsx to use Next.js <Image> component with /DRAVO_HOME_logo.png instead of the CSS .brand-symbol + .brand-name markup. The logo file (2172×724px) will be sized to match the current brand dimensions (approximately 34px height for the symbol + 28px font for name ≈ 50-60px total height). Use priority loading, maintain the light prop for color variants, and preserve the Link wrapper and aria-label. Add CSS class .brand-logo-image for styling control.
      Files: src/components/brand.tsx, src/app/globals.css
      Verify: `npm run typecheck` passes with no errors in brand.tsx, and visually inspect the header at http://localhost:3001 to confirm the logo displays correctly and maintains layout.

- [ ] 2. Add CarouselImage type and update Database schema.
      Add `export type CarouselImage = { id: string; filename: string; alt: string; order: number; createdAt: string; }` to src/lib/types.ts. Update the Database type to include `carouselImages: CarouselImage[]`. Update emptyDatabase in src/lib/store.ts to include `carouselImages: []`.
      Files: src/lib/types.ts, src/lib/store.ts
      Verify: `npm run typecheck` passes with no type errors.

- [ ] 3. Create carousel image validation and helper functions.
      Add image validation functions to src/lib/validation.ts: `MAX_IMAGE_SIZE = 5 * 1024 * 1024` constant, `validateCarouselImage(buffer: Uint8Array, filename: string)` to check file is jpg/jpeg/png/webp and under 5MB by checking magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46), and `carouselImageFields(input: Record<string, unknown>)` to validate alt text (max 200 chars) and order (number).
      Files: src/lib/validation.ts
      Verify: `npm run typecheck` passes with no errors in validation.ts.

- [ ] 4. Create POST and GET endpoints for carousel images at /api/carousel.
      Create src/app/api/carousel/route.ts with runtime = "nodejs". POST endpoint: auth-gated with guard(), accepts multipart/form-data with file (image, max 5MB) and alt (string) fields, validates using validateCarouselImage(), saves to public/images/carousel/ directory with UUID filename, adds CarouselImage record to database with order = max(existing orders) + 1, returns 201 with {image: CarouselImage}. GET endpoint: returns all carousel images sorted by order ascending as {images: CarouselImage[]}.
      Files: src/app/api/carousel/route.ts
      Verify: `npm run typecheck` passes, and `npm run build` completes without errors.

- [ ] 5. Create PATCH and DELETE endpoints for individual carousel images at /api/carousel/[id].
      Create src/app/api/carousel/[id]/route.ts with runtime = "nodejs" and dynamic = "force-dynamic". PATCH endpoint: auth-gated with guard(), accepts JSON with optional alt and order fields, updates the carousel image record, returns {image: CarouselImage}. DELETE endpoint: auth-gated with guard(), removes the image file from public/images/carousel/, removes the database record, returns {success: true}. Both return 404 if image not found.
      Files: src/app/api/carousel/[id]/route.ts
      Verify: `npm run typecheck` passes, and `npm run build` completes without errors.

- [ ] 6. Create the Carousel client component.
      Create src/components/carousel.tsx as a "use client" component. Accepts `images: CarouselImage[]` prop. If empty, falls back to displaying the existing /images/hero.png with the same hero-photo styling. If not empty, displays images in a carousel: auto-advances every 5 seconds, has prev/next buttons (lucide-react ChevronLeft/ChevronRight), dot indicators at the bottom showing current slide, uses Next.js Image with fill and object-fit cover. Includes the existing .photo-shade overlay, .photo-label, .photo-copy with heading and text, .photo-bottom, and .photo-index elements on top of the carousel. Uses React useState for current index, useEffect for auto-advance with cleanup, and keyboard navigation (ArrowLeft/Right).
      Files: src/components/carousel.tsx
      Verify: `npm run typecheck` passes with no errors, and `npm run lint` passes.

- [ ] 7. Add Carousel tab to admin dashboard.
      Update src/components/admin-dashboard.tsx: add "carousel" to the tab state type (line 9: `useState<"brochures" | "settings" | "carousel">`), add a "Carousel images" navigation button in the sidebar with an Images icon from lucide-react, create carousel state management (useState for carouselImages array, fetched via GET /api/carousel on mount and after mutations), create a carousel tab section following the brochures pattern with: drag-drop upload zone accepting jpg/png/webp up to 5MB, table showing thumbnail preview (Next.js Image 60×40px object-cover), alt text, order, and action buttons (Edit alt - opens inline input or small modal, Move up/down arrows to reorder via PATCH with adjusted order values, Delete with confirmation dialog). Use the same visual patterns and components as the brochures tab.
      Files: src/components/admin-dashboard.tsx
      Verify: `npm run typecheck` passes, manually test admin interface at http://localhost:3001/admin after running `npm run dev` to confirm the new tab renders and all controls are present.

- [ ] 8. Update home page to use Carousel component.
      Update src/app/page.tsx: read carouselImages from database (add to readDatabase() call), pass to new Carousel component import, replace the existing `<div className="hero-photo"><Image src="/images/hero.png" ... /></div>` block with `<Carousel images={carouselImages} />`. Keep all other home page structure unchanged.
      Files: src/app/page.tsx
      Verify: `npm run typecheck` passes, `npm run build` completes without errors, and visually inspect http://localhost:3001 to confirm the carousel displays correctly (or falls back to hero.png if no images uploaded).

- [ ] 9. Add CSS styles for carousel controls and admin carousel tab.
      Add to src/app/globals.css: `.brand-logo-image { height: 50px; width: auto; object-fit: contain; }` for the logo, carousel navigation styles (`.carousel-container`, `.carousel-slide`, `.carousel-nav` for prev/next buttons positioned absolutely on left/right edges, `.carousel-dots` for dot indicators centered at bottom), `.carousel-nav button` hover states matching existing button patterns, `.admin-carousel-preview { width: 60px; height: 40px; object-fit: cover; }` for admin thumbnails, and `.carousel-reorder-buttons` for up/down action buttons.
      Files: src/app/globals.css
      Verify: `npm run build` completes without CSS errors, and visual inspection at http://localhost:3001 confirms all styles render correctly.

- [ ] 10. Create public/images/carousel directory and test the complete flow.
      Create the public/images/carousel directory. Test: (1) Logo replacement - visit http://localhost:3001 and confirm DRAVO_HOME_logo.png displays in header. (2) Admin carousel tab - sign in to /admin, navigate to Carousel tab, upload 2-3 test images, verify thumbnails appear, test reordering with up/down buttons, test editing alt text, test delete with confirmation. (3) Public carousel - visit homepage and confirm carousel displays uploaded images with auto-advance, prev/next buttons work, dot indicators update, and keyboard navigation functions. (4) Fallback - delete all carousel images and confirm hero.png fallback displays correctly.
      Files: public/images/carousel/ (directory creation)
      Verify: Run `npm run typecheck && npm run lint && npm run build` - all must pass without errors. Manual testing of all features confirms functionality.

---

## Design Decisions

**Logo sizing**: The current CSS brand layout uses a 34×38px symbol plus 28px font name. The new logo image (2172×724px, ~3:1 aspect ratio) will be sized to 50px height with auto width to maintain aspect ratio and fit the existing header space. CSS will provide fallback sizing and object-fit contain for proper scaling.

**Carousel storage**: Images are stored locally in `public/images/carousel/` as files (not using pdf-storage since that's R2-specific for PDFs). This matches the existing local-first architecture where the app runs on one Node instance with persistent disk. Filenames are UUIDs to prevent conflicts and path traversal issues.

**Carousel fallback**: When no carousel images exist, the component falls back to the existing hero.png to maintain visual consistency and prevent a broken homepage experience for new installations.

**Image validation**: Magic byte checking for JPEG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A), and WebP (52 49 46 46...57 45 42 50) ensures only valid images are uploaded. 5MB limit balances quality with reasonable page load performance.

**Carousel reordering**: Uses explicit order field (number) rather than array index. When moving up/down, swap order values with the adjacent item. This approach survives concurrent edits better than reindexing the entire array and matches common CMS patterns.

**Auto-advance timing**: 5-second interval provides enough time to read overlay copy while maintaining visual interest. Pauses on user interaction (manual nav) for 10 seconds before resuming auto-advance to respect user intent.

**Admin UI patterns**: Carousel tab follows the established brochures pattern - same layout, same drag-drop upload zone, same table structure, same modal patterns for editing - ensuring consistency and reusing the existing elegant visual language.

**Accessibility**: Carousel includes keyboard navigation (ArrowLeft/Right), aria-labels on all buttons, proper alt text on images (user-provided), and respects prefers-reduced-motion to disable auto-advance for users who need it.
