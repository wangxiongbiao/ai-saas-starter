# Photo to Dance — development checkpoint

This branch implements a first UI slice against PROJECT_PLAN.zh-CN.md and UI_STYLE_GUIDE.zh-CN.md.

Implemented:
- Responsive cream/black public shell, homepage, template directory, Love Options and Stateside pages, and prelaunch pricing.
- Local-only image selection, JPG/PNG/WebP MIME filtering, browser preview, replacement/removal, and object URL cleanup.
- Explicit unavailable templates, 9:16 placeholder previews, no-music disclosure, FAQ, limitations, and input guidance.
- No invented prices, durations, credits, real examples, or successful generation.
- Prelaunch pages are noindex until verified templates are available.

Not implemented:
- Upload to private storage, generation provider, background tasks, credit deduction/refund, result persistence and downloads.
- My Videos and template administration.
- Verified media and pixel-level comparison against approved PNGs (repository contains only their inventory).

Validation:
- Reviewed changed UI for unsafe HTML, server secrets, mutation endpoints, and fake payment/generation actions. None added.
- Browser execution, TypeScript, production build and the Python security scanner could not run in the originating session.
- CI workflow runs build, type checking and the repository scanner on the branch; inspect its actual result before merging.
- Chinese message keys are present; untranslated new copy intentionally falls back to English for this English-first implementation.
- Do not treat this checkpoint as recovery of the previously reported unpushed local implementation.
