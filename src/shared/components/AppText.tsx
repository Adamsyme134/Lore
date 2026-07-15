import { Text, type TextProps } from "react-native";
import { cx } from "../utils/cx";

type Variant = "display" | "title" | "subtitle" | "body" | "caption" | "eyebrow";

type AppTextProps = TextProps & {
  variant?: Variant;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  display: "font-serif text-5xl leading-[56px] tracking-[-1.6px] text-ink dark:text-ivory",
  title: "font-serifSemi text-3xl leading-10 tracking-[-0.8px] text-ink dark:text-ivory",
  subtitle: "font-sansSemi text-lg leading-7 text-ink dark:text-ivory",
  body: "font-sans text-[15px] leading-6 text-ink/40 dark:text-ivory/60",
  caption: "font-sans text-xs leading-5 text-ink/60 dark:text-ivory/60",
  eyebrow: "font-sansBold text-[11px] uppercase tracking-editorial text-ink/60 dark:text-ivory/60"
};

export function AppText({ variant = "body", className, ...props }: AppTextProps) {
  return <Text {...props} className={cx(variantClass[variant], className)} />;
}
