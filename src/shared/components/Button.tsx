import { Pressable, type PressableProps, View } from "react-native";
import { AppText } from "./AppText";
import { cx } from "../utils/cx";

type ButtonVariant = "primary" | "secondary" | "quiet";

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  className?: string;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-ink",
  secondary: "bg-cream border border-line",
  quiet: "bg-transparent border border-ink/15"
};

const labelClass: Record<ButtonVariant, string> = {
  primary: "text-ivory",
  secondary: "text-ink",
  quiet: "text-ink"
};

export function Button({ label, variant = "primary", className, ...props }: ButtonProps) {
  return (
    <Pressable
      {...props}
      className={cx("overflow-hidden rounded-full", className)}
      android_ripple={{ color: "rgba(245,240,231,0.16)", borderless: false }}
    >
      {({ pressed }) => (
        <View className={cx("items-center justify-center rounded-full px-6 py-4", variantClass[variant], pressed && "opacity-80")}>
          <AppText variant="caption" className={cx("font-sansBold uppercase tracking-editorial", labelClass[variant])}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
