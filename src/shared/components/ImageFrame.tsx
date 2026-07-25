import { Image } from "expo-image";
import { View, type ViewStyle } from "react-native";
import { imageSource } from "../utils/imageSource";

type ImageFrameProps = {
  uri: string;
  className?: string;
  imageStyle?: ViewStyle;
};

export function ImageFrame({ uri, className, imageStyle }: ImageFrameProps) {
  return (
    <View className={className ?? "overflow-hidden rounded-card bg-stone"}>
      <Image
        source={imageSource(uri)}
        transition={280}
        contentFit="cover"
        style={[{ width: "100%", height: "100%" }, imageStyle]}
      />
    </View>
  );
}
