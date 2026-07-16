// script.js

// 1. Hardcoded preview quests directly from previewData.ts
// This bypasses Supabase entirely so they render instantly on the website
const previewQuests = [
  {
    id: "sunrise-high-place",
    title: "Watch sunrise from somewhere high",
    kicker: "Before the city starts",
    description: "Find a hill, bridge, rooftop cafe, college tower view or quiet overlook. Arrive before first light. Stay until the city has fully woken up.",
    locationHint: "A high place within 30 minutes",
    duration: "60-90 min",
    mood: "quiet",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    maxParticipants: 1
  },
  {
    id: "unknown-cafe",
    title: "Enter a cafe you have always walked past",
    kicker: "One unopened door",
    description: "Pick a cafe you have noticed but never entered. Order slowly. Sit without scrolling for at least twenty minutes.",
    locationHint: "Somewhere familiar, but untried",
    duration: "45 min",
    mood: "curious",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    maxParticipants: 1
  },
  {
    id: "train-no-plan",
    title: "Take a train without planning the destination",
    kicker: "A deliberate detour",
    description: "Go to the station, pick a reachable stop that feels unfamiliar, and spend two hours there with no itinerary.",
    locationHint: "A station within reach",
    duration: "Half day",
    mood: "wild",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    maxParticipants: 1
  }
];

// 2. Render function that maps the data exactly to the app's styling
function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; 

  quests.forEach((quest) => {
    const isGroup = quest.maxParticipants > 1;
    
    // Build Chips dynamically from the preview data
    let chipsHtml = '';
    if (quest.mood) chipsHtml += `<div class="app-chip">${quest.mood}</div>`;
    if (quest.duration) chipsHtml += `<div class="app-chip">${quest.duration}</div>`;
    if (quest.locationHint) chipsHtml += `<div class="app-chip">${quest.locationHint}</div>`;

    const contentPos = quest.imagePosition || 'center';

    const cardHtml = `
      <a href="#waitlist" class="app-quest-card ${isGroup ? 'is-group' : ''}">
        
        <img class="app-quest-img" 
             src="${quest.imageUrl}" 
             alt="${quest.title}" 
             style="object-position: ${contentPos};" />
        
        <div class="app-quest-gradient"></div>

        ${isGroup ? `
          <div class="app-group-badge">Group Quest</div>
        ` : ''}

        <div class="app-quest-content">
          ${chipsHtml ? `<div class="app-quest-chips">${chipsHtml}</div>` : ''}
          
          ${quest.kicker ? `<div class="app-quest-kicker">${quest.kicker}</div>` : ''}
          
          <h3 class="app-quest-title">${quest.title}</h3>
          
          ${quest.description ? `<p class="app-quest-desc">${quest.description}</p>` : ''}
        </div>
      </a>
    `;
    container.innerHTML += cardHtml;
  });
}

// 3. Immediately inject the quests into the DOM
renderQuests(previewQuests);