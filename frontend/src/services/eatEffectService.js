const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:9510').replace(/\/$/, '');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getMealEatEffectTimeline = async (meal, { signal } = {}) => {
  const response = await fetch(`${API_BASE_URL}/api/eat-effect-timeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ meal }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Eat Effect timeline failed (${response.status})`);
  }

  const timeline = payload.timeline || {};
  return {
    hero: timeline.hero || {},
    energyCurve: Array.isArray(timeline.energyCurve) ? timeline.energyCurve.map(toNumber) : [],
    glucoseCurve: Array.isArray(timeline.glucoseCurve) ? timeline.glucoseCurve.map(toNumber) : [],
    cravings: timeline.cravings || { level: 'Low', time: 'Later', reason: '' },
    sleepImpact: toNumber(timeline.sleepImpact),
    digestionHours: toNumber(timeline.digestionHours),
    highlights: Array.isArray(timeline.highlights) ? timeline.highlights : [],
    coachNote: timeline.coachNote || '',
    timeline: Array.isArray(timeline.timeline)
      ? timeline.timeline.map((item, index) => ({
          id: `${payload.mealId || meal?.id || 'meal'}-${index}`,
          offsetMinutes: toNumber(item.offsetMinutes),
          phase: item.phase || 'Phase',
          headline: item.headline || 'Body response',
          body: item.body || '',
          tone: item.tone || 'cyan',
          impactScore: toNumber(item.impactScore),
          microSignals: Array.isArray(item.microSignals) ? item.microSignals : [],
        }))
      : [],
    debug: payload.debug || {},
  };
};
