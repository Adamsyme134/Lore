// 1. Data mapping (Adding the Fuego steps to the first quest)
const previewQuests = [
  {
    id: "volcan-de-fuego",
    title: "Hike an erupting volcano",
    kicker: "Guatemala's Signature Trek",
    description: "Climb Acatenango to spend a night above the clouds watching glowing lava fountains, ash plumes and explosive eruptions from a safe vantage point.",
    locationHint: "Antigua, Guatemala",
    duration: "3 Days",
    mood: "wild",
    imageUrl: "https://images.unsplash.com/photo-1621931645951-91d28f7e7fe4?q=80&w=1632&auto=format&fit=crop",
    imagePosition: "center",
    maxParticipants: 1,
    steps: [
      "[TITLE:About the hike]Volcán de Fuego is one of the most active volcanoes on Earth, producing regular eruptions that can often be seen every 15–30 minutes. You'll climb the neighbouring Acatenango volcano, where you'll spend a night above the clouds watching glowing lava fountains, ash plumes and explosive eruptions from a safe vantage point before summiting at sunrise.\n\nThe hike is physically demanding, involving a steep climb to nearly 4,000 metres, but requires no technical climbing experience. It is widely considered Guatemala's signature adventure and one of the world's most memorable overnight treks, combining dramatic volcanic landscapes, high-altitude camping and unforgettable views.\n\nTours usually cost between $60-$100, while some more luxurious trips (better food, warmer cabins instead of tents etc) can exceed $150. An optional extension for the gruelling hike to the Fuego volcano ridge is another ~$30. Porter services are available to carry your backpack from around $26 round trip.[YOUTUBE:rawEmbed=%3Ciframe%20width%3D%22560%22%20height%3D%22315%22%20src%3D%22https%3A%2F%2Fwww.youtube.com%2Fembed%2FoCpHmYMTcdM%3Fsi%3DRyES_xG_Luw1VBti%22%20title%3D%22YouTube%20video%20player%22%20frameborder%3D%220%22%20allow%3D%22accelerometer%3B%20autoplay%3B%20clipboard-write%3B%20encrypted-media%3B%20gyroscope%3B%20picture-in-picture%3B%20web-share%22%20referrerpolicy%3D%22strict-origin-when-cross-origin%22%20allowfullscreen%3E%3C%2Fiframe%3E]\nEverything starts and ends in Antigua, a small city renowned for its colonial buildings which used to be Guatemala's capital. The recommended length is a three 3 day trip, plus any extra time to explore the city and surroundings. On Day 1, you'll arrive in Antigua, explore and organise your equipment (warm clothing, hiking boots and poles, etc), then day 2 is where the hike begins:\n  • 8-9am Meet the tour company \n  • 9-10am Bus ride to the village of La Soledad\n  • 10-4pm Hike to base camp on Acatenango\n  • 5-9pm Hike to Fuego's \"knife ridge\" (optional extra)\n  • 9pm Campfire dinner\n  • Then sleep in a tent overlooking the volcano\n\nOn day 3, you'll descend Acatenango:\n  • 4am Wake up call\n  • 4:30am Hike to Acatenango summit\n  • 5:30-6:30am Enjoy the sunrise and eruptions\n  • 7am Return to camp for breakfast\n  • 8-11am Hike to bottom of Acatenango\n  • 11am Bus back to Antigua",
      "[TITLE:Choose your dates]The best time to hike Acatenango is during Guatemala's dry season (November–April), when clear skies provide the highest chance of seeing Fuego's eruptions and enjoying unobstructed sunset and sunrise views. January to March are generally considered the ideal months, while the rainy season (June–October) brings frequent afternoon storms and cloud cover that can completely obscure the volcano.\n\nWhen choosing your dates, allow at least 3 days for the experience: one day to arrive in Antigua, one day and night for the hike, and one recovery day afterwards. If you're visiting Guatemala for longer, the volcano fits well into a 7–10 day itinerary alongside destinations such as Lake Atitlán or Tikal.[LINK:url=https%3A%2F%2Fwww.acatenangovolcanotour.com%2Fpost%2Fbest-time-to-hike-acatenango-weather-seasons-and-base-camp-conditions&title=When%20to%20hike%20&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1621931645951-91d28f7e7fe4%3Fq%3D80%26w%3D1632%26auto%3Dformat%26fit%3Dcrop%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%253D%253D]",
      "[TITLE:Book the trip]Once you've chosen your dates, book the main components of your trip. The order generally doesn't matter too much, but it's sensible to secure your flights first, followed by accommodation in Antigua and finally your Acatenango tour, particularly if you're travelling during the busy dry season.\n\nMost international visitors fly into La Aurora International Airport (GUA) in Guatemala City, the country's main airport. From the airport, Antigua is approximately 40–50 km away, with a journey time of 1–1.5 hours depending on traffic. Most travellers either book a shuttle through their accommodation, arrange a private transfer, or take an official airport taxi.\n[LINK:url=https%3A%2F%2Fwww.skyscanner.net%2Ftransport%2Fflights%2Fuk%2Fgua%2F%3Fadultsv2%3D1%26cabinclass%3Deconomy%26childrenv2%3D%26ref%3Dhome%26rtn%3D1%26outboundaltsenabled%3Dfalse%26inboundaltsenabled%3Dfalse%26oym%3D2612%26iym%3D2612&title=Skyscanner%20flights&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1499063078284-f78f7d89616a%3Fw%3D1600%26auto%3Dformat%26fit%3Dcrop%26q%3D60%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxzZWFyY2h8MTB8fHBsYW5lfGVufDB8fDB8fHwy]\nAlmost everyone stays in Antigua before and after the hike. It's the departure point for virtually every Acatenango tour and one of Guatemala's most attractive cities, making it well worth exploring for a couple of days. The average accomodation prices per night are:\n  • Hostels: $10-28\n  • Mid range hotels: $23-45\n  • 4-Star hotels: $85-195[LINK:url=https%3A%2F%2Fwww.booking.com%2Fsearchresults.en-gb.html%3Fss%3DAntigua%2BGuatemala%252C%2BGuatemala%26efdco%3D1%26label%3Dgen173nr-10CAEoggI46AdIM1gEaE2IAQGYATO4AQfIAQzYAQPoAQH4AQGIAgGoAgG4Aonaz9IGwAIB0gIkYWM1ZTRiMjAtNzk5Yi00ZGRlLTk3ZTAtNTU1MGIxMDc2NDM32AIB4AIB%26aid%3D304142%26lang%3Den-gb%26sb%3D1%26src_elem%3Dsb%26src%3Dindex%26dest_id%3D-1131627%26dest_type%3Dcity%26ac_position%3D0%26ac_click_type%3Db%26ac_langcode%3Dxu%26ac_suggestion_list_length%3D7%26search_selected%3Dtrue%26search_pageview_id%3D3f0260ec95320127%26ac_meta%3DGhAzZjAyNjBlYzk1MzIwMTI3IAAoATICeHU6CGFudGlndWEg%26ltfd%3D1%253A5%253A12-2026%253A1%253A%26group_adults%3D2%26no_rooms%3D1%26group_children%3D0&title=Find%20accomodation&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1563442744-3e17a3bf4932%3Fq%3D80%26w%3D1470%26auto%3Dformat%26fit%3Dcrop%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%253D%253D]\nAlmost all visitors hike with an organised tour, as they provide transport, guides, camping equipment and meals. While it's technically possible to organise the hike independently, it's not recommended unless you have extensive high-altitude camping experience and your own equipment. The three main recommended companies are:[LINK:url=https%3A%2F%2Foxexpeditions.com%2F&title=OX%20Expeditions&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1619266465172-02a857c3556d%3Fq%3D80%26w%3D1631%26auto%3Dformat%26fit%3Dcrop%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%253D%253D][LINK:url=https%3A%2F%2Fwichoandcharlies.com%2F&title=Wicho%20%26%20Charlie's&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1659118859158-de53325b59bb%3Fw%3D1600%26auto%3Dformat%26fit%3Dcrop%26q%3D60%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxzZWFyY2h8Mnx8YWNhdGVuYW5nb3xlbnwwfHwwfHx8Mg%253D%253D][LINK:url=https%3A%2F%2Fca-travelers.com%2Fcase%2Facatenango-volcano-tour%2F%3Fsrsltid%3DAfmBOopbuAVFLusW0-W2NNdesb4seELuLU1tmT89Uz7TV7Xx6RqpISqG&title=CA%20Travelers&bgImage=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1576832906066-4b5ea7b0c97d%3Fq%3D80%26w%3D1548%26auto%3Dformat%26fit%3Dcrop%26ixlib%3Drb-4.1.0%26ixid%3DM3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%253D%253D]Most tours include:\n  • Return transport from Antigua\n  • Certified guide\n  • Tent and sleeping mat\n  • Sleeping bag\n  • Dinner and breakfast\n\nMany operators charge park entrance fees separately (around Q100), and the optional Fuego Ridge hike usually costs an additional Q200–250. During the dry season—especially January to March—it's worth booking your tour at least 2–4 weeks in advance, as the best operators often sell out."
    ]
  },
  {
    id: "unknown-cafe",
    title: "Enter a cafe you have always walked past",
    kicker: "One unopened door",
    description: "Pick a cafe you have noticed but never entered. Order slowly. Sit without scrolling for at least twenty minutes.",
    locationHint: "Somewhere familiar",
    duration: "45 min",
    mood: "curious",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=85",
    imagePosition: "center",
    steps: []
  }
];

// 2. Parser helpers ported directly from QuestDetailBlock.tsx
const parseConfig = (str) => {
  const obj = {};
  str.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      obj[pair.substring(0, idx)] = decodeURIComponent(pair.substring(idx + 1));
    }
  });
  return obj;
};

const extractTitleAndText = (stepStr) => {
  const match = stepStr.match(/\[TITLE:(.*?)\]/);
  if (match) {
    return { title: match[1], text: stepStr.replace(match[0], '') };
  }
  return { title: "", text: stepStr };
};

// 3. Toggle Logic
window.toggleQuestCard = function(questId) {
  const wrapper = document.getElementById(`wrapper-${questId}`);
  if (wrapper) wrapper.classList.toggle('expanded');
};

window.toggleStep = function(questId, stepIndex) {
  const stepCard = document.getElementById(`step-${questId}-${stepIndex}`);
  const isCurrentlyActive = stepCard.classList.contains('is-active');
  
  // Collapse all in this quest
  document.querySelectorAll(`#wrapper-${questId} .app-step-card`).forEach(el => {
    el.classList.remove('is-active');
    el.querySelector('.app-step-circle').classList.remove('active');
    el.querySelector('.app-step-circle').classList.add('default');
  });

  // Toggle clicked step
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
    if (quest.mood) chipsHtml += `<div class="app-chip">${quest.mood}</div>`;
    if (quest.duration) chipsHtml += `<div class="app-chip">${quest.duration}</div>`;
    if (quest.locationHint) chipsHtml += `<div class="app-chip">${quest.locationHint}</div>`;

    // Render Steps
    let stepsHtml = '';
    if (quest.steps && quest.steps.length > 0) {
      stepsHtml = `<div class="app-steps-container">`;
      
      quest.steps.forEach((step, index) => {
        const { title, text: rawStepText } = extractTitleAndText(step);
        
        // Exact regex split from Source 3
        const parts = rawStepText.split(/(\[[A-Z_]+:.*?\])/g);
        let contentHtml = '';

        parts.forEach(part => {
          if (part.startsWith('[YOUTUBE:')) {
            const raw = part.slice(9, -1);
            const config = parseConfig(raw);
            if (config.rawEmbed) {
              contentHtml += `<div class="app-youtube-widget">${config.rawEmbed}</div>`;
            }
          } else if (part.startsWith("[LINK:")) {
            const raw = part.slice(6, -1);
            const config = parseConfig(raw);
            contentHtml += `
              <a href="${config.url}" target="_blank" class="app-link-widget">
                ${config.bgImage ? `<img src="${config.bgImage}" alt="${config.title}" />` : ''}
                <span>${config.title}</span>
              </a>`;
          } else if (part !== "") {
            // Trim newlines for HTML
            let cleanText = part.trim();
            if (cleanText) {
              contentHtml += `<div class="app-step-text">${cleanText}</div>`;
            }
          }
        });

        const isActive = index === 0 ? 'is-active' : '';
        const circleClass = index === 0 ? 'active' : 'default';

        stepsHtml += `
          <div id="step-${quest.id}-${index}" class="app-step-card ${isActive}" onclick="toggleStep('${quest.id}', ${index})">
            <div class="app-step-header">
              <div class="app-step-header-left">
                <div class="app-step-circle ${circleClass}">${index + 1}</div>
                <div class="app-step-title">${title || `Step ${index + 1}`}</div>
              </div>
            </div>
            <div class="app-step-body">
              ${contentHtml}
            </div>
          </div>
        `;
      });
      stepsHtml += `</div>`;
    }

    const contentPos = quest.imagePosition || 'center';

    const cardHtml = `
      <div id="wrapper-${quest.id}" class="app-quest-wrapper">
        <a href="javascript:void(0)" onclick="toggleQuestCard('${quest.id}')" class="app-quest-card ${isGroup ? 'is-group' : ''}">
          
          <img class="app-quest-img" 
               src="${quest.imageUrl}" 
               style="object-position: ${contentPos};" />
          
          <div class="app-quest-gradient"></div>
          ${isGroup ? `<div class="app-group-badge">Group Quest</div>` : ''}

          <div class="app-quest-content">
            ${chipsHtml ? `<div class="app-quest-chips">${chipsHtml}</div>` : ''}
            ${quest.kicker ? `<div class="app-quest-kicker">${quest.kicker}</div>` : ''}
            <h3 class="app-quest-title">${quest.title}</h3>
            ${quest.description ? `<p class="app-quest-desc">${quest.description}</p>` : ''}
          </div>
        </a>
        
        ${stepsHtml}
      </div>
    `;
    container.innerHTML += cardHtml;
  });
}

// 5. Instantly render
renderQuests(previewQuests);