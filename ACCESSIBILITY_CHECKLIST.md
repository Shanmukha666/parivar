# Parivar family accessibility checklist

This checklist records the implemented safeguards and the validation still required before making any WCAG conformance claim.

## Implemented

- [x] Mobile-first layout with responsive containers and a `100dvh` chat view.
- [x] Minimum 48px button targets; primary language choices are 64px high.
- [x] Visible `:focus-visible` outlines for keyboard users.
- [x] Labels for the chat input, callback phone input, and consent checkbox.
- [x] Dialog semantics: `role="dialog"`, `aria-modal`, and labelled heading.
- [x] Live/status messaging for escalation and loading states.
- [x] Read-aloud controls on key instructional screens.
- [x] Voice input with language-specific recognition tags, including Tamil.
- [x] Voice-input fallback message when browser speech recognition is unavailable.
- [x] Reduced-motion media query.
- [x] Icon-supported parent concern chips.
- [x] Simple source badges that keep verification status visible.
- [x] Retry path for failed chat sends through the retry suggestion.
- [x] Responsive text and layout adjustments for narrow screens.

## Required manual validation before claiming compliance

- [ ] Keyboard-only walkthrough at 320px, 375px, 768px, and 1024px.
- [ ] Screen-reader walkthrough with NVDA or VoiceOver.
- [ ] Contrast measurement for every route, including staff screens.
- [ ] Focus order and focus trapping verification for the escalation dialog.
- [ ] Touch testing on a real low-end Android device.
- [ ] Voice input testing in supported Chrome/Edge versions for English, Hindi, Telugu, and Tamil.
- [ ] Read-aloud pronunciation review by native speakers; translations remain marked DRAFT until reviewed.
- [ ] Browser zoom to 200% without loss of controls or evidence.
- [ ] Error recovery testing with offline/slow network conditions.

The project does not claim WCAG compliance from automated build checks alone.
