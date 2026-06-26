import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../src/shared/components/Screen";
import { AppText } from "../../src/shared/components/AppText";
import { Button } from "../../src/shared/components/Button";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { isSupabaseConfigured } from "../../src/lib/supabase";

export default function SignInScreen() {
  const { signInWithEmail, continueInPreviewMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithEmail(email.trim(), password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen scroll={false} contentClassName="flex-1 px-5 pb-8">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-between">
        <View className="pt-8">
          <AppText variant="eyebrow">Lore</AppText>
          <AppText variant="display" className="mt-4">Build a life worth remembering.</AppText>
          <AppText className="mt-5 max-w-[330px]">
            Sign in to save quests, preserve completed memories, map where they happened, and invite friends into small adventures.
          </AppText>
        </View>

        <View className="rounded-[36px] border border-line bg-cream p-5">
          {!isSupabaseConfigured ? (
            <View className="mb-5 rounded-[28px] bg-ivory p-4">
              <AppText variant="eyebrow">Local preview</AppText>
              <AppText className="mt-2 text-ink/70">
                Supabase is not configured yet. Preview mode keeps the app runnable while you set up the database.
              </AppText>
            </View>
          ) : null}

          <AppText variant="subtitle">Sign in</AppText>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#787267"
            value={email}
            onChangeText={setEmail}
            className="mt-5 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />
          <TextInput
            autoCapitalize="none"
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#787267"
            value={password}
            onChangeText={setPassword}
            className="mt-3 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />

          {error ? <AppText className="mt-4 text-burgundy">{error}</AppText> : null}

          <Button label={isSubmitting ? "Signing in" : "Sign in"} className="mt-5" onPress={handleSignIn} disabled={isSubmitting} />
          <Button label="Preview without backend" className="mt-3" variant="secondary" onPress={continueInPreviewMode} />

          <Pressable className="mt-5 items-center">
            <Link href="/sign-up" asChild>
              <AppText variant="caption" className="font-sansSemi text-ink">Create an account</AppText>
            </Link>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
