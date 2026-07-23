import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { useExperienceStore } from "../../app/store/useExperienceStore";
import type { Profile, Quest } from "../../../shared/types/domain";
import { mapQuest, type QuestRow } from "./questApi";

type ProfileJoin = {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string | null;
  home_city?: string | null;
  points_total?: number;
};

type QuestInviteRow = {
  id: string;
  quest_id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  sender: ProfileJoin | ProfileJoin[] | null;
  receiver: ProfileJoin | ProfileJoin[] | null;
  quests?: QuestRow | QuestRow[] | null;
};

type UserQuestProgressRow = {
  user_id: string;
  status: "saved" | "active" | "completed" | "dismissed";
  completed_step_indexes?: number[] | null;
};

export type PendingGroupQuestInvite = {
  id: string;
  quest: Quest;
  sender: Profile;
  createdAt: string;
};

export type GroupQuestParticipant = {
  userId: string;
  fullName: string;
  handle: string;
  avatarUrl?: string | null;
  status: "accepted" | "pending";
  completedStepIndexes: number[];
  isCurrentUser: boolean;
};

export type UserQuestState = {
  status: "saved" | "active" | "completed" | "dismissed";
  completedStepIndexes: number[];
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function mapProfile(row: ProfileJoin): Profile {
  return {
    id: row.id,
    handle: row.handle,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    homeCity: row.home_city ?? null,
    pointsTotal: row.points_total ?? 0
  };
}

async function fetchUserQuestProgress(questId: string, userIds: string[]) {
  if (!supabase || userIds.length === 0) return [];

  const withStepIndexes = await supabase
    .from("user_quests")
    .select("user_id, status, completed_step_indexes")
    .eq("quest_id", questId)
    .in("user_id", userIds);

  if (!withStepIndexes.error) {
    return (withStepIndexes.data ?? []) as UserQuestProgressRow[];
  }

  const fallback = await supabase
    .from("user_quests")
    .select("user_id, status")
    .eq("quest_id", questId)
    .in("user_id", userIds);

  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as UserQuestProgressRow[];
}

export function useCreateGroupQuestInvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activateQuest = useExperienceStore((state) => state.activateQuest);
  const activeQuests = useExperienceStore((state) => state.activeQuests);

  return useMutation({
    mutationFn: async ({ questId, receiverIds }: { questId: string; receiverIds: string[] }) => {
      if (!user || !supabase) return;
      const uniqueReceiverIds = Array.from(new Set(receiverIds)).filter((id) => id !== user.id);
      if (uniqueReceiverIds.length === 0) {
        throw new Error("Choose at least one friend to invite.");
      }

      activateQuest(questId);

      const client = requireSupabase();
      const activeQuest = await client
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "active" }, { onConflict: "user_id,quest_id" });

      if (activeQuest.error) throw activeQuest.error;

      const existingStepIndexes = activeQuests[questId] ?? [];
      if (existingStepIndexes.length > 0) {
        const progressUpdate = await client
          .from("user_quests")
          .update({ completed_step_indexes: existingStepIndexes })
          .eq("user_id", user.id)
          .eq("quest_id", questId);

        if (progressUpdate.error) {
          console.warn("Could not sync local quest progress before sending group invites.", progressUpdate.error.message);
        }
      }

      const { data: existingInvites, error: existingError } = await client
        .from("quest_invites")
        .select("receiver_id, status")
        .eq("quest_id", questId)
        .eq("sender_id", user.id)
        .in("receiver_id", uniqueReceiverIds);

      if (existingError) throw existingError;

      const existingByReceiver = new Map((existingInvites ?? []).map((invite) => [invite.receiver_id, invite.status]));
      const declinedReceiverIds = uniqueReceiverIds.filter((receiverId) => existingByReceiver.get(receiverId) === "declined");

      if (declinedReceiverIds.length > 0) {
        const { error: reopenError } = await client
          .from("quest_invites")
          .update({ status: "pending", responded_at: null })
          .eq("quest_id", questId)
          .eq("sender_id", user.id)
          .in("receiver_id", declinedReceiverIds);

        if (reopenError) throw reopenError;
      }

      const rows = uniqueReceiverIds.filter((receiverId) => !existingByReceiver.has(receiverId)).map((receiverId) => ({
        quest_id: questId,
        sender_id: user.id,
        receiver_id: receiverId,
        status: "pending"
      }));

      if (rows.length > 0) {
        const { error } = await client.from("quest_invites").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress", variables.questId] });
      void queryClient.invalidateQueries({ queryKey: ["user-quest-state", variables.questId] });
      void queryClient.invalidateQueries({ queryKey: ["pending-group-quest-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["quests"] });
    }
  });
}

export function usePendingGroupQuestInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-group-quest-invites", user?.id],
    queryFn: async () => {
      if (!user || !supabase) return [];
      const { data, error } = await supabase
        .from("quest_invites")
        .select(`
          id,
          quest_id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!quest_invites_sender_id_fkey(id, handle, full_name, avatar_url, home_city, points_total),
          quests(*)
        `)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as QuestInviteRow[])
        .map((invite) => {
          const sender = unwrapJoin(invite.sender);
          const quest = unwrapJoin(invite.quests);
          if (!sender || !quest) return null;
          return {
            id: invite.id,
            quest: mapQuest(quest),
            sender: mapProfile(sender),
            createdAt: invite.created_at
          } satisfies PendingGroupQuestInvite;
        })
        .filter(Boolean) as PendingGroupQuestInvite[];
    },
    enabled: !!user && !!supabase
  });
}

export function useAcceptGroupQuestInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activateQuest = useExperienceStore((state) => state.activateQuest);

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user || !supabase) return null;

      const client = requireSupabase();
      const { data: invite, error: inviteError } = await client
        .from("quest_invites")
        .select("id, quest_id, sender_id")
        .eq("id", inviteId)
        .eq("receiver_id", user.id)
        .single();

      if (inviteError) throw inviteError;

      const { error: updateError } = await client
        .from("quest_invites")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", inviteId)
        .eq("receiver_id", user.id);

      if (updateError) throw updateError;

      activateQuest(invite.quest_id);

      const activeQuest = await client
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: invite.quest_id, status: "active", invited_by: invite.sender_id }, { onConflict: "user_id,quest_id" });

      if (activeQuest.error) throw activeQuest.error;

      return invite.quest_id as string;
    },
    onSuccess: (questId) => {
      void queryClient.invalidateQueries({ queryKey: ["pending-group-quest-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress", questId] });
      void queryClient.invalidateQueries({ queryKey: ["user-quest-state", questId] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["quests"] });
    },
    onError: (error) => {
      Alert.alert("Could not join quest", error instanceof Error ? error.message : "Please try again.");
    }
  });
}

export function useDeclineGroupQuestInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user || !supabase) return;
      const { error } = await supabase
        .from("quest_invites")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", inviteId)
        .eq("receiver_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-group-quest-invites"] });
    }
  });
}

export function useGroupQuestProgress(questId?: string) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["group-quest-progress", questId, user?.id],
    queryFn: async () => {
      if (!questId || !user || !supabase) {
        return { participants: [] as GroupQuestParticipant[], pendingCount: 0, hasGroup: false };
      }

      const { data, error } = await supabase
        .from("quest_invites")
        .select(`
          id,
          quest_id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!quest_invites_sender_id_fkey(id, handle, full_name, avatar_url, home_city, points_total),
          receiver:profiles!quest_invites_receiver_id_fkey(id, handle, full_name, avatar_url, home_city, points_total)
        `)
        .eq("quest_id", questId)
        .in("status", ["pending", "accepted"]);

      if (error) throw error;

      const invites = (data ?? []) as unknown as QuestInviteRow[];
      const hasGroup = invites.some((invite) => invite.sender_id === user.id || invite.receiver_id === user.id);
      if (!hasGroup) {
        return { participants: [] as GroupQuestParticipant[], pendingCount: 0, hasGroup: false };
      }

      const profileById = new Map<string, Profile>();
      if (profile) profileById.set(user.id, profile);

      invites.forEach((invite) => {
        const sender = unwrapJoin(invite.sender);
        const receiver = unwrapJoin(invite.receiver);
        if (sender) profileById.set(sender.id, mapProfile(sender));
        if (receiver) profileById.set(receiver.id, mapProfile(receiver));
      });

      const acceptedIds = new Set<string>();
      const pendingIds = new Set<string>();

      invites.forEach((invite) => {
        acceptedIds.add(invite.sender_id);
        if (invite.status === "accepted") {
          acceptedIds.add(invite.receiver_id);
        } else if (invite.status === "pending") {
          pendingIds.add(invite.receiver_id);
        }
      });

      const progressRows = await fetchUserQuestProgress(questId, Array.from(acceptedIds));
      const progressByUser = new Map(progressRows.map((row) => [row.user_id, row]));

      const participants = Array.from(acceptedIds).map((userId) => {
        const participantProfile = profileById.get(userId);
        return {
          userId,
          fullName: participantProfile?.fullName ?? "Explorer",
          handle: participantProfile?.handle ?? "friend",
          avatarUrl: participantProfile?.avatarUrl,
          status: "accepted",
          completedStepIndexes: progressByUser.get(userId)?.completed_step_indexes ?? [],
          isCurrentUser: userId === user.id
        } satisfies GroupQuestParticipant;
      });

      return {
        participants,
        pendingCount: pendingIds.size,
        hasGroup: true
      };
    },
    enabled: !!questId && !!user && !!supabase
  });
}

export function useUserQuestState(questId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-quest-state", questId, user?.id],
    queryFn: async () => {
      if (!questId || !user || !supabase) return null;

      const withStepIndexes = await supabase
        .from("user_quests")
        .select("status, completed_step_indexes")
        .eq("quest_id", questId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!withStepIndexes.error) {
        return withStepIndexes.data
          ? {
            status: withStepIndexes.data.status,
            completedStepIndexes: withStepIndexes.data.completed_step_indexes ?? []
          } satisfies UserQuestState
          : null;
      }

      const fallback = await supabase
        .from("user_quests")
        .select("status")
        .eq("quest_id", questId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fallback.error) throw fallback.error;
      return fallback.data
        ? { status: fallback.data.status, completedStepIndexes: [] } satisfies UserQuestState
        : null;
    },
    enabled: !!questId && !!user && !!supabase
  });
}

export function useUpdateQuestStepProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questId, completedStepIndexes }: { questId: string; completedStepIndexes: number[] }) => {
      if (!user || !supabase) return;
      const uniqueSteps = Array.from(new Set(completedStepIndexes)).sort((a, b) => a - b);
      const client = requireSupabase();

      const update = await client
        .from("user_quests")
        .upsert(
          { user_id: user.id, quest_id: questId, status: "active", completed_step_indexes: uniqueSteps },
          { onConflict: "user_id,quest_id" }
        );

      if (update.error) {
        const fallback = await client
          .from("user_quests")
          .upsert({ user_id: user.id, quest_id: questId, status: "active" }, { onConflict: "user_id,quest_id" });
        if (fallback.error) throw fallback.error;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress", variables.questId] });
      void queryClient.invalidateQueries({ queryKey: ["user-quest-state", variables.questId] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
    }
  });
}
