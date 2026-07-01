import * as Linking from 'expo-linking';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../../shared/components/AppText';

type LinkWidgetProps = { config: string };

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      if (k) obj[k] = decodeURIComponent(v || '');
    }
  });
  return obj;
};

export function LinkWidget({ config }: LinkWidgetProps) {
  const cfg = parseConfig(config);
  const isInline = cfg.displayType === 'inline';
  const isAffiliate = cfg.isAffiliate === 'true';

  if (isInline) {
    return (
      <Pressable 
        onPress={() => Linking.openURL(cfg.url || '')}
        className="flex-row items-center px-2 py-0.5 rounded-md border border-line bg-white active:bg-stone shadow-sm mx-1 inline-flex"
        style={{ alignSelf: 'flex-start', transform: [{ translateY: 2 }] }}
      >
        <AppText className="font-sansSemi text-ink text-sm">{cfg.title || 'Link'}</AppText>
        <AppText className="text-ink/40 text-[10px] ml-1">↗</AppText>
      </Pressable>
    );
  }

  return (
    <Pressable 
      onPress={() => Linking.openURL(cfg.url || '')}
      className="w-half flex-row justify-between items-center p-4 rounded-xl border border-line shadow-sm my-3 active:opacity-80 overflow-hidden relative"
      style={{ backgroundColor: cfg.bgImage ? '#000' : '#F5F5F4', width: '100%' }} 
    >
      {!!cfg.bgImage && (
        <Image
          source={{ uri: cfg.bgImage }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}
          contentFit="cover"
        />
      )}
      <View className="flex-1 ml-2 z-10">
        <AppText className="font-sansSemi text-base" style={{ color: cfg.textColor || (cfg.bgImage ? 'white' : '#1C1A17') }}>
          {cfg.title || 'External Link'}
        </AppText>
        
        {!!cfg.desc && (
           <AppText className="text-xs mt-1" style={{ color: cfg.textColor ? `${cfg.textColor}CC` : (cfg.bgImage ? 'rgba(255,255,255,0.8)' : 'rgba(28,26,23,0.6)') }}>
            {cfg.desc}
          </AppText>
        )}

        {/* AFFILIATE DISCLAIMER */}
        {isAffiliate && (
          <AppText 
            className="text-[9px] mt-1" 
            style={{ color: cfg.textColor ? `${cfg.textColor}80` : (cfg.bgImage ? 'rgba(255,255,255,0.5)' : 'rgba(28,26,23,0.4)') }}
          >
            (i) we may earn a commission on payments made using this link
          </AppText>
        )}
      </View>
      <AppText className="z-10" style={{ color: cfg.textColor || (cfg.bgImage ? 'white' : 'rgba(28,26,23,0.4)') }}>↗</AppText>
    </Pressable>
  );
}