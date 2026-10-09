# BeachRooms

**Find an empty classroom to study in at Cal State Long Beach at any time this semester.**

BeachRooms is an interactive campus map showing which CSULB classrooms are free, how long they'll stay free, and when the next class starts. It works from the university's published class schedules, so students don't have to wander from building to building checking doors.

<img width="3816" height="1902" alt="image" src="https://github.com/user-attachments/assets/221e3bfb-5716-4b01-a658-cdfad92e5c59" />

## Features

- **Live availability map**: every building is a Mapbox pin colored by how many rooms are open. Each room shows its status ("Free until 2:30 PM · 1h 15m", "In use until 11:50 AM") and the day's full class timeline.
- **Time travel**: pick any date and time to see what will be free then, for planning around your schedule.
- **Building hours**: availability accounts for when buildings are actually open, including special hours for the University Library and Horn Center.
- **Study spots beyond classrooms**: library floors and Horn Center study areas, with quiet and collaborative noise labels and photos.
- **Crowdsourced signals**: signed-in users can rate whether a room was actually free during a specific time block, comment and upvote tips, and favorite rooms.
- **Parking overlay**: student and employee lots on the same map.
- **Mobile-first UI**: a bottom-sheet layout on phones and a sidebar on desktop, with fuzzy search across buildings and rooms.
- **Accounts**: Google sign-in, editable handles, and self-serve account deletion.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI, Vaul |
| Map | Mapbox GL JS |
| Data fetching | TanStack Query, Fuse.js (search) |
| Backend | Next.js Route Handlers, Supabase (Postgres, Auth, Row Level Security) |
| Data pipeline | Python, Requests, BeautifulSoup |
| Hosting | Vercel (+ Vercel Analytics) |

## How It Works

```
CSULB class schedule pages
        │  scrape_schedules.py (Python, BeautifulSoup)
        ▼
Supabase Postgres ── buildings, classrooms, class_schedules
        │  /api/rooms (cached with Next.js unstable_cache)
        ▼
Availability computed per request ──► React + Mapbox client
```

1. **Scrape.** `data-pipeline/scrape_schedules.py` crawls the public CSULB schedule-by-subject pages for the current term and parses every section's room, days, and times. It skips online, off-campus, and athletic locations. It then reloads the `class_schedules` table, refusing to wipe the table if a crawl comes back empty.
2. **Cache.** The `/api/rooms` route reads classrooms and the day's schedules from Supabase through `unstable_cache`. When the scraper finishes, it calls an authenticated `/api/revalidate` endpoint, so new data goes live immediately with no redeploy.
3. **Compute.** Availability is calculated per request in `src/lib/availability.ts` against each building's effective hours. Duplicate cross-listed sections are collapsed into one occupancy. Responses sit on the CDN for about a minute, so many users share one computation.
4. **Community data.** Ratings, comments, votes, and favorites live in Supabase tables protected by Row Level Security: anyone can read them, but users can only write their own rows.

### Engineering notes

- **Timezones.** Vercel servers run in UTC, which would make every Pacific evening read as the next day. All availability math runs on campus wall-clock time (`src/lib/campus-time.ts`), and times are sent to clients as naive local strings so they display correctly in any browser.
- **Pagination.** Supabase caps queries at 1,000 rows, so schedule fetches paginate with a stable sort order to avoid duplicated or skipped rows.
- **Scoped ratings.** "Was this room free?" votes belong to a specific recurring weekday time block, so feedback about a 1–2:30 PM gap never counts toward a different slot.
- **Lean payloads.** The API sends only the fields the UI renders, which keeps the response small even with thousands of class sections.

## Project Structure

```
src/
  app/            Next.js pages and API routes (rooms, revalidate, delete-account)
  components/     Map, sidebar, mobile sheet, room/building/study-spot detail views
  lib/            Availability engine, building hours, campus time, Supabase hooks
  data/           Static data: library floors, study spots, parking lots
data-pipeline/    Python scraper + Supabase SQL schema and RLS policies
public/assets/    Building, library, and parking photos; map pins
```
