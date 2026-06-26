import { useState } from "react";
import { TextInput, View } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { FriendMomentCard } from "../../../src/features/social/components/FriendMomentCard";
import { Button } from "../../../src/shared/components/Button";
import { useFriendMoments, useSendFriendRequest } from "../../../src/features/social/api/socialApi";

export default function FriendsScreen() {
  const { data: friendMoments } = useFriendMoments();
  const sendFriendRequest = useSendFriendRequest();
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleInvite() {
    setMessage(null);

    try {
      await sendFriendRequest.mutateAsync(handle);
      setMessage("Request sent quietly. No broadcast, no feed noise.");
      setHandle("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send request.");
    }
  }

  return (
    <Screen contentClassName="pt-3">
      <View className="mb-6">
        <AppText variant="eyebrow">People</AppText>
        <AppText variant="display" className="mt-2">Shared, not scored.</AppText>
        <AppText className="mt-4 max-w-[330px]">
          Friends should make the world feel more possible. No followers, no rankings, no feed addiction.
        </AppText>
      </View>

      <View className="mb-4 rounded-card border border-line bg-cream p-5">
        <AppText variant="subtitle">Invite someone into a small adventure.</AppText>
        <AppText className="mt-2">
          Add by handle. Friendships are private connections for shared quests and quiet inspiration.
        </AppText>
        <TextInput
          autoCapitalize="none"
          placeholder="@handle"
          placeholderTextColor="#787267"
          value={handle}
          onChangeText={setHandle}
          className="mt-5 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
        />
        {message ? <AppText className="mt-3 text-ink/70">{message}</AppText> : null}
        <Button label={sendFriendRequest.isPending ? "Sending" : "Send request"} className="mt-5" variant="secondary" onPress={handleInvite} disabled={sendFriendRequest.isPending} />
      </View>

      <SectionHeader eyebrow="Friend lore" title="Quiet inspiration" />
      {friendMoments.map((moment) => (
        <FriendMomentCard key={moment.id} moment={moment} />
      ))}
    </Screen>
  );
}
