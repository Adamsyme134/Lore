// script.js

// 1. Initialize Supabase (Replace with your actual keys from Supabase Dashboard)
const EXPO_PUBLIC_SUPABASE_URL = 'https://vqoxqetfrjuvtpkqifbw.supabase.co';
const EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_TPUy3RvrZS4b3RO1maV7yw_MoIsLeuP';

const supabase = supabase.createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY);

// 2. Helper to determine difficulty based on your points_value
function getDifficultyLabel(points) {
  if (points <= 10) return 'Easy';
  if (points <= 15) return 'Moderate';
  return 'Challenging';
}

// 3. Fetch data from your actual Lore database
async function loadQuests() {
  try {
    const { data: quests, error } = await supabase
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
      '<p>Error loading curated adventures. Please try again later.</p>';
  }
}

// 4. Render the UI
function renderQuests(quests) {
  const container = document.getElementById('quest-container');
  container.innerHTML = ''; // Clear loading state

  if (!quests || quests.length === 0) {
    container.innerHTML = '<p>No featured adventures selected yet.</p>';
    return;
  }

  quests.forEach((quest) => {
    // Generate the steps HTML dynamically from your PostgreSQL text[] array
    let stepsHtml = '';
    quest.steps.forEach((stepText, index) => {
      // In the design, step 1 is ticked/open, others are locked
      const isFirst = index === 0;
      const statusIcon = isFirst ? '<span>✅</span>' : '<span>🔒</span>';
      const statusClass = isFirst ? 'step-closed' : 'step-locked';
      
      stepsHtml += `
        <li>
          <div class="step-label"><span class="step-number">${index + 1}</span> ${stepText}</div>
          <div class="${statusClass}">${statusIcon}</div>
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

// Execute on page load
loadQuests();