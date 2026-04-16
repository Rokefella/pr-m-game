

## Add Entity Questions and Profile Setup Screens

### Overview
Add two new screens with navigation flow: Launch → Entity Questions → Profile Setup.

### Files to Create/Modify

**1. `src/pages/EntityQuestions.tsx`** — Screen 2
- Full viewport, centered layout on #04040a
- Custom SVG eye icon (52×30px) with purple tones and pulse animation
- Question: "Why have you come to this place?" in IM Fell English italic
- Three option buttons with hover states, sharp corners, purple-tinted backgrounds
- Warning text in DM Mono 7px
- On option click → navigate to `/profile-setup`

**2. `src/pages/ProfileSetup.tsx`** — Screen 3
- Full viewport with padding, flex column layout
- "Who are you?" title in Cinzel
- Avatar placeholder (64px circle with silhouette SVG + outer ring)
- Username input field with DM Mono styling, placeholder, and warning text
- Aura colour picker: 5 circles (20px), last selected by default with purple border
- Title slot: locked display with hint text
- CTA button "ENTER THE DIMENSION" pinned to bottom via `margin-top: auto`

**3. `src/pages/Index.tsx`** — Update ENTER button
- Import `useNavigate` from react-router-dom
- Add `onClick={() => navigate('/entity-questions')}` to ENTER button

**4. `src/App.tsx`** — Add routes
- Import `EntityQuestions` and `ProfileSetup`
- Add `/entity-questions` and `/profile-setup` routes

**5. `src/index.css`** — Add eye-pulse keyframe
- `eye-pulse`: opacity 0.6 ↔ 1.0, 4s ease-in-out infinite

All text elements will have explicit font-family classes (`font-fell`, `font-cinzel`, `font-mono`) — no reliance on inheritance.

