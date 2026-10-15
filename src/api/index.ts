import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * 小满合 APP — API 服务层
 * 交易相关接口暂由旧 Node 服务承载；商品、分类、溯源、认养优先走 Spring
 * 移动端接口。VITE_MOBILE_API_BASE_URL 可在联调/生产环境覆盖。
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/app-api';
const MOBILE_API_BASE = (import.meta.env.VITE_MOBILE_API_BASE_URL || '/app-api/mobile/v1').replace(/\/$/, '');
const ASSET_ORIGIN = MOBILE_API_BASE.startsWith('http') ? new URL(MOBILE_API_BASE).origin : '';

// ====================== 类型定义 ======================

export interface ApiProduct {
  id: number;
  name: string;
  origin: string;
  description: string;
  price: number | string;
  originalPrice?: number;
  original_price?: number | string;
  unit: string;
  stock: number;
  sales_count?: number;
  salesCount?: number;
  view_count?: number;
  images: string;
  tags: string;
  category_id?: number;
  categoryId?: number;
  category_name?: string;
  categoryName?: string;
  farmer_name?: string;
  farmerName?: string;
  status: string;
}

// ====================== App 端使用的产品类型 ======================

export type CategoryId = 'all' | 'veg' | 'fruit' | 'grain' | 'meat' | 'local' | 'seafood';

const CAT_MAP: Record<number, CategoryId> = {
  1: 'veg', 2: 'fruit', 3: 'grain', 4: 'meat', 5: 'seafood', 6: 'local',
};

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
  id: number;
  name: string;
  origin: string;
  category: CategoryId;
  category_id: number;
  category_name: string;
  unit: string;
  image: string;
  tag: string;
  price: number;
  originalPrice: number;
  sales: string;
  description: string;
}

/** 数据来自后台 4.0、过渡兼容服务，或当前无法取得。 */
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
}

export interface Banner {
  title: string;
  sub: string;
  image: string;
  color1?: string;
  color2?: string;
}

export interface AdoptItem {
  id: number; name: string; image: string; period: string;
  output: string; progress: number; left: number; stage: string; price: number;
  source?: ApiDataSource;
}

export interface PostItem {
  id: number; author: string; title: string; tag: string;
}

export interface TaskItem {
  id: number; name: string; time: string; type: string; done: boolean;
}

export interface TraceStep {
  stage: string; time: string; desc: string;
}

export type AiRole = 'consumer' | 'farmer';

export interface SessionUser {
  userId: number;
  nickname: string;
  avatar: string;
  identity: 'consumer' | 'farmer';
  phone: string;
  token: string;
  isNewUser?: boolean;
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

function parseJson(str: unknown): any {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str as string); } catch { return []; }
}

function parseImages(raw: unknown): string {
  const arr = parseJson(raw);
  if (Array.isArray(arr) && arr.length > 0) return normalizeAssetUrl(String(arr[0]));
  return '';
}

function normalizeAssetUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/images/') && ASSET_ORIGIN) return `${ASSET_ORIGIN}${url}`;
  return url;
}

function parseTags(raw: unknown): string {
  const arr = parseJson(raw);
  if (Array.isArray(arr) && arr.length > 0) return arr[0].replace(/特产$/, '');
  return '';
}

function formatSales(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  return String(count || 0);
}

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  return Number(v) || fallback;
}

// 映射API商品到App Product类型 (兼容 Sequelize 下划线和驼峰)
function mapProduct(raw: Record<string, unknown>): Product {
  const catId = toNum(raw.category_id ?? raw.categoryId ?? 6);
  const cat: CategoryId = CAT_MAP[catId] || 'local';
  return {
    id: toNum(raw.id),
    name: String(raw.name || ''),
    origin: String(raw.origin || ''),
    category: cat,
    category_id: catId,
    category_name: String(raw.category_name || raw.categoryName || ''),
    unit: String(raw.unit || '份'),
    image: parseImages(raw.images ?? raw.image ?? raw.imageUrl ?? raw.image_url),
    tag: parseTags(raw.tags) || '当季',
    price: toNum(raw.price),
    originalPrice: toNum(raw.original_price ?? raw.originalPrice ?? raw.price),
    sales: formatSales(toNum(raw.sales_count ?? raw.salesCount ?? 0)),
    description: String(raw.description || ''),
  };
}

function sourceOf(value: unknown): ApiDataSource {
  return value === 'fallback' || value === 'unavailable' ? value : 'real';
}

function categoryIdFrom(raw: Record<string, unknown>): CategoryId {
  const id = toNum(raw.id ?? raw.category_id ?? raw.categoryId);
  if (CAT_MAP[id]) return CAT_MAP[id];
  const name = String(raw.name ?? raw.category_name ?? raw.categoryName ?? '');
  if (/蔬菜|瓜果|菌菇/.test(name)) return 'veg';
  if (/水果|果/.test(name)) return 'fruit';
  if (/粮|米|油/.test(name)) return 'grain';
  if (/肉|蛋|禽/.test(name)) return 'meat';
  if (/水产|海鲜|鱼|虾/.test(name)) return 'seafood';
  return 'local';
}

function unavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /HTTP (0|404|405|408|429|500|501|502|503|504)|Failed to fetch|Network Error/i.test(message);
}

// ====================== API 调用 (适配Node.js嵌套响应格式) ======================

async function fetchJson<T>(url: string): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url, responseType: 'json' });
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    return response.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function postJson<T>(url: string, data: Record<string, unknown>): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      data,
      responseType: 'json'
    });
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    return response.data as T;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const SESSION_STORAGE_KEY = 'xiaomanhe_session';

export function getStoredSession(): SessionUser | null {
  try {
    const value = localStorage.getItem(SESSION_STORAGE_KEY);
    return value ? JSON.parse(value) as SessionUser : null;
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

async function requestJson<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  let raw: T;
  if (Capacitor.isNativePlatform()) {
    const options = { url, headers, data, responseType: 'json' as const };
    let response;
    if (method === 'GET') response = await CapacitorHttp.get(options);
    else if (method === 'POST') response = await CapacitorHttp.post(options);
    else if (method === 'PUT') response = await CapacitorHttp.put(options);
    else response = await CapacitorHttp.delete(options);
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    raw = response.data as T;
  } else {
    const response = await fetch(url, {
      method,
      headers,
      ...(method === 'GET' || method === 'DELETE' || data === undefined ? {} : { body: JSON.stringify(data) })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    raw = await response.json() as T;
  }
  return raw;
}

function unwrap<T>(raw: any): T {
  if (raw?.code !== undefined && raw.code !== 0 && raw.code !== 200) throw new Error(raw.message || '请求失败');
  const envelope = raw?.data ?? raw;
  if (envelope?.success === false) throw new Error(envelope.message || '请求失败');
  return (envelope?.data ?? envelope) as T;
}

export async function sendLoginCode(phone: string): Promise<{ debugCode?: string }> {
  return unwrap(await requestJson('POST', `${API_BASE}/user/send-code`, { phone }));
}

export async function loginWithSms(phone: string, code: string): Promise<SessionUser> {
  const session = unwrap<SessionUser>(await requestJson('POST', `${API_BASE}/user/phone-login`, { phone, code }));
  saveSession(session);
  return session;
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  return unwrap(await requestJson('GET', `${API_BASE}/user/info`));
}

export async function fetchAddresses(): Promise<Address[]> {
  const payload = unwrap<{ list: Address[] }>(await requestJson('GET', `${API_BASE}/user/addresses`));
  return payload.list;
}

export async function createAddress(address: Omit<Address, 'id'>): Promise<Address> {
  return unwrap(await requestJson('POST', `${API_BASE}/user/addresses`, address));
}

export async function updateAddress(address: Address): Promise<Address> {
  const { id, ...data } = address;
  return unwrap(await requestJson('PUT', `${API_BASE}/user/addresses/${id}`, data));
}

export async function deleteAddress(addressId: number): Promise<void> {
  await unwrap(await requestJson('DELETE', `${API_BASE}/user/addresses/${addressId}`));
}

export async function fetchCart(): Promise<CartLine[]> {
  const payload = unwrap<{ list: Array<{ id: number; quantity: number; productInfo: Record<string, unknown> }> }>(await requestJson('GET', `${API_BASE}/order/cart`));
  return payload.list.map((item) => ({ cartId: item.id, product: mapProduct(item.productInfo), quantity: Number(item.quantity), spec: mapProduct(item.productInfo).unit }));
}

export async function addCartItem(productId: number, quantity = 1): Promise<void> {
  await unwrap(await requestJson('POST', `${API_BASE}/order/cart`, { productId, quantity }));
}

export async function updateCartItem(cartId: number, quantity: number): Promise<void> {
  await unwrap(await requestJson('PUT', `${API_BASE}/order/cart/${cartId}`, { quantity }));
}

export async function removeCartItem(cartId: number): Promise<void> {
  await unwrap(await requestJson('DELETE', `${API_BASE}/order/cart/${cartId}`));
}

export async function createOrder(items: Array<{ productId: number; quantity: number }>, addressId: number, remark = ''): Promise<{ orderId: number; orderNo: string; totalAmount: number }> {
  return unwrap(await requestJson('POST', `${API_BASE}/order`, { items, addressId, remark }));
}

export async function completeTestPayment(orderId: number): Promise<{ orderId: number; status: string }> {
  return unwrap(await requestJson('POST', `${API_BASE}/order/pay/${orderId}`, { paymentMethod: 'test' }));
}

export async function fetchOrders(): Promise<OrderRecord[]> {
  const payload = unwrap<{ list: OrderRecord[] }>(await requestJson('GET', `${API_BASE}/order/list`));
  return payload.list;
}

/** Calls the first-party server proxy. No third-party API key reaches the app. */
export async function askAi(question: string, role: AiRole): Promise<string> {
  const raw = await postJson<any>(`${API_BASE}/ai/chat`, { question, role });
  if (raw?.code && raw.code !== 0) throw new Error(raw.message || 'AI request failed');
  const envelope = raw?.data ?? raw;
  if (envelope?.success === false) throw new Error(envelope.message || 'AI request failed');
  const payload = envelope?.data ?? envelope;
  const answer = String(payload?.answer || '').trim();
  if (!answer) throw new Error('AI returned an empty response');
  return answer;
}

// 旧 Node.js API 返回 {code:0, data:{success:true, data:{list:[...]}}}。
// 仅在对应 Spring 移动端接口暂不可用时作为过渡回退。
async function fetchLegacyList(url: string): Promise<{ list: Record<string, unknown>[]; total: number } | null> {
  try {
    const raw = await fetchJson<any>(url);
    // 解包: code.data.data 或 code.data
    const inner = raw?.data?.data || raw?.data;
    if (inner?.list) {
      return { list: inner.list, total: inner.total || 0 };
    }
    return null;
  } catch (error) {
    if (url.includes('/product/list')) {
      console.error('[PRODUCT API ERROR]', error);
      throw error;
    }
    return null;
  }
}

async function fetchMobileList(path: string): Promise<{ list: Record<string, unknown>[]; total: number; source: ApiDataSource }> {
  const payload = unwrap<any>(await fetchJson<any>(`${MOBILE_API_BASE}${path}`));
  if (!Array.isArray(payload?.list)) throw new Error('移动端接口返回格式异常');
  return { list: payload.list, total: Number(payload.total || payload.list.length), source: sourceOf(payload.source) };
}

async function fetchLegacyProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;

  while (true) {
    const result = await fetchLegacyList(
      `${API_BASE}/product/list?page=${page}&pageSize=100`
    );
    if (!result || result.list.length === 0) break;
    all.push(...result.list.map(mapProduct));
    if (all.length >= result.total) break;
    page++;
  }
  return all;
}

/** 商品以后台 4.0 移动端接口为准；旧 Node 仅作为联调期间的不可用回退。 */
export async function fetchProductData(options: { keyword?: string; categoryId?: number; sort?: string } = {}): Promise<ApiDataResult<Product[]>> {
  const params = new URLSearchParams({ page: '1', pageSize: '100' });
  if (options.keyword) params.set('keyword', options.keyword);
  if (options.categoryId) params.set('categoryId', String(options.categoryId));
  if (options.sort) params.set('sort', options.sort);
  try {
    const payload = await fetchMobileList(`/products?${params.toString()}`);
    return { value: payload.list.map(mapProduct), source: payload.source };
  } catch (error) {
    if (!unavailable(error)) throw error;
    try {
      return { value: await fetchLegacyProducts(), source: 'fallback', fallbackReason: '移动端商品服务暂不可用，已显示兼容数据' };
    } catch {
      return { value: [], source: 'unavailable', fallbackReason: '暂时无法加载商品，请稍后重试' };
    }
  }
}

/** 保留给未迁移调用方的兼容函数。 */
export async function fetchProducts(): Promise<Product[]> {
  return (await fetchProductData()).value;
}

export async function fetchMobileCategories(): Promise<ApiDataResult<AppCategory[]>> {
  try {
    const payload = await fetchMobileList('/categories');
    const seen = new Set<CategoryId>();
    const value: AppCategory[] = [{ id: 'all', name: '全部' }];
    for (const raw of payload.list) {
      const id = categoryIdFrom(raw);
      if (seen.has(id)) continue;
      seen.add(id);
      value.push({ id, backendId: toNum(raw.id ?? raw.category_id ?? raw.categoryId), name: String(raw.name ?? raw.category_name ?? raw.categoryName ?? APP_CATEGORIES.find((item) => item.id === id)?.name ?? '特产') });
    }
    return { value: value.length > 1 ? value : APP_CATEGORIES, source: payload.source };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { value: APP_CATEGORIES, source: 'fallback', fallbackReason: '移动端分类服务暂不可用，已显示兼容分类' };
  }
}

// 获取Banner - 降级处理
export async function fetchBanners(): Promise<Banner[]> {
  try {
    const result = await fetchLegacyList(`${API_BASE}/product/banners`);
    if (result?.list?.length) {
      return result.list.slice(0, 3).map((b: any) => ({
        title: b.title || '',
        sub: b.sub || '来自合作农场的当季好物',
        image: b.image || '',
        color1: b.color1,
        color2: b.color2,
      }));
    }
  } catch {}
  return [
    { title: '产地直发，新鲜到家', sub: '严选全国优质农产品基地', image: '/images/product/mock_寿光蔬菜组合.jpg' },
    { title: '云认养农场', sub: '看得见的生长过程', image: '/images/product/mock_丹东红颜草莓.jpg' },
  ];
}

function mapAdoptionPackage(item: Record<string, unknown>, index: number, source: ApiDataSource): AdoptItem {
  return {
    id: toNum(item.id, index),
    name: String(item.name ?? item.title ?? ''),
    image: parseImages(item.images ?? item.image ?? item.imageUrl ?? item.image_url) || '/assets/adopt/farm1.jpg',
    period: String(item.period ?? item.cycle ?? ['90天', '120天', '180天'][index % 3]),
    output: String(item.output ?? item.expectedOutput ?? item.expected_output ?? ['约12斤', '约20斤', '约30斤'][index % 3]),
    progress: toNum(item.progress ?? item.growthProgress ?? item.growth_progress, 0),
    left: toNum(item.stock ?? item.remaining ?? item.remainingCount, 0),
    stage: String(item.stage ?? item.growthStage ?? item.growth_stage ?? '成长记录待更新'),
    price: toNum(item.price, 0),
    source,
  };
}

export async function fetchAdoptionPackageData(): Promise<ApiDataResult<AdoptItem[]>> {
  try {
    const payload = await fetchMobileList('/adoption-packages');
    return { value: payload.list.map((item, index) => mapAdoptionPackage(item, index, payload.source)), source: payload.source };
  } catch (error) {
    if (!unavailable(error)) throw error;
    const result = await fetchLegacyList(`${API_BASE}/adoption/list`);
    return { value: (result?.list || []).map((item, index) => mapAdoptionPackage(item, index, 'fallback')), source: 'fallback', fallbackReason: '移动端认养服务暂不可用，已显示兼容数据' };
  }
}

// 保留给未迁移调用方的兼容函数。
export async function fetchAdoptionPackages(): Promise<AdoptItem[]> {
  return (await fetchAdoptionPackageData()).value;
}

// 获取社区帖子
export async function fetchPosts(): Promise<PostItem[]> {
  const result = await fetchLegacyList(`${API_BASE}/community/posts?pageSize=10`);
  if (result?.list?.length) {
    return result.list.map((p: any) => ({
      id: p.id || 0,
      author: p.userName || p.user_name || '农户',
      title: String(p.content || '').slice(0, 50),
      tag: '种植日记',
    }));
  }
  return [];
}

// 获取农事任务
export async function fetchTasks(): Promise<TaskItem[]> {
  const result = await fetchLegacyList(`${API_BASE}/crop/tasks?pageSize=10`);
  if (result?.list?.length) {
    return result.list.map((t: any) => ({
      id: t.id || 0,
      name: t.name || '',
      time: String(t.scheduledAt || t.scheduled_at || '').slice(11, 16) || '08:00',
      type: t.taskType === 'urgent' ? '浇水' : t.taskType === 'important' ? '巡检' : '记录',
      done: t.status === 'completed',
    }));
  }
  return [];
}

export interface TraceQuery {
  source: ApiDataSource;
  record: Record<string, unknown> | null;
  events: TraceStep[];
  fallbackReason?: string;
}

function mapTraceEvent(raw: Record<string, unknown>): TraceStep {
  return {
    stage: String(raw.stage ?? raw.actionType ?? raw.action_type ?? raw.title ?? '已记录'),
    time: String(raw.recordedAt ?? raw.recorded_at ?? raw.createdAt ?? raw.created_at ?? raw.time ?? ''),
    desc: String(raw.description ?? raw.content ?? raw.detail ?? '已记录该批次流转信息'),
  };
}

/** 根据批次号验真。没有成功响应时不会把回退数据标记为“已验真”。 */
export async function queryTrace(batchNo: string): Promise<TraceQuery> {
  try {
    const payload = unwrap<any>(await fetchJson<any>(`${MOBILE_API_BASE}/traces/${encodeURIComponent(batchNo)}`));
    return {
      source: sourceOf(payload?.source),
      record: payload?.record && typeof payload.record === 'object' ? payload.record : null,
      events: Array.isArray(payload?.events) ? payload.events.map(mapTraceEvent) : [],
    };
  } catch (error) {
    if (!unavailable(error)) throw error;
    return { source: 'unavailable', record: null, events: [], fallbackReason: '溯源验真服务暂不可用，请稍后重试' };
  }
}

// 获取溯源记录：仅保留现有农户页面兼容用途，不作为消费者验真结果。
export async function fetchTraceRecords(): Promise<TraceStep[]> {
  const result = await fetchLegacyList(`${API_BASE}/trace/records?pageSize=10`);
  if (result?.list?.length) {
    return result.list.map((item: any, i: number) => ({
      stage: item.stage || item.actionType || item.action_type || '已记录',
      time: String(item.recordedAt || item.recorded_at || item.created_at || ''),
      desc: String(item.description || item.content || '溯源数据已记录'),
    }));
  }
  return [];
}
