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
    console.log("[YouTubeWidget Native] Falling back to legacy URL");
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

  // FORCE YouTube to respect your mobile limits (Overrides YouTube's hardcoded width="560")
  const responsiveEmbed = rawEmbed
     .replace(/width="[^"]*"/, 'width="100%"')
     .replace(/height="[^"]*"/, 'height="100%"');

  const customHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; background: transparent; }
        </style>
      </head>
      <body>${responsiveEmbed}</body>
    </html>
  `;

  console.log("[YouTubeWidget Native] Rendering WebView safely");

  return (
    <View className="rounded-2xl overflow-hidden h-56 w-full my-3 bg-stone border border-line">
      <WebView 
        source={{ html: customHtml, baseUrl: 'https://www.youtube.com' }}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}       
        domStorageEnabled={true}       
        scrollEnabled={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}