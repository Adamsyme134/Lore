// script.js

// 1. Initialize Supabase (Replace with your actual keys!)
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5c...YOUR-ANON-KEY...';

// FIX: Name the variable supabaseClient so it doesn't conflict with the window object!
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Helper to determine difficulty based on your points_value
function getDifficultyLabel(points) {
  if (points <= 10) return 'Easy';
  if (points <= 15) return 'Moderate';
  return 'Challenging';
}

// 3. Fetch data from your actual Lore database
async function loadQuests() {
  try {
    // FIX: Use supabaseClient here
    const { data: quests, error } = await supabaseClient
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .eq('is_curated', true)
      .limit(3);

    if (error) throw error;

    renderQuests(quests);
  } catch (error) {
    console.error('Error loading quests from Supabase:', error);
    document.getElementById('quest-container').innerHTML = 
      '<p style="text-align: center; color: var(--text-secondary);">Error loading curated adventures. Please ensure your Supabase keys are correct and policies are set.</p>';
  }
}

// 4. Render the UI
function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; // Clear loading state

  if (!quests || quests.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No featured adventures selected yet.</p>';
    return;
  }

  quests.forEach((quest) => {
    let stepsHtml = '';
    quest.steps.forEach((stepText, index) => {
      const isFirst = index === 0;
      // Using standard checkmark and lock emojis for zero-cost icons
      const statusIcon = isFirst ? '<span>✓</span>' : '<span>🔒</span>';
      
      stepsHtml += `
        <li>
          <div class="step-label"><span class="step-number">${index + 1}</span> ${stepText}</div>
          <div class="step-status">${statusIcon}</div>
        </li>
      `;
    });

    const cardHtml = `
      <div class="quest-card">
        <div class="quest-image-container">
          <img src="${quest.image_url}" alt="${quest.title}" />
          <div class="difficulty-tag">
            <span>📊</span> ${getDifficultyLabel(quest.points_value)}
          </div>
        </div>
        <div class="quest-details">
          <div class="quest-title-row">
            <h3>${quest.title}</h3>
            <div class="arrow-circle">→</div>
          </div>
          <div class="quest-location"><span>📍</span> ${quest.location_hint}</div> 
          
          <p class="quest-description">${quest.description}</p>
          
          <ul class="quest-checklist">
            ${stepsHtml}
          </ul>
          
          <a href="#" class="view-quest-link">View full quest <span>→</span></a>
        </div>
      </div>
    `;
    container.innerHTML += cardHtml;
  });
}

loadQuests();