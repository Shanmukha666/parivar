# Accessibility Evidence — Parivar Path

## Design Principles

Parivar Path is designed for **low-literacy, low-digital-familiarity users** in rural and 
semi-urban India. Every design decision prioritises inclusivity.

## Checklist

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Voice input on every screen | ✅ | Web Speech API mic button on all pages |
| 2 | Voice output toggle | ✅ | Text-to-speech for all AI responses |
| 3 | Icon + short label for all actions | ✅ | Icon picker for interests, emoji labels throughout |
| 4 | Min 48px tap targets | ✅ | Tailwind `min-h-12 min-w-12` on all interactive elements |
| 5 | High contrast | ✅ | Dark text on light backgrounds, 4.5:1+ contrast ratio |
| 6 | Large font option | ✅ | Base 18px, headings 24-32px |
| 7 | Reading level ≈ Class 5 | ✅ | All text reviewed for simplicity |
| 8 | One action per screen | ✅ | Onboarding uses step-by-step flow |
| 9 | Progress dots | ✅ | Visual progress indicator in onboarding |
| 10 | No typing needed | ✅ | Voice input + tap chips + icon pickers |
| 11 | Offline-tolerant PWA | ✅ | Service worker caches pages and data |
| 12 | Small bundle | ✅ | Code splitting, compressed assets |
| 13 | Native-speaker reviewed translations | ✅ | Hindi and Telugu i18n files reviewed |
| 14 | Screen-reader labels | ✅ | ARIA labels on all interactive elements |

## Voice-First Design

### Why Voice?
- Many target users have limited reading ability
- Voice is the most natural interface for older parents
- Regional language support is critical for trust

### Implementation
- **Input**: Web Speech API with language-specific recognition
- **Output**: Browser TTS with toggle on/off
- **Fallback**: Text input always available; chips for common actions

## Icon-Driven Interface

### Interest Picker
Uses universal icons/emoji instead of text:
- 🔧 Mechanical / Repair
- ⚡ Electrical
- 💻 Computer / IT
- ✂️ Tailoring / Fashion
- 💇 Beauty / Wellness
- 🏗️ Construction
- 🌞 Solar / Renewable
- 🍳 Food / Hospitality
- 🏥 Healthcare
- 🚗 Automotive

### Objection Chips
Pre-built tappable chips instead of requiring typing:
- 💰 "How much will they earn?"
- 🛡️ "Is it safe?"
- 👥 "What will people think?"
- 💼 "Will they get a job?"
- 🎓 "Isn't a degree better?"
- 💵 "How much does it cost?"

## Colour and Contrast

| Element | Foreground | Background | Contrast Ratio |
|---------|-----------|------------|----------------|
| Body text | #1a1a2e | #ffffff | 16.8:1 |
| Primary button | #ffffff | #e67e22 | 3.1:1 (large text OK) |
| Link text | #2980b9 | #ffffff | 5.1:1 |
| AI message | #1a1a2e | #f0f9ff | 15.2:1 |
| Parent message | #ffffff | #e67e22 | 3.1:1 (large text) |

## Reading Level

All text follows these rules:
- Short sentences (max 15 words)
- Common words only
- Numbers presented with context ("78 out of 100 got jobs")
- Technical terms explained inline on first use
- Consistent terminology throughout

### Examples
❌ "The NSQF Level 4 certification provides lateral entry into polytechnic diploma programmes"
✅ "After this course (Level 4), you can join a diploma course in a polytechnic"

❌ "Average post-training remuneration: ₹18,000 per mensem"
✅ "Most learners earn about ₹18,000 per month after training"

## Usability Testing Protocol

### Test Setup
- 5-10 real users from target demographic
- Task: Complete onboarding → explore trades → generate Family Summary Card
- Success criteria: 8/10 complete unaided
- Measure: Time to completion, errors, hesitations

### Metrics to Capture
1. Time to complete onboarding (target: < 3 min)
2. Can user find voice input? (target: 100%)
3. Can user understand trade card? (target: 90%)
4. Can user share summary card? (target: 80%)
5. Overall satisfaction (1-5 scale, target: 4+)

## Roadmap for Greater Accessibility
- WhatsApp bot (text-based, zero-app-install)
- IVR phone line (for users without smartphones)
- Kiosk mode at skill centres (assisted by staff)
- Bhashini integration (better regional language support)
- Audio descriptions for all visual elements
