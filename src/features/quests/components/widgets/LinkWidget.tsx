import * as Linking from 'expo-linking';
import { Pressable, View } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';

type LinkWidgetProps = { config: string };

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};

export function LinkWidget({ config }: LinkWidgetProps) {
  const cfg = parseConfig(config);

  return (
    <Pressable 
      onPress={() => Linking.openURL(cfg.url || '')}
      className="flex-row items-center p-4 rounded-xl border border-line bg-stone my-3 active:bg-line"
    >
      <View className="flex-1 ml-2">
        <AppText className="font-sansSemi text-ink text-base">{cfg.title || 'External Link'}</AppText>
        {cfg.desc && <AppText className="text-ink/60 text-xs mt-1">{cfg.desc}</AppText>}
      </View>
      <AppText className="text-ink/40">↗</AppText>
    </Pressable>
  );
}