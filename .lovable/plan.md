

## Two Fixes

### 1. Entity Questions — Button styling + warning text
**File: `src/pages/EntityQuestions.tsx`**
- Change button `background` from `rgba(169,140,255,0.04)` → `rgba(169,140,255,0.03)`
- Change button `border` from `0.5px solid rgba(169,140,255,0.18)` → `0.5px solid rgba(169,140,255,0.15)`
- Change "choose carefully" text `color` from `#2a2825` → `#3a3835`

### 2. Profile Setup — Constrain to 390px mobile column
**File: `src/pages/ProfileSetup.tsx`**
- Add `maxWidth: 390px` and `margin: '0 auto'` to the outer container div
- All existing text colors remain unchanged (labels #9a9890, hints #5a5855, etc.)

