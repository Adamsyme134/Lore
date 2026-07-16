// script.js
console.log("--- STARTING DIAGNOSTIC SCRIPT ---");

const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co'; // Replace with yours
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5c...YOUR-ANON-KEY...'; // Replace with yours

// Helper function
function getDifficultyLabel(points) {
  if (points <= 10) return 'Easy';
  if (points <= 15) return 'Moderate';
  return 'Challenging';
}

try {
  console.log("1. Checking if Supabase library loaded from HTML...");
  if (typeof window.supabase === 'undefined') {
    console.error("CRITICAL ERROR: window.supabase is undefined. The CDN script in index.html might be missing or blocked.");
  } else {
    console.log("1b. Supabase library found successfully!");
  }

  console.log("2. Attempting to create Supabase Client...");
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("2b. Supabase Client created!");

  async function loadQuests() {
    console.log("3. loadQuests() started. Fetching from database...");
    try {
      const { data: quests, error } = await supabaseClient
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .eq('is_curated', true)
        .limit(3);

      console.log("4. Network request finished. Checking for errors...");

      if (error) {
        console.error("SUPABASE API ERROR:", error);
        throw error;
      }

      console.log("5. Data retrieved successfully! Here is the data:", quests);
      renderQuests(quests);
      
    } catch (error) {
      console.error('CAUGHT ERROR IN LOADQUESTS:', error);
      document.getElementById('quest-container').innerHTML = 
        '<p style="text-align: center; color: var(--text-secondary);">Error loading curated adventures. Check console for details.</p>';
    }
  }

  function renderQuests(quests) {
    console.log("6. renderQuests() started.");
    const container = document.getElementById('quest-container');
    container.innerHTML = ''; 

    if (!quests || quests.length === 0) {
      console.log("7. No quests found (array is empty).");
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No featured adventures selected yet.</p>';
      return;
    }

    console.log(`8. Rendering ${quests.length} quests to the screen...`);
    
    quests.forEach((quest) => {
      let stepsHtml = '';
      quest.steps.forEach((stepText, index) => {
        const isFirst = index === 0;
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
    
    console.log("9. Finished rendering successfully!");
  }

  console.log("Executing loadQuests now...");
  loadQuests();

} catch (globalError) {
  console.error("GLOBAL SCRIPT CRASH:", globalError);
  document.getElementById('quest-container').innerHTML = 
        '<p style="text-align: center; color: red;">A critical script error occurred. Check console.</p>';
}