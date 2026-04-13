import api from '@/lib/axios';

export const authService = {
    signUp: async (username: string, password: string, firstname: string, lastname: string, email: string) => {
        const response = await api.post('/auth/signup', {
            username,
            password,
            firstName: firstname,
            lastName: lastname,
            email,
        }, {withCredentials: true});
        return response.data;
    },

    signIn: async (username: string, password: string) => {
        const response = await api.post('/auth/signin', {
            username,
            password,
        }, {withCredentials: true});
        return response.data;
    },

    signOut: async () => {
        return api.post('/auth/signout', {}, {withCredentials: true});
    },

    fetchMe: async () => {
        const response = await api.get('/users/me', {withCredentials: true});
        return response.data.user;
    },

    refresh: async () => {
        const response = await api.post('/auth/refresh', {}, {withCredentials: true});
        return response.data.accessToken;
    },

    updateProfile: async (data: { displayName?: string; username?: string; email?: string; phone?: string; bio?: string }) => {
        const response = await api.put('/users/me', data, { withCredentials: true });
        return response.data.user;
    },

    updateOnlineStatus: async (showOnlineStatus: boolean) => {
        const response = await api.put('/users/me/online-status', { showOnlineStatus }, { withCredentials: true });
        return response.data.user;
    },

    changePassword: async (oldPassword: string, newPassword: string) => {
        const response = await api.put('/users/me/change-password', { oldPassword, newPassword }, { withCredentials: true });
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email }, { withCredentials: true });
        return response.data;
    },

    verifyOtp: async (email: string, otp: string) => {
        const response = await api.post('/auth/verify-otp', { email, otp }, { withCredentials: true });
        return response.data;
    },

    resetPassword: async (email: string, otp: string, newPassword: string) => {
        const response = await api.post('/auth/reset-password', { email, otp, newPassword }, { withCredentials: true });
        return response.data;
    },
    
    getUserById: async (id: string) => {
        const response = await api.get(`/users/${id}`, { withCredentials: true });
        return response.data.user;
    },
}