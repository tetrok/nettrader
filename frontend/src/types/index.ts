export interface User {
  id: number;
  pseudo: string;
  email: string;
  cashback: number;
  authlevel: number;
  isAdmin: boolean;
  level: number;
  vad: boolean;
  skin?: string;
  dateinscr?: number;
}

export interface Stock {
  code: number;
  ticker: string;
  name: string;
  price: number;
  prevPrice: number;
  variation: number;
  authBuy: boolean;
  lastTime: number;
}

export type ChartPeriod = '1d' | '1w' | '1m' | '1y';

export interface StockHistoryPoint {
  time: number;
  price: number;
}

export interface StockDetail extends Stock {
  period?: ChartPeriod;
  history: StockHistoryPoint[];
}


export interface Position {
  code: number;
  name: string;
  quantity: number;
  currentPrice: number;
  buyPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
  isVad: boolean;
  availableQuantity?: number;
  pendingQuantity?: number;
}

export interface Portfolio {
  cashback: number;
  initialCapital: number;
  totalPositionsValue: number;
  totalCapital: number;
  totalPerformance: number;
  totalPerformancePercent: number;
  vadPossible: number;
  positions: Position[];
}

export interface Order {
  id: string;
  code: number;
  name: string;
  sens: 'A' | 'V' | string;
  quantity: number;
  valmin: number;
  valmax: number;
  currentValue: number;
  dateCreation: number;
  tempsLimite: number;
}

export interface HistoryItem {
  date: number;
  name: string;
  sens: string;
  quantity: number;
  totalExclTax: number;
  tax: number;
  totalInclTax: number;
  profit: string;
}

export interface SimulationResult {
  code: number;
  stockPrice: number;
  quantity: number;
  tax: number;
  total: number;
  maxBuyable: number;
  maxVad: number;
  ownedQuantity: number;
  availableSellQuantity: number;
  pendingSellQuantity: number;
  availableCash: number;
  canVad: boolean;
  canThreshold: boolean;
  canRange: boolean;
}

export interface PlayerRank {
  rank: number;
  userId: number;
  pseudo: string;
  capital: number;
  performance: number;
  teamName: string | null;
  teamId: number | null;
}

export interface TeamRank {
  rank: number;
  teamId: number;
  name: string;
  tag: string;
  performance: number;
  membersCount: number;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export interface TeamMember {
  userId: number;
  pseudo: string;
  joinDate: string;
  capitalJoin: number;
  currentCapital: number;
  performance: number;
  isLeader: boolean;
}

export interface TeamDetail {
  id: number;
  name: string;
  tag: string;
  description: string;
  website: string;
  leader: {
    id: number;
    pseudo: string;
  };
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
  members: TeamMember[];
}

export interface Message {
  id: number;
  senderId: number;
  senderPseudo: string;
  title: string;
  content: string;
  date: number;
  isRead: boolean;
}

export interface Forum {
  id: number;
  name: string;
  description: string;
  topicsCount: number;
  messagesCount: number;
  hasUnread: boolean;
}

export interface Topic {
  id: number;
  title: string;
  author: string;
  authorId: number;
  repliesCount: number;
  viewsCount: number;
  lastPoster: string;
  lastPostDate: number;
  hasUnread: boolean;
}

export interface TopicMessage {
  id: number;
  authorId: number;
  authorPseudo: string;
  date: number;
  subject: string;
  content: string;
  formattedContent?: string;
  teamName: string | null;
  teamId?: number | null;
}

export interface AdminForumSection {
  id: number;
  name: string;
}

export interface AdminForumItem {
  id: number;
  sectionId: number;
  sectionName: string;
  name: string;
  description: string;
  topicsCount: number;
  messagesCount: number;
  authread: 'ouvert' | 'identifie' | 'admin' | 'groupe' | string;
  authwrite: 'identifie' | 'admin' | 'groupe' | string;
}

export interface AdminTopicItem {
  id: number;
  forumId: number;
  forumName: string;
  title: string;
  authorId: number;
  authorPseudo: string;
  repliesCount: number;
  viewsCount: number;
  lastPoster: string;
  lastPostDate: number;
}

export interface AdminMessageItem {
  id: number;
  topicId: number;
  topicTitle: string;
  forumId: number;
  forumName: string;
  authorId: number;
  authorPseudo: string;
  date: number;
  content: string;
}

export interface MarketSummary {
  isMarketOpen: boolean;
  marketTime: number;
  currentTime: number;
  totalStocks: number;
  topGainers: Stock[];
  topLosers: Stock[];
  recentNews: Array<{
    id: number;
    author: string;
    date: number;
    title: string;
    content: string;
  }>;
}

export interface MarketSyncOverview {
  totalStocks: number;
  totalTracked: number;
  totalDisabled: number;
  totalSuccess: number;
  totalFailed: number;
  totalPending: number;
  totalWithRetries: number;
  totalFailuresAllTime: number;
  successRate: number;
  lastSyncTime: number | null;
  lastSyncDuration: number | null;
  lastSyncSuccess: number | null;
  lastSyncError: number | null;
}

export interface MarketSyncLogItem {
  id: number;
  syncTime: number;
  totalStocks: number;
  successCount: number;
  errorCount: number;
  durationSeconds: number;
  details: string;
}

export interface MarketSyncRunResult {
  totalStocks: number;
  successCount: number;
  errorCount: number;
  durationSeconds: number;
}

export interface MarketSyncStockItem {
  codesico: number;
  ticker: string;
  name: string;
  price: number;
  lastTime: number;
  lastAttempt: number;
  lastStatus: 'success' | 'failed' | 'pending' | string;
  failCount: number;
  totalFails: number;
  retryCount: number;
  lastError: string | null;
  isTracked: boolean;
  authAchat: boolean;
}

export interface AdminStockItem {
  codesico: number;
  ticker: string;
  name: string;
  price: number;
  authBuy: boolean;
  isTracked: boolean;
  sectorId: number;
  marketId: number;
  sectorName: string;
  marketName: string;
  lastTime: number;
  lastAttempt: number;
  lastStatus: string;
  failCount: number;
  isArchived: boolean;
}

export interface ArchiveStockResult {
  success: boolean;
  codesico?: number;
  ticker?: string;
  name?: string;
  settlementPrice?: number;
  positionsClosed?: number;
  totalCashCredited?: number;
  archivedCount?: number;
  totalPositionsClosed?: number;
  errors?: string[];
}

export interface DeleteBulkStocksResult {
  success: boolean;
  deletedCount: number;
  errors?: string[];
}

export interface AdminStockMetadata {
  sectors: Array<{ id: number; name: string }>;
  markets: Array<{ id: number; name: string }>;
}

export interface CreateStockPayload {
  codesico: number;
  yahooname: string;
  nom: string;
  valeur: number;
  authachat?: '1' | '0' | boolean;
  down?: '1' | '0' | boolean;
  idsecteur?: number;
  idmarket?: number;
}

export interface UpdateStockPayload {
  nom?: string;
  yahooname?: string;
  valeur?: number;
  authachat?: '1' | '0' | boolean;
  down?: '1' | '0' | boolean;
  idsecteur?: number;
  idmarket?: number;
}

export interface SplitStockPayload {
  codesico: number;
  type: 'multiplier' | 'diviser';
  factor: number;
}

export interface YahooStockCandidate {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  marketCap?: number;
  volume?: number;
  exchange?: string;
  inDatabase: boolean;
  codesico?: number | null;
  isTracked?: boolean;
  isAuthBuy?: boolean;
  currentDbPrice?: number | null;
}


export interface YahooSyncResult {
  success: boolean;
  created: number;
  updated: number;
  total: number;
  errors?: string[];
  message?: string;
}


