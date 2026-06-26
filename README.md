# Lore

Lore is a premium React Native + Expo mobile app for collecting real-world experiences as beautifully preserved memories.

This build adds the first real backend spine:

- Supabase Auth email/password login
- Supabase Postgres schema with row-level security
- Supabase Storage photo uploads
- Curated quest database
- Lore entry creation with photos
- Location capture and map display
- Friend request foundation
- Private friend activity feed foundation
- Classy Lore Points system without streaks, leaderboards, or gamified noise

The app still supports local preview mode if Supabase is not configured.

## Run locally on Android emulator

```bash
cd lore_mockup
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
npx expo-doctor
npx expo start --android
```

If the Android emulator is already open, Expo will install and launch the app. If it does not, start an Android Virtual Device from Android Studio Device Manager, then run:

```bash
npx expo start
```

Press `a` in the Expo terminal.

## Set up Supabase backend

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Paste and run `supabase/seed.sql`.
5. Go to Project Settings > API.
6. Copy the Project URL and anon public key.
7. Create `.env.local` in this project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

8. Restart Expo with a cleared cache:

```bash
npx expo start --clear --android
```

## Current architecture

```text
app/
  (auth)/              Auth screens
  (app)/               Protected app routes
    (tabs)/            Today, Explore, Lore, Map, People
    quest/[id].tsx     Quest detail
    complete/[questId].tsx
    lore/[id].tsx      Lore detail
src/
  features/
    auth/              Auth provider and session state
    app/               Local preview state
    quests/            Quest API and UI
    lore/              Lore entry API and UI
    map/               Map components
    social/            Friend activity and requests
    points/            Points UI
  shared/
    components/        Reusable UI primitives
    data/              Preview data
    design/            Design tokens
    types/             Domain types
supabase/
  schema.sql           Tables, RLS, triggers, storage bucket
  seed.sql             Curated quests
```

## Product stance

Lore Points are intentionally restrained. They acknowledge completed experiences and photographs, but there are no streaks, leaderboards, follower counts, public rankings, or dopamine loops.

The product remains a travel journal that encourages action, not a habit tracker or social game.
