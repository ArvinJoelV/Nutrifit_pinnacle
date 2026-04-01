import { auth } from '../config/firebase';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:9510').replace(/\/$/, '');

const getUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
};

const getJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || `Request failed (${response.status})`);
    }
    return payload;
};

export const startGoogleFitConnect = async () => {
    const userId = getUserId();
    const payload = await getJson(`${API_BASE_URL}/api/google-fit/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    });
    return payload.authUrl;
};

export const syncGoogleFitActivity = async (days = 7) => {
    const userId = getUserId();
    return getJson(`${API_BASE_URL}/api/google-fit/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, days }),
    });
};

export const getGoogleFitActivity = async (days = 7) => {
    const userId = getUserId();
    const url = `${API_BASE_URL}/api/google-fit/activity?userId=${encodeURIComponent(userId)}&days=${encodeURIComponent(days)}`;
    return getJson(url);
};

