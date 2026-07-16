// script.js
const SUPABASE_URL = 'https://vqoxqetfrjuvtpkqifbw.supabase.co'; 
// Use your working anon key here:
const SUPABASE_ANON_KEY = 'YOUR_WORKING_ANON_KEY_HERE'; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to safely extract YouTube IDs from various URL formats
function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Global function to handle expand/collapse
window.toggleQuest = function(questId) {
  const body = document.getElementById(`quest-body-${questId}`);
  const btn = document.getElementById(`quest-btn-${questId}`);
  
  if (body.style.display === 'none' || body.style.display === '') {
    body.style.display = 'flex';
    btn.innerHTML = 'Collapse quest <span>↑</span>';
  } else {
    body.style.display = 'none';
    btn.innerHTML = 'Expand quest <span>↓</span>';
  }
};

// Render the rich content blocks or fallback to standard steps
function renderQuestContent(quest) {
  // 1. Check if the quest uses the new contentBlocks system
  if (quest.contentBlocks && quest.contentBlocks.length > 0) {
    return quest.contentBlocks.map(block => {
      if (block.type === 'text') {
        return `<p class="quest-text-block">${block.content}</p>`;
      }
      if (block.type === 'widget') {
        if (block.widgetType === 'youtube') {
          const videoId = block.config?.videoId || getYouTubeId(block.config?.url);
          if (!videoId) return '';
          return `
            <div class="widget-video-container">
              <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
        }
        if (block.widgetType === 'link') {
          return `
            <a href="${block.config?.url}" target="_blank" class="widget-link">
              ${block.config?.title || block.config?.url || 'Visit Link'} <span>↗</span>
            </a>`;
        }
        // Fallback for app-native widgets (Randomiser, Map, etc.)
        return `
          <div class="widget-fallback">
            <span>✨</span> Interactive ${block.widgetType} available in the Lore app
          </div>`;
      }
      return '';
    }).join('');
  }
  
  // 2. Fallback to standard steps array for older quests
  if (quest.steps && quest.steps.length > 0) {
    let stepsHtml = '<ul class="quest-checklist">';
    quest.steps.forEach((stepText, index) => {
      stepsHtml += `
        <li>
          <div class="step-label"><span class="step-number">${index + 1}</span> ${stepText}</div>
        </li>`;
    });
    stepsHtml += '</ul>';
    return stepsHtml;
  }

  return '';
}

// Remove all the old toggleQuest and renderQuestContent functions.
// We are mimicking the static display card from the app!

async function loadQuests() {
  try {
    const { data: quests, error } = await supabaseClient
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .eq('is_curated', true)
      .limit(3);

    if (error) throw error;
    renderQuests(quests);
    
  } catch (error) {
    console.error('Error loading quests:', error);
    document.getElementById('quest-container').innerHTML = 
      '<p style="text-align: center; color: var(--text-secondary);">Error loading curated adventures.</p>';
  }
}

function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; 

  if (!quests || quests.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No featured adventures selected yet.</p>';
    return;
  }

  quests.forEach((quest) => {
    // Handle Supabase snake_case vs App camelCase
    const maxParticipants = quest.maxParticipants || quest.max_participants || 1;
    const isGroup = maxParticipants > 1;
    
    // Build Chips just like the App's mapping
    let chipsHtml = '';
    const cats = Array.isArray(quest.categories) ? quest.categories : (quest.categories ? JSON.parse(quest.categories) : []);
    cats.forEach(cat => {
      chipsHtml += `<div class="app-chip">${cat}</div>`;
    });
    
    const length = quest.length || quest.duration_label;
    if (length) chipsHtml += `<div class="app-chip">${length}</div>`;
    if (quest.difficulty) chipsHtml += `<div class="app-chip">${quest.difficulty}</div>`;
    if (quest.cost) chipsHtml += `<div class="app-chip">${quest.cost}</div>`;

    // Exact imagePosition parsing from QuestCard.tsx
    let contentPos = 'center';
    const rawPos = quest.imagePosition || quest.image_position;
    if (rawPos) {
      const posMatch = rawPos.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
      contentPos = posMatch ? `${posMatch[1]}% ${posMatch[2]}%` : rawPos;
    }

    // Outputting the exact hierarchy of QuestCard.tsx
    const cardHtml = `
      <a href="#waitlist" class="app-quest-card ${isGroup ? 'is-group' : ''}">
        
        <img class="app-quest-img" 
             src="${quest.image_url || quest.imageUrl}" 
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

loadQuests();