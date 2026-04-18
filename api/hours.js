/* Dynamic Stylz Salon — live hours from Google Places (New) API.
 *
 * Vercel serverless function. Called by the static page on load.
 * Edge-cached for 6h, stale-while-revalidate 24h, so Google is hit ~4×/day
 * regardless of traffic — costs stay in the free tier.
 *
 * Required env var:
 *   GOOGLE_PLACES_API_KEY  — server-side key with Places API (New) enabled
 *
 * Optional env var:
 *   GOOGLE_PLACE_ID        — skip the text-search discovery step
 *
 * Response shape:
 *   {
 *     source: "google" | "fallback",
 *     openNow: boolean | null,
 *     weekdayDescriptions: string[],   // ["Monday: 10:00 AM – 5:00 PM", ...]
 *     placeId?: string,                // echoed back for debugging
 *     reason?: string                  // only on fallback
 *   }
 *
 * On any error we respond 200 with { source: "fallback" } so the client
 * quietly keeps the static markup that's already in the page.
 */

const PLACES_API_BASE = "https://places.googleapis.com/v1";
const SEARCH_QUERY = "Dynamic Stylz Salon 313 W Main St Elma WA 98541";

// Module-scoped cache — survives warm invocations on the same Lambda.
let cachedPlaceId = null;

async function discoverPlaceId(apiKey) {
  if (cachedPlaceId) return cachedPlaceId;

  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: SEARCH_QUERY }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`places:searchText ${res.status} ${text.slice(0, 160)}`);
  }

  const data = await res.json();
  const first = data.places?.[0];
  if (!first?.id) throw new Error("no place found for text query");

  cachedPlaceId = first.id;
  return cachedPlaceId;
}

async function fetchPlaceDetails(apiKey, placeId) {
  const url = `${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "regularOpeningHours,currentOpeningHours,utcOffsetMinutes",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`places/details ${res.status} ${text.slice(0, 160)}`);
  }

  return res.json();
}

module.exports = async function handler(req, res) {
  // Aggressive edge cache: fresh for 6h, serve stale up to 24h while revalidating.
  // Vercel honors s-maxage on the edge; individual browsers won't cache (max-age=0).
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400"
  );

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const envPlaceId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey) {
    return res.status(200).json({
      source: "fallback",
      reason: "GOOGLE_PLACES_API_KEY not set",
    });
  }

  try {
    const placeId = envPlaceId || (await discoverPlaceId(apiKey));
    const place = await fetchPlaceDetails(apiKey, placeId);

    // Prefer currentOpeningHours (reflects holidays / temporary closures)
    // but fall back to regularOpeningHours.
    const current = place.currentOpeningHours;
    const regular = place.regularOpeningHours;
    const weekdayDescriptions =
      current?.weekdayDescriptions ||
      regular?.weekdayDescriptions ||
      [];

    return res.status(200).json({
      source: "google",
      placeId,
      openNow: current?.openNow ?? regular?.openNow ?? null,
      weekdayDescriptions,
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
    });
  } catch (err) {
    console.error("api/hours:", err);
    return res.status(200).json({
      source: "fallback",
      reason: String(err?.message || err).slice(0, 200),
    });
  }
}
