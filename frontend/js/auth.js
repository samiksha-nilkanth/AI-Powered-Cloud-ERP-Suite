const AuthAPI = {
    async register({ fullName, email, phone, password }) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, phone, password })
        });
        return response.json();
    },

    async login(email, password) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    },

    async googleLogin(credential) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        return response.json();
    },

    async googleLoginWithProfile(profile) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile })
        });
        return response.json();
    },

    async sendOTP(phone) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/phone/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        return response.json();
    },

    async verifyOTP(phone, code) {
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/phone/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code })
        });
        return response.json();
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem(APP_CONFIG.REFRESH_KEY);
        if (!refreshToken) return null;
        const response = await fetch(`${APP_CONFIG.API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        return response.json();
    },

    async logout() {
        const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
        const refreshToken = localStorage.getItem(APP_CONFIG.REFRESH_KEY);
        try {
            await fetch(`${APP_CONFIG.API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ refreshToken })
            });
        } catch (e) {}
        clearAuthData();
    },

    async getProfile() {
        const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
        const response = await fetch(`${APP_CONFIG.API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    },

    async getDashboard() {
        const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
        const response = await fetch(`${APP_CONFIG.API_BASE}/user/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }
};
