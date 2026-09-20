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

export interface StockHistoryPoint {
  time: number;
  price: number;
}

export interface StockDetail extends Stock {
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
