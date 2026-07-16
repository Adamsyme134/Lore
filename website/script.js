// 1. Data mapped to match the screenshot perfectly
const previewQuests = [
  {
    id: "volcan-de-fuego",
    title: "Volcán de Fuego Hike",
    kicker: "Guatemala's Signature Trek",
    description: "Hike and camp to overlook the \"Volcano of Fire\" in Guatemala.",
    locationHint: "Antigua Guatemala, Guatemala",
    duration: "Multi-day",
    difficulty: "Challenging",
    cost: "££",
    mood: "wild",
    imageUrl: "https://images.unsplash.com/photo-1621931645951-91d28f7e7fe4?q=80&w=1632&auto=format&fit=crop",
    imagePosition: "center",
    maxParticipants: 1,
    whyItMatters: "You'll sleep above the clouds, and from camp you can watch lava fountains, incandescent rockfalls, ash clouds and explosions throughout the night before witnessing sunrise from nearly 4,000m",
    steps: [
      "[TITLE:About the hike]Volcán de Fuego is one of the most active volcanoes on Earth, producing regular eruptions that can often be seen every 15–30 minutes. You'll climb the neighbouring Acatenango volcano, where you'll spend a night above the clouds watching glowing lava fountains, ash plumes and explosive eruptions from a safe vantage point before summiting at sunrise.\n\nThe hike is physically demanding, involving a steep climb to nearly 4,000 metres, but requires no technical climbing experience. It is widely considered Guatemala's signature adventure and one of the world's most memorable overnight treks, combining dramatic volcanic landscapes, high-altitude camping and unforgettable views.\n\nTours usually cost between $60-$100, while some more luxurious trips (better food, warmer cabins instead of tents etc) can exceed $150. An optional extension for the gruelling hike to the Fuego volcano ridge is another ~$30. Porter services are available to carry your backpack from around $26 round trip.[YOUTUBE:rawEmbed=%3Ciframe%20width%3D%22560%22%20height%3D%22315%22%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FoCpHmYMTcdM%3Fsi%3DRyES_xG_Luw1VBti%22%20title%3D%22YouTube%20video%20player%22%20frameborder%3D%220%22%20allow%3D%22accelerometer%3B%20autoplay%3B%20clipboard-write%3B%20encrypted-media%3B%20gyroscope%3B%20picture-in-picture%3B%20web-share%22%20referrerpolicy%3D%22strict-origin-when-cross-origin%22%20allowfullscreen%3E%3C%2Fiframe%3E]\nEverything starts and ends in Antigua, a small city renowned for its colonial buildings which used to be Guatemala's capital. The recommended length is a three 3 day trip, plus any extra time to explore the city and surroundings. On Day 1, you'll arrive in Antigua, explore and organise your equipment (warm clothing, hiking boots and poles, etc), then day 2 is where the hike begins:\n  • 8-9am Meet the tour company \n  • 9-10am Bus ride to the village of La Soledad\n  • 10-4pm Hike to base camp on Acatenango\n  • 5-9pm Hike to Fuego's \"knife ridge\" (optional extra)\n  • 9pm Campfire dinner\n  • Then sleep in a tent overlooking the volcano\n\nOn day 3, you'll descend Acatenango:\n  • 4am Wake up call\n  • 4:30am Hike to Acatenango summit\n  • 5:30-6:30am Enjoy the sunrise and eruptions\n  • 7am Return to camp for breakfast\n  • 8-11am Hike to bottom of Acatenango\n  • 11am Bus back to Antigua",
      "[TITLE:Choose your dates]The best time to hike Acatenango is during Guatemala's dry season (November–April), when clear skies provide the highest chance of seeing Fuego's eruptions and enjoying unobstructed sunset and sunrise views. January to March are generally considered the ideal months, while the rainy season (June–October) brings frequent afternoon storms and cloud cover that can completely obscure the volcano.\n\nWhen choosing your dates, allow at least 3 days for the experience: one day to arrive in Antigua, one day and night for the hike, and one recovery day afterwards. If you're visiting Guatemala for longer, the volcano fits well into a 7–10 day itinerary alongside destinations such as Lake Atitlán or Tikal.",
      "[TITLE:Book the trip]Once you've chosen your dates, book the main components of your trip. The order generally doesn't matter too much, but it's sensible to secure your flights first, followed by accommodation in Antigua and finally your Acatenango tour, particularly if you're travelling during the busy dry season."
    ]
  },
  {
    id: "unknown-cafe",
    title: "Enter a cafe you have always walked past",
    kicker: "One unopened door",
    description: "Pick a cafe you have noticed but never entered. Order slowly. Sit without scrolling for at least twenty minutes.",
    locationHint: "Somewhere familiar",
    duration: "45 min",
    difficulty: "Easy",
    cost: "£",
    mood: "curious",
    whyItMatters: "Breaking familiar routines opens up new perspectives in your own neighborhood.",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    steps: []
  },
  {
    id: "train-no-plan",
    title: "Take a train without planning",
    kicker: "A deliberate detour",
    description: "Go to the station, pick a reachable stop that feels unfamiliar, and spend two hours there with no itinerary.",
    locationHint: "A station within reach",
    duration: "Half day",
    difficulty: "Easy",
    cost: "££",
    mood: "wild",
    whyItMatters: "Removing the itinerary allows you to wander freely and discover unexpected places.",
    imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    steps: []
  }
];

// SVG Icons matching Screenshot
const icons = {
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
};

// 2. Parsers
const parseConfig = (str) => {
  const obj = {};
  str.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) obj[pair.substring(0, idx)] = decodeURIComponent(pair.substring(idx + 1));
  });
  return obj;
};

const extractTitleAndText = (stepStr) => {
  const match = stepStr.match(/\[TITLE:(.*?)\]/);
  if (match) return { title: match[1], text: stepStr.replace(match[0], '') };
  return { title: "", text: stepStr };
};

// 3. Animation state logic
window.toggleQuestCard = function(questId) {
  const container = document.getElementById('quest-container');
  const clickedWrapper = document.getElementById(`wrapper-${questId}`);
  
  // If clicking an already open card, close it (reset grid)
  if (clickedWrapper.classList.contains('is-active-quest')) {
    container.classList.remove('has-active-quest');
    document.querySelectorAll('.app-quest-wrapper').forEach(el => {
      el.classList.remove('is-active-quest', 'is-inactive-quest');
    });
    return;
  }

  // Otherwise open the clicked one and hide the others
  container.classList.add('has-active-quest');
  document.querySelectorAll('.app-quest-wrapper').forEach(el => {
    if (el.id === `wrapper-${questId}`) {
      el.classList.remove('is-inactive-quest');
      el.classList.add('is-active-quest');
    } else {
      el.classList.remove('is-active-quest');
      el.classList.add('is-inactive-quest');
    }
  });
};

// Steps toggle logic
window.toggleStep = function(questId, stepIndex) {
  const stepCard = document.getElementById(`step-${questId}-${stepIndex}`);
  const isCurrentlyActive = stepCard.classList.contains('is-active');
  
  document.querySelectorAll(`#wrapper-${questId} .app-step-card`).forEach(el => {
    el.classList.remove('is-active');
    el.querySelector('.app-step-circle').classList.remove('active');
    el.querySelector('.app-step-circle').classList.add('default');
  });

  if (!isCurrentlyActive) {
    stepCard.classList.add('is-active');
    stepCard.querySelector('.app-step-circle').classList.add('active');
    stepCard.querySelector('.app-step-circle').classList.remove('default');
  }
};

// 4. Render Engine
function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; 

  quests.forEach((quest) => {
    const isGroup = quest.maxParticipants > 1;
    let chipsHtml = '';
    if (quest.duration) chipsHtml += `<div class="app-chip">${quest.duration}</div>`;
    if (quest.difficulty) chipsHtml += `<div class="app-chip">${quest.difficulty}</div>`;
    if (quest.cost) chipsHtml += `<div class="app-chip">${quest.cost}</div>`;

    // Render Steps
    let stepsHtml = '';
    if (quest.steps && quest.steps.length > 0) {
      stepsHtml = `<div class="app-steps-container">`;
      quest.steps.forEach((step, index) => {
        const { title, text: rawStepText } = extractTitleAndText(step);
        const parts = rawStepText.split(/(\[[A-Z_]+:.*?\])/g);
        let contentHtml = '';

        parts.forEach(part => {
          if (part.startsWith('[YOUTUBE:')) {
            const raw = part.slice(9, -1);
            const config = parseConfig(raw);
            if (config.rawEmbed) contentHtml += `<div class="app-youtube-widget">${config.rawEmbed}</div>`;
          } else if (part !== "") {
            let cleanText = part.trim();
            if (cleanText) contentHtml += `<div class="app-step-text">${cleanText}</div>`;
          }
        });

        const isActive = index === 0 ? 'is-active' : '';
        const circleClass = index === 0 ? 'active' : 'default';

        stepsHtml += `
          <div id="step-${quest.id}-${index}" class="app-step-card ${isActive}" onclick="toggleStep('${quest.id}', ${index})">
            <div class="app-step-header">
              <div class="app-step-circle ${circleClass}">${index + 1}</div>
              <div class="app-step-title">${title || `Step ${index + 1}`}</div>
            </div>
            <div class="app-step-body">${contentHtml}</div>
          </div>
        `;
      });
      stepsHtml += `</div>`;
    }

    const contentPos = quest.imagePosition || 'center';

    const cardHtml = `
      <div id="wrapper-${quest.id}" class="app-quest-wrapper">
        
        <!-- Collapsed Card View (Clicks to open hero view) -->
        <a href="javascript:void(0)" onclick="toggleQuestCard('${quest.id}')" class="app-quest-card ${isGroup ? 'is-group' : ''}">
          <img class="app-quest-img" src="${quest.imageUrl}" style="object-position: ${contentPos};" />
          <div class="app-quest-gradient"></div>
          ${isGroup ? `<div class="app-group-badge">Group Quest</div>` : ''}
          <div class="app-quest-content">
            ${chipsHtml ? `<div class="app-quest-chips">${chipsHtml}</div>` : ''}
            ${quest.kicker ? `<div class="app-quest-kicker">${quest.kicker}</div>` : ''}
            <h3 class="app-quest-title">${quest.title}</h3>
            ${quest.description ? `<p class="app-quest-desc">${quest.description}</p>` : ''}
          </div>
        </a>
        
        <!-- Expanded Hero View Details (Fades in) -->
        <div class="expanded-details">
          
          <div class="title-row">
            <div>
              <h2>${quest.title}</h2>
              <p>${quest.description}</p>
            </div>
            <button class="bookmark-btn">${icons.bookmark}</button>
          </div>

          <div class="info-grid">
            <div class="info-col">
              ${icons.clock}
              <span class="info-label">TIME</span>
              <span class="info-val">${quest.duration}</span>
            </div>
            <div class="info-col">
              ${icons.chart}
              <span class="info-label">DIFFICULTY</span>
              <span class="info-val">${quest.difficulty}</span>
            </div>
            <div class="info-col">
              ${icons.pin}
              <span class="info-label">LOCATION</span>
              <span class="info-val">${quest.locationHint}</span>
            </div>
            <div class="info-col">
              ${icons.money}
              <span class="info-label">COST</span>
              <span class="info-val">${quest.cost}</span>
            </div>
          </div>

          <div class="why-quest">
            <h4>WHY THIS QUEST?</h4>
            <p>${quest.whyItMatters}</p>
          </div>

          ${stepsHtml}

        </div>
      </div>
    `;
    container.innerHTML += cardHtml;
  });
}

// 5. Instantly render
renderQuests(previewQuests);