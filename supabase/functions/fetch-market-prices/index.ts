import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PriceRow {
  category: string;
  symbol: string;
  name_fa: string;
  price: number;
  unit: string;
  change_percent: number;
  sort_order: number;
}

// ─── Crypto name mapping (English → Persian) ───────────────────────
const CRYPTO_NAMES_FA: Record<string, string> = {
  "bitcoin": "بیت‌کوین",
  "ethereum": "اتریوم",
  "tether": "تتر",
  "binancecoin": "بایننس کوین",
  "solana": "سولانا",
  "ripple": "ریپل",
  "usd-coin": "دالار کوین",
  "cardano": "کاردانو",
  "dogecoin": "دوج کوین",
  "avalanche": "آوالانچ",
  "tron": "ترون",
  "chainlink": "چین لینک",
  "polygon": "پالیگان",
  "polkadot": "پولکادات",
  "litecoin": "لایت‌کوین",
  "bitcoin-cash": "بیت‌کوین کش",
  "near": "نیئر",
  "uniswap": "انی‌سواپ",
  "aptos": "آپتوس",
  "internet-computer": "کامپیوتر اینترنت",
  "stellar": "استلار",
  "filecoin": "فایل‌کوین",
  "cosmos": "کازماس",
  "hedera": "هدِرا",
  "the-sandbox": "سندباکس",
  "decentraland": "دسنترالند",
  "aave": "آوه",
  "monero": "مونرو",
  "eos": "ایاس",
  "tezos": "تزوس",
};

// ─── Fetch crypto top 20 from CoinGecko ─────────────────────────────
async function fetchCrypto(usdToman: number): Promise<PriceRow[]> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";

  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
  const data = await resp.json();

  return data.map((coin: any, idx: number): PriceRow => {
    const nameFa = CRYPTO_NAMES_FA[coin.id] ?? CRYPTO_NAMES_FA[coin.symbol] ?? coin.name;
    return {
      category: "crypto",
      symbol: `crypto_${coin.id}`,
      name_fa: nameFa,
      price: Math.round(coin.current_price * usdToman),
      unit: "تومان",
      change_percent: coin.price_change_percentage_24h ?? 0,
      sort_order: idx + 1,
    };
  });
}

// ─── Fetch Iranian market rates from Nobitex ────────────────────────
async function fetchNobitexStats(): Promise<{ usdToman: number; goldOunceUsd: number } | null> {
  try {
    const resp = await fetch("https://api.nobitex.ir/v2/stats", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    // Nobitex returns stats with pairs like usdt-rls, btc-usdt etc.
    // The USDT/Toman (rls) rate gives us the free-market USD rate
    const usdtRls = data?.stats?.["usdt-rls"]?.latest ?? data?.stats?.["usdt-rls"]?.lastPrice;
    if (!usdtRls) return null;

    // Nobitex returns IRR (Rial), convert to Toman (divide by 10)
    const usdToman = Number(usdtRls) / 10;
    if (!usdToman || usdToman < 1000) return null;

    // Try to get gold price from the gold-usdt pair if available
    let goldOunceUsd = 0;
    const goldUsdt = data?.stats?.["gold-usdt"]?.latest ?? data?.stats?.["gold-usdt"]?.lastPrice;
    if (goldUsdt) {
      goldOunceUsd = Number(goldUsdt);
    }

    return { usdToman, goldOunceUsd };
  } catch {
    return null;
  }
}

// ─── Fetch gold spot price from free API ─────────────────────────────
async function fetchGoldSpot(): Promise<{ goldUsd: number; silverUsd: number; platinumUsd: number } | null> {
  // Try metals.dev free API (no key required for basic)
  try {
    const resp = await fetch("https://api.metals.live/v1/spot/gold", {
      headers: { Accept: "application/json" },
    });
    if (resp.ok) {
      const data = await resp.json();
      const goldUsd = typeof data === "number" ? data : data?.price ?? data?.gold ?? 0;
      if (goldUsd > 0) {
        return { goldUsd, silverUsd: 0, platinumUsd: 0 };
      }
    }
  } catch { /* fall through */ }

  // Try alternative: gold price from Frankfurter (ECB rates include XAU)
  try {
    const resp = await fetch("https://api.frankfurter.app/latest?from=XAU&to=USD", {
      headers: { Accept: "application/json" },
    });
    if (resp.ok) {
      const data = await resp.json();
      const goldUsd = data?.rates?.USD;
      if (goldUsd && goldUsd > 0) {
        return { goldUsd, silverUsd: 0, platinumUsd: 0 };
      }
    }
  } catch { /* fall through */ }

  return null;
}

// ─── Fetch forex rates (EUR, GBP, etc. vs USD) ──────────────────────
async function fetchForexRates(): Promise<Record<string, number> | null> {
  try {
    const resp = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.rates) return data.rates;
    return null;
  } catch {
    return null;
  }
}

// ─── Fetch Iranian gold/coin rates from bon-bast ────────────────────
async function fetchBonbast(): Promise<Record<string, { sell: string; buy?: string }> | null> {
  // Try bon-bast API endpoint
  try {
    const resp = await fetch("https://www.bon-bast.com/api", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && typeof data === "object") return data;
    }
  } catch { /* fall through */ }

  return null;
}

// ─── Build gold/coin price rows ─────────────────────────────────────
function buildGoldRows(
  usdToman: number,
  goldOunceUsd: number,
  bonbast: Record<string, { sell: string; buy?: string }> | null,
): PriceRow[] {
  const rows: PriceRow[] = [];
  let sortOrder = 1;

  // Helper to add a row
  const add = (symbol: string, nameFa: string, price: number, unit: string, change: number) => {
    if (price > 0) {
      rows.push({ category: "gold", symbol, name_fa: nameFa, price, unit, change_percent: change, sort_order: sortOrder++ });
    }
  };

  if (bonbast) {
    // Use bon-bast direct prices (in Toman)
    const get = (key: string) => Number(bonbast[key]?.sell ?? "0");

    add("gold_18k", "طلا ۱۸ عیار", get("Gold Gram") * 0.75, "تومان", 0);
    add("gold_mithqal", "مثقال طلا", get("Gold Mithqal"), "تومان", 0);
    add("gold_coin_emami", "سکه امامی", get("Emami"), "تومان", 0);
    add("gold_coin_azadi", "سکه بهار آزادی", get("Azadi"), "تومان", 0);
    add("gold_melted", "طلای آب‌شده", get("Gold Gram"), "تومان", 0);
    add("gold_ounce", "انس طلا", get("Gold Ounce"), "دلار", 0);
  } else {
    // Calculate from gold ounce price
    const gramPrice = goldOunceUsd > 0 ? (goldOunceUsd / 31.1034768) * usdToman : 0;

    if (gramPrice > 0) {
      add("gold_18k", "طلا ۱۸ عیار", Math.round(gramPrice * 0.75), "تومان", 0);
      add("gold_mithqal", "مثقال طلا", Math.round(gramPrice * 4.6083), "تومان", 0);
      add("gold_melted", "طلای آب‌شده", Math.round(gramPrice), "تومان", 0);
      add("gold_ounce", "انس طلا", goldOunceUsd, "دلار", 0);

      // Coins are typically ~1.0-1.1x the gold content value
      const emamiGoldContent = gramPrice * 8.13; // ~8.13 grams of gold in an Emami coin
      add("gold_coin_emami", "سکه امامی", Math.round(emamiGoldContent * 1.05), "تومان", 0);
      add("gold_coin_azadi", "سکه بهار آزادی", Math.round(emamiGoldContent * 1.02), "تومان", 0);
    }
  }

  // Silver and platinum from spot price (if available)
  if (goldOunceUsd > 0) {
    // Estimate silver at ~1/80 of gold
    add("silver_ounce", "انس نقره", Math.round(goldOunceUsd / 80), "دلار", 0);
    // Platinum is typically ~0.4x gold
    add("platinum", "پلاتین", Math.round(goldOunceUsd * 0.4), "دلار", 0);
  }

  return rows;
}

// ─── Build currency rows ────────────────────────────────────────────
function buildCurrencyRows(
  usdToman: number,
  forexRates: Record<string, number> | null,
  bonbast: Record<string, { sell: string; buy?: string }> | null,
): PriceRow[] {
  const rows: PriceRow[] = [];
  let sortOrder = 1;

  const currencies: { symbol: string; nameFa: string; code: string; bonbastKey: string }[] = [
    { symbol: "usd", nameFa: "دلار آمریکا", code: "USD", bonbastKey: "US Dollar" },
    { symbol: "eur", nameFa: "یورو", code: "EUR", bonbastKey: "Euro" },
    { symbol: "gbp", nameFa: "پوند انگلیس", code: "GBP", bonbastKey: "British Pound" },
    { symbol: "aed", nameFa: "درهم امارات", code: "AED", bonbastKey: "UAE Dirham" },
    { symbol: "try", nameFa: "لیر ترکیه", code: "TRY", bonbastKey: "Turkish Lira" },
    { symbol: "cny", nameFa: "یوان چین", code: "CNY", bonbastKey: "Chinese Yuan" },
    { symbol: "jpy", nameFa: "ین ژاپن", code: "JPY", bonbastKey: "Japanese Yen" },
    { symbol: "rub", nameFa: "روبل روسیه", code: "RUB", bonbastKey: "Russian Ruble" },
    { symbol: "cad", nameFa: "دلار کانادا", code: "CAD", bonbastKey: "Canadian Dollar" },
    { symbol: "aud", nameFa: "دلار استرالیا", code: "AUD", bonbastKey: "Australian Dollar" },
    { symbol: "chf", nameFa: "فرانک سوئیس", code: "CHF", bonbastKey: "Swiss Franc" },
    { symbol: "sek", nameFa: "کرون سوئد", code: "SEK", bonbastKey: "Swedish Krona" },
  ];

  for (const cur of currencies) {
    let priceToman = 0;

    if (bonbast && bonbast[cur.bonbastKey]?.sell) {
      priceToman = Number(bonbast[cur.bonbastKey]!.sell);
    } else if (forexRates && cur.code !== "USD") {
      // forexRates gives USD→X rate, so X in Toman = rate × usdToman
      const rate = forexRates[cur.code];
      if (rate) priceToman = Math.round(rate * usdToman);
    } else if (cur.code === "USD") {
      priceToman = usdToman;
    }

    if (priceToman > 0) {
      rows.push({
        category: "currency",
        symbol: cur.symbol,
        name_fa: cur.nameFa,
        price: priceToman,
        unit: "تومان",
        change_percent: 0,
        sort_order: sortOrder++,
      });
    }
  }

  return rows;
}

// ─── Main handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check if data is fresh (last update < 90 seconds ago)
    const { data: latestRow } = await supabase
      .from("market_prices")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastUpdate = latestRow?.updated_at ? new Date(latestRow.updated_at).getTime() : 0;
    const ageSeconds = (Date.now() - lastUpdate) / 1000;

    // If data is fresh, return cached data
    if (ageSeconds < 90) {
      const { data: cached } = await supabase
        .from("market_prices")
        .select("category,symbol,name_fa,price,unit,change_percent,sort_order,updated_at")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      return new Response(
        JSON.stringify({ success: true, data: cached ?? [], cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch fresh data from external APIs
    const errors: string[] = [];

    // 1. Fetch Iranian market rates (USDT/Toman rate)
    const nobitex = await fetchNobitexStats();
    let usdToman = nobitex?.usdToman ?? 0;
    let goldOunceUsd = nobitex?.goldOunceUsd ?? 0;

    // 2. Fetch gold spot price if not from Nobitex
    if (goldOunceUsd <= 0) {
      const goldSpot = await fetchGoldSpot();
      if (goldSpot) {
        goldOunceUsd = goldSpot.goldUsd;
      }
    }

    // 3. Fetch bon-bast Iranian rates (gold, coins, currencies)
    const bonbast = await fetchBonbast();

    // 4. If we still don't have USD/Toman, try to get it from bon-bast
    if (usdToman <= 0 && bonbast?.["US Dollar"]?.sell) {
      usdToman = Number(bonbast["US Dollar"].sell);
    }

    // 5. Fetch forex cross-rates
    const forexRates = await fetchForexRates();

    // If we have no USD/Toman rate at all, keep cached data
    if (usdToman <= 0) {
      errors.push("No USD/Toman rate available");
      const { data: cached } = await supabase
        .from("market_prices")
        .select("category,symbol,name_fa,price,unit,change_percent,sort_order,updated_at")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      return new Response(
        JSON.stringify({ success: true, data: cached ?? [], cached: true, errors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build all price rows
    const allRows: PriceRow[] = [];

    // Gold & coins
    const goldRows = buildGoldRows(usdToman, goldOunceUsd, bonbast);
    allRows.push(...goldRows);

    // Currencies
    const currencyRows = buildCurrencyRows(usdToman, forexRates, bonbast);
    allRows.push(...currencyRows);

    // Crypto (from CoinGecko, converted to Toman)
    try {
      const cryptoRows = await fetchCrypto(usdToman);
      allRows.push(...cryptoRows);
    } catch (err) {
      errors.push(`Crypto fetch failed: ${err instanceof Error ? err.message : "unknown"}`);
    }

    // Upsert all rows into market_prices
    if (allRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("market_prices")
        .upsert(allRows, { onConflict: "symbol" });

      if (upsertError) {
        errors.push(`Upsert error: ${upsertError.message}`);
      }
    }

    // Return the fresh data
    const { data: freshData } = await supabase
      .from("market_prices")
      .select("category,symbol,name_fa,price,unit,change_percent,sort_order,updated_at")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    return new Response(
      JSON.stringify({ success: true, data: freshData ?? [], cached: false, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
