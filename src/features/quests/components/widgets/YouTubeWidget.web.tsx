import { View, Text } from 'react-native';

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
  console.log("[YouTubeWidget Web] Mounted. Raw Config:", config.substring(0, 100));

  const cfg = parseConfig(config);
  let rawEmbed = cfg.rawEmbed || '';

  if (!rawEmbed && cfg.url) {
    const videoId = extractYouTubeId(cfg.url);
    if (videoId) {
      rawEmbed = `<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1" frameborder="0" allowfullscreen></iframe>`;
    }
  }
  
  if (!rawEmbed || !rawEmbed.includes('<iframe')) {
    console.warn("[YouTubeWidget Web] ERROR: Invalid rawEmbed string ->", rawEmbed);
    return (
      <View className="rounded-2xl h-56 w-full my-3 bg-red-100 border border-red-300 items-center justify-center">
        <Text className="text-red-600 font-bold">Invalid YouTube Widget</Text>
        <Text className="text-red-500 text-xs mt-1">Please re-save this step in the Builder.</Text>
      </View>
    );
  }

  // Force the iframe to fill the container without relying on injected <style> tags
  const responsiveEmbed = rawEmbed
     .replace(/width="[^"]*"/, 'width="100%"')
     .replace(/height="[^"]*"/, 'height="100%"');

  console.log("[YouTubeWidget Web] Rendering standard div wrapper");

  return (
    <View className="rounded-2xl overflow-hidden h-56 w-full my-3 bg-stone border border-line relative">
      <div 
         style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
         dangerouslySetInnerHTML={{ __html: responsiveEmbed }} 
      />
    </View>
  );
}