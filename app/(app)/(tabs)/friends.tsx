// app/(app)/(tabs)/friends.tsx
import { useState } from "react";
import { TextInput, View, ActivityIndicator, Share, TouchableOpacity, ScrollView } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { FriendMomentCard } from "../../../src/features/social/components/FriendMomentCard";
import { Button } from "../../../src/shared/components/Button";
import { 
  useFriendMoments, 
  useSendFriendRequest, 
  useFriendsList,
  useSearchUsers,
  usePendingRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest
} from "../../../src/features/social/api/socialApi";

export default function FriendsScreen() {
  const { data: friendMoments } = useFriendMoments();
  const { data: friends, isLoading: isLoadingFriends } = useFriendsList();
  
  // New API Hooks
  const { data: pendingRequests } = usePendingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const sendFriendRequest = useSendFriendRequest();
  
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const handleShareAppInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on Lore! Download the app so we can make life more interesting: https://lore.app/invite',
        title: 'Invite Friends to Lore'
      });
    } catch (error) {
      console.error('Error sharing link', error);
    }
  };

  const handleSendRequest = (userId: string) => {
    sendFriendRequest.mutate(userId, {
      onSuccess: () => {
        setSentRequests(prev => new Set(prev).add(userId));
      }
    });
  };

  return (
    <Screen contentClassName="pt-3 px-5 pb-20">
      <View className="mb-6">
        <AppText variant="eyebrow">People</AppText>
        <AppText variant="display" className="mt-2">Shared, not scored.</AppText>
        <AppText className="mt-4 max-w-[330px]">
          Friends should make the world feel more possible. No followers, no rankings, no feed addiction.
        </AppText>
      </View>

      {/* PENDING REQUESTS */}
      {pendingRequests && pendingRequests.length > 0 && (
        <View className="mb-8">
          <SectionHeader eyebrow="Requests" title="Awaiting response" />
          <View className="space-y-3 mt-2">
            {pendingRequests.map(req => (
              <View key={req.id} className="flex-row items-center justify-between border-b border-line pb-4 pt-2">
                <View className="flex-row items-center flex-1 pr-4">
                   <View className="h-10 w-10 items-center justify-center rounded-full bg-orange">
                    <AppText className="font-sansSemi text-ivory text-base">
                      {req.requester.full_name.charAt(0).toUpperCase()}
                    </AppText>
                   </View>
                   <View className="ml-3 flex-1">
                     <AppText className="font-sansSemi" numberOfLines={1}>{req.requester.full_name}</AppText>
                     <AppText variant="caption" className="text-ink/60">@{req.requester.handle}</AppText>
                   </View>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => declineRequest.mutate(req.id)}
                    className="rounded-full bg-line px-4 py-2"
                  >
                    <AppText className="font-sansSemi text-[14px]">Decline</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => acceptRequest.mutate(req.id)}
                    className="ml-2 rounded-full bg-forest px-4 py-2"
                  >
                    <AppText className="font-sansSemi text-ivory text-[14px]">Accept</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* FIND & INVITE CARD */}
      <View className="mb-8 rounded-card border border-line bg-surface p-5">
        <AppText variant="subtitle">Grow your circle</AppText>
        
        <Button 
          label="Share invite link" 
          className="mt-4" 
          variant="secondary" 
          onPress={handleShareAppInvite} 
        />

        <View className="my-5 h-[1px] w-full bg-line" />

        <TextInput
          autoCapitalize="none"
          placeholder="Search by name or @handle..."
          placeholderTextColor="#787267"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="rounded-3xl border border-line bg-background px-5 py-4 font-sans text-[15px] text-ink"
        />

        {searchQuery.length >= 2 && (
          <View className="mt-4 space-y-3">
            {isSearching ? (
               <ActivityIndicator className="py-2" color="#2c2a25" />
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map(user => {
                const isSent = sentRequests.has(user.id);
                return (
                  <View key={user.id} className="flex-row items-center justify-between border-b border-line pb-3">
                    <View className="flex-1 pr-4">
                      <AppText className="font-sansSemi" numberOfLines={1}>{user.fullName}</AppText>
                      <AppText variant="caption" className="text-ink/60">@{user.handle}</AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() => !isSent && handleSendRequest(user.id)}
                      className={`rounded-full px-4 py-2 ${isSent ? 'bg-line' : 'bg-forest'}`}
                      disabled={isSent}
                    >
                      <AppText className={`font-sansSemi text-[14px] ${isSent ? 'text-ink' : 'text-ivory'}`}>
                        {isSent ? 'Sent' : 'Add'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <AppText className="text-ink/60 text-center py-2">No explorers found.</AppText>
            )}
          </View>
        )}
      </View>

      {/* ACTIVE FRIENDS */}
      <SectionHeader eyebrow="Your Circle" title="Active Explorers" />
      
      {isLoadingFriends ? (
        <ActivityIndicator className="mt-4" color="#2c2a25" />
      ) : friends && friends.length > 0 ? (
        <View className="mb-8 mt-2 space-y-4">
          {friends.map(friend => (
            <View key={friend.id} className="flex-row items-center border-b border-line pb-4 pt-2">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-orange">
                <AppText className="font-sansSemi text-ivory text-lg">
                  {friend.fullName.charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View className="ml-4 flex-1">
                <AppText className="font-sansSemi text-[17px]">{friend.fullName}</AppText>
                <AppText variant="caption" className="text-ink/60">@{friend.handle}</AppText>
              </View>
              <AppText variant="caption" className="font-sansSemi text-burgundy">
                {friend.pointsTotal} pts
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText className="mb-8 mt-2 text-ink/60">Your circle is currently empty.</AppText>
      )}

      {/* FRIEND LORE */}
      {friendMoments && friendMoments.length > 0 && (
        <>
          <SectionHeader eyebrow="Friend lore" title="Quiet inspiration" />
          {friendMoments.map((moment) => (
            <FriendMomentCard key={moment.id} moment={moment} />
          ))}
        </>
      )}
    </Screen>
  );
}