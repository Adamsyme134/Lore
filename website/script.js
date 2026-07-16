// (Keep the same previewQuests and icons arrays here from previous code...)
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
      "[TITLE:About the hike]Volcán de Fuego is one of the most active volcanoes on Earth... [YOUTUBE:rawEmbed=%3Ciframe%20width%3D%22560%22%20height%3D%22315%22%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FoCpHmYMTcdM%3Fsi%3DRyES_xG_Luw1VBti%22%20title%3D%22YouTube%20video%20player%22%20frameborder%3D%220%22%20allow%3D%22accelerometer%3B%20autoplay%3B%20clipboard-write%3B%20encrypted-media%3B%20gyroscope%3B%20picture-in-picture%3B%20web-share%22%20referrerpolicy%3D%22strict-origin-when-cross-origin%22%20allowfullscreen%3E%3C%2Fiframe%3E]",
      "[TITLE:Choose your dates]The best time to hike Acatenango is during Guatemala's dry season...",
      "[TITLE:Book the trip]Once you've chosen your dates, book the main components of your trip..."
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

const icons = {
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
};

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


// --- STATE MACHINE ---
let activeQuestIndex = null;
let viewMode = 'GRID'; // 'GRID' or 'EXPANDED'

window.toggleQuestCard = function(event, index) {
  event.stopPropagation();
  if (activeQuestIndex === index) return; // Do nothing if clicking already active one
  
  activeQuestIndex = index;
  viewMode = 'EXPANDED';
  updateLayout();
};

window.closeExpanded = function(event) {
  event.stopPropagation(); // Stop click from triggering toggleQuestCard
  activeQuestIndex = null;
  viewMode = 'GRID';
  updateLayout();
};

// The Layout Engine: Updates CSS Left, Transform, and Z-Index smoothly
function updateLayout() {
  const container = document.getElementById('quest-container');
  const wrappers = document.querySelectorAll('.app-quest-wrapper');
  
  if (viewMode === 'GRID') {
    wrappers.forEach((el, i) => {
      el.className = 'app-quest-wrapper is-grid-view';
      // Space them out exactly 340px + 24px gap = 364px
      el.style.left = `calc(50% + ${(i - 1) * 364}px)`;
      el.style.transform = `translateX(-50%) scale(1)`;
      el.style.zIndex = 1;
    });
    container.style.height = '320px'; // Reset container back to normal
  } else {
    // Math to figure out which card sits on the left vs right
    const prevIndex = (activeQuestIndex - 1 + 3) % 3;
    const nextIndex = (activeQuestIndex + 1) % 3;
    
    wrappers.forEach((el, i) => {
      if (i === activeQuestIndex) {
        el.className = 'app-quest-wrapper is-active-quest';
        el.style.left = '50%';
        el.style.transform = `translateX(-50%) scale(1)`;
        el.style.zIndex = 10;
      } else if (i === prevIndex) {
        el.className = 'app-quest-wrapper is-side-quest';
        // Pull it to the left, scaled down, tucked behind
        el.style.left = 'calc(50% - 310px)'; 
        el.style.transform = `translateX(-50%) scale(0.85)`;
        el.style.zIndex = 1;
      } else if (i === nextIndex) {
        el.className = 'app-quest-wrapper is-side-quest';
        // Pull it to the right, scaled down, tucked behind
        el.style.left = 'calc(50% + 310px)'; 
        el.style.transform = `translateX(-50%) scale(0.85)`;
        el.style.zIndex = 1;
      }
    });
    
    // Animate container height to match the new giant active element
    setTimeout(() => {
      const activeEl = wrappers[activeQuestIndex];
      if (activeEl) {
        container.style.height = `${activeEl.offsetHeight}px`;
      }
    }, 50); // slight delay so display block kicks in first
  }
}

// Inner Steps logic
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
  
  // Recalculate container height because step opened!
  setTimeout(() => {
     const container = document.getElementById('quest-container');
     const activeEl = document.querySelector('.is-active-quest');
     if (activeEl) container.style.height = `${activeEl.offsetHeight}px`;
  }, 50);
};

// --- RENDER ENGINE ---
function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; 

  quests.forEach((quest, index) => {
    const isGroup = quest.maxParticipants > 1;
    let chipsHtml = '';
    if (quest.duration) chipsHtml += `<div class="app-chip">${quest.duration}</div>`;
    if (quest.difficulty) chipsHtml += `<div class="app-chip">${quest.difficulty}</div>`;
    if (quest.cost) chipsHtml += `<div class="app-chip">${quest.cost}</div>`;

    let stepsHtml = '';
    if (quest.steps && quest.steps.length > 0) {
      stepsHtml = `<div class="app-steps-container">`;
      quest.steps.forEach((step, stepIndex) => {
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

        const isActive = stepIndex === 0 ? 'is-active' : '';
        const circleClass = stepIndex === 0 ? 'active' : 'default';

        stepsHtml += `
          <div id="step-${quest.id}-${stepIndex}" class="app-step-card ${isActive}" onclick="toggleStep('${quest.id}', ${stepIndex})">
            <div class="app-step-header">
              <div class="app-step-circle ${circleClass}">${stepIndex + 1}</div>
              <div class="app-step-title">${title || `Step ${stepIndex + 1}`}</div>
            </div>
            <div class="app-step-body">${contentHtml}</div>
          </div>
        `;
      });
      stepsHtml += `</div>`;
    }

    const contentPos = quest.imagePosition || 'center';

    const cardHtml = `
      <div id="wrapper-${quest.id}" class="app-quest-wrapper" onclick="toggleQuestCard(event, ${index})">
        
        <div class="app-quest-card ${isGroup ? 'is-group' : ''}">
          <button class="close-expanded-btn" onclick="closeExpanded(event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <img class="app-quest-img" src="${quest.imageUrl}" style="object-position: ${contentPos};" />
          <div class="app-quest-gradient"></div>
          ${isGroup ? `<div class="app-group-badge">Group Quest</div>` : ''}
          <div class="app-quest-content">
            ${chipsHtml ? `<div class="app-quest-chips">${chipsHtml}</div>` : ''}
            ${quest.kicker ? `<div class="app-quest-kicker">${quest.kicker}</div>` : ''}
            <h3 class="app-quest-title">${quest.title}</h3>
            ${quest.description ? `<p class="app-quest-desc">${quest.description}</p>` : ''}
          </div>
        </div>
        
        <div class="expanded-details">
          
          <div class="title-row">
            <div>
              <h2>${quest.title}</h2>
              <p>${quest.description}</p>
            </div>
            <button class="bookmark-btn">${icons.bookmark}</button>
          </div>

          <div class="info-grid">
            <div class="info-col">${icons.clock}<span class="info-label">TIME</span><span class="info-val">${quest.duration}</span></div>
            <div class="info-col">${icons.chart}<span class="info-label">DIFFICULTY</span><span class="info-val">${quest.difficulty}</span></div>
            <div class="info-col">${icons.pin}<span class="info-label">LOCATION</span><span class="info-val">${quest.locationHint}</span></div>
            <div class="info-col">${icons.money}<span class="info-label">COST</span><span class="info-val">${quest.cost}</span></div>
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

// Boot up
renderQuests(previewQuests);
// Run layout math for the initial grid
setTimeout(updateLayout, 100);