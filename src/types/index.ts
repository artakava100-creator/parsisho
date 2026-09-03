export type UserRole = 'user' | 'seller' | 'admin' | 'super_admin';

export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'disabled';

export type Permission =
  | 'manage_auctions'
  | 'manage_products'
  | 'manage_users'
  | 'manage_wallet'
  | 'manage_rewards'
  | 'manage_missions'
  | 'manage_businesses'
  | 'manage_content'
  | 'manage_settings'
  | 'manage_store_products'
  | 'manage_store_categories'
  | 'manage_store_variants'
  | 'manage_store_media'
  | 'manage_store_attributes'
  | 'manage_store_inventory'
  | 'manage_store_pricing';

// ─── Marketplace Foundation Types ─────────────────────────────────

export type ProductStatus = 'draft' | 'published' | 'archived';

export type AttributeType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select';

export type PriceType = 'base' | 'sale';

export type MediaType = 'image' | 'video';

export interface ProductCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
  showInNavigation: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  brandId: string | null;
  sellerId: string | null;
  producerId: string | null;
  status: ProductStatus;
  isPublished: boolean;
  isActive: boolean;
  isNew: boolean;
  isSelected: boolean;
  isEconomic: boolean;
  isBestSeller: boolean;
  isPopular: boolean;
  isSpecialOffer: boolean;
  isDiscounted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string | null;
  name: string;
  attributes: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMedia {
  id: string;
  productId: string;
  mediaType: MediaType;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductAttributeDefinition {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  attributeType: AttributeType;
  options: Record<string, unknown> | null;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttributeValue {
  id: string;
  productId: string;
  attributeDefinitionId: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInventory {
  id: string;
  productId: string;
  variantId: string | null;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  updatedAt: string;
}

export interface PublicProductInventory {
  productId: string;
  stockQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
}

export interface ProductPrice {
  id: string;
  productId: string;
  variantId: string | null;
  priceType: PriceType;
  amount: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  role: UserRole;
  reputationScore: number;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  accountStatus: AccountStatus;
  identityVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  profile: Profile | null;
}

export type AuthState = 'initializing' | 'unauthenticated' | 'authenticated';

export interface IdentityState {
  isRegistered: boolean;
  isEmailVerified: boolean;
  hasPhoneNumber: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  accountStatus: AccountStatus;
  isAuctionEligible: boolean;
  eligibilityReasons: string[];
}

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'ending' | 'ended' | 'cancelled';

export interface Auction {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: AuctionStatus;
  auctionDate: string;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  currentPrice: number;
  minBidIncrement: number;
  bidCount: number;
  participantCount: number;
  winnerUserId: string | null;
  imageUrl: string | null;
  productName: string | null;
  isOfficial: boolean;
  extensionUsed: boolean;
  extensionTriggeredAt: string | null;
  originalEndsAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  originalPrice: number | null;
  clickIncrement: number;
  clickCost: number;
  clickCount: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  amount: number;
  isWinning: boolean;
  createdAt: string;
  bidSequence: number;
}

export interface BidHistoryEntry {
  id: string;
  amount: number;
  bidderName: string;
  isWinning: boolean;
  createdAt: string;
  bidSequence: number;
  isOwnBid: boolean;
}

export interface LastFiveClicker {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lastClickAt: string;
  isOwn: boolean;
}

export interface AuctionDetail {
  auction: Auction;
  bids: BidHistoryEntry[];
  lastFiveClickers: LastFiveClicker[];
  userClickCount: number;
  userTotalSpent: number;
  userLastClick: string | null;
  serverTime: string;
}

export interface PlaceClickResult {
  success: boolean;
  error?: string;
  auctionId?: string;
  newCurrentPrice?: number;
  newClickCount?: number;
  clickSequence?: number;
  clickCost?: number;
  currentPrice?: number;
  currentBidCount?: number;
  clickCount?: number;
  extensionApplied?: boolean;
  newEndsAt?: string;
  newBalance?: number;
}

export type AuctionEventType =
  | 'auction_created' | 'auction_scheduled' | 'auction_published'
  | 'auction_started' | 'bid_accepted' | 'bid_rejected'
  | 'extension_triggered' | 'extension_consumed'
  | 'auction_ending' | 'auction_ended' | 'winner_determined'
  | 'auction_cancelled' | 'auto_activated';

export interface AuctionEvent {
  id: string;
  auctionId: string;
  eventType: AuctionEventType;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type AuctionNotificationType =
  | 'auction_starting_soon' | 'auction_started' | 'auction_ending_soon'
  | 'auction_ended' | 'user_won' | 'user_lost' | 'direct_purchase_opportunity';

export interface AuctionNotification {
  id: string;
  userId: string;
  auctionId: string;
  notificationType: AuctionNotificationType;
  channel: 'in_app' | 'sms';
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'not_configured';
  message: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  sentAt: string | null;
}

export interface ServerTimeResult {
  success: boolean;
 serverTime: string;
  iranTime: string;
}

export type WalletTxType =
  | 'deposit'
  | 'withdrawal'
  | 'auction_bid'
  | 'auction_click'
  | 'auction_refund'
  | 'direct_purchase'
  | 'reward'
  | 'daily_reward'
  | 'referral_reward'
  | 'admin_adjustment';

export type WalletTxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  status: WalletTxStatus;
  paymentOrderId: string | null;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  availableBalance: number;
  lockedBalance: number;
}

export interface ParsiPackage {
  id: string;
  parsiAmount: number;
  price: number;
  bonusAmount: number;
  isActive: boolean;
  sortOrder: number;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePackageResult {
  success: boolean;
  error?: string;
  wallet?: Wallet;
  creditedAmount?: number;
}

export type PaymentOrderStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export interface PaymentOrder {
  id: string;
  userId: string;
  packageId: string | null;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  gateway: string | null;
  gatewayReference: string | null;
  authority: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  failedAt: string | null;
}

export interface CreatePaymentOrderResult {
  success: boolean;
  error?: string;
  paymentOrder?: PaymentOrder;
  isExisting?: boolean;
}

export interface ConfirmPaymentResult {
  success: boolean;
  error?: string;
  code?: string;
  alreadyConfirmed?: boolean;
  message?: string;
  wallet?: Wallet;
  creditedAmount?: number;
}

export type AuctionHistoryResult = 'won' | 'lost' | 'cancelled' | 'live';

export interface AuctionHistoryEntry {
  auctionId: string;
  title: string;
  productName: string | null;
  imageUrl: string | null;
  status: AuctionStatus;
  auctionDate: string;
  currentPrice: number;
  originalPrice: number | null;
  clickCost: number;
  clickIncrement: number;
  userClickCount: number;
  userTotalSpent: number;
  winnerUserId: string | null;
  winnerName: string | null;
  isWinner: boolean;
  endsAt: string;
}

export interface DirectPurchaseResult {
  success: boolean;
  error?: string;
  auctionId?: string;
  originalPrice?: number;
  credit?: number;
  remaining?: number;
  newBalance?: number;
}

export type MissionType = 'daily' | 'weekly' | 'special' | 'community';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  rewardAmount: number;
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export type StoreOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type StorePaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed';

export interface StoreOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  status: StoreOrderStatus;
  subtotal: number;
  discount: number;
  shippingCost: number;
  paymentFee: number;
  total: number;
  customerName: string;
  mobileNumber: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  deliveryNote: string | null;
  paymentStatus: StorePaymentStatus;
  createdAt: string;
  updatedAt: string;
  items?: StoreOrderItem[];
}

export interface CreateOrderInput {
  customerName: string;
  mobileNumber: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  deliveryNote?: string;
  items: {
    productId: string;
    productName: string;
    productImage: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  paymentFee: number;
  total: number;
}

export type ShippingMode = 'free' | 'fixed' | 'provider';
export type PaymentFeeType = 'none' | 'percentage' | 'fixed' | 'combined';

export interface StoreSettings {
  shippingMode: ShippingMode;
  fixedShippingFee: number;
  shippingProvider: string | null;
  paymentFeeType: PaymentFeeType;
  paymentFeePercentage: number;
  paymentFeeFixedAmount: number;
  updatedAt: string;
}

export interface OrderPriceBreakdown {
  subtotal: number;
  discount: number;
  shippingCost: number;
  paymentFee: number;
  total: number;
}

export interface CreateOrderResult {
  success: boolean;
  error?: string;
  order?: StoreOrder;
}

export type GameRoundStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled' | 'drawn';
export type GameChallengeType = 'image_count' | '3d_object' | 'hidden_object' | 'visual_identification' | 'text_question';
export type GameAnswerType = 'text' | 'number';

export interface GameRound {
  id: string;
  gameId: string;
  title: string;
  question: string;
  challengeType: string;
  displayImagePath: string | null;
  originalImagePath: string | null;
  answerType: GameAnswerType;
  correctAnswer: string;
  acceptedAnswers: string[];
  entryFee: number;
  prizeAmount: number;
  winnerCount: number;
  maxEntriesPerUser: number;
  startsAt: string;
  endsAt: string;
  status: GameRoundStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameRoundInput {
  gameId: string;
  title: string;
  question: string;
  challengeType: string;
  answerType: GameAnswerType;
  correctAnswer: string;
  displayImagePath?: string | null;
  originalImagePath?: string | null;
  acceptedAnswers?: string[];
  entryFee?: number;
  prizeAmount?: number;
  winnerCount?: number;
  maxEntriesPerUser?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateGameRoundInput {
  title?: string;
  question?: string;
  challengeType?: string;
  answerType?: GameAnswerType;
  correctAnswer?: string;
  displayImagePath?: string | null;
  originalImagePath?: string | null;
  acceptedAnswers?: string[];
  entryFee?: number;
  prizeAmount?: number;
  winnerCount?: number;
  maxEntriesPerUser?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface GameRoundRpcResult {
  success: boolean;
  error?: string;
  round_id?: string;
  status?: string;
}

export type BusinessStatus = 'pending' | 'active' | 'inactive';

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
}

export interface BusinessCategoryWithActive extends BusinessCategory {
  isActive: boolean;
}

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  city: string | null;
  locality: string | null;
  logoPath: string | null;
  coverPath: string | null;
  isFeatured: boolean;
}

export interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  city: string | null;
  locality: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  logoPath: string | null;
  coverPath: string | null;
  status: BusinessStatus;
  isFeatured: boolean;
  createdAt: string;
}

export interface BusinessAdminRow extends BusinessSummary {
  status: BusinessStatus;
  displayOrder: number;
  createdAt: string;
}

export interface CreateBusinessInput {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription?: string | null;
  description?: string | null;
  city?: string | null;
  locality?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoPath?: string | null;
  coverPath?: string | null;
  status?: BusinessStatus;
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface UpdateBusinessInput {
  name?: string | null;
  slug?: string | null;
  categoryId?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  city?: string | null;
  locality?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoPath?: string | null;
  coverPath?: string | null;
  status?: BusinessStatus | null;
  isFeatured?: boolean | null;
  displayOrder?: number | null;
}

export interface AdSlot {
  id: string;
  slotKey: string;
  page: string;
  placement: string;
  devices: string[];
  isActive: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  destinationUrl: string;
  isActive: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  slotIds?: string[];
}

export interface ResolveAdResult {
  advertisement: Advertisement | null;
  slot: { id: string; slotKey: string; page: string; placement: string } | null;
}

export interface AdAnalytics {
  advertisementId?: string;
  title?: string;
  impressions: number;
  clicks: number;
}
