const API_BASE_URL = import.meta.env.VITE_MEAL_ANALYSIS_API_URL || 'http://127.0.0.1:9510';

const toAbsoluteUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('blob:')) return path;
    let url = path;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        url = `${API_BASE_URL}${normalized}`;
    }
    // Append timestamp cache-buster if not already present
    if (!url.includes('?t=') && !url.includes('&t=')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}t=${Date.now()}`;
    }
    return url;
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
            serving: item.serving || (item.mass_g != null ? `${Math.round(toNum(item.mass_g))}g portion` : '1 portion'),
            mass_g: item.mass_g != null ? toNum(item.mass_g) : null,
            mass_range_g: Array.isArray(item.mass_range_g) ? item.mass_range_g.map(toNum) : null,
            estimated_volume_cm3: item.estimated_volume_cm3 != null ? toNum(item.estimated_volume_cm3) : null,
            visible_area_cm2: item.visible_area_cm2 != null ? toNum(item.visible_area_cm2) : null,
            estimated_total_area_cm2: item.estimated_total_area_cm2 != null ? toNum(item.estimated_total_area_cm2) : null,
            occlusion_probability: item.occlusion_probability != null ? toNum(item.occlusion_probability) : null,
            confidence: item.confidence != null ? toNum(item.confidence) : null,
            category: item.category || null,
        })),
        totals: {
            calories: toNum(payload.totals?.calories ?? payload.totalCalories),
            protein: toNum(payload.totals?.protein),
            carbs: toNum(payload.totals?.carbs),
            fat: toNum(payload.totals?.fat),
        },
        total_mass_g: payload.total_mass_g != null ? toNum(payload.total_mass_g) : null,
        scale_calibration: payload.scale_calibration || null,
        scene_assessment: payload.scene_assessment || null,
        gemini_validation: payload.gemini_validation || null,
        pipeline_trace: Array.isArray(payload.pipeline_trace) ? payload.pipeline_trace : [],
        pipeline_duration_ms: toNum(payload.pipeline_duration_ms),
        execution_target: payload.execution_target || 'Local Pipeline',
        segmentedImage: toAbsoluteUrl(payload.segmentedImage),
        originalImage: toAbsoluteUrl(payload.originalImage),
    };
};
