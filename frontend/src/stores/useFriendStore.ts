import { friendService } from "@/services/friendService";
import type { FriendState } from "@/types/store";
import type { FriendRequest } from "@/types/user";
import { create } from "zustand";

export const useFriendStore = create<FriendState>((set, get) => ({
    friends: [],
    loading: false,
    receivedList: [],
    sentList: [],
    searchbyUsername: async (username) => {
        try {
            set({ loading: true });
            const user = await friendService.searchByUsername(username);
            return user;
        }
        catch (error) {
            console.error("Error searching user by username:", error);
            return null;
        }
        finally {
            set({ loading: false });
        }
    },
    addFriend: async (to, message) => {
        try {
            set({ loading: true });
            const { message: resultMessage, request } = await friendService.sendFriendRequest(to, message);

            if (request) {
                set((state) => ({
                    sentList: state.sentList.some(r => r._id === request._id)
                        ? state.sentList
                        : [request, ...state.sentList]
                }));
            }

            return resultMessage;
        }
        catch (error: any) {
            const serverMessage = error?.response?.data?.message;
            return serverMessage || "Failed to send friend request.";
        }
        finally {
            set({ loading: false });
        }
    },
    getAllFriendRequests: async () => {
        try {
            set({ loading: true });
            const result = await friendService.getAllFriendRequests();
            if (!result) return;

            const { sent, received } = result;

            set({ sentList: sent, receivedList: received });
        }
        catch (error) {
            console.error("Error fetching friend requests:", error);
        }
        finally {
            set({ loading: false });
        }

    },
    acceptRequest: async (requestId) => {
        try {
            set({ loading: true });
            await friendService.acceptRequest(requestId);

            set((state) => ({
                receivedList: state.receivedList.filter(req => req._id !== requestId)
            }));
        }
        catch (error) {
            console.error("Error accepting friend request:", error);
        }
        finally {
            set({ loading: false });
        }
    },
    declineRequest: async (requestId) => {
        try {
            set({ loading: true });
            await friendService.declineRequest(requestId);

            set((state) => ({
                receivedList: state.receivedList.filter(req => req._id !== requestId)
            }));
        }
        catch (error) {
            console.error("Error declining friend request:", error);
        }
        finally {
            set({ loading: false });
        }
    },
    getFriends: async () => {
        try {
            set({ loading: true });
            const friends = await friendService.getFriendsList();
            set({friends: friends});
        }
        catch (error) {
            console.error("Error fetching friends list:", error);
            set({friends: []});
        }
        finally {
            set({ loading: false });
        }
    },    
    addReceivedRequest: (request: FriendRequest) => {
        set((state) => {
            const exists = state.receivedList.some(r => r._id === request._id);
            if (exists) return state;
            return { receivedList: [request, ...state.receivedList] };
        });
    },
}));