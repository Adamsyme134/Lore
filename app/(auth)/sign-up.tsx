import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "../../src/shared/components/Screen";
import { AppText } from "../../src/shared/components/AppText";
import { Button } from "../../src/shared/components/Button";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  async function handleSignUp() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signUpWithEmail(email.trim(), password, fullName, handle);
      setIsVerificationSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isVerificationSent) {
    return (
      <Screen scroll={false} contentClassName="flex-1 px-5 justify-center">
        <View className="rounded-[36px] border border-line bg-cream p-6 items-center">
          <AppText variant="subtitle" className="text-center">Check your email</AppText>
          <AppText className="mt-4 text-center max-w-[280px]">
            We've sent a verification link to <AppText className="font-sansSemi">{email}</AppText>. 
            Tap the link on this device to activate your account.
          </AppText>
          <Button 
            label="Back to Sign In" 
            className="mt-8 w-full" 
            onPress={() => router.replace("/sign-in")} 
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentClassName="flex-1 px-5 pb-8">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-between">
        <View className="pt-8">
          <AppText variant="eyebrow">Join Lore</AppText>
          <AppText variant="display" className="mt-4">Start collecting better stories.</AppText>
          <AppText className="mt-5 max-w-[330px]">
            A profile is deliberately minimal: a name, a handle, and the memories you choose to preserve.
          </AppText>
        </View>

        <View className="rounded-[36px] border border-line bg-cream p-5">
          <AppText variant="subtitle">Create account</AppText>
          <TextInput
            placeholder="Full name"
            placeholderTextColor="#787267"
            value={fullName}
            onChangeText={setFullName}
            className="mt-5 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />
          <TextInput
            autoCapitalize="none"
            placeholder="Handle"
            placeholderTextColor="#787267"
            value={handle}
            onChangeText={setHandle}
            className="mt-3 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#787267"
            value={email}
            onChangeText={setEmail}
            className="mt-3 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
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

          <Button label={isSubmitting ? "Creating" : "Create account"} className="mt-5" onPress={handleSignUp} disabled={isSubmitting} />
          <Pressable className="mt-5 items-center">
            <Link href="/sign-in" asChild>
              <AppText variant="caption" className="font-sansSemi text-ink">Already have an account?</AppText>
            </Link>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
