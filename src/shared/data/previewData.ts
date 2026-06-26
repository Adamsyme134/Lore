import type { FriendMoment, LoreEntry, Quest } from "../types/domain";

export const previewQuests: Quest[] = [
  {
    id: "sunrise-high-place",
    slug: "sunrise-high-place",
    title: "Watch sunrise from somewhere high",
    kicker: "Before the city starts",
    description: "Find a hill, bridge, rooftop cafe, college tower view or quiet overlook. Arrive before first light. Stay until the city has fully woken up.",
    whyItMatters: "The point is not fitness or optimisation. It is the feeling of seeing somewhere familiar become strange again.",
    locationHint: "A high place within 30 minutes",
    duration: "60-90 min",
    mood: "quiet",
    accent: "gold",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    steps: [
      "Choose the place tonight, not tomorrow morning.",
      "Bring coffee or something warm.",
      "Take one photograph only after the sun has broken the horizon.",
      "Write three lines about what felt different."
    ],
    journalPrompt: "What did the city look like before it belonged to anyone else?",
    pointsValue: 10
  },
  {
    id: "unknown-cafe",
    slug: "unknown-cafe",
    title: "Enter a cafe you have always walked past",
    kicker: "One unopened door",
    description: "Pick a cafe you have noticed but never entered. Order slowly. Sit without scrolling for at least twenty minutes.",
    whyItMatters: "Small discoveries compound into a richer mental map of your own city.",
    locationHint: "Somewhere familiar, but untried",
    duration: "45 min",
    mood: "curious",
    accent: "forest",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=85",
    steps: [
      "Walk without checking reviews.",
      "Ask what they recommend.",
      "Notice one detail you would have missed from the street.",
      "Save the receipt or photograph the table."
    ],
    journalPrompt: "What did this place reveal once you were inside?",
    pointsValue: 10
  },
  {
    id: "train-no-plan",
    slug: "train-no-plan",
    title: "Take a train without planning the destination",
    kicker: "A deliberate detour",
    description: "Go to the station, pick a reachable stop that feels unfamiliar, and spend two hours there with no itinerary.",
    whyItMatters: "Unplanned movement breaks the compression of routine. The memory comes from relinquishing certainty.",
    locationHint: "A station within reach",
    duration: "Half day",
    mood: "wild",
    accent: "navy",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1600&q=85",
    steps: [
      "Set a maximum travel budget.",
      "Choose the platform before the destination.",
      "Walk for twenty minutes before opening maps.",
      "Find one object, view or conversation worth remembering."
    ],
    journalPrompt: "What did you find because you refused to over-plan?",
    pointsValue: 12
  },
  {
    id: "independent-cinema",
    slug: "independent-cinema",
    title: "See a film at an independent cinema",
    kicker: "A room full of strangers",
    description: "Choose a film you would not normally stream. Arrive early enough to read the programme notes.",
    whyItMatters: "The cinema turns passive watching into a place, a ritual and a shared atmosphere.",
    locationHint: "Independent cinema or film society",
    duration: "Evening",
    mood: "social",
    accent: "burgundy",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=85",
    steps: [
      "Invite one person whose taste differs from yours.",
      "Do not watch the trailer first.",
      "Stay through the credits.",
      "Discuss the best image from the film afterwards."
    ],
    journalPrompt: "Which frame stayed with you after leaving the building?",
    pointsValue: 10
  },
  {
    id: "sketch-in-public",
    slug: "sketch-in-public",
    title: "Sketch something in public",
    kicker: "Look longer than usual",
    description: "Sit somewhere ordinary and draw a building, tree, table, person from memory or street corner. Quality is irrelevant. Attention is the point.",
    whyItMatters: "Drawing slows perception. You leave with a memory made by attention, not consumption.",
    locationHint: "Park, square, museum or cafe",
    duration: "30 min",
    mood: "creative",
    accent: "orange",
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=85",
    steps: [
      "Use paper, not a phone.",
      "Pick one subject and stay with it.",
      "Add the date and location to the page.",
      "Photograph the sketch beside the scene."
    ],
    journalPrompt: "What did drawing force you to notice?",
    pointsValue: 8
  }
];

export const previewLoreEntries: LoreEntry[] = [
  {
    id: "entry-rain-cinema",
    title: "Rain outside the Phoenix",
    date: "17 May 2026",
    occurredAt: "2026-05-17T20:30:00.000Z",
    location: "East Oxford",
    latitude: 51.7489,
    longitude: -1.2362,
    mood: "Reflective",
    questId: "independent-cinema",
    questTitle: "See a film at an independent cinema",
    journal: "We left into rain and kept talking under the awning because nobody wanted the evening to end yet.",
    excerpt: "We left into rain and kept talking under the awning because nobody wanted the evening to end yet.",
    people: ["Maya", "Ollie"],
    tags: ["film", "rain", "conversation"],
    imageUrl: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1600&q=85",
    photos: [{ id: "photo-rain-cinema", uri: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1600&q=85" }],
    accent: "burgundy",
    pointsAwarded: 12
  },
  {
    id: "entry-port-meadow",
    title: "Mist over Port Meadow",
    date: "03 May 2026",
    occurredAt: "2026-05-03T06:10:00.000Z",
    location: "Oxford",
    latitude: 51.7784,
    longitude: -1.2847,
    mood: "Quiet",
    questId: "sunrise-high-place",
    questTitle: "Watch sunrise from somewhere high",
    journal: "The horses were almost silhouettes. The city felt further away than it was.",
    excerpt: "The horses were almost silhouettes. The city felt further away than it was.",
    people: [],
    tags: ["morning", "walk", "field"],
    imageUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=85",
    photos: [{ id: "photo-port-meadow", uri: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=85" }],
    accent: "gold",
    pointsAwarded: 12
  },
  {
    id: "entry-cafe-window",
    title: "The little table in the back",
    date: "22 April 2026",
    occurredAt: "2026-04-22T15:30:00.000Z",
    location: "Jericho",
    latitude: 51.7635,
    longitude: -1.2699,
    mood: "Curious",
    questId: "unknown-cafe",
    questTitle: "Enter a cafe you have always walked past",
    journal: "The owner said the orange cake was his mother's recipe. I had walked past that window for two years.",
    excerpt: "The owner said the orange cake was his mother's recipe. I had walked past that window for two years.",
    people: ["Sam"],
    tags: ["coffee", "cake", "found place"],
    imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=85",
    photos: [{ id: "photo-cafe-window", uri: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1600&q=85" }],
    accent: "forest",
    pointsAwarded: 12
  }
];

export const previewFriendMoments: FriendMoment[] = [
  {
    id: "friend-1",
    name: "Maya",
    handle: "maya",
    title: "Found a blue door in Bath",
    location: "Bath",
    reaction: "This feels like a still from a film.",
    imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=85",
    accent: "navy"
  },
  {
    id: "friend-2",
    name: "Ollie",
    handle: "ollie",
    title: "Cooked Georgian khachapuri badly",
    location: "Cowley",
    reaction: "Chaotic, but worth repeating.",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=85",
    accent: "orange"
  },
  {
    id: "friend-3",
    name: "Lina",
    handle: "lina",
    title: "Read in the Botanic Garden",
    location: "Oxford",
    reaction: "Quiet flex: disappearing for an afternoon.",
    imageUrl: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1600&q=85",
    accent: "forest"
  }
];

export function getPreviewQuestById(id: string) {
  return previewQuests.find((quest) => quest.id === id || quest.slug === id);
}

export function getPreviewLoreEntryById(id: string) {
  return previewLoreEntries.find((entry) => entry.id === id);
}
