import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "../../src/shared/components/Screen";
import { AppText } from "../../src/shared/components/AppText";
import { Button } from "../../src/shared/components/Button";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { isSupabaseConfigured } from "../../src/lib/supabase";

export default function SignInScreen() {
  const { signInWithEmail} = useAuth();
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
      {/* 1. Add behavior="padding" and keyboardVerticalOffset to push the view up */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0} 
        className="flex-1 justify-center" // Center the form when keyboard is closed
      >
        <View className="rounded-[36px] border border-line bg-cream p-5">
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

          <Button label="Sign In" className="mt-5" onPress={handleSignIn} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
 );
}
