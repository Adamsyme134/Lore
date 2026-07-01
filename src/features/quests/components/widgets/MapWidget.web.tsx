// src/features/quests/components/widgets/MapWidget.web.tsx
import React from 'react';
import { View } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';

export function MapWidget({ config }: { config: string }) {
  const parsed: Record<string, string> = {};
  config.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      if (k) parsed[k] = decodeURIComponent(v || '');
    }
  });

  const pins = (parsed.pins || '').split('|').filter(Boolean);

  return (
    <View className="w-full my-3 rounded-xl border border-line bg-stone items-center justify-center relative" style={{ height: 350 }}>
      <AppText className="text-4xl mb-2">🗺️</AppText>
      <AppText variant="subtitle" className="text-ink">{parsed.title || 'Interactive Map'}</AppText>
      <AppText className="text-ink/60 text-sm mt-1">{pins.length} pinned location(s)</AppText>
      
      <View className="absolute bottom-4 px-4 py-2 bg-white rounded-full border border-line shadow-sm">
        <AppText className="text-ink/40 text-[10px] font-sansSemi uppercase">Native Map Hidden on Web Builder</AppText>
      </View>
    </View>
  );
}