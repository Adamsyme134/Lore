import { View } from "react-native";
import { AppText } from "./AppText";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  body?: string;
};

export function SectionHeader({ eyebrow, title, body }: SectionHeaderProps) {
  return (
    <View className="mb-5 mt-8">
      {eyebrow ? <AppText variant="eyebrow" className="mb-2">{eyebrow}</AppText> : null}
      <AppText variant="title">{title}</AppText>
      {body ? <AppText className="mt-2 max-w-[310px]">{body}</AppText> : null}
    </View>
  );
}
