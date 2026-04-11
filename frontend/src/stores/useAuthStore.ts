import {create} from 'zustand';
import {toast} from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/store';
import { persist } from 'zustand/middleware';
import { useChatStore } from './useChatStore';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            user: null,
            loading: false,

            setAccessToken (accessToken) {
                set({accessToken});
            },

            setUser (user) {
                set({user});
            },

            clearState () {
                set({
                    accessToken: null,
                    user: null,
                    loading: false
                });
                useChatStore.getState().reset();
                localStorage.clear();
                sessionStorage.clear();
            },

            signUp: async (username, password, firstname, lastname, email) => {
                try {
                    set({loading: true});

                    // Call API
                    await authService.signUp(username, password, firstname, lastname, email);
                    useChatStore.getState().reset();
                    toast.success('Sign up successful! Directing to sign in page...');
                }
                catch (error) {
                    console.error(error);
                    toast.error('Sign up failed. Please try again.');
                }
                finally {
                    set({loading: false});
                }
            },

            signIn: async (username, password) => {
                try {
                    get().clearState();
                    set({loading: true});

                    const {accessToken} = await authService.signIn(username, password);
                    get().setAccessToken(accessToken);

                    await get().fetchMe();
                    useChatStore.getState().fetchConversations();

                    toast.success('Sign in successful!');
                }
                catch (error) {
                    console.error(error);
                    toast.error('Sign in failed. Please try again.');
                }
                finally {
                    set({loading: false});
                }
            },

            signOut: async () => {
                try {
                    get().clearState();
                    await authService.signOut();
                    toast.success('Sign out successful!');

                }
                catch (error) {
                    console.error(error);
                    toast.error('Sign out failed. Please try again.');
                }
            },

            fetchMe: async () => {
                try {
                    set({loading: true});
                    const user =  await authService.fetchMe();
                    set({user});
                }
                catch (error) {
                    console.error(error);
                    set({user: null, accessToken: null});
                    toast.error('Session has expired. Please sign in again.');
                }
                finally {
                    set({loading: false});
                }
            },

            refresh: async () => {
                try {
                    set({loading: true});
                    const {user, fetchMe, setAccessToken} = get();
                    const accessToken = await authService.refresh();

                    setAccessToken(accessToken);

                    if (!user) {
                        await fetchMe();
                    }
                }
                catch (error) {
                    console.error(error);
                    toast.error('Session has expired. Please sign in again.');
                    get().clearState();
                }
                finally {
                    set({loading: false});
                }
            },

            updateProfile: async (data) => {
                try {
                    set({ loading: true });
                    const user = await authService.updateProfile(data);
                    set({ user });
                    toast.success('Profile updated successfully!');
                }
                catch (error: any) {
                    console.error(error);
                    const message = error?.response?.data?.message || 'Update failed. Please try again.';
                    toast.error(message);
                }
                finally {
                    set({ loading: false });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user })
        }
    )
);
