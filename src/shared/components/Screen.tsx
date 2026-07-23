import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, type ScrollViewProps, type ViewProps } from "react-native";
import { cx } from "../utils/cx";

type ScreenProps = ViewProps & {
  scroll?: boolean;
  contentClassName?: string;
  refreshControl?: ScrollViewProps["refreshControl"];
};

export function Screen({ children, className, contentClassName, refreshControl, scroll = true, ...props }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} className={cx("flex-1 bg-background", className)} {...props}>
        <View className={cx("flex-1", contentClassName)}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className={cx("flex-1 bg-background", className)} {...props}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName={cx("px-5 pb-36", contentClassName)}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
