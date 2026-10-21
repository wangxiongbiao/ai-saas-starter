# UI fidelity implementation

Recreates the approved homepage, template directory, revised Love Options/Stateside, pricing, My Videos and mobile layouts in React. Concept-photo crops are extracted from the approved references into public/design; they remain static illustrations, disclosed by preview controls. No verified video, duration or pricing is invented. My Videos cards are explicitly labeled design examples, with downloads disabled.

No photo is uploaded by this UI. Input supports selection, replacement, removal and drag-and-drop. Private preview access must retain its current owner and external viewer.

Pixel comparisons must use corresponding viewport dimensions. Reference images contain rasterized text and baked-in controls; this implementation uses accessible HTML and approximate system-font metrics. English is the launch language; new Chinese locale keys currently fall back to English.
