const OPEN_FOOD_FACTS_SEARCH_URL =
    import.meta.env.VITE_FOOD_SEARCH_URL || 'https://in.openfoodfacts.org/cgi/search.pl';
const DEFAULT_COUNTRY = import.meta.env.VITE_FOOD_SEARCH_COUNTRY || 'india';
const FOOD_SEARCH_PROVIDER = (import.meta.env.VITE_FOOD_SEARCH_PROVIDER || 'openfoodfacts').toLowerCase();
const BONHAPPETEE_SEARCH_URL = import.meta.env.VITE_BONHAPPETEE_SEARCH_URL || '';
const BONHAPPETEE_API_KEY = import.meta.env.VITE_BONHAPPETEE_API_KEY || '';
const BONHAPPETEE_AUTH_SCHEME = (import.meta.env.VITE_BONHAPPETEE_AUTH_SCHEME || 'bearer').toLowerCase();
const SHOULD_FALLBACK_TO_OFF = String(import.meta.env.VITE_FOOD_SEARCH_FALLBACK_TO_OFF || 'true').toLowerCase() !== 'false';

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const mapProductToFood = (product, page, index) => {
    const name =
        product.product_name_en ||
        product.abbreviated_product_name_en ||
        product.product_name ||
        product.abbreviated_product_name ||
        '';
    if (!name.trim()) return null;

    const nutriments = product.nutriments || {};
    const calories = toNumber(
        nutriments['energy-kcal_serving'] ||
        nutriments['energy-kcal_100g'] ||
        nutriments['energy-kcal'] ||
        nutriments.energy_kcal_serving ||
        nutriments.energy_kcal_100g
    );
    const caloriesFromKj = toNumber(
        nutriments['energy-kj_serving'] ||
        nutriments['energy-kj_100g'] ||
        nutriments.energy_kj_serving ||
        nutriments.energy_kj_100g
    ) / 4.184;
    const resolvedCalories = calories > 0 ? calories : caloriesFromKj;

    if (resolvedCalories <= 0) return null;

    return {
        id: product.code || `${page}-${index}-${name}`,
        name,
        brand: product.brands || null,
        calories: Math.round(resolvedCalories),
        protein: toNumber(nutriments.proteins_serving || nutriments.proteins_100g),
        carbs: toNumber(nutriments.carbohydrates_serving || nutriments.carbohydrates_100g),
        fat: toNumber(nutriments.fat_serving || nutriments.fat_100g),
        serving: product.serving_size || '100 g',
    };
};

const pick = (...candidates) => {
    for (const value of candidates) {
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
};

const mapBonHappeteeFood = (item, page, index) => {
    const name = pick(item.name, item.food_name, item.title, item.dish_name);
    if (!name) return null;

    const calories = toNumber(
        pick(
            item.calories,
            item.calories_kcal,
            item.energy_kcal,
            item.kcal,
            item.nutrition?.calories,
            item.macros?.calories
        )
    );

    if (calories <= 0) return null;

    return {
        id: pick(item.id, item.food_id, item._id, `${page}-${index}-${name}`),
        name,
        brand: pick(item.brand, item.brand_name, item.source) || null,
        calories: Math.round(calories),
        protein: toNumber(pick(item.protein, item.protein_g, item.nutrition?.protein, item.macros?.protein)),
        carbs: toNumber(pick(item.carbs, item.carbohydrates, item.carbs_g, item.nutrition?.carbs, item.macros?.carbs)),
        fat: toNumber(pick(item.fat, item.fat_g, item.nutrition?.fat, item.macros?.fat)),
        serving: pick(item.serving, item.serving_size, item.portion, item.portion_size, '1 serving'),
    };
};

const searchFoodsOpenFoodFacts = async ({ normalizedQuery, page, pageSize, signal, country }) => {
    const params = new URLSearchParams({
        search_terms: normalizedQuery,
        search_simple: '1',
        action: 'process',
        json: '1',
        lc: 'en',
        page: String(page),
        page_size: String(pageSize),
        tagtype_0: 'countries',
        tag_contains_0: 'contains',
        tag_0: country,
        fields: [
            'code',
            'product_name',
            'product_name_en',
            'abbreviated_product_name',
            'abbreviated_product_name_en',
            'brands',
            'serving_size',
            'nutriments',
            'countries_tags',
        ].join(',')
    });

    const response = await fetch(`${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`, { signal });
    if (!response.ok) {
        throw new Error(`Food search failed (${response.status})`);
    }

    const data = await response.json();
    const rawItems = Array.isArray(data.products) ? data.products : [];
    const items = rawItems
        .map((product, index) => mapProductToFood(product, page, index))
        .filter(Boolean);
    const total = toNumber(data.count);
    const hasMore = total > page * pageSize;

    return { items, hasMore, total };
};

const searchFoodsBonHappetee = async ({ normalizedQuery, page, pageSize, signal }) => {
    if (!BONHAPPETEE_SEARCH_URL) {
        throw new Error('Bon Happetee search is not configured. Set VITE_BONHAPPETEE_SEARCH_URL.');
    }

    const params = new URLSearchParams({
        query: normalizedQuery,
        page: String(page),
        limit: String(pageSize),
    });

    const headers = { Accept: 'application/json' };
    if (BONHAPPETEE_API_KEY) {
        if (BONHAPPETEE_AUTH_SCHEME === 'x-api-key') {
            headers['x-api-key'] = BONHAPPETEE_API_KEY;
        } else {
            headers.Authorization = `Bearer ${BONHAPPETEE_API_KEY}`;
        }
    }

    const separator = BONHAPPETEE_SEARCH_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${BONHAPPETEE_SEARCH_URL}${separator}${params.toString()}`, {
        method: 'GET',
        headers,
        signal,
    });

    if (!response.ok) {
        throw new Error(`Bon Happetee search failed (${response.status})`);
    }

    const data = await response.json();
    const rawItems = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.results)
            ? data.results
            : Array.isArray(data.foods)
                ? data.foods
                : [];

    const items = rawItems
        .map((item, index) => mapBonHappeteeFood(item, page, index))
        .filter(Boolean);

    const total = toNumber(pick(data.total, data.total_count, data.count, data.pagination?.total));
    const hasMore = total > 0
        ? total > page * pageSize
        : items.length >= pageSize;

    return { items, hasMore, total: total || items.length };
};

export const searchFoods = async ({
    query,
    page = 1,
    pageSize = 20,
    signal,
    country = DEFAULT_COUNTRY,
} = {}) => {
    const normalizedQuery = (query || '').trim();
    if (!normalizedQuery) {
        return { items: [], hasMore: false, total: 0 };
    }

    if (FOOD_SEARCH_PROVIDER === 'bonhappetee') {
        try {
            return await searchFoodsBonHappetee({ normalizedQuery, page, pageSize, signal });
        } catch (error) {
            if (!SHOULD_FALLBACK_TO_OFF) throw error;
            console.warn('Bon Happetee search failed; falling back to Open Food Facts.', error);
        }
    }

    return searchFoodsOpenFoodFacts({ normalizedQuery, page, pageSize, signal, country });
};
