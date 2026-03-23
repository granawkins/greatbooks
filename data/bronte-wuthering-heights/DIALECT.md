# Wuthering Heights — Dialect Substitution Table

Joseph's Yorkshire dialect is unlistenable in TTS as-is. This table documents planned
substitutions to make it listenable without losing character. Apply before regenerating
affected chapters.

## Strategy
- Keep unusual spellings that TTS handles acceptably (e.g. "Ech", "Wisht", "Bud")
- Substitute patterns that TTS reads as isolated letters or sounds wrong
- Prioritise the most frequent/egregious offenders

## Substitution Table

| Original | → TTS-friendly | Count | Notes |
|----------|---------------|-------|-------|
| `t'` | `the` | high | "t' maister" → "the master" |
| `th'` | `the` | high | "th' back" → "the back" |
| `o'` | `of` | 26 | "pack o' corn" → "pack of corn" |
| `on'` | `of` | 4 | "one on 'em" → "one of them" |
| `wi'` | `with` | 2 | "hend wi't" → "hand with it" |
| `'em` | `them` | high | "laced 'em" → "laced them" |
| `i'` | `in` | — | tricky — also matches contractions; needs context |
| `maister` | `master` | 23 | |
| `yah` | `you` | 19 | |
| `nowt` | `nothing` | 10 | |
| `mun` | `must` | 9 | |
| `soa` | `so` | 7 | |
| `flaysome` | `frightful` | 6 | |
| `thear` | `there` | 6 | |
| `niver` | `never` | 6 | |
| `noan` | `none` | 6 | |
| `happen` | `perhaps` | 6 | (common English word too — check context) |
| `nobbut` | `nothing but` | 4 | |
| `goan` | `gone` | 4 | |
| `weel` | `well` | 4 | |
| `getten` | `gotten` | 4 | |
| `allas` / `allus` | `always` | 4/1 | |
| `agean` | `again` | 3 | |
| `coom` | `come` | 3 | |
| `owd` | `old` | 2 | |
| `riven` | `torn` | 2 | |
| `afore` | `before` | 2 | |
| `amang` | `among` | 2 | |
| `mensful` | `respectable` | 2 | |
| `wad` | `would` | 1 | |
| `laced` | `thrashed` | 1 | |
| `pawsed` | `pushed` | 1 | |
| `varry` | `very` | 1 | |
| `abaht` | `about` | 1 | |
| `lig` | `lie` | 1 | |
| `owt` | `anything` | 1 | |
| `dee` | `die` | 1 | careful — also valid English word |
| `sarved` | `served` | 1 | |
| `ahr` | `our` | 1 | |

## Other patterns to handle
- `ha'` → `have` (in "wad ha'" = "would have", "mud ha'" = "might have")
- `un'` → `and` ("un' Heathcliff's" → "and Heathcliff's")
- `yo'` → `you`
- Capitalisation fix: `t'` at sentence start → `The`

## Status
- [ ] Substitution script written
- [ ] Tested on sample passage
- [ ] Applied to chapters.json
- [ ] Affected chapters regenerated
- [ ] Audio spliced and re-uploaded to GCS

## Note for readers
*The original text preserves Joseph's thick Yorkshire dialect exactly as Brontë wrote it.
The audio narration uses phonetic substitutions to aid listenability while retaining
the character's distinct voice and unusual vocabulary.*
