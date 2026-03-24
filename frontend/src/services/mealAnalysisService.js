const API_BASE_URL = import.meta.env.VITE_MEAL_ANALYSIS_API_URL || 'http://127.0.0.1:9510';

const toAbsoluteUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalized}`;
};

const toNum = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const analyzeMealImage = async (file, { signal } = {}) => {
    if (!file) {
        throw new Error('No image file selected.');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/analyze-meal`, {
        method: 'POST',
        body: formData,
        signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || `Meal analysis failed (${response.status})`);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    return {
        items: items.map((item, index) => ({
            id: item.id || `seg-${index}`,
            name: item.name || 'Unknown Food',
            calories: toNum(item.calories),
            protein: toNum(item.protein),
            carbs: toNum(item.carbs),
            fat: toNum(item.fat),
            image: toAbsoluteUrl(item.image),
            error: item.error || null,
            rawModelText: item.rawModelText || null,
            detectedLabel: item.detectedLabel || null,
            detectedConfidence: toNum(item.detectedConfidence),
            multiplier: 1,
            serving: '1 portion',
        })),
        totals: {
            calories: toNum(payload.totals?.calories),
            protein: toNum(payload.totals?.protein),
            carbs: toNum(payload.totals?.carbs),
            fat: toNum(payload.totals?.fat),
        },
        segmentedImage: toAbsoluteUrl(payload.segmentedImage),
        originalImage: toAbsoluteUrl(payload.originalImage),
    };
};
