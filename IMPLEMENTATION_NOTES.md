# Lore backend implementation notes

## What changed in this build

The app now has the backend-oriented foundation needed for V1:

1. Auth routes with Supabase email/password login.
2. Protected app routes with local preview fallback.
3. Supabase client configured for React Native session persistence.
4. Postgres schema for profiles, quests, lore entries, photos, friend requests, friendships, invites, reactions and points.
5. RLS policies that keep personal data scoped to owners and friends.
6. Supabase Storage bucket and storage policies for quest photos.
7. Lore entry creation flow with photo picker, camera capture and location capture.
8. Map tab and entry map preview using react-native-maps.
9. Friend request UI by handle.
10. Lore Points as a subtle private-progress measure.

## Intentional constraints

- No algorithmic feed.
- No follower counts.
- No leaderboard.
- No streaks.
- No confetti or celebratory game mechanics.
- Points are private, quiet, and attached to completed memories.

## Known V1 gaps

- Friend request accept/decline UI is not yet implemented, though the SQL function exists.
- Quest sharing/invites have schema support but no UI flow yet.
- Reactions have schema support but no UI flow yet.
- Photo uploads are sequential for simplicity. Later, move to resilient batched uploads with retry and progress.
- Location reverse geocoding is not implemented. The user currently enters a location name and can attach coordinates.
- Supabase generated TypeScript types are not yet wired. Add them after the schema stabilises.
