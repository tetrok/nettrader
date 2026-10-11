/**
 * NetTrader 2 — Moteur Métier de Négociation & Courtage Boursier
 *
 * Usage:
 *   Cœur financier de l'application NestJS : applique l'ensemble des règles de courtage, calculs de taxes,
 *   vérifications de solvabilité, marges de Vente À Découvert et exécutions transactionnelles ACID.
 *
 * Logique & Fonctionnement:
 *   - Calcul des taxes et courtage : commission de 0,30% + TVA 19,6% avec forfait plancher de 4,95 €.
 *   - Validation stricte des ordres selon le niveau d'expertise :
 *     * Niveau 1 Débutant : comptant uniquement (pas de seuils de prix, pas de VAD).
 *     * Niveau 2 Initié : ordres à cours limité et à seuil de déclenchement autorisés.
 *     * Niveau 3 Expert : Vente À Découvert (VAD) avec calcul du levier sur marge.
 *   - Prévention des doubles dépenses : comptabilisation des liquidités et actions engagées en carnet d'ordres.
 *   - Exécution atomique des transactions : utilisation de transactions TypeORM avec verrous pessimistes.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { Stock } from '../entities/stock.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Order } from '../entities/order.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { MarketService } from '../market/market.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  // Taux de courtage et commissions identiques à l'historique
  public static readonly COMMISSION_RATE = 0.003;
  public static readonly TVA_RATE = 0.196;
  public static readonly MINIMUM_TAX = 4.95;
  public static readonly INITIAL_CAPITAL = 10000.0;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(TradeHistory)
    private readonly tradeHistoryRepository: Repository<TradeHistory>,
    private readonly marketService: MarketService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Résout l'identifiant de joueur à partir d'un token Bearer optionnel.
   */
  async resolveUserIdFromToken(token?: string): Promise<number | null> {
    if (!token) return null;
    const clean = token.replace('Bearer ', '').trim();
    if (!clean || clean.startsWith('reset_') || !/^[a-f0-9]{32,64}$/i.test(clean)) return null;
    const now = Math.floor(Date.now() / 1000);
    const session = await this.dataSource.getRepository(Session).findOne({
      where: { idSession: clean },
    });
    if (!session || Number(session.tempsLimite) < now) return null;
    return session.idcompte;
  }

  /**
   * Calcule la taxe de courtage pour une transaction.
   */
  calculateTax(stockPrice: number, quantity: number): number {
    const rawTax = quantity * stockPrice * TradingService.COMMISSION_RATE * (1 + TradingService.TVA_RATE);
    const tax = Math.round(rawTax * 100) / 100;
    return Math.max(tax, TradingService.MINIMUM_TAX);
  }

  /**
   * Calcule la quantité maximale d'actions achetable pour une liquidité donnée.
   */
  getMaxBuyableShares(cash: number, stockPrice: number): number {
    if (stockPrice <= 0 || cash < TradingService.MINIMUM_TAX + stockPrice) {
      return 0;
    }
    const maxShares = Math.floor((0.99642482771815 * cash) / stockPrice);
    return Math.max(0, maxShares);
  }

  /**
   * Liquidités engagées dans des ordres d'achat actifs en attente.
   */
  async getCommittedBuyCash(userId: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const pendingOrders = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.stock', 's')
      .where('o.userId = :userId AND o.sens = :sens AND o.etat = :etat', {
        userId,
        sens: 'achat',
        etat: '1',
      })
      .andWhere('(o.tempsLimite = 0 OR o.tempsLimite > :now)', { now })
      .getMany();

    let committed = 0.0;
    for (const ord of pendingOrders) {
      const stockP = ord.stock ? Number(ord.stock.price) : 0.0;
      const price = ord.coursMax > 0 ? Math.max(stockP, Number(ord.coursMax)) : stockP;
      if (price > 0 && ord.quantity > 0) {
        committed += ord.quantity * price + this.calculateTax(price, ord.quantity);
      }
    }

    return Math.round(committed * 100) / 100;
  }

  /**
   * Liquidités disponibles nettes d'ordres en attente.
   */
  async getAvailableCash(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return 0.0;
    const cashback = Number(user.cashback) || 0.0;
    const committed = await this.getCommittedBuyCash(userId);
    return Math.max(0.0, Math.round((cashback - committed) * 100) / 100);
  }

  /**
   * Quantité d'un titre engagée dans des ordres de vente actifs.
   */
  async getPendingSellQuantity(userId: number, stockCode: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.quantity)', 'total')
      .where('o.userId = :userId AND o.stockCode = :stockCode AND o.sens = :sens AND o.etat = :etat', {
        userId,
        stockCode,
        sens: 'vente',
        etat: '1',
      })
      .andWhere('(o.tempsLimite = 0 OR o.tempsLimite > :now)', { now })
      .getRawOne();

    return result?.total ? parseInt(result.total, 10) : 0;
  }

  /**
   * Calcule le plafond de Vente À Découvert (VAD) possible pour un joueur.
   */
  async getMaxVadPossible(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau'],
    });

    if (!user || !user.isVadAllowed) {
      return 0.0;
    }

    const positions = await this.portfolioRepository.find({
      where: { userId },
      relations: ['stock'],
    });

    let capitalHorsVad = 0.0;
    let capitalVad = 0.0;

    for (const pos of positions) {
      const price = pos.stock ? Number(pos.stock.price) : 0.0;
      const qty = Number(pos.quantity);
      if (qty > 0) {
        capitalHorsVad += qty * price;
      } else if (qty < 0) {
        capitalVad += Math.abs(qty) * price;
      }
    }

    const cashback = Number(user.cashback);
    const limiteVad = cashback - capitalVad + capitalHorsVad;

    // Déduire la marge VAD déjà engagée dans des ordres de vente en attente
    const now = Math.floor(Date.now() / 1000);
    const pendingSellOrders = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.stock', 's')
      .where('o.userId = :userId AND o.sens = :sens AND o.etat = :etat', {
        userId,
        sens: 'vente',
        etat: '1',
      })
      .andWhere('(o.tempsLimite = 0 OR o.tempsLimite > :now)', { now })
      .getMany();

    const ownedMap = new Map<number, number>();
    for (const pos of positions) {
      ownedMap.set(pos.stockCode, Math.max(0, Number(pos.quantity)));
    }

    let committedVadMargin = 0.0;
    for (const ord of pendingSellOrders) {
      const owned = ownedMap.get(ord.stockCode) || 0;
      const remainingOwned = Math.max(0, owned - ord.quantity);
      ownedMap.set(ord.stockCode, remainingOwned);

      const vadPortion = Math.max(0, ord.quantity - owned);
      if (vadPortion > 0) {
        const price = ord.coursMin > 0 ? ord.coursMin : (ord.stock ? Number(ord.stock.price) : 0);
        committedVadMargin += vadPortion * price;
      }
    }

    const limiteVadPossible = limiteVad - capitalVad - committedVadMargin;

    return Math.max(0.0, Math.round(limiteVadPossible * 100) / 100);
  }

  /**
   * Récupère le portefeuille complet et la performance globale d'un joueur.
   */
  async getPortfolio(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const rawPositions = await this.portfolioRepository.find({
      where: { userId },
      relations: ['stock'],
    });

    const positions: any[] = [];
    let totalPositionsValue = 0.0;

    for (const pos of rawPositions) {
      const qty = Number(pos.quantity);
      if (qty === 0) continue;

      const code = pos.stockCode;
      const name = pos.stock?.name || `Action #${code}`;
      const currentPrice = pos.stock ? Number(pos.stock.price) : 0.0;
      const buyPrice = Number(pos.buyPrice) || currentPrice;
      const totalValue = qty * currentPrice;

      totalPositionsValue += totalValue;

      const pendingQty = await this.getPendingSellQuantity(userId, code);
      const availableQty = Math.max(0, qty - pendingQty);

      const gainLoss = (currentPrice - buyPrice) * qty;
      const gainLossPercent = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0.0;

      positions.push({
        code,
        name,
        quantity: qty,
        availableQuantity: availableQty,
        pendingQuantity: pendingQty,
        currentPrice: Number(currentPrice.toFixed(2)),
        buyPrice: Number(buyPrice.toFixed(2)),
        totalValue: Number(totalValue.toFixed(2)),
        gainLoss: Number(gainLoss.toFixed(2)),
        gainLossPercent: Number(gainLossPercent.toFixed(2)),
        isVad: qty < 0,
      });
    }

    const cashback = Number(Number(user.cashback).toFixed(2));
    const initialCapital = TradingService.INITIAL_CAPITAL;
    const totalCapital = Number((cashback + totalPositionsValue).toFixed(2));
    const totalPerformance = Number((totalCapital - initialCapital).toFixed(2));
    const totalPerformancePercent =
      initialCapital > 0 ? Number(((totalPerformance / initialCapital) * 100).toFixed(2)) : 0.0;

    const vadPossible = await this.getMaxVadPossible(userId);

    return {
      cashback,
      initialCapital,
      totalPositionsValue: Number(totalPositionsValue.toFixed(2)),
      totalCapital,
      totalPerformance,
      totalPerformancePercent,
      vadPossible,
      positions,
    };
  }

  /**
   * Récupère la liste des ordres en attente du joueur.
   */
  async getOrders(userId: number) {
    const orders = await this.orderRepository.find({
      where: { userId, etat: '1' },
      relations: ['stock'],
      order: { dateCreation: 'DESC' },
    });

    return orders.map((o) => ({
      id: String(o.id),
      code: o.stockCode,
      name: o.stock?.name || `Action #${o.stockCode}`,
      sens: o.sens === 'achat' ? 'A' : 'V',
      quantity: Number(o.quantity),
      valmin: Number(o.coursMin) || 0,
      valmax: Number(o.coursMax) || 0,
      currentValue: o.stock ? Number(o.stock.price) : 0,
      dateCreation: Number(o.dateCreation),
      tempsLimite: Number(o.tempsLimite),
    }));
  }

  /**
   * Passage d'un ordre d'achat ou de vente.
   */
  async placeOrder(userId: number, dto: PlaceOrderDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const stock = await this.stockRepository.findOne({
      where: { code: dto.codesicav },
    });

    if (!stock || stock.authBuy !== '1') {
      throw new BadRequestException("Ce titre n'existe pas ou n'est pas autorisé à la négociation.");
    }

    const stockPrice = Number(stock.price);
    if (stockPrice <= 0) {
      throw new BadRequestException("Le cours de cette action est invalide.");
    }

    const valmin = Number(dto.valmin) || 0;
    const valmax = Number(dto.valmax) || 0;

    if (dto.seuil === '1' && valmin <= 0 && valmax <= 0) {
      throw new BadRequestException(
        "Un ordre à seuil nécessite au moins un cours minimum ou un cours maximum supérieur à zéro."
      );
    }
    const hasThreshold = valmin > 0 || valmax > 0;

    const isMarketOpen = this.marketService.isMarketOpen();
    if (!isMarketOpen && !hasThreshold) {
      throw new BadRequestException(
        "Le marché est actuellement fermé pour les ordres au marché. Vous pouvez néanmoins programmer un ordre à cours limité qui sera placé dans le carnet d'ordres."
      );
    }

    const quantity = dto.quantity;

    const canUseThreshold = user.niveau ? user.niveau.seuil > 0 : false;
    const canUseRange = user.niveau ? user.niveau.plage === '1' : false;

    if (hasThreshold && !canUseThreshold) {
      throw new BadRequestException("Les ordres à seuil ne sont pas autorisés pour votre niveau de joueur.");
    }

    if (valmin > 0 && valmax > 0 && !canUseRange) {
      throw new BadRequestException("Les ordres avec plage de cours nécessitent le niveau Initié ou Expert.");
    }

    if (hasThreshold && valmin > 0 && valmax > 0 && valmin > valmax) {
      throw new BadRequestException("Le cours minimum ne peut pas dépasser le cours maximum.");
    }

    const now = Math.floor(Date.now() / 1000);
    const validityDays = dto.validity && dto.validity >= 1 && dto.validity <= 90 ? dto.validity : 30;
    const tempsLimite = now + validityDays * 86400;

    // Contrôles spécifiques VENTE
    if (dto.sens === 'vente') {
      const position = await this.portfolioRepository.findOne({
        where: { userId, stockCode: dto.codesicav },
      });
      const ownedQty = position ? Number(position.quantity) : 0;
      const pendingSell = await this.getPendingSellQuantity(userId, dto.codesicav);
      const availableShares = Math.max(0, ownedQty - pendingSell);

      if (!user.isVadAllowed) {
        if (ownedQty <= 0) {
          throw new BadRequestException(
            "Vous ne possédez pas cette action dans votre portefeuille et vous n'avez pas l'autorisation de vente à découvert (VAD)."
          );
        }
        if (quantity > availableShares) {
          throw new BadRequestException(
            `Quantité insuffisante : vous possédez ${ownedQty} action(s), dont ${pendingSell} déjà engagée(s) (disponible : ${availableShares}).`
          );
        }
      } else {
        const maxVad = await this.getMaxVadPossible(userId);
        const vadShares = this.getMaxBuyableShares(maxVad, stockPrice);
        const totalPossible = availableShares + vadShares;

        if (quantity > totalPossible) {
          throw new BadRequestException(
            `Quantité excessive pour votre capacité de vente (actions disponibles : ${availableShares}, capacité VAD : ${vadShares} action(s)).`
          );
        }
      }
    }

    // Contrôles spécifiques ACHAT
    if (dto.sens === 'achat') {
      const effectivePrice = valmax > 0 ? Math.max(stockPrice, valmax) : stockPrice;
      const tax = this.calculateTax(effectivePrice, quantity);
      const totalCost = Number((effectivePrice * quantity + tax).toFixed(2));
      const availableCash = await this.getAvailableCash(userId);

      if (totalCost > availableCash) {
        throw new BadRequestException(
          `Liquidités insuffisantes. Montant requis : ${totalCost.toLocaleString('fr-FR')} € (disponible net : ${availableCash.toLocaleString('fr-FR')} €).`
        );
      }
    }

    // Détermination de l'exécution immédiate vs placement en attente
    const isImmediate =
      isMarketOpen &&
      (!hasThreshold ||
        (dto.sens === 'achat' && (valmax === 0 || stockPrice <= valmax) && (valmin === 0 || stockPrice >= valmin)) ||
        (dto.sens === 'vente' && (valmin === 0 || stockPrice >= valmin) && (valmax === 0 || stockPrice <= valmax)));

    if (isImmediate) {
      // Exécution immédiate transactionnelle
      const message = await this.executeTradeTransaction(
        userId,
        dto.codesicav,
        dto.sens,
        quantity,
        stockPrice,
      );
      return { message };
    } else {
      // Création de l'ordre en attente
      await this.orderRepository.save({
        stockCode: dto.codesicav,
        userId,
        dateCreation: now,
        sens: dto.sens,
        quantity,
        pourc: 0,
        tempsLimite,
        coursMin: valmin,
        coursMax: valmax,
        etat: '1',
      });

      return {
        message: "Votre ordre a été placé en attente d'exécution sur le carnet d'ordres.",
      };
    }
  }

  /**
   * Exécution immédiate et atomique d'un trade (ACHAT ou VENTE).
   */
  async executeTradeTransaction(
    userId: number,
    stockCode: number,
    sens: 'achat' | 'vente',
    quantity: number,
    stockPrice: number,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
        relations: ['niveau'],
      });

      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      const position = await manager.findOne(Portfolio, {
        where: { userId, stockCode },
        lock: { mode: 'pessimistic_write' },
      });

      const tax = this.calculateTax(stockPrice, quantity);
      const now = Math.floor(Date.now() / 1000);
      const currentCashback = Number(user.cashback);

      if (sens === 'achat') {
        const totalCost = Number((stockPrice * quantity + tax).toFixed(2));
        if (totalCost > currentCashback) {
          throw new BadRequestException("Liquidités insuffisantes lors de l'exécution.");
        }

        // Débit cashback
        await manager.update(User, userId, {
          cashback: Number((currentCashback - totalCost).toFixed(2)),
          dateactivite: now,
        });

        const oldQty = position ? Number(position.quantity) : 0;
        const oldPru = position ? Number(position.buyPrice) : stockPrice;
        const newQty = oldQty + quantity;

        // Calcul du nouveau PRU
        let newPru = stockPrice;
        if (position && oldQty > 0) {
          newPru = (oldQty * oldPru + quantity * stockPrice) / newQty;
        } else if (position && oldQty < 0) {
          // Rachat partiel ou total de VAD
          newPru = newQty > 0 ? stockPrice : oldPru;
        }

        if (newQty === 0) {
          if (position) await manager.delete(Portfolio, { userId, stockCode });
        } else if (position) {
          await manager.update(Portfolio, { userId, stockCode }, {
            quantity: newQty,
            buyPrice: Number(newPru.toFixed(4)),
          });
        } else {
          await manager.save(Portfolio, {
            userId,
            stockCode,
            quantity: newQty,
            buyPrice: Number(newPru.toFixed(4)),
          });
        }

        // Profit en cas de rachat VAD
        let profit = 0.0;
        if (oldQty < 0) {
          const coveredQty = Math.min(Math.abs(oldQty), quantity);
          profit = -(stockPrice - oldPru) * coveredQty - tax;
        }

        // Enregistrement historique
        await manager.save(TradeHistory, {
          userId,
          stockCode,
          time: now,
          sens: 'Achat',
          quantity,
          price: stockPrice,
          tax,
          profit: Number(profit.toFixed(2)),
        });

        return `Achat de ${quantity} action(s) exécuté avec succès au cours de ${stockPrice.toLocaleString('fr-FR')} €.`;
      } else {
        // VENTE
        const oldQty = position ? Number(position.quantity) : 0;
        const oldPru = position ? Number(position.buyPrice) : stockPrice;
        const newQty = oldQty - quantity;

        // Contrôle de sécurité VAD dans la transaction verrouillée :
        if (newQty < 0) {
          if (!user.isVadAllowed) {
            throw new BadRequestException(
              "Vous ne possédez pas cette action dans votre portefeuille et vous n'avez pas l'autorisation de vente à découvert (VAD)."
            );
          }
          const maxVad = await this.getMaxVadPossible(userId);
          const vadShares = this.getMaxBuyableShares(maxVad, stockPrice);
          const availableShares = Math.max(0, oldQty);
          if (quantity > availableShares + vadShares) {
            throw new BadRequestException(
              `Quantité excessive pour votre capacité de vente VAD (disponible : ${availableShares}, capacité VAD : ${vadShares}).`
            );
          }
        }

        const grossAmount = stockPrice * quantity;
        const netCredit = Number((grossAmount - tax).toFixed(2));

        // Crédit cashback
        await manager.update(User, userId, {
          cashback: Number((currentCashback + netCredit).toFixed(2)),
          dateactivite: now,
        });

        let newPru = oldPru;
        if (position && oldQty < 0) {
          // Accentuation VAD
          newPru = (Math.abs(oldQty) * oldPru + quantity * stockPrice) / Math.abs(newQty);
        } else if (position && oldQty > 0 && newQty < 0) {
          // Passage de long à VAD
          newPru = stockPrice;
        }

        if (newQty === 0) {
          if (position) await manager.delete(Portfolio, { userId, stockCode });
        } else if (position) {
          await manager.update(Portfolio, { userId, stockCode }, {
            quantity: newQty,
            buyPrice: Number(newPru.toFixed(4)),
          });
        } else {
          await manager.save(Portfolio, {
            userId,
            stockCode,
            quantity: newQty,
            buyPrice: Number(newPru.toFixed(4)),
          });
        }

        // Plus ou moins-value réalisée
        const soldQty = oldQty > 0 ? Math.min(oldQty, quantity) : 0;
        const prevTax = this.calculateTax(oldPru, quantity);
        const profit = soldQty > 0 ? (stockPrice - oldPru) * soldQty - (tax + prevTax) : 0.0;

        await manager.save(TradeHistory, {
          userId,
          stockCode,
          time: now,
          sens: 'Vente',
          quantity,
          price: stockPrice,
          tax: -tax,
          profit: Number(profit.toFixed(2)),
        });

        return `Vente de ${quantity} action(s) exécutée avec succès au cours de ${stockPrice.toLocaleString('fr-FR')} €.`;
      }
    });
  }

  /**
   * Modification d'un ordre actif en attente.
   */
  async updateOrder(userId: number, orderId: string, dto: UpdateOrderDto) {
    const order = await this.orderRepository.findOne({
      where: [
        { id: Number(orderId) || 0, userId, etat: '1' },
        { dateCreation: Number(orderId) || 0, userId, etat: '1' },
      ],
      relations: ['stock'],
    });

    if (!order) {
      throw new NotFoundException("Ordre introuvable ou vous n'êtes pas autorisé à le modifier.");
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const stock = order.stock || (await this.stockRepository.findOne({ where: { code: order.stockCode } }));
    if (!stock) {
      throw new BadRequestException("Ce titre n'existe pas.");
    }
    if (stock.isArchived === '1' || (order.sens === 'achat' && stock.authBuy !== '1')) {
      throw new BadRequestException("Ce titre n'est plus autorisé à la négociation.");
    }

    const stockPrice = Number(stock.price);
    const newQuantity = dto.quantity !== undefined ? Number(dto.quantity) : Number(order.quantity);
    if (newQuantity <= 0) {
      throw new BadRequestException('La quantité doit être supérieure à zéro.');
    }

    const newCoursMin = dto.valmin !== undefined ? Number(dto.valmin) : Number(order.coursMin);
    const newCoursMax = dto.valmax !== undefined ? Number(dto.valmax) : Number(order.coursMax);

    if (newCoursMin < 0 || newCoursMax < 0) {
      throw new BadRequestException('Les seuils de cours ne peuvent pas être négatifs.');
    }
    if (newCoursMin > 0 && newCoursMax > 0 && newCoursMin > newCoursMax) {
      throw new BadRequestException('Le cours minimum ne peut pas dépasser le cours maximum.');
    }

    const hasThreshold = newCoursMin > 0 || newCoursMax > 0;
    const canUseThreshold = user.niveau ? user.niveau.seuil > 0 : false;
    const canUseRange = user.niveau ? user.niveau.plage === '1' : false;

    if (hasThreshold && !canUseThreshold) {
      throw new BadRequestException('Les ordres à seuil ne sont pas autorisés pour votre niveau de joueur.');
    }
    if (newCoursMin > 0 && newCoursMax > 0 && !canUseRange) {
      throw new BadRequestException('Les ordres avec plage de cours nécessitent le niveau Initié ou Expert.');
    }

    const isMarketOpen = this.marketService.isMarketOpen();
    if (!isMarketOpen && !hasThreshold) {
      throw new BadRequestException("Le marché est actuellement fermé.");
    }

    // Contrôles spécifiques selon le sens
    if (order.sens === 'vente') {
      const position = await this.portfolioRepository.findOne({
        where: { userId, stockCode: order.stockCode },
      });
      const ownedQty = position ? Number(position.quantity) : 0;

      // Calcul des actions engagées dans les AUTRES ordres de vente
      const otherPendingOrders = await this.orderRepository.find({
        where: {
          userId,
          stockCode: order.stockCode,
          sens: 'vente',
          etat: '1',
        },
      });
      const pendingSellOther = otherPendingOrders
        .filter((o) => o.id !== order.id)
        .reduce((sum, o) => sum + Number(o.quantity), 0);

      const availableShares = Math.max(0, ownedQty - pendingSellOther);

      if (!user.isVadAllowed) {
        if (newQuantity > availableShares) {
          throw new BadRequestException(
            `Quantité insuffisante : vous disposez de ${availableShares} action(s) disponible(s).`
          );
        }
      } else {
        const maxVad = await this.getMaxVadPossible(userId);
        const vadShares = this.getMaxBuyableShares(maxVad, stockPrice);
        const totalPossible = availableShares + vadShares;

        if (newQuantity > totalPossible) {
          throw new BadRequestException(
            `Quantité excessive pour votre capacité de vente (${totalPossible} max).`
          );
        }
      }
    } else if (order.sens === 'achat') {
      const priceRef = newCoursMax > 0 ? Math.max(stockPrice, newCoursMax) : stockPrice;
      const tax = this.calculateTax(priceRef, newQuantity);
      const totalRequired = Number((priceRef * newQuantity + tax).toFixed(2));

      // Calcul liquidités engagées par les AUTRES ordres d'achat
      const now = Math.floor(Date.now() / 1000);
      const otherBuyOrders = await this.orderRepository
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.stock', 's')
        .where('o.userId = :userId AND o.sens = :sens AND o.etat = :etat AND o.id != :orderId', {
          userId,
          sens: 'achat',
          etat: '1',
          orderId: order.id,
        })
        .andWhere('(o.tempsLimite = 0 OR o.tempsLimite > :now)', { now })
        .getMany();

      let otherCommitted = 0.0;
      for (const ord of otherBuyOrders) {
        const stockP = ord.stock ? Number(ord.stock.price) : 0.0;
        const p = ord.coursMax > 0 ? Math.max(stockP, Number(ord.coursMax)) : stockP;
        if (p > 0 && ord.quantity > 0) {
          otherCommitted += ord.quantity * p + this.calculateTax(p, ord.quantity);
        }
      }

      const currentCash = Number(user.cashback) || 0.0;
      const availableCashForOrder = Math.max(0.0, Number((currentCash - otherCommitted).toFixed(2)));

      if (totalRequired > availableCashForOrder) {
        throw new BadRequestException(
          `Liquidités insuffisantes pour modifier cet ordre. Requis : ${totalRequired.toLocaleString('fr-FR')} € (Disponible : ${availableCashForOrder.toLocaleString('fr-FR')} €).`
        );
      }
    }

    // Validité temporelle
    let tempsLimite = Number(order.tempsLimite);
    if (dto.validity && dto.validity >= 1 && dto.validity <= 90) {
      const now = Math.floor(Date.now() / 1000);
      tempsLimite = now + dto.validity * 86400;
    }

    order.quantity = newQuantity;
    order.coursMin = newCoursMin;
    order.coursMax = newCoursMax;
    order.tempsLimite = tempsLimite;

    await this.orderRepository.save(order);

    return { message: 'Ordre modifié avec succès !' };
  }

  /**
   * Annulation d'un ordre actif.
   */
  async cancelOrder(userId: number, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: [
        { id: Number(orderId) || 0, userId, etat: '1' },
        { dateCreation: Number(orderId) || 0, userId, etat: '1' },
      ],
    });

    if (!order) {
      throw new NotFoundException("Ordre introuvable ou vous n'êtes pas autorisé à l'annuler.");
    }

    await this.orderRepository.delete(order.id);
    return { message: 'Ordre annulé avec succès.' };
  }

  /**
   * Annulation de tous les ordres actifs du joueur.
   */
  async cancelAllOrders(userId: number) {
    await this.orderRepository.delete({ userId, etat: '1' });
    return { message: 'Tous vos ordres en attente ont été annulés.' };
  }

  /**
   * Consultation paginée de l'historique des transactions.
   */
  async getHistory(userId: number, page = 1, limit = 20) {
    const take = Math.min(100, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    const [rows, total] = await this.tradeHistoryRepository.findAndCount({
      where: { userId },
      relations: ['stock'],
      order: { time: 'DESC', id: 'DESC' },
      take,
      skip,
    });

    const items = rows.map((r) => {
      const price = Number(r.price);
      const qty = Number(r.quantity);
      const totalExclTax = Number((price * qty).toFixed(2));
      const tax = Math.abs(Number(r.tax));
      const totalInclTax = r.sens === 'Achat' ? totalExclTax + tax : totalExclTax - tax;
      const profitNum = Number(r.profit);
      const profitStr = `${profitNum >= 0 ? '+' : ''}${profitNum.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

      return {
        date: Number(r.time),
        name: r.stock?.name || `Action #${r.stockCode}`,
        sens: r.sens,
        quantity: qty,
        totalExclTax,
        tax,
        totalInclTax: Number(totalInclTax.toFixed(2)),
        profit: profitStr,
      };
    });

    return {
      items,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Simulation en temps réel d'un achat/vente pour la modale de trading.
   */
  async calculateSimulation(userId: number | null, code: number, quantity: number) {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable');
    }

    const stockPrice = Number(stock.price);
    const qty = Math.max(1, quantity);
    const tax = this.calculateTax(stockPrice, qty);
    const total = Number((stockPrice * qty + tax).toFixed(2));

    let maxBuyable = 0;
    let maxVad = 0.0;
    let ownedQuantity = 0;
    let availableSellQuantity = 0;
    let pendingSellQuantity = 0;
    let availableCash = 0.0;
    let canVad = false;
    let canThreshold = false;
    let canRange = false;

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['niveau'],
      });

      if (user) {
        availableCash = await this.getAvailableCash(userId);
        maxBuyable = this.getMaxBuyableShares(availableCash, stockPrice);
        maxVad = await this.getMaxVadPossible(userId);

        const position = await this.portfolioRepository.findOne({
          where: { userId, stockCode: code },
        });
        ownedQuantity = position ? Number(position.quantity) : 0;
        pendingSellQuantity = await this.getPendingSellQuantity(userId, code);
        availableSellQuantity = Math.max(0, ownedQuantity - pendingSellQuantity);

        canVad = user.isVadAllowed;
        canThreshold = user.niveau ? user.niveau.seuil > 0 : false;
        canRange = user.niveau ? user.niveau.plage === '1' : false;
      }
    }

    return {
      code,
      stockPrice,
      quantity: qty,
      tax,
      total,
      maxBuyable,
      maxVad,
      ownedQuantity,
      availableSellQuantity,
      pendingSellQuantity,
      availableCash,
      canVad,
      canThreshold,
      canRange,
      isMarketOpen: this.marketService.isMarketOpen(),
    };
  }

  /**
   * Envoie une notification interne au joueur (message système).
   */
  async sendTradeNotification(userId: number, title: string, content: string): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await this.dataSource.getRepository(Message).save({
        recipientId: userId,
        senderId: 0,
        title,
        content,
        date: now,
        status: 'non lu',
      });
    } catch (err) {
      this.logger.warn(`Impossible d'envoyer la notification de trading #${userId}: ${err.message}`);
    }
  }

  /**
   * Exécute les ordres en attente dont les conditions de cours sont validées.
   */
  async executePendingOrders(): Promise<number> {
    // Respect strict des horaires de cotation Euronext
    if (!this.marketService.isMarketOpen()) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const pendingOrders = await this.orderRepository.find({
      where: { etat: '1' },
      relations: ['stock'],
    });

    let executedCount = 0;
    for (const ord of pendingOrders) {
      // Expiration temporelle
      if (ord.tempsLimite > 0 && ord.tempsLimite < now) {
        await this.orderRepository.delete(ord.id);
        await this.sendTradeNotification(
          ord.userId,
          `Ordre expiré : ${ord.stock?.name || 'Titre #' + ord.stockCode}`,
          `Votre ordre n°${ord.id} (${ord.sens === 'achat' ? 'Achat' : 'Vente'} de ${ord.quantity} action(s)) est arrivé à expiration et a été retiré du carnet d'ordres.`,
        );
        continue;
      }

      // Vérification que le titre est toujours négociable et non archivé
      if (!ord.stock || ord.stock.isArchived === '1' || (ord.sens === 'achat' && ord.stock.authBuy !== '1')) {
        await this.orderRepository.delete(ord.id);
        await this.sendTradeNotification(
          ord.userId,
          `Ordre annulé : ${ord.stock?.name || 'Titre #' + ord.stockCode}`,
          `Votre ordre n°${ord.id} a été annulé car ce titre n'est plus disponible à la négociation.`,
        );
        continue;
      }

      const currentPrice = ord.stock ? Number(ord.stock.price) : 0.0;
      if (currentPrice <= 0) continue;

      const isExecutable =
        (ord.sens === 'achat' && (ord.coursMax === 0 || currentPrice <= ord.coursMax) && (ord.coursMin === 0 || currentPrice >= ord.coursMin)) ||
        (ord.sens === 'vente' && (ord.coursMin === 0 || currentPrice >= ord.coursMin) && (ord.coursMax === 0 || currentPrice <= ord.coursMax));

      if (isExecutable) {
        try {
          await this.executeTradeTransaction(
            ord.userId,
            ord.stockCode,
            ord.sens as 'achat' | 'vente',
            ord.quantity,
            currentPrice,
          );
          await this.orderRepository.delete(ord.id);
          executedCount++;
        } catch (err) {
          this.logger.warn(`Échec exécution ordre #${ord.id}: ${err.message}`);
          // Annulation automatique de l'ordre en échec et notification du joueur
          await this.orderRepository.delete(ord.id);
          await this.sendTradeNotification(
            ord.userId,
            `Annulation d'ordre : ${ord.stock?.name || 'Titre #' + ord.stockCode}`,
            `Votre ordre n°${ord.id} (${ord.sens === 'achat' ? 'Achat' : 'Vente'} de ${ord.quantity} action(s)) n'a pas pu être exécuté et a été annulé. Motif : ${err.message}`,
          );
        }
      }
    }

    return executedCount;
  }
}
