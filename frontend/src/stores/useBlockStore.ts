import { create } from "zustand";
import type { BlockState, BlockedUser } from "@/types/store";
import api from "@/lib/axios";
import { toast } from "sonner";

export const useBlockStore = create<BlockState>((set, get) => ({
    blockedUsers: [],
    _blockedByUsers: [],
    loading: false,

    fetchBlockedUsers: async () => {
        try {
            set({ loading: true });
            const res = await api.get("/blocks", { withCredentials: true });
            set({ blockedUsers: res.data.blockedUsers });
        } catch (error) {
            console.error("Error fetching blocked users:", error);
        } finally {
            set({ loading: false });
        }
    },

    blockUser: async (userId: string) => {
        try {
            set({ loading: true });
            await api.post(`/blocks/${userId}`, {}, { withCredentials: true });
            toast.success("User blocked.");
        } catch (error) {
            console.error("Error blocking user:", error);
            toast.error("Failed to block user.");
        } finally {
            set({ loading: false });
        }
    },

    unblockUser: async (userId: string) => {
        try {
            set({ loading: true });
            await api.delete(`/blocks/${userId}`, { withCredentials: true });
            toast.success("User unblocked.");
        } catch (error) {
            console.error("Error unblocking user:", error);
            toast.error("Failed to unblock user.");
        } finally {
            set({ loading: false });
        }
    },

    getBlockStatus: async (userId: string) => {
        try {
            const res = await api.get(`/blocks/${userId}/status`, { withCredentials: true });
            return res.data;
        } catch {
            return { iBlockedThem: false, theyBlockedMe: false };
        }
    },

    isBlocked: (userId: string) => {
        return get().blockedUsers.some(u => u._id === userId);
    },

    isBlockedBy: (userId: string) => {
        return get()._blockedByUsers.includes(userId);
    },

    addBlock: (blockerId: string, blockedId: string, currentUserId: string) => {
        if (blockerId === currentUserId) {
            set((state) => {
                const exists = state.blockedUsers.some(u => u._id === blockedId);
                if (exists) return state;
                return {
                    blockedUsers: [...state.blockedUsers, { _id: blockedId } as BlockedUser]
                };
            });
        } else if (blockedId === currentUserId) {
            set((state) => ({
                _blockedByUsers: [...state._blockedByUsers, blockerId]
            }));
        }
    },

    removeBlock: (blockerId: string, blockedId: string, currentUserId: string) => {
        if (blockerId === currentUserId) {
            set((state) => ({
                blockedUsers: state.blockedUsers.filter(u => u._id !== blockedId)
            }));
        } else if (blockedId === currentUserId) {
            set((state) => ({
                _blockedByUsers: state._blockedByUsers.filter((id: string) => id !== blockerId)
            }));
        }
    },
}));