# NutriFit - Predictive Nutrition App

An academic project for a calm, predictive nutrition app that explains how food affects energy, hunger, sleep, and weight.

## Project Structure

## Food Search Configuration

The search flow is configured for India-first results by default.

- `VITE_FOOD_SEARCH_URL` (default: `https://in.openfoodfacts.org/cgi/search.pl`)
- `VITE_FOOD_SEARCH_COUNTRY` (default: `india`)
- `VITE_FOOD_SEARCH_PROVIDER` (`openfoodfacts` or `bonhappetee`, default: `openfoodfacts`)
- `VITE_FOOD_SEARCH_FALLBACK_TO_OFF` (default: `true`)

### Bon Happetee (India-focused)

Set these values when you receive your API endpoint/credentials:

- `VITE_FOOD_SEARCH_PROVIDER=bonhappetee`
- `VITE_BONHAPPETEE_SEARCH_URL=<search endpoint URL>`
- `VITE_BONHAPPETEE_API_KEY=<api key>`
- `VITE_BONHAPPETEE_AUTH_SCHEME=bearer` (or `x-api-key`)

Example `.env`:

```bash
VITE_FOOD_SEARCH_URL=https://in.openfoodfacts.org/cgi/search.pl
VITE_FOOD_SEARCH_COUNTRY=india
# Optional provider switch:
# VITE_FOOD_SEARCH_PROVIDER=bonhappetee
# VITE_BONHAPPETEE_SEARCH_URL=https://your-bonhappetee-endpoint/search
# VITE_BONHAPPETEE_API_KEY=your_api_key
# VITE_BONHAPPETEE_AUTH_SCHEME=bearer
```
