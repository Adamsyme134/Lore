import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

type YouTubeWidgetProps = { config: string };

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const equalIdx = pair.indexOf('=');
    if (equalIdx > -1) {
      const k = pair.slice(0, equalIdx);
      const v = pair.slice(equalIdx + 1);
      try {
        if (k) obj[k] = decodeURIComponent(v || '');
      } catch (e) {
        obj[k] = v;
      }
    }
  });
  return obj;
};

const extractYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export function YouTubeWidget({ config }: YouTubeWidgetProps) {
  console.log("[YouTubeWidget Native] Mounted. Raw Config:", config.substring(0, 100));

  const cfg = parseConfig(config);
  let rawEmbed = cfg.rawEmbed || '';

  if (!rawEmbed && cfg.url) {
    const videoId = extractYouTubeId(cfg.url);
    if (videoId) {
      rawEmbed = `<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1" frameborder="0" allowfullscreen></iframe>`;
    }
  }
  
  if (!rawEmbed || !rawEmbed.includes('<iframe')) {
    console.warn("[YouTubeWidget Native] ERROR: Invalid rawEmbed string ->", rawEmbed);
    return (
      <View className="rounded-2xl h-56 w-full my-3 bg-red-100 border border-red-300 items-center justify-center">
        <Text className="text-red-600 font-bold">Invalid YouTube Widget</Text>
        <Text className="text-red-500 text-xs mt-1">Please re-save this step in the Builder.</Text>
      </View>
    );
  }

  // 1. Force iframe dimensions to 100%
  let responsiveEmbed = rawEmbed
     .replace(/width="[^"]*"/, 'width="100%"')
     .replace(/height="[^"]*"/, 'height="100%"');

  // 2. Inject referrerpolicy to satisfy YouTube's strict origin API requirement
  if (!responsiveEmbed.includes('referrerpolicy')) {
     responsiveEmbed = responsiveEmbed.replace('<iframe', '<iframe referrerpolicy="strict-origin-when-cross-origin"');
  }

  // 3. Inject 'origin' parameter into the src URL if it's missing
  if (!responsiveEmbed.includes('origin=')) {
    responsiveEmbed = responsiveEmbed.replace(/src="([^"]+)"/, (match, p1) => {
      // Safely check if the URL already has query parameters to append with & or ?
      const separator = p1.includes('?') ? '&' : '?';
      return `src="${p1}${separator}origin=https://lore.com"`;
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { margin: 0; padding: 0; background-color: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        ${responsiveEmbed}
      </body>
    </html>
  `;

  return (
    <View className="rounded-2xl overflow-hidden h-56 w-full my-3 bg-stone border border-line relative">
      <WebView
        // Use a generic valid HTTPS URL as the baseUrl so YouTube registers a valid HTTP Referer
        source={{ html: htmlContent, baseUrl: 'https://lore.com' }}
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}