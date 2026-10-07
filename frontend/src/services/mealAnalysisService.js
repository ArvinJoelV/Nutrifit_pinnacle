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

export const formatAnalysisResult = (payload) => {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid analysis payload received from server');
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    return {
        items: items.map((item, index) => ({
            id: item.id || `seg-${index}`,
            name: item.name || item.food || 'Unknown Food',
            calories: toNum(item.calories),
            protein: toNum(item.protein),
            carbs: toNum(item.carbs),
            fat: toNum(item.fat),
            image: toAbsoluteUrl(item.image),
            error: item.error || null,
            rawModelText: item.rawModelText || null,
            detectedLabel: item.detectedLabel || item.food_class || null,
            detectedConfidence: toNum(item.detectedConfidence ?? item.confidence),
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

/**
 * Synchronous image analysis (legacy / standard HTTP POST)
 */
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

    return formatAnalysisResult(payload);
};

/**
 * Decoupled Asynchronous Job Dispatch with Real-Time SSE Pipeline Broadcasting.
 * 
 * 1. Dispatches image to Kafka / Async Job Queue in <50ms.
 * 2. Streams live milestone stages (YOLOv8 -> SAM 2 -> Depth Map -> 3D Volume -> Gemini)
 *    directly from Redis Pub/Sub / SSE into the progress callback.
 * 3. Resolves with full nutrition and 3D portion results upon pipeline completion.
 */
export const analyzeMealImageStream = async (file, { onStageProgress, signal } = {}) => {
    if (!file) {
        throw new Error('No image file selected.');
    }

    const formData = new FormData();
    formData.append('image', file);

    // 1. Submit job to async endpoint (<50ms response)
    let initData;
    try {
        const initResponse = await fetch(`${API_BASE_URL}/api/analyze-meal/async`, {
            method: 'POST',
            body: formData,
            signal,
        });

        initData = await initResponse.json().catch(() => ({}));
        if (!initResponse.ok || !initData.job_id) {
            console.warn('[NutriFit Pipeline] Async endpoint unavailable, falling back to sync POST:', initData?.error);
            return analyzeMealImage(file, { signal });
        }
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn('[NutriFit Pipeline] Async submission failed, falling back to sync POST:', err);
        return analyzeMealImage(file, { signal });
    }

    const { job_id, stream_url, broker } = initData;

    if (onStageProgress) {
        onStageProgress({
            stage: 1,
            name: 'Job Enqueued in Broker',
            broker: broker || 'Apache Kafka / Async Worker',
            details: { job_id },
        });
    }

    // 2. Connect to real-time Server-Sent Events (SSE) stream
    return new Promise((resolve, reject) => {
        let isSettled = false;
        let eventSource = null;
        let pollInterval = null;

        const cleanup = () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        if (signal) {
            signal.addEventListener('abort', () => {
                cleanup();
                if (!isSettled) {
                    isSettled = true;
                    reject(new DOMException('Aborted by user', 'AbortError'));
                }
            });
        }

        const pollFallback = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/jobs/${job_id}`, { signal });
                if (!res.ok) return;
                const job = await res.json();
                if (job.status === 'completed' && job.result) {
                    cleanup();
                    if (!isSettled) {
                        isSettled = true;
                        resolve(formatAnalysisResult(job.result));
                    }
                } else if (job.status === 'failed') {
                    cleanup();
                    if (!isSettled) {
                        isSettled = true;
                        reject(new Error(job.error || 'Pipeline job failed in worker queue'));
                    }
                } else if (job.current_stage && onStageProgress) {
                    onStageProgress({
                        stage: job.current_stage,
                        name: job.stage_name || `Stage ${job.current_stage}`,
                        broker: job.broker,
                    });
                }
            } catch (e) {
                // Ignore transient polling fetch errors
            }
        };

        const sseUrl = `${API_BASE_URL}${stream_url || `/api/jobs/${job_id}/events`}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener('stage', (evt) => {
            try {
                const data = JSON.parse(evt.data);
                if (onStageProgress) {
                    onStageProgress({
                        stage: data.stage,
                        name: data.name,
                        duration_ms: data.duration_ms,
                        broker: data.broker,
                        details: data.details,
                    });
                }
            } catch (err) {
                console.error('[SSE Stage Parse Error]', err);
            }
        });

        eventSource.addEventListener('completed', (evt) => {
            try {
                const data = JSON.parse(evt.data);
                cleanup();
                if (!isSettled) {
                    isSettled = true;
                    const finalPayload = data.result || data;
                    resolve(formatAnalysisResult(finalPayload));
                }
            } catch (err) {
                cleanup();
                if (!isSettled) {
                    isSettled = true;
                    reject(new Error('Failed to parse completed event payload: ' + err.message));
                }
            }
        });

        eventSource.addEventListener('error', (evt) => {
            // If SSE connection encounters a hiccup, activate polling fallback instead of failing immediately
            if (!pollInterval && !isSettled) {
                console.info('[NutriFit Pipeline] SSE stream reconnecting; polling job status as fallback...');
                pollInterval = setInterval(pollFallback, 750);
            }
        });

        // Set safety timeout (90s max wait for 3D estimation & Gemini)
        setTimeout(() => {
            if (!isSettled) {
                cleanup();
                isSettled = true;
                reject(new Error('Pipeline execution timed out after 90 seconds'));
            }
        }, 90000);
    });
};

/**
 * High-speed Redis Nutrition query (<2ms latency)
 */
export const getFoodNutritionFromCache = async (foodName) => {
    if (!foodName) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/nutrition?query=${encodeURIComponent(foodName)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

/**
 * Telemetry intelligence for Redis cache & Kafka/Async Queue
 */
export const getInfrastructureStats = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/infra/stats`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};
