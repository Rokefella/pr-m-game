

## Two Changes Across All Screens

### Change 1 — Global font size +1px

**Index.tsx:**
- Line 121: `text-[42px] sm:text-[52px]` → `text-[43px] sm:text-[53px]`
- Line 136: `fontSize: 12` → `fontSize: 13`

**EntityQuestions.tsx:**
- Line 58: `fontSize: 15` → `fontSize: 16`
- Line 82: `fontSize: 11` → `fontSize: 12`
- Line 113: `fontSize: 7` → `fontSize: 8`

**ProfileSetup.tsx:**
- Line 17: `fontSize: 9` → `fontSize: 10`
- Line 61: `fontSize: 7` → `fontSize: 8`
- Line 76: `fontSize: 10` → `fontSize: 11`
- Line 87: `fontSize: 7` → `fontSize: 8`
- Line 101: `fontSize: 7` → `fontSize: 8`
- Line 142: `fontSize: 7` → `fontSize: 8`
- Line 152: `fontSize: 11` → `fontSize: 12`
- Line 158: `fontSize: 7` → `fontSize: 8`
- Line 173: `fontSize: 9` → `fontSize: 10`

### Change 2 — Title slot fixes + new line (ProfileSetup.tsx)

Lines 131-162:
1. Container background: `#0a0a14` → `#0e0e1e`
2. Container border: `0.5px solid #2a2a3a` → `1px solid #3a3a5a`
3. "Title" label color: `#5a5870` → `#9a9890`
4. "—" value color: `#5a5870` → `#9a9890`
5. Hint color: `#4a4860` → `#5a5855`
6. Add new `<p>` after existing hint: `"first 500 players receive a founding title"`, className `font-mono italic`, style `fontSize: 8, color: '#5a5855', marginTop: 2`

No changes to fonts, colors (beyond specified), layout, animations, or navigation.

