# horin

Strona HORIN — https://horin.pl (GitHub Pages, bez builda: vanilla HTML/CSS/JS + Three.js).

| Plik | Co to jest |
|---|---|
| `index.html` | kolekcja „Deformed in Concrete” (kolumna + spirala zdjęć) |
| `twoj-dawid.html` | kostium sceniczny „Twój, Dawid — Letnie Brzmienia” (scena 3D `assets/models/stage.glb`) |
| `contact.html` | formularz kontaktowy → Supabase |
| `admin.html` | panel: zdjęcia, teksty PL/EN z tłumaczeniem AI, zgłoszenia, statystyki |

## Backend (Supabase `bprgedjtklowtmspimtr`)

- schemat i uprawnienia: `supabase/migrations/001_init.sql`
- tłumaczenie PL → EN: `supabase/functions/translate/` (sekret `BARABASH_AI_KEY` ustawiony w Supabase, nie w repo)
- strona czyta treści jednym zapytaniem (`assets/js/content.js`); gdy backend nie odpowiada, używa
  pamięci podręcznej, a potem tekstów z `assets/js/dict.js` i zdjęć z `assets/img/`

W repo jest tylko klucz publiczny (`sb_publishable_…`) — wszystkie zapisy chroni RLS.

## Podgląd lokalny

```
python3 -m http.server 8765
```
