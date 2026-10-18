import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * 小满合 APP — API 服务层（对接小程序后端）
 *
 * 后端：xiaomanhe-mp-backend（Spring Boot 2.7 + Java 8 + MyBatis-Plus）
 * 域名：https://www.chunfenmengya.cn  context-path=/api，控制器映射 /v1
 * 统一响应信封：{ code: 0 | "ERROR_CODE", message: string, requestId: string, data: any }
 *   - code 成功为数字 0，业务失败为错误码字符串
 *
 * 地址解析策略：
 *   - 安卓原生（CapacitorHttp）：直连线上域名（原生请求无浏览器跨域限制）
 *   - 浏览器开发：走 /api 相对路径，由 vite 代理转发到线上（见 vite.config.ts）
 */

const API_BASE = resolveBase(import.meta.env.VITE_API_BASE_URL);

function resolveBase(explicit: string | undefined): string {
  if (explicit && explicit.trim()) return explicit.replace(/\/$/, '');
  // 原生环境直连线上；浏览器走 vite 代理（/api）
  // 注：2026-10-17 起 APP 端临时直连 8082 明文端口——本机网络链路对
  // www.chunfenmengya.cn:443 的 TLS 握手存在重置干扰（模拟器/PC 均复现），
  // 服务器与公网 TLS 本身正常。后续恢复 443 时改回即可。
  if (Capacitor.isNativePlatform()) return 'http://47.109.104.165:8082/api/v1';
  return '/api/v1';
}

// 图片资源公开基址：后端返回 /images/uploads/... 相对路径时补全。
const ASSET_ORIGIN = API_BASE.startsWith('http') ? new URL(API_BASE).origin : 'https://www.chunfenmengya.cn';

const MOCK_LOGIN_ENABLED = import.meta.env.MODE === 'mock';
export const isMockLoginEnabled = MOCK_LOGIN_ENABLED;

// ====================== 类型定义 ======================

export type CategoryId = 'all' | 'veg' | 'fruit' | 'grain' | 'meat' | 'local' | 'seafood';

export const APP_CATEGORIES: Array<{ id: CategoryId; name: string }> = [
  { id: 'all', name: '全部' },
  { id: 'veg', name: '蔬菜' },
  { id: 'fruit', name: '水果' },
  { id: 'grain', name: '粮油' },
  { id: 'meat', name: '肉蛋' },
  { id: 'seafood', name: '水产' },
  { id: 'local', name: '特产' },
];

export interface Product {
  id: string;
  name: string;
  origin: string;
  category: CategoryId;
  category_id: number;
  category_name: string;
  unit: string;
  image: string;
  coverImage: string;
  images: Array<{ url: string; alt: string }>;
  tag: string;
  price: number;
  priceText: string;
  priceFen: number;
  originalPrice: number;
  sales: string;
  stock: number;
  description: string;
  isOnSale: boolean;
  purchasable: boolean;
  catalogueOnly: boolean;
  status: number;
  source: string;
  favorited: boolean;
}

export type ApiDataSource = 'real' | 'fallback' | 'unavailable';

export interface ApiDataResult<T> {
  value: T;
  source: ApiDataSource;
  fallbackReason?: string;
}

export interface AppCategory {
  id: CategoryId;
  backendId?: number;
  name: string;
  imageUrl?: string;
}

/** 首页金刚区用：后端原始分类（不去重、不映射，保留 id/name/imageUrl）。 */
export interface RawCategory { id: string; name: string; imageUrl?: string; }

export async function fetchRawCategories(): Promise<RawCategory[]> {
  try {
    const payload = await requestJson<{ items: Array<{ id: unknown; name: unknown; imageUrl?: unknown }> }>('GET', '/categories', undefined, { auth: false });
    return (payload.items || []).map((raw) => {
      const imageUrl = String(raw.imageUrl || '');
      return { id: String(raw.id || ''), name: String(raw.name || ''), ...(imageUrl ? { imageUrl } : {}) };
    });
  } catch { return []; }
}

export interface Banner {
  title: string;
  sub: string;
  image: string;
  color1?: string;
  color2?: string;
}

export interface AdoptItem {
  id: number;
  name: string;
  image: string;
  period: string;
  output: string;
  progress: number;
  left: number;
  stage: string;
  price: number;
  source?: ApiDataSource;
}

export interface PostItem {
  id: number;
  author: string;
  title: string;
  tag: string;
}

export interface TaskItem {
  id: number;
  name: string;
  time: string;
  type: string;
  done: boolean;
}

export interface TraceStep {
  stage: string;
  time: string;
  desc: string;
}

export type AiRole = 'consumer' | 'farmer';

export interface SessionUser {
  userId: number;
  nickname: string;
  avatar: string;
  identity: 'consumer' | 'farmer';
  phone: string;
  token: string;
  roles: string[];
  gender: number;
  birthday: string;
  city: string;
  points: number;
  memberLevel: number;
  memberLevelName: string;
  isNewUser?: boolean;
  isMock?: boolean;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  isDefault: boolean;
}

export interface CartLine {
  cartId: number;
  product: Product;
  quantity: number;
  spec: string;
}

export interface OrderItemRecord {
  id: number;
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderRecord {
  id: number;
  orderNo: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunding' | 'refunded';
  totalAmount: number;
  freight: number;
  address: Address;
  remark: string;
  items: OrderItemRecord[];
  createdAt: string;
  payTime?: string;
}

// ====================== 工具函数 ======================

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fenToYuan(fen: unknown): number {
  const n = toNum(fen, -1);
  return n >= 0 ? n / 100 : 0;
}

function yuanText(fen: unknown): string {
  const n = toNum(fen, -1);
  return n >= 0 ? (n / 100).toFixed(2) : '--';
}

export function imageURL(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/images/uploads/')) return ASSET_ORIGIN + value;
  return value;
}

function parseImages(raw: unknown): Array<{ url: string; alt: string }> {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((i) => {
      const url = imageURL(typeof i === 'string' ? i : (i as any)?.url);
      return url ? { url, alt: (i as any)?.alt || '' } : null;
    })
    .filter(Boolean) as Array<{ url: string; alt: string }>;
}

function parseTags(raw: unknown): string {
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length > 0) return String(arr[0]).replace(/特产$/, '');
  return '';
}

function formatSales(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  return String(count || 0);
}

// 后端 categoryId 为字符串（中文分类名），这里映射到 App 的分类 id。
const CAT_NAME_MAP: Record<string, CategoryId> = {
  '新鲜水果': 'fruit', '时令蔬菜': 'veg', '粮油调味': 'grain',
  '肉禽蛋品': 'meat', '海鲜水产': 'seafood',
};
const CAT_ID_MAP: Record<number, CategoryId> = {
  1: 'veg', 2: 'fruit', 3: 'grain', 4: 'meat', 5: 'seafood', 6: 'local',
};

/**
 * 把后端分类映射为前端枚举 + 真实分类 id。
 * category（枚举）仍按名称映射，供旧逻辑使用；
 * category_id 保留后端真实 id（用于商城分类筛选匹配 RawCategory.id），不再写死 0。
 */
function mapCategory(categoryId: unknown, categoryName: unknown): { category: CategoryId; category_id: number; category_name: string } {
  const name = String(categoryName || categoryId || '');
  const realId = toNum(categoryId, 0);
  for (const [key, val] of Object.entries(CAT_NAME_MAP)) {
    if (name.includes(key) || key.includes(name)) return { category: val, category_id: realId, category_name: name };
  }
  if (/蔬菜|瓜果|菌菇/.test(name)) return { category: 'veg', category_id: realId, category_name: name };
  if (/水果|果/.test(name)) return { category: 'fruit', category_id: realId, category_name: name };
  if (/粮|米|油/.test(name)) return { category: 'grain', category_id: realId, category_name: name };
  if (/肉|蛋|禽/.test(name)) return { category: 'meat', category_id: realId, category_name: name };
  if (/水产|海鲜|鱼|虾/.test(name)) return { category: 'seafood', category_id: realId, category_name: name };
  return { category: 'local', category_id: realId, category_name: name || '特产' };
}

function mapProduct(raw: Record<string, unknown>): Product {
  const images = parseImages(raw.images);
  const priceFen = toNum(raw.priceFen, -1);
  const stock = toNum(raw.stock, 0);
  const isOnSale = raw.isOnSale === true || toNum(raw.status, 1) === 1;
  const catalogueOnly = raw.catalogueOnly === true;
  const purchasable = raw.purchasable === true || (priceFen >= 0 && isOnSale && stock > 0 && !catalogueOnly);
  // 后端可能返回 categoryId 扁平字段，也可能返回嵌套 category 对象，两者都取真实 id
  const rawCategory = raw.category as Record<string, unknown> | undefined;
  const cat = mapCategory(raw.categoryId ?? rawCategory?.id, rawCategory?.name ?? raw.category_name);
  const coverImage = imageURL(raw.coverImage) || (images[0] ? images[0].url : '');
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name || ''),
    origin: String(raw.origin || ''),
    category: cat.category,
    category_id: cat.category_id,
    category_name: cat.category_name,
    unit: String(raw.unit || '份'),
    image: coverImage,
    coverImage,
    images,
    tag: parseTags(raw.tags) || '当季',
    price: fenToYuan(priceFen),
    priceText: yuanText(priceFen),
    priceFen,
    originalPrice: fenToYuan(priceFen),
    sales: formatSales(toNum(raw.sales_count ?? raw.salesCount ?? 0)),
    stock,
    description: String(raw.description || ''),
    isOnSale,
    purchasable,
    catalogueOnly,
    status: toNum(raw.status, 1),
    source: String(raw.source || ''),
    favorited: raw.favorited === true,
  };
}

function sourceOf(value: unknown): ApiDataSource {
  return value === 'fallback' || value === 'unavailable' ? value : 'real';
}

function unavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP (0|404|405|408|429|500|501|502|503|504)|Failed to fetch|Network Error/i.test(message);
}

// ====================== 会话管理 ======================

const SESSION_STORAGE_KEY = 'xiaomanhe_session';

export function getStoredSession(): SessionUser | null {
  try {
    const value = localStorage.getItem(SESSION_STORAGE_KEY);
    return value ? (JSON.parse(value) as SessionUser) : null;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return getStoredSession()?.token || null;
}

export function saveSession(session: SessionUser) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

// ====================== 底层请求 ======================

interface Envelope<T> {
  code: number | string;
  message: string;
  requestId: string;
  data: T | null;
}

// 生成后端幂等键（需匹配 ^[A-Za-z0-9_-]{16,80}$）。
function idempotencyKey(): string {
  const rand = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    return Array.from({ length: 24 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');
  };
  return `wb_${Date.now()}_${rand()}`.slice(0, 80);
}

async function requestJson<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: Record<string, unknown>,
  opts?: { auth?: boolean; formData?: Record<string, unknown>; headers?: Record<string, string> }
): Promise<T> {
  const token = getToken();
  const auth = opts?.auth ?? true;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts?.headers || {}) };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  let raw: any;

  if (Capacitor.isNativePlatform()) {
    const options: any = { url, headers, data, responseType: 'json' };
    let response;
    if (method === 'GET') response = await CapacitorHttp.get(options);
    else if (method === 'POST') response = await CapacitorHttp.post(options);
    else if (method === 'PUT') response = await CapacitorHttp.put(options);
    else response = await CapacitorHttp.delete(options);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${typeof response.data === 'string' ? response.data : ''}`);
    }
    raw = response.data;
  } else {
    const init: RequestInit = {
      method,
      headers,
      ...(method === 'GET' || method === 'DELETE' || data === undefined ? {} : { body: JSON.stringify(data) }),
    };
    const response = await fetch(url, init);
    const text = await response.text();
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = text;
    }
    if (!response.ok) {
      const msg = typeof raw === 'object' && raw?.message ? raw.message : `HTTP ${response.status}`;
      const err = new Error(msg) as any;
      err.status = response.status;
      err.code = typeof raw === 'object' && raw?.code ? raw.code : undefined;
      throw err;
    }
  }

  return unwrap<T>(raw);
}

function unwrap<T>(raw: any): T {
  // 标准信封 {code, message, requestId, data}
  if (raw && typeof raw === 'object' && 'code' in raw) {
    if (raw.code === 0 || raw.code === 200) return raw.data as T;
    const err = new Error(raw.message || '请求失败') as any;
    err.code = raw.code;
    throw err;
  }
  // 兜底：旧嵌套格式 {code, data:{success, data}}
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const envelope = raw.data;
    if (envelope && typeof envelope === 'object' && envelope.success === false) {
      const err = new Error(envelope.message || '请求失败') as any;
      err.code = raw.code;
      throw err;
    }
    if (envelope && typeof envelope === 'object' && 'data' in envelope) return envelope.data as T;
    return envelope as T;
  }
  return raw as T;
}

// ====================== 认证 ======================

function mapUser(raw: Record<string, unknown>): SessionUser {
  const roles = Array.isArray(raw.roles) ? raw.roles.map(String) : [];
  const identity: 'consumer' | 'farmer' = roles.includes('farmer') ? 'farmer' : 'consumer';
  return {
    userId: toNum(raw.id, 0),
    nickname: String(raw.nickname || ''),
    avatar: imageURL(raw.avatarUrl || raw.avatar),
    identity,
    phone: String(raw.phone || ''),
    token: '',
    roles,
    gender: toNum(raw.gender, 0),
    birthday: String(raw.birthday || ''),
    city: String(raw.city || ''),
    points: toNum(raw.points, 0),
    memberLevel: toNum(raw.memberLevel, 0),
    memberLevelName: String(raw.memberLevelName || '青芽会员'),
  };
}

interface LoginResponse {
  token: string;
  user: Record<string, unknown>;
}

/** 账号密码注册 */
export async function register(username: string, password: string, role: 'consumer' | 'farmer' = 'consumer'): Promise<SessionUser> {
  const resp = await requestJson<LoginResponse>('POST', '/auth/register', { username, password, role }, { auth: false });
  if (!resp || !resp.token || !resp.user) throw new Error('注册失败，请重试');
  const session = mapUser(resp.user);
  session.token = resp.token;
  saveSession(session);
  return session;
}

/** 账号密码登录 */
export async function passwordLogin(username: string, password: string): Promise<SessionUser> {
  const resp = await requestJson<LoginResponse>('POST', '/auth/password-login', { username, password }, { auth: false });
  if (!resp || !resp.token || !resp.user) throw new Error('登录失败，请重试');
  const session = mapUser(resp.user);
  session.token = resp.token;
  saveSession(session);
  return session;
}

/** 兼容旧签名：手机号验证码登录（已废弃，保留占位） */
export async function sendLoginCode(phone: string): Promise<{ debugCode?: string }> {
  if (MOCK_LOGIN_ENABLED) return { debugCode: '任意验证码' };
  throw new Error('已切换为账号密码登录');
}

export async function loginWithSms(_phone: string, _code: string, _identity: SessionUser['identity'] = 'consumer'): Promise<SessionUser> {
  if (MOCK_LOGIN_ENABLED) {
    const session: SessionUser = {
      userId: 9000001,
      nickname: '本地测试用户',
      avatar: '',
      identity: _identity,
      phone: _phone,
      token: 'local-mock-session',
      roles: [_identity],
      gender: 0,
      birthday: '',
      city: '',
      points: 100,
      memberLevel: 0,
      memberLevelName: '青芽会员',
      isNewUser: false,
      isMock: true,
    };
    saveSession(session);
    return session;
  }
  throw new Error('已切换为账号密码登录');
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  const raw = await requestJson<Record<string, unknown>>('GET', '/me');
  const session = getStoredSession();
  const user = mapUser(raw);
  if (session) {
    user.token = session.token;
    saveSession(user);
  }
  return user;
}

// ====================== 商品 / 分类 / 首页 ======================

export async function fetchProductData(options: { keyword?: string; categoryId?: number; sort?: string } = {}): Promise<ApiDataResult<Product[]>> {
  const params = new URLSearchParams({ page: '1', pageSize: '100' });
  if (options.keyword) params.set('keyword', options.keyword);
  if (options.categoryId) params.set('categoryId', String(options.categoryId));
  if (options.sort) params.set('sort', options.sort);
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[]; total: number }>('GET', `/products?${params.toString()}`, undefined, { auth: false });
    return { value: (payload.items || []).map(mapProduct), source: 'real' };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { value: [], source: 'unavailable', fallbackReason: '暂时无法加载商品，请稍后重试' };
  }
}

export async function fetchProducts(): Promise<Product[]> {
  return (await fetchProductData()).value;
}

export async function fetchMobileCategories(): Promise<ApiDataResult<AppCategory[]>> {
  try {
    const payload = await requestJson<{ items: Array<{ id: unknown; name: unknown; imageUrl?: unknown }> }>('GET', '/categories', undefined, { auth: false });
    const value: AppCategory[] = [{ id: 'all', name: '全部' }];
    for (const raw of payload.items || []) {
      const name = String(raw.name || '');
      const cat = mapCategory(undefined, name);
      if (value.some((c) => c.id === cat.category)) continue;
      const imageUrl = String(raw.imageUrl || '');
      value.push({ id: cat.category, backendId: toNum(raw.id, 0), name, ...(imageUrl ? { imageUrl } : {}) });
    }
    return { value: value.length > 1 ? value : APP_CATEGORIES, source: 'real' };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { value: APP_CATEGORIES, source: 'fallback', fallbackReason: '分类服务暂不可用' };
  }
}

export async function fetchBanners(): Promise<Banner[]> {
  try {
    const payload = await requestJson<{ banners: Array<{ id: string; imageUrl: string; title: string }> }>('GET', '/home', undefined, { auth: false });
    const banners = payload.banners || [];
    if (banners.length) {
      return banners.slice(0, 3).map((b) => ({
        title: b.title || '',
        sub: '来自合作农场的当季好物',
        image: imageURL(b.imageUrl),
      }));
    }
  } catch {}
  return [
    { title: '产地直发，新鲜到家', sub: '严选全国优质农产品基地', image: '/assets/banners/banner1.jpg' },
    { title: '云认养农场', sub: '看得见的生长过程', image: '/assets/banners/banner2.jpg' },
  ];
}

// ====================== 收藏 ======================

export async function toggleFavorite(productId: string, source: string = 'houtai'): Promise<{ favorited: boolean }> {
  return requestJson('POST', '/products/favorites/toggle', { productId, source });
}

export async function fetchFavorites(): Promise<Product[]> {
  const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/products/favorites');
  return (payload.items || []).map(mapProduct);
}

// ====================== 地址 ======================

function mapAddress(raw: Record<string, unknown>): Address {
  return {
    id: toNum(raw.id, 0),
    name: String(raw.name || ''),
    phone: String(raw.phone || ''),
    province: String(raw.province || ''),
    city: String(raw.city || ''),
    district: String(raw.district || ''),
    detailAddress: String(raw.detail || raw.detailAddress || ''),
    isDefault: toNum(raw.isDefault, 0) === 1,
  };
}

export async function fetchAddresses(): Promise<Address[]> {
  const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/addresses');
  return (payload.items || []).map(mapAddress);
}

export async function createAddress(address: Omit<Address, 'id'>): Promise<Address> {
  const body: Record<string, unknown> = {
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detailAddress,
    isDefault: address.isDefault ? 1 : 0,
  };
  return mapAddress(await requestJson<Record<string, unknown>>('POST', '/addresses', body));
}

export async function updateAddress(address: Address): Promise<Address> {
  const { id, ...rest } = address;
  const body: Record<string, unknown> = {
    id,
    name: rest.name,
    phone: rest.phone,
    province: rest.province,
    city: rest.city,
    district: rest.district,
    detail: rest.detailAddress,
    isDefault: rest.isDefault ? 1 : 0,
  };
  return mapAddress(await requestJson<Record<string, unknown>>('PUT', `/addresses/${id}`, body));
}

export async function deleteAddress(addressId: number): Promise<void> {
  await requestJson('DELETE', `/addresses/${addressId}`);
}

// ====================== 购物车 ======================

interface CartViewRaw {
  groups: Array<{
    items: Array<Record<string, unknown> & { id: string; quantity: number; product: Record<string, unknown> }>;
  }>;
}

export async function fetchCart(): Promise<CartLine[]> {
  const payload = await requestJson<CartViewRaw>('GET', '/cart');
  const lines: CartLine[] = [];
  for (const group of payload.groups || []) {
    for (const item of group.items || []) {
      lines.push({
        cartId: toNum(item.id, 0),
        product: mapProduct(item.product || {}),
        quantity: toNum(item.quantity, 1),
        spec: String((item.product || {}).unit || '份'),
      });
    }
  }
  return lines;
}

export async function addCartItem(productId: string, quantity = 1, source: string = 'houtai'): Promise<void> {
  await requestJson('POST', '/cart/items', { productId, source, quantity }, { headers: { 'Idempotency-Key': idempotencyKey() } });
}

export async function updateCartItem(cartId: number, quantity: number): Promise<void> {
  await requestJson('PUT', `/cart/items/${cartId}`, { quantity });
}

export async function removeCartItem(cartId: number): Promise<void> {
  await requestJson('DELETE', `/cart/items/${cartId}`);
}

// ====================== 订单 ======================

function mapOrder(raw: Record<string, unknown>): OrderRecord {
  const items = (raw.items || []) as Record<string, unknown>[];
  return {
    id: toNum(raw.id, 0),
    orderNo: String(raw.orderNo || ''),
    status: (raw.status as OrderRecord['status']) || 'pending',
    totalAmount: fenToYuan(raw.totalAmountFen),
    freight: fenToYuan(raw.freightFen),
    address: raw.address ? mapAddress(raw.address as Record<string, unknown>) : ({} as Address),
    remark: '',
    items: items.map((it, idx) => ({
      id: idx,
      productId: toNum((it.product as any)?.id, 0),
      name: String(it.name || (it.product as any)?.name || ''),
      image: imageURL(it.image || (it.product as any)?.coverImage || ''),
      price: fenToYuan(it.priceFen),
      quantity: toNum(it.quantity, 1),
      subtotal: fenToYuan(it.subtotalFen),
    })),
    createdAt: String(raw.createdAt || ''),
    payTime: raw.paidAt ? String(raw.paidAt) : undefined,
  };
}

export async function createOrder(items: Array<{ productId: string; quantity: number; source?: string }>, addressId: number, remark = ''): Promise<{ orderId: number; orderNo: string; totalAmount: number }> {
  const body = {
    items: items.map((i) => ({ productId: i.productId, source: i.source || 'houtai', quantity: i.quantity })),
    addressId,
  };
  const payload = await requestJson<Record<string, unknown>>('POST', '/orders', body, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return {
    orderId: toNum(payload.id || payload.orderId, 0),
    orderNo: String(payload.orderNo || ''),
    totalAmount: fenToYuan(payload.totalAmountFen),
  };
}

export async function completeTestPayment(orderId: number, payMethod = 'wechat'): Promise<{ orderId: number; status: string }> {
  const payload = await requestJson<Record<string, unknown>>('POST', `/orders/${orderId}/test-pay`, { payMethod }, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { orderId, status: String(payload.status || 'paid') };
}

export async function fetchOrders(): Promise<OrderRecord[]> {
  const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/orders');
  return (payload.items || []).map(mapOrder);
}

// ====================== 云认养 ======================

export async function fetchAdoptionPackageData(): Promise<ApiDataResult<AdoptItem[]>> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/adoption/packages', undefined, { auth: false });
    const items = (payload.items || []).map((item, index) => ({
      id: toNum(item.id, index),
      name: String(item.name || ''),
      image: imageURL(item.images && Array.isArray(item.images) ? (item.images as string[])[0] : item.image) || '/assets/adopt/farm1.jpg',
      period: String(item.unit || '90天'),
      output: String(item.description || ''),
      progress: 0,
      left: toNum(item.stock, 0),
      stage: '待认养',
      price: fenToYuan(item.priceFen),
    }));
    return { value: items, source: 'real' };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { value: [], source: 'fallback', fallbackReason: '认养服务暂不可用' };
  }
}

export async function fetchAdoptionPackages(): Promise<AdoptItem[]> {
  return (await fetchAdoptionPackageData()).value;
}

// ---------- 消费者认养订单 ----------

export interface AdoptionGrowthRecord {
  id: string;
  content: string;
  images: string[];
  recordedAt: string;
  userName: string;
  growthPercent: number;
}

export interface AdoptionOrder {
  id: string;
  orderNo: string;
  packageId: string;
  productName: string;
  packageName: string;
  quantity: string;
  amountFen: number;
  amount: number;
  startDate: string;
  harvestDate: string;
  shipAddress: string;
  remark: string;
  status: string;
  statusText: string;
  growthPercent: number;
  growthStage: string;
  shipmentCompany: string;
  shipmentTrackingNo: string;
  growthRecords: AdoptionGrowthRecord[];
}

function mapAdoptionOrder(raw: Record<string, unknown>): AdoptionOrder {
  const records = (raw.growthRecords || []) as Record<string, unknown>[];
  return {
    id: String(raw.id || ''),
    orderNo: String(raw.orderNo || raw.adoptionNo || ''),
    packageId: String(raw.packageId || ''),
    productName: String(raw.productName || ''),
    packageName: String(raw.packageName || ''),
    quantity: String(raw.quantity || '1'),
    amountFen: toNum(raw.amountFen, 0),
    amount: fenToYuan(raw.amountFen),
    startDate: String(raw.startDate || ''),
    harvestDate: String(raw.harvestDate || ''),
    shipAddress: String(raw.shipAddress || ''),
    remark: String(raw.remark || ''),
    status: String(raw.status || 'growing'),
    statusText: String(raw.statusText || ''),
    growthPercent: toNum(raw.growthPercent, 0),
    growthStage: String(raw.growthStage || ''),
    shipmentCompany: String(raw.shipmentCompany || ''),
    shipmentTrackingNo: String(raw.shipmentTrackingNo || ''),
    growthRecords: records.map((r) => ({
      id: String(r.id || ''),
      content: String(r.content || ''),
      images: Array.isArray(r.images) ? r.images.map(String) : [],
      recordedAt: String(r.recordedAt || ''),
      userName: String(r.userName || ''),
      growthPercent: toNum(r.growthPercent, 0),
    })),
  };
}

export async function createAdoptionOrder(packageId: number, shipAddress: string, remark?: string): Promise<{ adoptionId: string; adoptionNo: string }> {
  const payload = await requestJson<{ adoptionId: string; adoptionNo: string }>('POST', '/adoption/orders', { packageId, shipAddress, remark: remark || '' }, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { adoptionId: String(payload?.adoptionId || ''), adoptionNo: String(payload?.adoptionNo || '') };
}

export async function fetchAdoptionOrders(): Promise<AdoptionOrder[]> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/adoption/orders?page=1&pageSize=50');
    return (payload.items || []).map(mapAdoptionOrder);
  } catch {
    return [];
  }
}

export async function fetchAdoptionOrderDetail(id: string): Promise<AdoptionOrder | null> {
  try {
    const payload = await requestJson<Record<string, unknown>>('GET', `/adoption/orders/${id}`);
    return mapAdoptionOrder(payload);
  } catch {
    return null;
  }
}

// ---------- 农户视角认养订单 ----------

export interface FarmerAdoptionOrder {
  id: number;
  icon: string;
  bg: string;
  productName: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  quantity: string;
  amount: string;
  startDate: string;
  harvestDate: string;
  shipAddress: string;
  remark: string;
  statusKey: string;
  statusText: string;
  growthPercent: number;
  growthStage: string;
  canShip: boolean;
}

export interface FarmerAdoptionList {
  totalOrders: number;
  totalIncome: string;
  fansCount: number;
  categorySummary: Array<{ icon: string; name: string; count: number }>;
  orders: FarmerAdoptionOrder[];
}

export async function fetchFarmerAdoptionOrders(): Promise<FarmerAdoptionList> {
  try {
    const payload = await requestJson<Record<string, unknown>>('GET', '/adoption/farmer/orders');
    const orders = (payload.orders || []) as Record<string, unknown>[];
    const cats = (payload.categorySummary || []) as Record<string, unknown>[];
    return {
      totalOrders: toNum(payload.totalOrders, 0),
      totalIncome: String(payload.totalIncome || '0'),
      fansCount: toNum(payload.fansCount, 0),
      categorySummary: cats.map((c) => ({ icon: String(c.icon || ''), name: String(c.name || ''), count: toNum(c.count, 0) })),
      orders: orders.map((o) => ({
        id: toNum(o.id, 0),
        icon: String(o.icon || '🌱'),
        bg: String(o.bgColor || '#E8F5E9'),
        productName: String(o.productName || ''),
        packageName: String(o.packageName || ''),
        customerName: String(o.customerName || ''),
        customerPhone: String(o.customerPhone || ''),
        quantity: String(o.quantity || ''),
        amount: String(o.amount || '0'),
        startDate: String(o.startDate || ''),
        harvestDate: String(o.harvestDate || ''),
        shipAddress: String(o.shipAddress || ''),
        remark: String(o.remark || ''),
        statusKey: String(o.statusKey || 'growing'),
        statusText: String(o.statusText || ''),
        growthPercent: toNum(o.growthPercent, 0),
        growthStage: String(o.growthStage || ''),
        canShip: o.canShip === true,
      })),
    };
  } catch {
    return { totalOrders: 0, totalIncome: '0', fansCount: 0, categorySummary: [], orders: [] };
  }
}

export async function shipFarmerAdoptionOrder(orderId: number, company: string, trackingNo: string): Promise<void> {
  await requestJson('POST', `/adoption/${orderId}/ship`, { company, trackingNo }, { headers: { 'Idempotency-Key': idempotencyKey() } });
}

// ====================== 溯源 ======================

export interface TraceQuery {
  source: ApiDataSource;
  record: Record<string, unknown> | null;
  events: TraceStep[];
  fallbackReason?: string;
}

export async function queryTrace(batchNo: string): Promise<TraceQuery> {
  try {
    // 后端返回 TraceQueryResult: { code, batchNo, harvestTime, product, farmer, records[] }
    const payload = await requestJson<Record<string, any>>('GET', `/trace/query?code=${encodeURIComponent(batchNo)}`, undefined, { auth: false });
    const records = Array.isArray(payload.records) ? payload.records : [];
    const events: TraceStep[] = records.map((e: Record<string, any>) => ({
      stage: String(e.stage || e.operator || '已记录'),
      time: String(e.recordedAt || ''),
      desc: String(e.description || ''),
    }));
    return { source: 'real', record: payload, events };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { source: 'unavailable', record: null, events: [], fallbackReason: '溯源验真服务暂不可用' };
  }
}

export async function fetchTraceRecords(): Promise<TraceStep[]> {
  return [];
}

// ====================== 社区 / 农事 ======================

export async function fetchPosts(): Promise<PostItem[]> {
  try {
    const payload = await requestJson<{ list: Record<string, unknown>[] }>('GET', '/community/posts?page=1&pageSize=10', undefined, { auth: false });
    return (payload.list || []).map((p) => ({
      id: toNum(p.id, 0),
      author: String(p.userName || p.user_name || '农户'),
      title: String(p.content || '').slice(0, 50),
      tag: '种植日记',
    }));
  } catch {
    return [];
  }
}

export async function fetchTasks(): Promise<TaskItem[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/farmer/tasks?page=1&pageSize=10');
    return (Array.isArray(payload) ? payload : []).map((t) => ({
      id: toNum(t.id, 0),
      name: String(t.name || ''),
      time: String(t.scheduledAt || t.scheduled_at || '').slice(11, 16) || '08:00',
      type: String(t.taskType || '记录'),
      done: t.status === 'completed',
    }));
  } catch {
    return [];
  }
}

// ====================== AI ======================

export async function askAi(question: string, role: AiRole): Promise<string> {
  const payload = await requestJson<{ reply: string }>('POST', '/ai/chat', { content: question, role });
  const reply = String(payload?.reply || '').trim();
  if (!reply) throw new Error('AI 返回了空响应');
  return reply;
}

export interface DiseaseAnalysis {
  name: string;
  severity: string;
  advice: string;
  raw: string;
}

export async function analyzeDisease(crop: string, symptoms: string): Promise<DiseaseAnalysis> {
  const payload = await requestJson<DiseaseAnalysis>('POST', '/ai/disease-analyze', { crop, symptoms });
  return {
    name: String(payload?.name || '疑似病虫害'),
    severity: String(payload?.severity || ''),
    advice: String(payload?.advice || ''),
    raw: String(payload?.raw || ''),
  };
}

// ====================== 农户端 ======================

// ---------- 作物 ----------

export interface FarmerCrop {
  id: number;
  name: string;
  icon: string;
  category: string;
  status: string;
  statusText: string;
  progress: number;
  color: string;
  plantDate: string;
  expectHarvest: string;
  area: string;
  healthStatus: string;
  greenhouse: string;
  daysToHarvest: number;
}

function mapCrop(raw: Record<string, unknown>): FarmerCrop {
  const status = String(raw.status || 'growing');
  const statusText = status === 'growing' ? '生长中' : status === 'mature' ? '待采收' : '需关注';
  const health = String(raw.healthStatus || '良好');
  return {
    id: toNum(raw.id, 0),
    name: String(raw.name || ''),
    icon: String(raw.icon || '🌱'),
    category: String(raw.category || ''),
    status,
    statusText: String(raw.statusText || statusText),
    progress: toNum(raw.progress, 0),
    color: String(raw.color || '#43A047'),
    plantDate: String(raw.plantDate || ''),
    expectHarvest: String(raw.expectHarvest || ''),
    area: String(raw.area || ''),
    healthStatus: health,
    greenhouse: String(raw.greenhouse || ''),
    daysToHarvest: toNum(raw.daysToHarvest, 0),
  };
}

export async function fetchFarmerCrops(): Promise<FarmerCrop[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/farmer/crops');
    return (Array.isArray(payload) ? payload : []).map(mapCrop);
  } catch {
    return [];
  }
}

// ---------- 农事任务 ----------

export interface FarmTask {
  id: number;
  name: string;
  time: string;
  type: string;
  typeLabel: string;
  completed: boolean;
  cropId: number;
  cropName: string;
  taskDate: string;
}

function mapFarmTask(raw: Record<string, unknown>): FarmTask {
  return {
    id: toNum(raw.id, 0),
    name: String(raw.name || ''),
    time: String(raw.time || ''),
    type: String(raw.type || ''),
    typeLabel: String(raw.typeLabel || ''),
    completed: raw.completed === true,
    cropId: toNum(raw.cropId, 0),
    cropName: String(raw.cropName || ''),
    taskDate: String(raw.taskDate || ''),
  };
}

export async function fetchFarmTasks(date?: string): Promise<FarmTask[]> {
  try {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    const payload = await requestJson<Record<string, unknown>[]>('GET', `/farmer/tasks${q}`);
    return (Array.isArray(payload) ? payload : []).map(mapFarmTask);
  } catch {
    return [];
  }
}

export async function createFarmTask(task: { cropId?: number; taskDate?: string; name: string; time?: string; type?: string }): Promise<void> {
  await requestJson('POST', '/farmer/tasks', { cropId: task.cropId, taskDate: task.taskDate, name: task.name, time: task.time, type: task.type });
}

export async function completeFarmTask(id: number, completed: boolean): Promise<void> {
  await requestJson('PUT', `/farmer/tasks/${id}/complete`, { completed });
}

export async function deleteFarmTask(id: number): Promise<void> {
  await requestJson('DELETE', `/farmer/tasks/${id}`);
}

// ---------- 环境监测 ----------

export interface EnvironmentStation {
  id: number;
  name: string;
  icon: string;
  location: string;
  statusText: string;
  isOnline: boolean;
  sensorCount: number;
  cameraCount: number;
  coverImage: string;
}

export interface EnvironmentDevice {
  id: number;
  type: string;
  name: string;
  icon: string;
  on: boolean;
  runningState: string;
  auto: boolean;
}

export interface EnvironmentAlert {
  id: number;
  title: string;
  desc: string;
  level: string;
  levelText: string;
  time: string;
  source: string;
  icon: string;
}

/** 环境模块 icon 短名归一化：后端返回 "fan"/"temp" 等短名 → /assets/icons/icon-*.png */
function envIcon(raw: string, fallback = '/assets/icons/settings.png'): string {
  const v = String(raw || '').trim();
  if (!v) return fallback;
  if (v.startsWith('/') || v.startsWith('http')) return v;
  if (v === 'station') return '/assets/icons/icon-location.png';
  if (v === 'heat') return '/assets/icons/icon-flame.png';
  if (v === 'humid') return '/assets/icons/icon-humidifier.png';
  return `/assets/icons/icon-${v}.png`;
}

export async function fetchEnvironmentStations(): Promise<EnvironmentStation[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/farmer/environment/stations');
    return (Array.isArray(payload) ? payload : []).map((s) => ({
      id: toNum(s.id, 0),
      name: String(s.name || ''),
      icon: envIcon(String(s.icon || ''), '/assets/icons/icon-location.png'),
      location: String(s.location || ''),
      statusText: String(s.statusText || ''),
      isOnline: s.isOnline === true,
      sensorCount: toNum(s.sensorCount, 0),
      cameraCount: toNum(s.cameraCount, 0),
      coverImage: imageURL(s.coverImage),
    }));
  } catch {
    return [];
  }
}

export async function createEnvironmentStation(name: string, location = ''): Promise<EnvironmentStation> {
  const p = await requestJson<Record<string, unknown>>('POST', '/farmer/environment/stations', { name, location }, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return {
    id: toNum(p.id, 0),
    name: String(p.name || ''),
    icon: '/assets/icons/icon-location.png',
    location: String(p.location || ''),
    statusText: String(p.statusText || '离线'),
    isOnline: p.isOnline === true,
    sensorCount: toNum(p.sensorCount, 0),
    cameraCount: toNum(p.cameraCount, 0),
    coverImage: imageURL(p.coverImage),
  };
}

export async function fetchEnvironmentDevices(stationId: number): Promise<EnvironmentDevice[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', `/farmer/environment/stations/${stationId}/devices`);
    return (Array.isArray(payload) ? payload : []).map((d) => ({
      id: toNum(d.id, 0),
      type: String(d.type || ''),
      name: String(d.name || ''),
      icon: envIcon(String(d.icon || '')),
      on: d.on === true,
      runningState: String(d.runningState || ''),
      auto: d.auto === true,
    }));
  } catch {
    return [];
  }
}

export async function fetchEnvironmentAlerts(stationId: number): Promise<EnvironmentAlert[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', `/farmer/environment/stations/${stationId}/alerts`);
    return (Array.isArray(payload) ? payload : []).map((a) => ({
      id: toNum(a.id, 0),
      title: String(a.title || ''),
      desc: String(a.desc || ''),
      level: String(a.level || ''),
      levelText: String(a.levelText || ''),
      time: String(a.time || ''),
      source: String(a.source || ''),
      icon: envIcon(String(a.icon || ''), '/assets/icons/icon-announce.png'),
    }));
  } catch {
    return [];
  }
}

export async function toggleEnvironmentDevice(id: number, on: boolean): Promise<void> {
  await requestJson('PUT', `/farmer/environment/devices/${id}/toggle`, { on });
}

// ---------- 设备 ----------

export interface FarmerDevice {
  id: number;
  name: string;
  location: string;
  lastSeen: string;
  isOnline: boolean;
  isEnabled: boolean;
  type: string;
}

export async function fetchFarmerDevices(): Promise<{ stations: FarmerDevice[]; cameras: FarmerDevice[] }> {
  try {
    const payload = await requestJson<{ stations: Record<string, unknown>[]; cameras: Record<string, unknown>[] }>('GET', '/farmer/devices');
    const map = (arr: Record<string, unknown>[]): FarmerDevice[] => (arr || []).map((d) => ({
      id: toNum(d.id, 0),
      name: String(d.name || ''),
      location: String(d.location || ''),
      lastSeen: String(d.lastSeen || ''),
      isOnline: d.isOnline === true,
      isEnabled: d.isEnabled === true,
      type: String(d.type || ''),
    }));
    return { stations: map(payload.stations), cameras: map(payload.cameras) };
  } catch {
    return { stations: [], cameras: [] };
  }
}

export async function setFarmerDeviceEnabled(id: number, enabled: boolean): Promise<void> {
  await requestJson('PUT', `/farmer/devices/${id}/enabled`, { enabled });
}

// ---------- 农户商品 ----------

export interface FarmerProduct {
  id: string;
  name: string;
  price: number;
  priceText: string;
  unit: string;
  sales: number;
  status: number;
  statusText: string;
  image: string;
  stock: number;
  lat?: number;
  lng?: number;
  rejectReason?: string;
  auditedAt?: string;
}

function mapFarmerProduct(raw: Record<string, unknown>): FarmerProduct {
  const status = toNum(raw.status, 0);
  const statusText = status === 1 ? '在售' : status === 2 ? '待审核' : status === 3 ? '驳回' : '已下架';
  const images = parseImages(raw.images);
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    price: fenToYuan(raw.priceFen),
    priceText: yuanText(raw.priceFen),
    unit: String(raw.unit || '份'),
    sales: toNum(raw.salesCount, 0),
    status,
    statusText: String(raw.statusText || statusText),
    image: images[0] ? images[0].url : imageURL(raw.image),
    stock: toNum(raw.stock, 0),
    lat: typeof raw.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' ? raw.lng : undefined,
    rejectReason: raw.rejectReason == null ? undefined : String(raw.rejectReason),
    auditedAt: raw.auditedAt == null ? undefined : String(raw.auditedAt),
  };
}

export async function fetchFarmerProducts(): Promise<FarmerProduct[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/farmer/products');
    return (Array.isArray(payload) ? payload : []).map(mapFarmerProduct);
  } catch {
    return [];
  }
}

export async function createFarmerProduct(product: { name: string; priceFen: number; description?: string; unit?: string; stock?: number; status?: number; origin?: string; categoryId?: string; images?: string[]; lat?: number; lng?: number }): Promise<void> {
  await requestJson('POST', '/farmer/products', {
    name: product.name,
    priceFen: product.priceFen,
    description: product.description || '',
    unit: product.unit || '份',
    stock: product.stock ?? 0,
    status: product.status ?? 2,
    origin: product.origin || '',
    categoryId: product.categoryId || '蔬菜',
    images: product.images || [],
    lat: product.lat,
    lng: product.lng,
  });
}

export async function submitFarmerProduct(id: string): Promise<void> {
  await requestJson('POST', `/farmer/products/${id}/submit`, {}, { headers: { 'Idempotency-Key': idempotencyKey() } });
}

export async function offShelfFarmerProduct(id: string): Promise<void> {
  await requestJson('POST', `/farmer/products/${id}/off-shelf`, {}, { headers: { 'Idempotency-Key': idempotencyKey() } });
}

// ---------- 农户订单 ----------

export interface FarmerOrder {
  id: number;
  orderNo: string;
  status: string;
  statusText: string;
  totalAmount: number;
  items: Array<{ name: string; image: string; quantity: number; priceFen: number }>;
  createdAt: string;
}

function mapFarmerOrder(raw: Record<string, unknown>): FarmerOrder {
  const items = (raw.items || []) as Record<string, unknown>[];
  return {
    id: toNum(raw.id, 0),
    orderNo: String(raw.orderNo || ''),
    status: String(raw.status || 'pending'),
    statusText: String(raw.statusText || ''),
    totalAmount: fenToYuan(raw.totalAmountFen),
    items: items.map((it) => ({
      name: String(it.name || ''),
      image: imageURL(it.image || ''),
      quantity: toNum(it.quantity, 1),
      priceFen: toNum(it.priceFen, 0),
    })),
    createdAt: String(raw.createdAt || ''),
  };
}

export async function fetchFarmerOrders(): Promise<FarmerOrder[]> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/farmer/orders?page=1&pageSize=50');
    return (payload.items || []).map(mapFarmerOrder);
  } catch {
    return [];
  }
}

export async function shipFarmerOrder(orderId: number, company: string, trackingNo: string): Promise<void> {
  const key = idempotencyKey();
  await requestJson('POST', `/farmer/orders/${orderId}/ship`, { company, trackingNo }, { headers: { 'Idempotency-Key': key } });
}

// ---------- 预警 ----------

export interface FarmerWarning {
  id: number;
  cat: string;
  icon: string;
  title: string;
  desc: string;
  level: string;
  levelText: string;
  time: string;
  read: boolean;
}

function mapWarning(raw: Record<string, unknown>): FarmerWarning {
  const level = String(raw.level || 'yellow');
  return {
    id: toNum(raw.id, 0),
    cat: String(raw.category || raw.cat || 'crop'),
    icon: String(raw.icon || ''),
    title: String(raw.title || ''),
    desc: String(raw.desc || ''),
    level,
    levelText: String(raw.levelText || ''),
    time: String(raw.time || ''),
    read: raw.read === true || raw.read === '1',
  };
}

export async function fetchFarmerWarnings(): Promise<FarmerWarning[]> {
  try {
    const [weather, device, crop] = await Promise.all([
      requestJson<{ list: Record<string, unknown>[] }>('GET', '/warnings/weather').catch(() => ({ list: [] })),
      requestJson<{ list: Record<string, unknown>[] }>('GET', '/warnings/device').catch(() => ({ list: [] })),
      requestJson<{ list: Record<string, unknown>[] }>('GET', '/warnings/crop').catch(() => ({ list: [] })),
    ]);
    const all = [
      ...(weather.list || []).map((w) => ({ ...w, category: 'weather' })),
      ...(device.list || []).map((w) => ({ ...w, category: 'device' })),
      ...(crop.list || []).map((w) => ({ ...w, category: 'crop' })),
    ];
    return all.map(mapWarning);
  } catch {
    return [];
  }
}

// ---------- 天气 ----------

export interface WeatherInfo {
  temp: string;
  desc: string;
  humidity: string;
  wind: string;
  location: string;
  advice: string;
  icon: string;
  forecast: Array<{ date: string; weather: string; tempLow: string; tempHigh: string; icon: string }>;
}

export async function fetchWeather(): Promise<WeatherInfo | null> {
  try {
    const raw = await requestJson<Record<string, unknown>>('GET', '/weather/current', undefined, { auth: false });
    return {
      temp: String(raw.temp || '--'),
      desc: String(raw.desc || ''),
      humidity: String(raw.humidity || ''),
      wind: String(raw.wind || ''),
      location: String(raw.location || ''),
      advice: String(raw.advice || ''),
      icon: String(raw.icon || 'sunny'),
      forecast: Array.isArray(raw.forecast) ? (raw.forecast as Record<string, unknown>[]).map((f) => ({
        date: String(f.date || ''),
        weather: String(f.weather || ''),
        tempLow: String(f.tempLow || ''),
        tempHigh: String(f.tempHigh || ''),
        icon: String(f.icon || ''),
      })) : [],
    };
  } catch {
    return null;
  }
}

// ---------- 社区 ----------

export interface CommunityPost {
  id: number;
  userName: string;
  levelText: string;
  location: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  views: number;
  liked: boolean;
}

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const payload = await requestJson<{ list: Record<string, unknown>[] }>('GET', '/community/posts?page=1&pageSize=20', undefined, { auth: false });
    return (payload.list || []).map((p) => ({
      id: toNum(p.id, 0),
      userName: String(p.userName || '农户'),
      levelText: String(p.levelText || ''),
      location: String(p.location || ''),
      time: String(p.time || ''),
      content: String(p.content || ''),
      likes: toNum(p.likes, 0),
      comments: toNum(p.comments, 0),
      views: toNum(p.views, 0),
      liked: p.liked === true,
    }));
  } catch {
    return [];
  }
}

export async function createCommunityPost(content: string, location?: string): Promise<void> {
  await requestJson('POST', '/community/posts', { content, images: [], location: location || '' });
}

export async function likeCommunityPost(id: number, liked: boolean): Promise<void> {
  await requestJson('PUT', `/community/posts/${id}/like`, { liked });
}

// ---------- 技术支持 ----------

export interface TechSupportExpert {
  id: number;
  name: string;
  title: string;
  organization: string;
  fields: string[];
  rating: string;
  consultCount: number;
  isOnline: boolean;
  tagText: string;
}

export async function fetchTechExperts(): Promise<TechSupportExpert[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/tech-support/experts');
    return (Array.isArray(payload) ? payload : []).map((e) => ({
      id: toNum(e.id, 0),
      name: String(e.name || ''),
      title: String(e.title || ''),
      organization: String(e.organization || ''),
      fields: Array.isArray(e.fields) ? e.fields.map(String) : [],
      rating: String(e.rating || ''),
      consultCount: toNum(e.consultCount, 0),
      isOnline: e.isOnline === true,
      tagText: String(e.tagText || ''),
    }));
  } catch {
    return [];
  }
}

// ====================== 站内消息 ======================

export interface Conversation {
  id: string;
  peerType: string;
  peerName: string;
  peerAvatar: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'peer';
  content: string;
  createdAt: string;
}

export async function fetchConversations(): Promise<{ items: Conversation[]; unreadCount: number }> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[]; unreadCount: number }>('GET', '/messages/conversations');
    return {
      unreadCount: toNum(payload.unreadCount, 0),
      items: (payload.items || []).map((c) => ({
        id: String(c.id || ''),
        peerType: String(c.peerType || ''),
        peerName: String(c.peerName || c.title || ''),
        peerAvatar: imageURL(c.peerAvatar || c.avatar),
        lastMessage: String(c.lastMessage || ''),
        lastAt: String(c.lastAt || c.lastMessageAt || ''),
        unreadCount: toNum(c.unreadCount, 0),
      })),
    };
  } catch {
    return { items: [], unreadCount: 0 };
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', `/messages/conversations/${conversationId}/messages`);
    return (payload.items || []).map((m) => ({
      id: String(m.id || ''),
      sender: m.sender === 'user' ? 'user' : 'peer',
      content: String(m.content || ''),
      createdAt: String(m.createdAt || ''),
    }));
  } catch {
    return [];
  }
}

export async function sendConversationMessage(conversationId: string, content: string): Promise<{ user: ChatMessage; reply: ChatMessage | null }> {
  const payload = await requestJson<{ userMessage: Record<string, unknown>; reply: Record<string, unknown> | null }>('POST', `/messages/conversations/${conversationId}/messages`, { content });
  const mapMsg = (m: Record<string, unknown> | null | undefined): ChatMessage | null => (m ? { id: String(m.id || ''), sender: m.sender === 'user' ? 'user' : 'peer', content: String(m.content || ''), createdAt: String(m.createdAt || '') } : null);
  return { user: mapMsg(payload?.userMessage) || { id: '', sender: 'user', content, createdAt: '' }, reply: mapMsg(payload?.reply) };
}

export async function createConversation(peerType: string, peerId?: string, peerName?: string): Promise<Conversation> {
  const payload = await requestJson<Record<string, unknown>>('POST', '/messages/conversations', { peerType, peerId: peerId || '', peerName: peerName || '', title: peerName || '' });
  return {
    id: String(payload.id || ''),
    peerType: String(payload.peerType || peerType),
    peerName: String(payload.peerName || payload.title || peerName || ''),
    peerAvatar: imageURL(payload.peerAvatar || payload.avatar),
    lastMessage: '',
    lastAt: '',
    unreadCount: 0,
  };
}

// ====================== 在线客服 ======================

export interface SupportMessage {
  id: string;
  role: 'user' | 'support';
  content: string;
  createdAt: string;
}

export async function fetchSupportHistory(): Promise<SupportMessage[]> {
  try {
    const payload = await requestJson<{ items: Record<string, unknown>[] }>('GET', '/support/chat/messages');
    return (payload.items || []).map((m) => ({
      id: String(m.id || ''),
      role: m.role === 'support' ? 'support' : 'user',
      content: String(m.content || ''),
      createdAt: String(m.createdAt || ''),
    }));
  } catch {
    return [];
  }
}

export async function sendSupportMessage(content: string): Promise<{ user: SupportMessage; reply: SupportMessage | null }> {
  const payload = await requestJson<{ userMessage: Record<string, unknown>; reply: Record<string, unknown> | null }>('POST', '/support/chat/messages', { content });
  const mapMsg = (m: Record<string, unknown> | null | undefined): SupportMessage | null => (m ? { id: String(m.id || ''), role: m.role === 'support' ? 'support' : 'user', content: String(m.content || ''), createdAt: String(m.createdAt || '') } : null);
  return { user: mapMsg(payload?.userMessage) || { id: '', role: 'user', content, createdAt: '' }, reply: mapMsg(payload?.reply) };
}

// ====================== 技术支持（工单/预约/专家/联系平台） ======================

export interface DeviceTypeOption { id: string; name: string; icon: string; desc: string; }
export interface DroneServiceOption { id: string; title: string; subtitle: string; icon: string; colorTheme: string; features: string[]; price: string; note: string; }
export interface MachineTypeOption { id: string; name: string; icon: string; color: string; models: Record<string, unknown>[]; price: string; note: string; }
export interface TechContactInfo { phone: string; phoneDisplay: string; workTime: string; wechatService: boolean; onlineService: boolean; address: string; }

export interface TechRepair { id: number; repairNo: string; deviceTypeName: string; faultType: string; description: string; status: string; statusText: string; createdAt: string; }
export interface TechBooking { id: number; bookingNo: string; serviceType: string; serviceName: string; bookDate: string; area: string; contactName: string; contactPhone: string; address: string; remark: string; status: string; statusText: string; createdAt: string; }
export interface TechConsult { id: number; expertId: number; expertName: string; status: string; statusText: string; createdAt: string; }

export interface PagedList<T> { list: T[]; total: number; page: number; pageSize: number; hasMore?: boolean; }
export interface PagedItems<T> { items: T[]; total: number; page: number; pageSize: number; }

export async function fetchDeviceTypes(): Promise<DeviceTypeOption[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/tech-support/device-types');
    return (Array.isArray(payload) ? payload : []).map((d) => ({
      id: String(d.id || ''), name: String(d.name || ''), icon: String(d.icon || ''), desc: String(d.desc || ''),
    }));
  } catch { return []; }
}

export async function fetchFaultOptions(): Promise<string[]> {
  try { return await requestJson<string[]>('GET', '/tech-support/fault-options'); } catch { return []; }
}

export async function createDeviceRepair(req: { deviceTypeId: string; deviceTypeName: string; faultType: string; description: string; images?: string[] }): Promise<TechRepair> {
  const payload = await requestJson<Record<string, unknown>>('POST', '/tech-support/device-repair', req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { id: toNum(payload.id), repairNo: String(payload.repairNo || ''), deviceTypeName: String(payload.deviceTypeName || ''), faultType: String(payload.faultType || ''), description: String(payload.description || ''), status: String(payload.status || ''), statusText: String(payload.statusText || ''), createdAt: String(payload.createdAt || '') };
}

export async function fetchRepairs(page = 1, pageSize = 10): Promise<PagedList<TechRepair>> {
  try {
    const payload = await requestJson<{ list?: Record<string, unknown>[]; total?: number; page?: number; pageSize?: number; hasMore?: boolean }>('GET', `/tech-support/repairs?page=${page}&pageSize=${pageSize}`);
    return { list: (payload.list || []).map((r) => ({ id: toNum(r.id), repairNo: String(r.repairNo || ''), deviceTypeName: String(r.deviceTypeName || ''), faultType: String(r.faultType || ''), description: String(r.description || ''), status: String(r.status || ''), statusText: String(r.statusText || ''), createdAt: String(r.createdAt || '') })), total: toNum(payload.total), page: toNum(payload.page, page), pageSize: toNum(payload.pageSize, pageSize), hasMore: payload.hasMore === true };
  } catch { return { list: [], total: 0, page, pageSize }; }
}

export async function fetchDroneServices(): Promise<DroneServiceOption[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/tech-support/drone-services');
    return (Array.isArray(payload) ? payload : []).map((d) => ({ id: String(d.id || ''), title: String(d.title || ''), subtitle: String(d.subtitle || ''), icon: String(d.icon || ''), colorTheme: String(d.colorTheme || ''), features: Array.isArray(d.features) ? d.features.map(String) : [], price: String(d.price || ''), note: String(d.note || '') }));
  } catch { return []; }
}

export async function bookDroneService(req: { serviceId: string; bookDate: string; area: string; contactName: string; contactPhone: string; address: string; remark?: string }): Promise<TechBooking> {
  const payload = await requestJson<Record<string, unknown>>('POST', '/tech-support/drone/book', req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { id: toNum(payload.id), bookingNo: String(payload.bookingNo || ''), serviceType: String(payload.serviceType || ''), serviceName: String(payload.serviceName || ''), bookDate: String(payload.bookDate || ''), area: String(payload.area || ''), contactName: String(payload.contactName || ''), contactPhone: String(payload.contactPhone || ''), address: String(payload.address || ''), remark: String(payload.remark || ''), status: String(payload.status || ''), statusText: String(payload.statusText || ''), createdAt: String(payload.createdAt || '') };
}

export async function fetchMachineTypes(): Promise<MachineTypeOption[]> {
  try {
    const payload = await requestJson<Record<string, unknown>[]>('GET', '/tech-support/machine-types');
    return (Array.isArray(payload) ? payload : []).map((m) => ({ id: String(m.id || ''), name: String(m.name || ''), icon: String(m.icon || ''), color: String(m.color || ''), models: Array.isArray(m.models) ? m.models.map((x) => (x as Record<string, unknown>)) : [], price: String(m.price || ''), note: String(m.note || '') }));
  } catch { return []; }
}

export async function bookMachineService(req: { serviceId: string; bookDate: string; area: string; contactName: string; contactPhone: string; address: string; remark?: string }): Promise<TechBooking> {
  const payload = await requestJson<Record<string, unknown>>('POST', '/tech-support/machine/book', req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { id: toNum(payload.id), bookingNo: String(payload.bookingNo || ''), serviceType: String(payload.serviceType || ''), serviceName: String(payload.serviceName || ''), bookDate: String(payload.bookDate || ''), area: String(payload.area || ''), contactName: String(payload.contactName || ''), contactPhone: String(payload.contactPhone || ''), address: String(payload.address || ''), remark: String(payload.remark || ''), status: String(payload.status || ''), statusText: String(payload.statusText || ''), createdAt: String(payload.createdAt || '') };
}

export async function fetchBookings(page = 1, pageSize = 10): Promise<PagedList<TechBooking>> {
  try {
    const payload = await requestJson<{ list?: Record<string, unknown>[]; total?: number; page?: number; pageSize?: number; hasMore?: boolean }>('GET', `/tech-support/bookings?page=${page}&pageSize=${pageSize}`);
    return { list: (payload.list || []).map((b) => ({ id: toNum(b.id), bookingNo: String(b.bookingNo || ''), serviceType: String(b.serviceType || ''), serviceName: String(b.serviceName || ''), bookDate: String(b.bookDate || ''), area: String(b.area || ''), contactName: String(b.contactName || ''), contactPhone: String(b.contactPhone || ''), address: String(b.address || ''), remark: String(b.remark || ''), status: String(b.status || ''), statusText: String(b.statusText || ''), createdAt: String(b.createdAt || '') })), total: toNum(payload.total), page: toNum(payload.page, page), pageSize: toNum(payload.pageSize, pageSize), hasMore: payload.hasMore === true };
  } catch { return { list: [], total: 0, page, pageSize }; }
}

export async function consultExpert(req: { expertId: number; question: string; contactPhone?: string }): Promise<TechConsult> {
  const payload = await requestJson<Record<string, unknown>>('POST', '/tech-support/expert/consult', req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { id: toNum(payload.id), expertId: toNum(payload.expertId), expertName: String(payload.expertName || ''), status: String(payload.status || ''), statusText: String(payload.statusText || ''), createdAt: String(payload.createdAt || '') };
}

export async function fetchTechContact(): Promise<TechContactInfo> {
  try {
    const payload = await requestJson<Record<string, unknown>>('GET', '/tech-support/contact');
    return { phone: String(payload.phone || ''), phoneDisplay: String(payload.phoneDisplay || ''), workTime: String(payload.workTime || ''), wechatService: payload.wechatService === true, onlineService: payload.onlineService === true, address: String(payload.address || '') };
  } catch { return { phone: '', phoneDisplay: '', workTime: '', wechatService: false, onlineService: false, address: '' }; }
}

// ====================== 会员中心（积分/等级/签到） ======================

export interface MemberPrivilege { level: number; name: string; minPoints: number; discount: string; freeShipping: boolean; description: string; code: string; title: string; desc: string; icon: string; }
export interface MemberPromotion { id: string; title: string; subtitle: string; tag: string; image: string; minLevel: number; desc: string; startAt: string; endAt: string; imageUrl: string; }
export interface MemberSummary { points: number; memberLevel: number; memberLevelName: string; level: number; levelName: string; nextLevelPoints: number; progressPercent: number; minPoints: number; nextLevel: number | null; nextLevelName: string; pointsToNext: number; checkedInToday: boolean; privileges: MemberPrivilege[]; promotions: MemberPromotion[]; activities: MemberPromotion[]; }
export interface PointsRecord { id: string; type: string; amount: number; delta: number; balance: number; reason: string; refType: string; createdAt: string; }
export interface CheckinResult { awarded: boolean; points: number; totalPoints: number; message: string; }

export async function fetchMemberSummary(): Promise<MemberSummary | null> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', '/member/summary');
    const mapPromo = (a: unknown): MemberPromotion[] => (Array.isArray(a) ? a.map((x) => (x as Record<string, unknown>)).map((m) => ({ id: String(m.id || ''), title: String(m.title || ''), subtitle: String(m.subtitle || ''), tag: String(m.tag || ''), image: String(m.image || ''), minLevel: toNum(m.minLevel), desc: String(m.desc ?? ''), startAt: String(m.startAt ?? ''), endAt: String(m.endAt ?? ''), imageUrl: String(m.imageUrl ?? '') })) : []);
    const mapPriv = (a: unknown): MemberPrivilege[] => (Array.isArray(a) ? a.map((x) => (x as Record<string, unknown>)).map((m) => ({ level: toNum(m.level), name: String(m.name || ''), minPoints: toNum(m.minPoints), discount: String(m.discount || ''), freeShipping: m.freeShipping === true, description: String(m.description || ''), code: String(m.code || ''), title: String(m.title || ''), desc: String(m.desc || ''), icon: String(m.icon || '') })) : []);
    return {
      points: toNum(p.points), memberLevel: toNum(p.memberLevel), memberLevelName: String(p.memberLevelName || p.levelName || ''),
      level: toNum(p.level), levelName: String(p.levelName || p.memberLevelName || ''), nextLevelPoints: toNum(p.nextLevelPoints),
      progressPercent: toNum(p.progressPercent), minPoints: toNum(p.minPoints),
      nextLevel: p.nextLevel == null ? null : toNum(p.nextLevel), nextLevelName: String(p.nextLevelName || ''), pointsToNext: toNum(p.pointsToNext),
      checkedInToday: p.checkedInToday === true, privileges: mapPriv(p.privileges), promotions: mapPromo(p.promotions || p.activities), activities: mapPromo(p.activities || p.promotions),
    };
  } catch { return null; }
}

export async function checkinMember(): Promise<CheckinResult> {
  const p = await requestJson<Record<string, unknown>>('POST', '/member/checkin');
  return { awarded: p.awarded === true, points: toNum(p.points), totalPoints: toNum(p.totalPoints), message: String(p.message || '') };
}

export async function fetchPointsRecords(page = 1, pageSize = 20): Promise<PagedItems<PointsRecord>> {
  try {
    const p = await requestJson<{ items?: Record<string, unknown>[]; total?: number; page?: number; pageSize?: number }>('GET', `/member/points/records?page=${page}&pageSize=${pageSize}`);
    return { items: (p.items || []).map((r) => ({ id: String(r.id || ''), type: String(r.type || ''), amount: toNum(r.amount), delta: toNum(r.delta), balance: toNum(r.balance), reason: String(r.reason || ''), refType: String(r.refType || ''), createdAt: String(r.createdAt || '') })), total: toNum(p.total), page: toNum(p.page, page), pageSize: toNum(p.pageSize, pageSize) };
  } catch { return { items: [], total: 0, page, pageSize }; }
}

// ====================== 浏览足迹 ======================

export interface FootprintItem { id: string; coverImage: string; product: Record<string, unknown> | null; viewedAt: string; }

export async function recordFootprint(req: { productId: string; source?: string }): Promise<void> {
  try { await requestJson('POST', '/footprints', req); } catch { /* 上报失败静默，不打断浏览 */ }
}

export async function fetchFootprints(): Promise<FootprintItem[]> {
  try {
    const p = await requestJson<{ items?: Record<string, unknown>[] }>('GET', '/footprints');
    return (p.items || []).map((it) => ({ id: String(it.id || ''), coverImage: String(it.coverImage || ''), product: (it.product as Record<string, unknown>) || null, viewedAt: String(it.viewedAt || '') }));
  } catch { return []; }
}

export async function deleteFootprint(id: string): Promise<void> {
  await requestJson('DELETE', `/footprints/${id}`);
}

export async function clearFootprints(): Promise<void> {
  await requestJson('DELETE', '/footprints');
}

// ====================== 预警中心（summary/read/delete） ======================

export interface WarningSummary { weatherCount: number; deviceCount: number; cropCount: number; total: number; }

export async function fetchWarningsSummary(): Promise<WarningSummary> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', '/warnings/summary');
    return { weatherCount: toNum(p.weatherCount), deviceCount: toNum(p.deviceCount), cropCount: toNum(p.cropCount), total: toNum(p.total) };
  } catch { return { weatherCount: 0, deviceCount: 0, cropCount: 0, total: 0 }; }
}

export async function markWarningRead(id: number, category: string): Promise<void> {
  await requestJson('PUT', `/warnings/${id}/read`, { category });
}

export async function markAllWarningsRead(categories: string[]): Promise<void> {
  await requestJson('PUT', '/warnings/read-all', { categories });
}

export async function deleteWarning(id: number, category?: string): Promise<void> {
  await requestJson('DELETE', `/warnings/${id}${category ? `?category=${encodeURIComponent(category)}` : ''}`);
}

// ====================== 环境监测（IoT 子接口） ======================

export interface EnvironmentMetric { value: string; trend: string; change: string; status: string; }
export interface EnvironmentOverview { temp: EnvironmentMetric; ph: EnvironmentMetric; humidity: EnvironmentMetric; light: EnvironmentMetric; }
export interface EnvironmentSensor { id: number; type: string; name: string; unit: string; value: number; status: string; statusText: string; }
export interface EnvironmentChartPoint { time: string; value: string; }
export interface EnvironmentChartSeries { metric: string; unit: string; points: EnvironmentChartPoint[]; }
export interface EnvironmentAutoTask { id: number; name: string; description: string; triggerType: string; enabled: boolean; }
export interface EnvironmentIrrigation { id: number; name: string; icon: string; area: string; on: boolean; }
export interface EnvironmentVideoStream { mode: string; streamUrl: string; snapshotUrl: string; note: string; }

export async function fetchEnvironmentOverview(stationId: number): Promise<EnvironmentOverview | null> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', `/farmer/environment/stations/${stationId}/overview`);
    const metric = (m: unknown): EnvironmentMetric => { const x = (m || {}) as Record<string, unknown>; return { value: String(x.value ?? ''), trend: String(x.trend || ''), change: String(x.change ?? ''), status: String(x.status || '') }; };
    return { temp: metric(p.temp), ph: metric(p.ph), humidity: metric(p.humidity), light: metric(p.light) };
  } catch { return null; }
}

export async function fetchEnvironmentSensors(stationId: number): Promise<EnvironmentSensor[]> {
  try {
    const p = await requestJson<Record<string, unknown>[]>('GET', `/farmer/environment/stations/${stationId}/sensors`);
    return (Array.isArray(p) ? p : []).map((s) => ({ id: toNum(s.id), type: String(s.type || ''), name: String(s.name || ''), unit: String(s.unit || ''), value: toNum(s.value), status: String(s.status || ''), statusText: String(s.statusText || '') }));
  } catch { return []; }
}

export async function fetchEnvironmentChart(stationId: number, metric: string, hours = 24): Promise<EnvironmentChartSeries | null> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', `/farmer/environment/stations/${stationId}/chart?metric=${encodeURIComponent(metric)}&hours=${hours}`);
    return { metric: String(p.metric || metric), unit: String(p.unit || ''), points: (Array.isArray(p.points) ? p.points : []).map((x) => (x as Record<string, unknown>)).map((pt) => ({ time: String(pt.time || ''), value: String(pt.value ?? '') })) };
  } catch { return null; }
}

export async function fetchEnvironmentAutoTasks(stationId: number): Promise<EnvironmentAutoTask[]> {
  try {
    const p = await requestJson<Record<string, unknown>[]>('GET', `/farmer/environment/stations/${stationId}/auto-tasks`);
    return (Array.isArray(p) ? p : []).map((t) => ({ id: toNum(t.id), name: String(t.name || ''), description: String(t.description || ''), triggerType: String(t.triggerType || ''), enabled: t.enabled === true }));
  } catch { return []; }
}

export async function toggleEnvironmentAutoTask(taskId: number, enabled: boolean): Promise<void> {
  await requestJson('PUT', `/farmer/environment/auto-tasks/${taskId}/toggle`, { enabled });
}

export async function fetchEnvironmentIrrigation(stationId: number): Promise<EnvironmentIrrigation[]> {
  try {
    const p = await requestJson<Record<string, unknown>[]>('GET', `/farmer/environment/stations/${stationId}/irrigation`);
    return (Array.isArray(p) ? p : []).map((z) => ({ id: toNum(z.id), name: String(z.name || ''), icon: String(z.icon || ''), area: String(z.area || ''), on: z.on === true }));
  } catch { return []; }
}

export async function toggleEnvironmentIrrigation(zoneId: number, on: boolean): Promise<void> {
  await requestJson('PUT', `/farmer/environment/irrigation/${zoneId}/toggle`, { on });
}

export async function fetchEnvironmentVideoStreams(): Promise<EnvironmentVideoStream | null> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', '/farmer/environment/video/streams');
    return { mode: String(p.mode || ''), streamUrl: String(p.streamUrl || ''), snapshotUrl: String(p.snapshotUrl || ''), note: String(p.note || '') };
  } catch { return null; }
}

// ====================== 农户溯源 ======================

export interface TraceCodeView { id: string; code: string; batchNo: string; productId: string; productName: string; harvestTime: string; scanCount: number; }

export async function createTraceCode(req: { productId: number; batchNo: string }): Promise<{ id: string; code: string }> {
  const p = await requestJson<Record<string, unknown>>('POST', '/farmer/trace/codes', req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { id: String(p.id || ''), code: String(p.code || '') };
}

export async function fetchTraceCodes(page = 1, pageSize = 10): Promise<PagedItems<TraceCodeView>> {
  try {
    const p = await requestJson<{ items?: Record<string, unknown>[]; total?: number; page?: number; pageSize?: number }>('GET', `/farmer/trace/codes?page=${page}&pageSize=${pageSize}`);
    return { items: (p.items || []).map((c) => ({ id: String(c.id || ''), code: String(c.code || ''), batchNo: String(c.batchNo || ''), productId: String(c.productId || ''), productName: String(c.productName || ''), harvestTime: String(c.harvestTime || ''), scanCount: toNum(c.scanCount) })), total: toNum(p.total), page: toNum(p.page, page), pageSize: toNum(p.pageSize, pageSize) };
  } catch { return { items: [], total: 0, page, pageSize }; }
}

export async function addTraceRecord(codeId: string, req: { stage: string; description: string; images?: string[]; operator?: string }): Promise<string> {
  const p = await requestJson<Record<string, unknown>>('POST', `/farmer/trace/${codeId}/records`, req, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return String(p.id || '');
}

// ====================== 地域特色内容 ======================

export interface RegionContentItem { id: string; type: string; title: string; subtitle: string; description: string; imageUrl: string; icon: string; tags: string[]; actionType: string; actionTarget: string; source: string; }
export interface RegionContentGroup { type: string; title: string; subtitle: string; icon: string; items: RegionContentItem[]; }
export interface RegionFeed { province: string; city: string | null; slogan: string; intro: string | null; solarTerm: string; located: boolean; groups: RegionContentGroup[]; }
export interface RegionResolveResult { province: string; city: string | null; district: string | null; label: string; slogan: string; }

export async function fetchRegionContent(province?: string, city?: string): Promise<RegionFeed | null> {
  try {
    const q = new URLSearchParams(); if (province) q.set('province', province); if (city) q.set('city', city);
    const p = await requestJson<Record<string, unknown>>('GET', `/region/content${q.toString() ? `?${q.toString()}` : ''}`, undefined, { auth: false });
    return {
      province: String(p.province || ''), city: p.city == null ? null : String(p.city), slogan: String(p.slogan || ''), intro: p.intro == null ? null : String(p.intro), solarTerm: String(p.solarTerm || ''), located: p.located === true,
      groups: (Array.isArray(p.groups) ? p.groups : []).map((g) => (g as Record<string, unknown>)).map((g) => ({
        type: String(g.type || ''), title: String(g.title || ''), subtitle: String(g.subtitle || ''), icon: String(g.icon || ''),
        items: (Array.isArray(g.items) ? g.items : []).map((it) => (it as Record<string, unknown>)).map((it) => ({ id: String(it.id || ''), type: String(it.type || ''), title: String(it.title || ''), subtitle: String(it.subtitle || ''), description: String(it.description || ''), imageUrl: String(it.imageUrl || ''), icon: String(it.icon || ''), tags: Array.isArray(it.tags) ? it.tags.map(String) : [], actionType: String(it.actionType || 'none'), actionTarget: String(it.actionTarget || ''), source: String(it.source || '') })),
      })),
    };
  } catch { return null; }
}

export async function resolveRegion(lat: number, lng: number): Promise<RegionResolveResult | null> {
  try {
    const p = await requestJson<Record<string, unknown>>('GET', `/region/resolve?lat=${lat}&lng=${lng}`, undefined, { auth: false });
    return { province: String(p.province || ''), city: p.city == null ? null : String(p.city), district: p.district == null ? null : String(p.district), label: String(p.label || p.city || p.province || ''), slogan: String(p.slogan || '') };
  } catch { return null; }
}

// ====================== 账号设置（改密码/注销） ======================

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ ok: boolean; firstTime: boolean }> {
  const p = await requestJson<Record<string, unknown>>('PUT', '/me/password', { oldPassword, newPassword });
  return { ok: p.ok !== false, firstTime: p.firstTime === true };
}

// ---------- 用户偏好设置（/me/settings） ----------

export interface UserSettings { orderNotify: boolean; logisticsNotify: boolean; promoNotify: boolean; communityNotify: boolean; personalizedRecommend: boolean; footprintVisible: boolean; voiceEnabled: boolean; dataSaver: boolean; fontScale: number; }

function mapUserSettings(p: Record<string, unknown>): UserSettings {
  return {
    orderNotify: p.orderNotify !== false,
    logisticsNotify: p.logisticsNotify !== false,
    promoNotify: p.promoNotify !== false,
    communityNotify: p.communityNotify !== false,
    personalizedRecommend: p.personalizedRecommend !== false,
    footprintVisible: p.footprintVisible !== false,
    voiceEnabled: p.voiceEnabled === true,
    dataSaver: p.dataSaver === true,
    fontScale: typeof p.fontScale === 'number' ? p.fontScale : 2,
  };
}

export async function fetchUserSettings(): Promise<UserSettings> {
  try { return mapUserSettings(await requestJson<Record<string, unknown>>('GET', '/me/settings')); }
  catch { return { orderNotify: true, logisticsNotify: true, promoNotify: true, communityNotify: true, personalizedRecommend: true, footprintVisible: true, voiceEnabled: false, dataSaver: false, fontScale: 2 }; }
}

export async function updateUserSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const p = await requestJson<Record<string, unknown>>('PUT', '/me/settings', partial);
  return mapUserSettings(p);
}

// ---------- 意见反馈 / 帮助中心 ----------

export interface Faq { q: string; a: string }

export async function submitFeedback(type: string, content: string, contact = ''): Promise<void> {
  await requestJson('POST', '/feedback', { type, content, contact });
}

export async function fetchFaqs(): Promise<Faq[]> {
  const p = await requestJson<Faq[]>('GET', '/help/faqs', undefined, { auth: false });
  return Array.isArray(p) ? p : [];
}

// ---------- 资料更新（/me/profile） ----------

export async function updateProfile(req: { nickname?: string; city?: string; avatar?: string; gender?: number; birthday?: string }): Promise<{ nickname: string; city: string; avatar: string; gender: number; birthday: string }> {
  const p = await requestJson<Record<string, unknown>>('PUT', '/me/profile', req);
  const next = getStoredSession();
  const updated = {
    nickname: String(p.nickname ?? next?.nickname ?? ''),
    city: String(p.city ?? next?.city ?? ''),
    avatar: imageURL(String(p.avatar ?? p.avatarUrl ?? next?.avatar ?? '')),
    gender: toNum(p.gender, next?.gender ?? 0),
    birthday: String(p.birthday ?? next?.birthday ?? ''),
  };
  if (next) saveSession({ ...next, ...updated });
  return updated;
}

export async function deactivateAccount(confirm: string): Promise<void> {
  await requestJson('POST', '/me/deactivate', { confirm });
}

// ====================== 图片上传（base64） ======================

export async function uploadImageBase64(contentType: string, data: string): Promise<{ url: string }> {
  const p = await requestJson<Record<string, string>>('POST', '/uploads/base64', { contentType, data }, { headers: { 'Idempotency-Key': idempotencyKey() } });
  return { url: String(p.url || p.imageUrl || '') };
}

// ====================== 订单取消 ======================

export async function cancelOrder(orderId: number): Promise<void> {
  await requestJson('POST', `/orders/${orderId}/cancel`, {}, { headers: { 'Idempotency-Key': idempotencyKey() } });
}
