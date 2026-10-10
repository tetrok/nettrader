/**
 * NetTrader 2 — Service d'Intégration Yahoo Finance
 *
 * Usage:
 *   Interroge les API Yahoo Finance pour rechercher de nouveaux symboles et vérifier la validité des tickers avant import.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  exchange?: string;
  timezone?: string;
  time?: number;
  retried?: boolean;
}

export interface YahooCandidate {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  marketCap?: number;
  volume?: number;
  exchange?: string;
}

@Injectable()
export class YahooFinanceService {
  private readonly logger = new Logger(YahooFinanceService.name);
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  private cachedCookie: string | null = null;
  private cachedCrumb: string | null = null;
  private cacheExpiry = 0;

  /**
   * Obtient un tuple [cookie, crumb] pour les requêtes à Yahoo Finance.
   */
  async getSessionCookieAndCrumb(): Promise<{ cookie: string; crumb: string } | null> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedCookie && this.cachedCrumb && now < this.cacheExpiry) {
      return { cookie: this.cachedCookie, crumb: this.cachedCrumb };
    }

    try {
      // 1. Récupération du cookie sur fc.yahoo.com
      const resFc = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': this.userAgent },
        redirect: 'follow',
      });

      const rawSetCookie = resFc.headers.get('set-cookie');
      if (!rawSetCookie) {
        this.logger.warn('Aucun cookie reçu de fc.yahoo.com');
        return null;
      }

      // Nettoyer et extraire les paires cle=valeur
      const cookies = rawSetCookie
        .split(/,\s*(?=[a-zA-Z0-9_-]+=)/)
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean)
        .join('; ');

      // 2. Récupération du crumb sur /v1/test/getcrumb
      const resCrumb = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': this.userAgent,
          Cookie: cookies,
        },
      });

      if (!resCrumb.ok) {
        this.logger.warn(`Échec récupération crumb (HTTP ${resCrumb.status})`);
        return null;
      }

      const crumbText = (await resCrumb.text()).trim();
      if (!crumbText || crumbText.includes('<html')) {
        this.logger.warn('Crumb Yahoo Finance invalide reçu');
        return null;
      }

      this.cachedCookie = cookies;
      this.cachedCrumb = crumbText;
      this.cacheExpiry = now + 3600; // Valide 1h

      return { cookie: this.cachedCookie, crumb: this.cachedCrumb };
    } catch (err) {
      this.logger.error(`Erreur session Yahoo Finance: ${err.message}`);
      return null;
    }
  }

  /**
   * Récupère le cours et métadonnées d'une action via l'API chart v8.
   */
  async getQuote(ticker: string): Promise<YahooQuote | null> {
    const cleanTicker = ticker.trim();
    if (!cleanTicker) return null;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanTicker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });

      if (!res.ok) return null;

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = Number(meta.regularMarketPrice || 0);
      const instrumentType = String(meta.instrumentType || '').toUpperCase();

      if (price <= 0 || (instrumentType && instrumentType !== 'EQUITY')) {
        return null;
      }

      const name = meta.shortName || meta.longName || meta.symbol || cleanTicker;

      return {
        symbol: String(meta.symbol || cleanTicker),
        name: String(name),
        price,
        currency: String(meta.currency || 'EUR'),
        exchange: String(meta.exchangeName || 'PAR'),
        timezone: String(meta.exchangeTimezoneName || 'Europe/Paris'),
        time: Number(meta.regularMarketTime || Math.floor(Date.now() / 1000)),
      };
    } catch (err) {
      this.logger.debug(`Erreur getQuote pour ${cleanTicker}: ${err.message}`);
      return null;
    }
  }

  /**
   * Récupère en lot (batch) les cotations pour plusieurs symboles.
   */
  async getQuotes(tickers: string[]): Promise<Record<string, YahooQuote>> {
    const cleanTickers = Array.from(new Set(tickers.map((t) => t.trim()).filter(Boolean)));
    if (cleanTickers.length === 0) return {};

    const session = await this.getSessionCookieAndCrumb();
    const quotes: Record<string, YahooQuote> = {};

    // Découpage par lots de 50 symboles
    const chunkSize = 50;
    for (let i = 0; i < cleanTickers.length; i += chunkSize) {
      const chunk = cleanTickers.slice(i, i + chunkSize);
      const batchSymbols = chunk.join(',');
      let url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batchSymbols)}`;
      if (session?.crumb) {
        url += `&crumb=${encodeURIComponent(session.crumb)}`;
      }

      const headers: Record<string, string> = { 'User-Agent': this.userAgent };
      if (session?.cookie) {
        headers['Cookie'] = session.cookie;
      }

      try {
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          const results = data?.quoteResponse?.result || [];
          for (const item of results) {
            const sym = String(item.symbol || '');
            const price = Number(item.regularMarketPrice || 0);
            const time = Number(item.regularMarketTime || Math.floor(Date.now() / 1000));
            const name = item.shortName || item.longName || sym;
            if (sym && price > 0) {
              quotes[sym] = {
                symbol: sym,
                name: String(name),
                price,
                currency: String(item.currency || 'EUR'),
                time,
                retried: false,
              };
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Erreur lot Yahoo Finance: ${err.message}`);
      }

      // Repli unitaire pour les symboles absents du lot
      for (const t of chunk) {
        if (!quotes[t]) {
          const single = await this.getQuote(t);
          if (single && single.price > 0) {
            quotes[t] = {
              ...single,
              retried: true,
            };
          }
        }
      }
    }

    return quotes;
  }

  /**
   * Recherche de symboles via l'API Search Yahoo.
   */
  async search(query: string, limit = 15): Promise<any[]> {
    const q = query.trim();
    if (!q) return [];

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0&enableFuzzyQuery=false`;
      const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
      if (!res.ok) return [];

      const data = await res.json();
      const rawQuotes = data?.quotes || [];
      const results: any[] = [];

      for (const item of rawQuotes) {
        if (item.quoteType !== 'EQUITY') continue;
        const symbol = String(item.symbol || '');
        if (!symbol) continue;

        results.push({
          symbol,
          name: String(item.shortname || item.longname || symbol),
          exchange: String(item.exchange || ''),
          sector: String(item.sector || ''),
          industry: String(item.industry || ''),
          isParis: symbol.endsWith('.PA') || item.exchange === 'PAR',
        });
      }

      return results;
    } catch (err) {
      this.logger.warn(`Erreur search Yahoo Finance: ${err.message}`);
      return [];
    }
  }

  /**
   * Screener Euronext Paris ou recherche par mot-clé.
   */
  async screenParisEquities(
    limit = 50,
    offset = 0,
    search = '',
  ): Promise<{ total: number; items: YahooCandidate[]; error?: string }> {
    if (search.trim()) {
      const searchResults = await this.search(search, limit);
      const items: YahooCandidate[] = [];
      for (const sr of searchResults) {
        const quote = await this.getQuote(sr.symbol);
        if (quote) {
          items.push({
            symbol: sr.symbol,
            name: sr.name,
            price: quote.price,
            currency: quote.currency,
            marketCap: 0,
            volume: 0,
            exchange: sr.exchange || 'PAR',
          });
        }
      }
      return { total: items.length, items };
    }

    const session = await this.getSessionCookieAndCrumb();
    if (!session) {
      return {
        total: 0,
        items: [],
        error: "Impossible d'obtenir la session Yahoo (cookie/crumb).",
      };
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(session.crumb)}`;
      const operands = [
        { operator: 'eq', operands: ['exchange', 'PAR'] },
        { operator: 'eq', operands: ['quoteType', 'EQUITY'] },
        { operator: 'gt', operands: ['intradaymarketcap', 1000000] },
      ];

      const fetchSize = Math.min(Math.max(limit + 30, 25), 250);
      const payload = {
        size: fetchSize,
        offset,
        sortField: 'intradaymarketcap',
        sortType: 'DESC',
        quoteType: 'EQUITY',
        query: {
          operator: 'AND',
          operands,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json',
          Cookie: session.cookie,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { total: 0, items: [], error: `Erreur Screener Yahoo (HTTP ${res.status})` };
      }

      const data = await res.json();
      const screener = data?.finance?.result?.[0];
      const rawQuotes = screener?.quotes || [];
      const total = Number(screener?.total || rawQuotes.length);

      const items: YahooCandidate[] = [];
      for (const q of rawQuotes) {
        const symbol = String(q.symbol || '');
        if (!symbol) continue;

        // Filtrer les obligations (ACALS..., FR00...)
        if (symbol.startsWith('ACAL') || symbol.startsWith('FR00')) {
          continue;
        }

        const price = Number(q.regularMarketPrice || 0);
        if (price <= 0) continue;

        items.push({
          symbol,
          name: String(q.shortName || q.longName || symbol),
          price,
          currency: String(q.currency || 'EUR'),
          marketCap: Number(q.marketCap || 0),
          volume: Number(q.regularMarketVolume || 0),
          exchange: String(q.exchange || 'PAR'),
        });

        if (items.length >= limit) break;
      }

      return { total, items };
    } catch (err) {
      this.logger.error(`Erreur Screener Paris: ${err.message}`);
      return { total: 0, items: [], error: err.message };
    }
  }
}
