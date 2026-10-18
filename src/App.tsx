import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CloudSun,
  Droplets,
  Flame,
  Gift,
  Home,
  Leaf,
  MapPin,
  MessageCircle,
  PackageSearch,
  ScanLine,
  Search,
  ShieldCheck,
  Settings,
  ShoppingCart,
  Sprout,
  Store,
  Truck,
  UserRound,
  Wheat
} from 'lucide-react';
import {
  ConsumerTab,
  FarmerTab,
  Role,
} from './data/mock';
import {
  APP_CATEGORIES,
  fetchAdoptionPackageData,
  fetchBanners,
  fetchPosts,
  fetchProductData,
  fetchMobileCategories,
  fetchTasks,
  queryTrace,
  askAi,
  addCartItem,
  clearSession,
  cancelOrder,
  completeTestPayment,
  createAddress,
  createOrder,
  deleteAddress,
  fetchAddresses,
  fetchCart,
  fetchCurrentUser,
  fetchOrders,
  getStoredSession,
  passwordLogin,
  register,
  removeCartItem as removeCartItemApi,
  updateAddress,
  updateCartItem,
  Address,
  OrderRecord,
  Product,
  Banner,
  AdoptItem,
  PostItem,
  TaskItem,
  TraceStep,
  CategoryId,
  ApiDataSource,
  AppCategory,
  fetchFarmerProducts,
  createFarmerProduct,
  submitFarmerProduct,
  offShelfFarmerProduct,
  fetchFarmerCrops,
  fetchFarmTasks,
  createFarmTask,
  completeFarmTask,
  deleteFarmTask,
  fetchEnvironmentStations,
  fetchEnvironmentDevices,
  fetchEnvironmentAlerts,
  fetchEnvironmentVideoStreams,
  createEnvironmentStation,
  toggleEnvironmentDevice,
  fetchFarmerDevices,
  setFarmerDeviceEnabled,
  fetchFarmerOrders,
  shipFarmerOrder,
  fetchFarmerWarnings,
  fetchWeather,
  fetchCommunityPosts,
  createCommunityPost,
  likeCommunityPost,
  fetchTechExperts,
  TechSupportExpert,
  analyzeDisease,
  createAdoptionOrder,
  fetchAdoptionOrders,
  fetchAdoptionOrderDetail,
  fetchFarmerAdoptionOrders,
  shipFarmerAdoptionOrder,
  fetchConversations,
  fetchConversationMessages,
  sendConversationMessage,
  createConversation,
  fetchSupportHistory,
  sendSupportMessage,
  FarmerCrop,
  FarmTask,
  FarmerDevice,
  FarmerWarning,
  CommunityPost,
  FarmerOrder,
  AdoptionOrder,
  FarmerAdoptionList,
  FarmerAdoptionOrder,
  Conversation,
  ChatMessage,
  SupportMessage,
  SessionUser,
  WeatherInfo,
  fetchRepairs,
  fetchBookings,
  fetchDeviceTypes,
  fetchFaultOptions,
  createDeviceRepair,
  fetchDroneServices,
  bookDroneService,
  fetchMachineTypes,
  bookMachineService,
  consultExpert,
  fetchTechContact,
  fetchEnvironmentOverview,
  fetchEnvironmentSensors,
  fetchEnvironmentAutoTasks,
  toggleEnvironmentAutoTask,
  fetchEnvironmentIrrigation,
  toggleEnvironmentIrrigation,
  fetchEnvironmentChart,
  TechRepair,
  TechBooking,
  TechContactInfo,
  EnvironmentOverview,
  EnvironmentStation,
  EnvironmentVideoStream,
  EnvironmentSensor,
  EnvironmentAutoTask,
  EnvironmentIrrigation,
  EnvironmentAlert,
  fetchMemberSummary,
  checkinMember,
  fetchPointsRecords,
  fetchFavorites,
  toggleFavorite,
  fetchFootprints,
  deleteFootprint,
  clearFootprints,
  MemberSummary,
  PointsRecord,
  FootprintItem,
  fetchUserSettings,
  updateUserSettings,
  updateProfile,
  changePassword,
  UserSettings,
  submitFeedback,
  fetchFaqs,
  Faq,
  fetchRawCategories,
  RawCategory,
  fetchRegionContent,
  resolveRegion,
  uploadImageBase64,
  imageURL,
  RegionFeed,
} from './api';

type Screen = 'splash' | 'identity' | 'login' | 'consumer' | 'farmer';
type ConsumerPage = 'tabs' | 'mall' | 'trace' | 'productDetail' | 'cart' | 'checkout' | 'paySuccess' | 'orders' | 'orderDetail' | 'address' | 'messages' | 'service' | 'settings' | 'privacy' | 'general' | 'member' | 'favorites' | 'footprints' | 'adoptDetail' | 'adoptConfirm' | 'adoptSuccess' | 'traceResult' | 'region' | 'regionContent';
/** 收货地区：用于结算与配送，localStorage key。 */
const REGION_STORAGE_KEY = 'yunlu.home.region';
/** 地域内容推荐地区：只影响首页地域流，localStorage key。 */
const CONTENT_REGION_STORAGE_KEY = 'yunlu.home.contentRegion';
type StoredRegion = { province?: string; city?: string; district?: string; label?: string };
/** 从 localStorage 读取一个地区对象，读取失败时返回 null。 */
function readStoredRegion(key: string): StoredRegion | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
/** 把地区对象写入 localStorage，写入失败时静默忽略。 */
function writeStoredRegion(key: string, value: StoredRegion): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 存储不可用时忽略 */ }
}

/** 经纬度坐标。 */
type GeoCoords = { latitude: number; longitude: number };
/** 原生定位单次取点的超时时间（毫秒）。 */
const NATIVE_LOCATE_TIMEOUT = 6000;
/** WebView 降级定位的超时时间（毫秒）。 */
const WEB_LOCATE_TIMEOUT = 4000;

/** 从任意定位结果中提取经纬度，字段缺失时返回 null。 */
function toGeoCoords(position: { coords?: { latitude?: number; longitude?: number } } | null | undefined): GeoCoords | null {
  const latitude = position?.coords?.latitude;
  const longitude = position?.coords?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { latitude, longitude };
}

/**
 * 降级方案：使用浏览器 / WebView 自带的 navigator.geolocation。
 * 无论成功、拒绝还是超时都会 resolve，绝不挂起。
 */
function resolveCoordsViaNavigator(): Promise<GeoCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise<GeoCoords | null>((resolve) => {
    let settled = false;
    const done = (coords: GeoCoords | null): void => {
      if (settled) return;
      settled = true;
      resolve(coords);
    };
    navigator.geolocation.getCurrentPosition(
      (position) => done(toGeoCoords(position)),
      () => done(null),
      { timeout: WEB_LOCATE_TIMEOUT, enableHighAccuracy: false, maximumAge: 60000 }
    );
  });
}

/**
 * 获取当前位置经纬度，用于地域内容推荐。
 * 优先级：① Capacitor Geolocation 原生插件（真机可用，自动申请运行时权限）
 *        ② WebView 的 navigator.geolocation（浏览器 / 插件不可用时）
 * 任一步失败都不会抛错，最终返回 null，由调用方提示用户手动选择，不阻塞交互。
 */
async function resolveCurrentCoords(): Promise<GeoCoords | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Geolocation.requestPermissions();
      if (status.location !== 'denied' || status.coarseLocation !== 'denied') {
        const coords = toGeoCoords(await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: NATIVE_LOCATE_TIMEOUT }));
        if (coords) return coords;
      }
    } catch { /* 原生定位不可用或用户拒绝，降级继续 */ }
  } else {
    try {
      const coords = toGeoCoords(await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: NATIVE_LOCATE_TIMEOUT }));
      if (coords) return coords;
    } catch { /* WebView 插件定位失败，降级继续 */ }
  }
  return resolveCoordsViaNavigator();
}

type FarmerPage = 'tabs' | 'myCrops' | 'cropDetail' | 'warningCenter' | 'adoptionCenter' | 'myDevice' | 'techSupport' | 'weatherDetail' | 'voiceAssistant' | 'locationMap' | 'community' | 'farmerSettings' | 'farmerGeneral' | 'farmerAddress' | 'farmerPrivacy' | 'farmerOrders' | 'farmerOrderDetail' | 'myOrders';
type CartItem = { cartId?: number; product: Product; quantity: number; spec: string };

const consumerTabs: Array<{ id: ConsumerTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'adopt', label: '云认养', icon: Sprout },
  { id: 'assistant', label: '小露', icon: Bot },
  { id: 'cart', label: '购物车', icon: ShoppingCart },
  { id: 'my', label: '个人中心', icon: UserRound }
];

const farmerTabs: Array<{ id: FarmerTab; label: string; icon: typeof Home }> = [
  { id: 'environment', label: '环境', icon: CloudSun },
  { id: 'shop', label: '店铺', icon: Store },
  { id: 'farmHome', label: '首页', icon: Home },
  { id: 'farming', label: '农事', icon: CalendarDays },
  { id: 'farmerMy', label: '我的', icon: UserRound }
];

const consumerHomeStyle: 'current' | 'hema' = 'current';
const appName = '耘露';
const today = new Date();
const todayYear = today.getFullYear();
const todayMonth = today.getMonth() + 1;
const todayDay = today.getDate();
const todayMonthDay = `${todayMonth}月${todayDay}日`;
const weekdayText = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][today.getDay()];
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowMonthDay = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`;
const currentMonthTitle = `${todayYear}年${todayMonth}月`;

// 模块级默认产品和安全访问工具
const DEFAULT_PRODUCT: Product = {
  id: '', name: '加载中...', origin: '', category: 'local' as CategoryId, category_id: 6,
  category_name: '', unit: '', image: '', coverImage: '', images: [], tag: '', price: 0, originalPrice: 0,
  priceText: '', priceFen: 0, sales: '0', stock: 0, description: '', isOnSale: false, purchasable: false,
  catalogueOnly: false, status: 0, source: '', favorited: false,
};
const createSafeProduct = (products: Product[]) => (idx: number): Product => products[idx] || DEFAULT_PRODUCT;

// 错误边界 — 防止任何未捕获错误导致白屏
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#333' }}>
          <h2 style={{ color: '#e74c3c' }}>页面出错了</h2>
          <p style={{ color: '#999', fontSize: 14, marginBottom: 20 }}>{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [role, setRole] = useState<Role>('consumer');
  const [session, setSession] = useState(() => getStoredSession());
  const [roleSwitchTarget, setRoleSwitchTarget] = useState<Role | null>(null);
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [farmerAiPosition, setFarmerAiPosition] = useState<{ x: number; y: number } | null>(null);
  const [consumerAiPosition, setConsumerAiPosition] = useState<{ x: number; y: number } | null>(null);
  const [consumerTab, setConsumerTab] = useState<ConsumerTab>('home');
  const [farmerTab, setFarmerTab] = useState<FarmerTab>('farmHome');
  const [category, setCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAi, setShowAi] = useState(false);

  // ---- API 数据 ----
  const [products, setProducts] = useState<Product[]>([]);
  const [appCategories, setAppCategories] = useState<AppCategory[]>(APP_CATEGORIES);
  const [rawCategories, setRawCategories] = useState<RawCategory[]>([]);
  const [paySheet, setPaySheet] = useState<{ orderId: number; amount: number } | null>(null);
  const [payingMethod, setPayingMethod] = useState<string | null>(null);
  const [profileEditor, setProfileEditor] = useState<Role | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [adopts, setAdopts] = useState<AdoptItem[]>([]);
  const [postsData, setPostsData] = useState<PostItem[]>([]);
  const [tasksData, setTasksData] = useState<TaskItem[]>([]);
  const [traceTimeline, setTraceTimeline] = useState<TraceStep[]>([]);
  const [productSource, setProductSource] = useState<ApiDataSource>('unavailable');
  const [categorySource, setCategorySource] = useState<ApiDataSource>('unavailable');
  const [adoptionSource, setAdoptionSource] = useState<ApiDataSource>('unavailable');
  const [productError, setProductError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        setProductError('');
        const [productResult, categoryResult, b, adoptionResult, po, ta, rawCategoriesData] = await Promise.all([
          fetchProductData().catch((error) => {
            console.error('[PRODUCT API ERROR]', error);
            setProductError(String(error));
            return { value: [], source: 'unavailable' as ApiDataSource, fallbackReason: '商品数据加载失败' };
          }), fetchMobileCategories(), fetchBanners(), fetchAdoptionPackageData(),
          fetchPosts(), fetchTasks(), fetchRawCategories().catch(() => [] as RawCategory[]),
        ]);
        setProducts(productResult.value);
        setProductSource(productResult.source);
        setProductError(productResult.fallbackReason || '');
        setAppCategories(categoryResult.value);
        setRawCategories(rawCategoriesData);
        setCategorySource(categoryResult.source);
        setBanners(b);
        setAdopts(adoptionResult.value);
        setAdoptionSource(adoptionResult.source);
        setPostsData(po);
        setTasksData(ta);
      } catch (e) {
        console.warn('API load failed, using empty data:', e);
      } finally {
        setDataLoading(false);
      }
    }
    loadAll();
  }, []);

  const safeProduct = createSafeProduct(products);
  const [consumerPage, setConsumerPage] = useState<ConsumerPage>('tabs');
  const [farmerPage, setFarmerPage] = useState<FarmerPage>('tabs');
  const [selectedProduct, setSelectedProduct] = useState<Product>(DEFAULT_PRODUCT);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [toast, setToast] = useState('');

  const routeKey = `${screen}:${screen === 'consumer' ? `${consumerPage}:${consumerTab}` : screen === 'farmer' ? `${farmerPage}:${farmerTab}` : role}`;
  const skipNextRoutePush = useRef(false);
  useEffect(() => {
    if (skipNextRoutePush.current) skipNextRoutePush.current = false;
    else window.history.pushState({ xiaomanheRoute: routeKey }, '', `#${routeKey}`);
    const onSystemBack = () => {
      skipNextRoutePush.current = true;
      if (showAi) setShowAi(false);
      else if (roleSwitchTarget) setRoleSwitchTarget(null);
      else if (screen === 'consumer' && consumerPage !== 'tabs') { setConsumerPage('tabs'); setConsumerTab('home'); }
      else if (screen === 'farmer' && farmerPage !== 'tabs') setFarmerPage('tabs');
      else if (screen === 'consumer' || screen === 'farmer' || screen === 'login') setScreen('identity');
      else if (screen === 'identity') setScreen('splash');
    };
    window.addEventListener('popstate', onSystemBack);
    return () => window.removeEventListener('popstate', onSystemBack);
  }, [routeKey, screen, consumerPage, consumerTab, farmerPage, farmerTab, showAi, roleSwitchTarget]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1400);
  };

  const navigateConsumerTab = (tab: ConsumerTab) => {
    setShowAi(false);
    if (tab === 'mall' || tab === 'trace') {
      setConsumerTab('home');
      setConsumerPage(tab);
      return;
    }
    setConsumerPage('tabs');
    setConsumerTab(tab);
  };
  const openConsumerCart = () => navigateConsumerTab('cart');
  const requireLogin = () => {
    if (session) return true;
    notify('请先登录');
    setScreen('login');
    return false;
  };
  const refreshSession = () => {
    fetchCurrentUser().then((u) => setSession((prev) => (prev ? { ...prev, ...u, token: prev.token } : u))).catch(() => {});
  };
  const checkout = () => {
    if (!requireLogin()) return;
    if (!selectedAddress) {
      notify('请先新增并选择收货地址');
      setConsumerPage('address');
      return;
    }
    setConsumerPage('checkout');
  };
  const paySheetOrder = (order: OrderRecord) => {
    setActiveOrder(order);
    setPaySheet({ orderId: order.id, amount: order.totalAmount });
  };
  const closePaySheet = () => {
    const orderId = paySheet?.orderId;
    setPaySheet(null);
    setPayingMethod(null);
    if (orderId !== undefined) setConsumerPage('orderDetail');
  };
  const confirmPay = async (method: 'wechat' | 'alipay') => {
    if (!paySheet || payingMethod) return;
    setPayingMethod(method);
    try {
      await completeTestPayment(paySheet.orderId, method);
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setActiveOrder(nextOrders.find((item) => item.id === paySheet.orderId) || null);
      setPaySheet(null);
      setPayingMethod(null);
      notify('支付成功');
      setConsumerPage('orderDetail');
    } catch (error) {
      setPayingMethod(null);
      notify(error instanceof Error ? error.message : '支付失败，请重试');
    }
  };
  const cancelOrderById = async (order: { id: number }) => {
    try {
      await cancelOrder(order.id);
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setActiveOrder(nextOrders.find((item) => item.id === order.id) || null);
      notify('订单已取消');
    } catch (error) {
      notify(error instanceof Error ? error.message : '订单取消失败');
    }
  };

  const filteredProducts = useMemo(
    () => products.filter((item) => (category === '' || category === 'all' || String(item.category_id) === category) && (!searchKeyword.trim() || item.name.includes(searchKeyword.trim()) || (item.origin || '').includes(searchKeyword.trim()))),
    [category, products, searchKeyword]
  );

  const loadTradeData = async () => {
    const [nextCart, nextAddresses, nextOrders] = await Promise.all([fetchCart(), fetchAddresses(), fetchOrders()]);
    setCartItems(nextCart);
    setAddresses(nextAddresses);
    setSelectedAddress((current) => nextAddresses.find((item) => item.id === current?.id) || nextAddresses.find((item) => item.isDefault) || nextAddresses[0] || null);
    setOrders(nextOrders);
  };

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) return;
    if (stored.isMock) {
      setSession(stored);
      return;
    }
    fetchCurrentUser()
      .then(async (user) => {
        setSession({ ...stored, ...user, token: stored.token });
        await loadTradeData();
      })
      .catch(() => {
        clearSession();
        setSession(null);
      });
  }, []);

  const enterRole = (nextRole: Role) => {
    setRole(nextRole);
    setScreen('login');
  };

  const completeLogin = () => {
    const nextSession = getStoredSession();
    setSession(nextSession);
    if (!nextSession?.isMock) {
      loadTradeData().catch((error) => notify(error instanceof Error ? error.message : '交易数据加载失败'));
    }
    if (nextSession?.identity !== 'farmer' || role === 'consumer') {
      setRole('consumer');
      setConsumerTab('home');
      setConsumerPage('tabs');
      setScreen('consumer');
    } else {
      setFarmerTab('farmHome');
      setFarmerPage('tabs');
      setScreen('farmer');
    }
  };

  const openRoleSwitchConfirm = () => {
    if (isRoleSwitching) return;
    if (screen === 'farmer') {
      setRoleSwitchTarget('consumer');
      return;
    }
    if (screen === 'consumer') {
      setRoleSwitchTarget('farmer');
      return;
    }
    setScreen('identity');
  };

  const completeRoleSwitch = (nextRole: Role) => {
    setShowAi(false);
    if (nextRole === 'consumer') {
      setRole('consumer');
      setConsumerTab('home');
      setConsumerPage('tabs');
      setScreen('consumer');
      return;
    }
    setRole('farmer');
    setFarmerTab('farmHome');
    setFarmerPage('tabs');
    setScreen('farmer');
  };

  const logoutConsumer = () => {
    setShowAi(false);
    setRoleSwitchTarget(null);
    setConsumerTab('home');
    setConsumerPage('tabs');
    setCartItems([]);
    setAddresses([]);
    setSelectedAddress(null);
    setOrders([]);
    setActiveOrder(null);
    clearSession();
    setSession(null);
    setRole('consumer');
    setScreen('identity');
    notify('已退出登录');
  };

  const confirmRoleSwitch = () => {
    if (!roleSwitchTarget || isRoleSwitching) return;
    const nextRole = roleSwitchTarget;
    setRoleSwitchTarget(null);
    setIsRoleSwitching(true);
    window.setTimeout(() => {
      completeRoleSwitch(nextRole);
      setIsRoleSwitching(false);
      notify(nextRole === 'consumer' ? '已进入消费者端' : '已进入农户端');
    }, 850);
  };

  const updateCartQuantity = async (productId: string, spec: string, nextQuantity: number) => {
    const item = cartItems.find((row) => row.product.id === productId && row.spec === spec);
    if (!item?.cartId) return notify('购物车数据尚未同步');
    try {
      await updateCartItem(item.cartId, Math.max(0, nextQuantity));
      await loadTradeData();
    } catch (error) {
      notify(error instanceof Error ? error.message : '购物车更新失败');
    }
  };

  const removeCartItem = async (productId: string, spec: string) => {
    const item = cartItems.find((row) => row.product.id === productId && row.spec === spec);
    if (!item?.cartId) return notify('购物车数据尚未同步');
    try {
      await removeCartItemApi(item.cartId);
      await loadTradeData();
      notify('已从购物车移除');
    } catch (error) {
      notify(error instanceof Error ? error.message : '购物车移除失败');
    }
  };

  return (
    <div className="viewport-shell">
      <ErrorBoundary>
      <main className="phone-frame">
        {screen === 'splash' && <Splash onStart={() => {
          if (!session) return setScreen('identity');
          const storedRole = session.identity === 'farmer' ? 'farmer' : 'consumer';
          setRole(storedRole);
          setScreen(storedRole);
        }} />}
        {screen === 'identity' && <Identity onSelect={enterRole} />}
        {screen === 'login' && <Login role={role} onBack={() => setScreen('identity')} onDone={completeLogin} />}
        {paySheet && screen === 'consumer' && <PaySheet amount={paySheet.amount} busy={payingMethod} onClose={closePaySheet} onPay={confirmPay} />}
        {profileEditor && <ProfileEditPage role={profileEditor} onClose={() => setProfileEditor(null)} notify={notify} />}
        {screen === 'consumer' && (
          <AppLayout
            title={appName}
            tabs={consumerTabs}
            active={consumerTab}
            onTab={(tab) => navigateConsumerTab(tab as ConsumerTab)}
            onAi={openConsumerCart}
            aiPosition={consumerAiPosition}
            onAiMove={setConsumerAiPosition}
            noHeader
            hideAi
            hideTabbar={consumerPage !== 'tabs'}
            variant="consumer-mp-shell"
          >
            {consumerPage === 'tabs' && consumerTab === 'home' && <ConsumerHome onTab={navigateConsumerTab} notify={notify} onProduct={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }} products={products} source={productSource} loading={dataLoading} error={productError} banners={banners} categories={appCategories} onOpenPage={setConsumerPage} onMallCategory={(cat) => { setCategory(cat); setConsumerTab('mall'); }} onSearch={(kw) => { setSearchKeyword(kw); setCategory(''); setConsumerTab('mall'); }} onAddCart={async (item) => { if (!requireLogin()) return; try { await addCartItem(item.id); await loadTradeData(); notify('已加入购物车'); } catch (error) { notify(error instanceof Error ? error.message : '加入购物车失败'); } }} />}
            {consumerPage === 'tabs' && consumerTab === 'mall' && <Mall category={category} setCategory={setCategory} categories={rawCategories} products={filteredProducts} onOpenCart={openConsumerCart} onBack={() => setConsumerTab('home')} productError={productError} source={productSource} categorySource={categorySource} canPurchase={productSource === 'real'} notify={notify} onAddCart={async (item) => { if (!requireLogin()) return; try { await addCartItem(item.id); await loadTradeData(); notify('已加入购物车'); } catch (error) { notify(error instanceof Error ? error.message : '加入购物车失败'); } }} onProduct={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }} />}
            {consumerPage === 'tabs' && consumerTab === 'trace' && <Trace onResult={() => setConsumerPage('traceResult')} notify={notify} traceTimeline={traceTimeline} safeProduct={safeProduct} onTraceResult={(result) => { setTraceTimeline(result.events); }} />}
            {consumerPage === 'tabs' && consumerTab === 'adopt' && <AdoptV2 onDetail={() => setConsumerPage('adoptDetail')} notify={notify} projects={adopts} source={adoptionSource} />}
            {consumerPage === 'tabs' && consumerTab === 'assistant' && <AiPanel pageMode onClose={() => setConsumerTab('home')} onCart={openConsumerCart} onPage={setConsumerPage} />}
            {consumerPage === 'tabs' && consumerTab === 'cart' && <div className="consumer-cart-tab"><div className="consumer-tab-title">购物车</div><CartPage cartItems={cartItems} onCheckout={checkout} onShop={() => setConsumerTab('home')} onUpdateQuantity={updateCartQuantity} onRemove={removeCartItem} /></div>}
            {consumerPage === 'tabs' && consumerTab === 'my' && <Profile role="consumer" onSwitch={openRoleSwitchConfirm} onOpenConsumerPage={setConsumerPage} onLogin={() => setScreen('login')} loggedIn={Boolean(session)} session={session} safeProduct={safeProduct} orders={orders} onEditProfile={() => setProfileEditor('consumer')} recommendProducts={products} onProduct={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }} />}
            {consumerPage !== 'tabs' && (
              <ConsumerSubPage
                page={consumerPage}
                product={selectedProduct}
                cartItems={cartItems}
                safeProduct={safeProduct}
                traceTimeline={traceTimeline}
                products={filteredProducts}
                categories={rawCategories}
                productError={productError}
                productSource={productSource}
                categorySource={categorySource}
                canPurchase={productSource === 'real'}
                category={category}
                setCategory={setCategory}
                onProductSelected={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }}
                onTraceResult={(result) => setTraceTimeline(result.events)}
                onBack={() => { setConsumerPage('tabs'); setConsumerTab('home'); }}
                onCartTab={openConsumerCart}
                onPage={setConsumerPage}
                onAddCart={async (item) => {
                  if (!requireLogin()) return;
                  try {
                    await addCartItem(item.id);
                    await loadTradeData();
                    notify('已加入购物车');
                  } catch (error) {
                    notify(error instanceof Error ? error.message : '加入购物车失败');
                  }
                }}
                onUpdateCartQuantity={updateCartQuantity}
                onRemoveCartItem={removeCartItem}
                addresses={addresses}
                selectedAddress={selectedAddress}
                onSelectAddress={setSelectedAddress}
                onAddressesChanged={() => loadTradeData()}
                orders={orders}
                activeOrder={activeOrder}
                onSelectOrder={setActiveOrder}
                onCheckout={checkout}
                onPay={async () => {
                  if (!selectedAddress || !cartItems.length) return notify('请先选择地址和商品');
                  try {
                    const created = await createOrder(cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })), selectedAddress.id, '');
                    await loadTradeData();
                    const nextOrders = await fetchOrders();
                    setOrders(nextOrders);
                    setActiveOrder(nextOrders.find((item) => item.id === created.orderId) || null);
                    setPaySheet({ orderId: created.orderId, amount: created.totalAmount });
                  } catch (error) {
                    notify(error instanceof Error ? error.message : '订单提交失败');
                  }
                }}
                onPayOrder={paySheetOrder}
                onCancelOrder={cancelOrderById}
                onEditProfile={() => setProfileEditor('consumer')}
                onProfileChanged={refreshSession}
                notify={notify}
                onLogout={logoutConsumer}
                onIdentity={openRoleSwitchConfirm}
                onLogin={() => setScreen('login')}
                loggedIn={Boolean(session)}
                adopts={adopts}
              />
            )}
          </AppLayout>
        )}
        {screen === 'farmer' && (
          <AppLayout
            title="农户工作台"
            tabs={farmerTabs}
            active={farmerTab}
            onTab={(tab) => {
              setFarmerTab(tab as FarmerTab);
              setFarmerPage('tabs');
            }}
            onAi={() => { setShowAi(false); setFarmerPage('voiceAssistant'); }}
            noHeader
            hideAi
            hideTabbar={farmerPage !== 'tabs'}
            variant="farmer-mp-shell"
          >
            {farmerPage === 'tabs' && farmerTab === 'farmHome' && <FarmerHomeMP onTab={setFarmerTab} onPage={setFarmerPage} />}
            {farmerPage === 'tabs' && farmerTab === 'shop' && <FarmerShopMP onPage={setFarmerPage} notify={notify} />}
            {farmerPage === 'tabs' && farmerTab === 'farming' && <FarmingMP />}
            {farmerPage === 'tabs' && farmerTab === 'environment' && <EnvironmentMP onPage={setFarmerPage} notify={notify} />}
            {farmerPage === 'tabs' && farmerTab === 'farmerMy' && <Profile role="farmer" onSwitch={openRoleSwitchConfirm} onOpenFarmerPage={setFarmerPage} onLogin={() => setScreen('login')} loggedIn={Boolean(session)} session={session} safeProduct={safeProduct} onEditProfile={() => setProfileEditor('farmer')} />}
            {farmerPage !== 'tabs' && <FarmerSubPageMP page={farmerPage} onBack={() => setFarmerPage('tabs')} onPage={setFarmerPage} nickname={session?.nickname} loggedIn={Boolean(session)} onSwitch={openRoleSwitchConfirm} onOpenGeneral={() => setFarmerPage('farmerGeneral')} onLogout={logoutConsumer} onEditProfile={() => setProfileEditor('farmer')} onAddress={() => setFarmerPage('farmerAddress')} onPrivacy={() => setFarmerPage('farmerPrivacy')} onProfileChanged={refreshSession} onLogin={() => setScreen('login')} notify={notify} addresses={addresses} selectedAddress={selectedAddress} onSelectAddress={setSelectedAddress} onAddressesChanged={() => loadTradeData()} />}
          </AppLayout>
        )}
        {screen === 'farmer' && !showAi && (
          <FarmerFloatingAssistant
            position={farmerAiPosition}
            onMove={setFarmerAiPosition}
            onOpen={() => { setShowAi(false); setFarmerPage('voiceAssistant'); }}
          />
        )}
        {showAi && screen === 'consumer' && <AiPanel onClose={() => setShowAi(false)} onPage={setConsumerPage} />}
        {roleSwitchTarget && (
          <RoleSwitchConfirm
            currentRole={screen === 'farmer' ? 'farmer' : 'consumer'}
            targetRole={roleSwitchTarget}
            onCancel={() => setRoleSwitchTarget(null)}
            onConfirm={confirmRoleSwitch}
          />
        )}
        {isRoleSwitching && <RoleSwitchLoading targetRole={roleSwitchTarget || (screen === 'farmer' ? 'consumer' : 'farmer')} />}
        {toast && <div className="global-toast-red">{toast}</div>}
      </main>
      </ErrorBoundary>
    </div>
  );
}

function RoleSwitchConfirm({
  currentRole,
  targetRole,
  onCancel,
  onConfirm
}: {
  currentRole: Role;
  targetRole: Role;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const currentLabel = currentRole === 'farmer' ? '农户端' : '消费者端';
  const targetLabel = targetRole === 'farmer' ? '农户端' : '消费者端';
  const targetDesc = targetRole === 'farmer'
    ? '进入农场管理、农事任务、环境设备和云店铺。'
    : '进入商城选购、认养农场、订单和品质溯源。';

  return (
    <div className="role-switch-mask" onClick={onCancel}>
      <section className="role-switch-card" onClick={(event) => event.stopPropagation()}>
        <div className="role-switch-icon"><img src={targetRole === 'farmer' ? '/assets/icons/icon-rice.png' : '/assets/icons/icon-cart.png'} alt="" /></div>
        <span>身份切换确认</span>
        <h3>从{currentLabel}切换到{targetLabel}</h3>
        <p>{targetDesc}</p>
        <div className="role-switch-actions">
          <button className="ghost" onClick={onCancel}>取消</button>
          <button onClick={onConfirm}>确认切换</button>
        </div>
      </section>
    </div>
  );
}

function RoleSwitchLoading({ targetRole }: { targetRole: Role }) {
  return (
    <div className="role-switch-loading">
      <section>
        <div className="role-switch-spinner"><i /><i /><i /></div>
        <b>正在切换到{targetRole === 'farmer' ? '农户端' : '消费者端'}</b>
        <span>正在同步首页、底部导航和身份权限</span>
      </section>
    </div>
  );
}

function Splash({ onStart }: { onStart: () => void }) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const steps = [22, 46, 68, 86, 100];
    const timers = steps.map((value, index) => window.setTimeout(() => setProgress(value), 260 + index * 280));
    const done = window.setTimeout(onStart, 1900);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
  }, [onStart]);

  return (
    <section className="splash page-full splash-dynamic" onClick={onStart}>
      <div className="splash-circle c1" />
      <div className="splash-circle c2" />
      <div className="splash-circle c3" />
      <div className="splash-main">
        <img className="brand-logo" src="/assets/brand-logo.png" alt={appName} />
        <h1>{appName}</h1>
        <p>让农业更智慧，让生活更美好</p>
        <div className="loading-track"><span style={{ width: `${progress}%` }} /></div>
        <small>{progress < 100 ? '正在准备耘露...' : '准备进入'}</small>
      </div>
      <div className="splash-footer-text">新鲜农货 · 云认养体验 · 农事记录</div>
      <i className="falling-leaf l1">🌿</i>
      <i className="falling-leaf l2">🌾</i>
      <i className="falling-leaf l3">🍃</i>
      <i className="falling-leaf l4">🌱</i>
    </section>
  );
}

function Identity({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <section className="identity page-full">
      <img className="brand-logo sm" src="/assets/brand-logo.png" alt="" />
      <h2>选择你的身份</h2>
      <p className="muted">不同身份会进入不同工作台</p>
      <button className="identity-card consumer" onClick={() => onSelect('consumer')}>
        <Store />
        <span><b>我是消费者</b><small>浏览农货图册、云认养与订单入口</small></span>
        <ChevronRight />
      </button>
      <button className="identity-card farmer" onClick={() => onSelect('farmer')}>
        <Wheat />
        <span><b>我是农户</b><small>查看农场、农事与认养管理体验</small></span>
        <ChevronRight />
      </button>
    </section>
  );
}

function Login({ role, onBack, onDone }: { role: Role; onBack: () => void; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loginHint, setLoginHint] = useState('');

  const submit = async () => {
    if (submitting) return;
    if (!agreed) {
      setLoginHint('请先阅读并同意服务协议');
      return;
    }
    const name = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) {
      setLoginHint('请输入正确的手机号');
      return;
    }
    if (!password || password.length < 6 || password.length > 20) {
      setLoginHint('密码需为 6-20 位');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setLoginHint('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    setLoginHint(mode === 'register' ? '正在注册...' : '正在登录...');
    try {
      if (mode === 'register') {
        await register(name, password, role);
      } else {
        await passwordLogin(name, password);
      }
      onDone();
    } catch (error) {
      setLoginHint(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login page-full">
      <button className="ghost-back" onClick={onBack}><ChevronLeft size={18} />返回</button>
      <h2>{role === 'consumer' ? '欢迎回来，消费者' : '欢迎回来，农户朋友'}</h2>
      <p className="muted">{mode === 'register' ? '注册' : '登录'}{appName}，开启智慧农业新体验</p>
      <div className="form-card">
        <label>手机号<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={mode === 'register' ? '设置手机号' : '请输入手机号'} /></label>
        <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? '设置密码（6-20 位）' : '请输入密码'} /></label>
        {mode === 'register' && <label>确认密码<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" /></label>}
        <button className={`primary-btn wide ${submitting ? 'loading' : ''}`} onClick={submit}>{submitting ? '请稍候...' : mode === 'register' ? '注册并进入' : '登录'}</button>
        <button className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLoginHint(''); }}>{mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}</button>
        {mode === 'login' && (
          <div className="oauth-row">
            <span className="oauth-divider">其他登录方式</span>
            <div className="oauth-btns">
              <button className="oauth-btn" onClick={() => setLoginHint('微信登录即将上线，敬请期待')}>微信登录</button>
              <button className="oauth-btn" onClick={() => setLoginHint('支付宝登录即将上线，敬请期待')}>支付宝登录</button>
            </div>
          </div>
        )}
        <button className={`agreement ${agreed ? 'checked' : ''}`} onClick={() => setAgreed((value) => !value)}><i />已阅读并同意《隐私服务协议》《用户服务协议》</button>
        {loginHint && <p className="login-hint">{loginHint}</p>}
      </div>
    </section>
  );
}

function AppLayout({
  title,
  tabs,
  active,
  onTab,
  onAi,
  aiPosition,
  onAiMove,
  noHeader,
  hideAi,
  hideTabbar,
  variant,
  children
}: {
  title: string;
  tabs: Array<{ id: string; label: string; icon: typeof Home }>;
  active: string;
  onTab: (id: string) => void;
  onAi: () => void;
  aiPosition?: { x: number; y: number } | null;
  onAiMove?: (position: { x: number; y: number }) => void;
  noHeader?: boolean;
  hideAi?: boolean;
  hideTabbar?: boolean;
  variant?: string;
  children: import('react').ReactNode;
}) {
  const [aiDrag, setAiDrag] = useState<null | { startX: number; startY: number; originX: number; originY: number; moved: boolean }>(null);
  const startAiDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    if (!onAiMove) return;
    const frame = event.currentTarget.closest('.app-screen') as HTMLElement | null;
    const frameRect = frame?.getBoundingClientRect();
    const rect = event.currentTarget.getBoundingClientRect();
    const originX = aiPosition?.x ?? (frameRect ? rect.left - frameRect.left : rect.left);
    const originY = aiPosition?.y ?? (frameRect ? rect.top - frameRect.top : rect.top);
    event.currentTarget.setPointerCapture(event.pointerId);
    setAiDrag({ startX: event.clientX, startY: event.clientY, originX, originY, moved: false });
  };
  const moveAiDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    if (!aiDrag || !onAiMove) return;
    const frame = event.currentTarget.closest('.app-screen') as HTMLElement | null;
    const frameRect = frame?.getBoundingClientRect();
    const width = frameRect?.width ?? window.innerWidth;
    const height = frameRect?.height ?? window.innerHeight;
    const nextX = Math.min(Math.max(12, aiDrag.originX + event.clientX - aiDrag.startX), width - 62);
    const nextY = Math.min(Math.max(18, aiDrag.originY + event.clientY - aiDrag.startY), height - 112);
    const moved = aiDrag.moved || Math.abs(event.clientX - aiDrag.startX) > 5 || Math.abs(event.clientY - aiDrag.startY) > 5;
    setAiDrag({ ...aiDrag, moved });
    onAiMove({ x: nextX, y: nextY });
  };
  const endAiDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    const wasMoved = aiDrag?.moved;
    setAiDrag(null);
    if (!wasMoved) onAi();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  };

  return (
    <section className={`app-screen ${noHeader ? 'no-header' : ''} ${variant || ''}`}>
      <header className="top-nav">
        <div><MapPin size={16} />昆明</div>
        <strong>{title}</strong>
        <button onClick={onAi}><Bot size={20} /></button>
      </header>
      <div className={`scroll-page ${hideTabbar ? 'without-tabbar' : ''}`}>{children}</div>
      {!hideAi && (
        <button
          className={`ai-ball ${aiDrag ? 'dragging' : ''}`}
          style={aiPosition ? { left: aiPosition.x, top: aiPosition.y, right: 'auto', bottom: 'auto' } : undefined}
          onPointerDown={startAiDrag}
          onPointerMove={moveAiDrag}
          onPointerUp={endAiDrag}
          onPointerCancel={() => setAiDrag(null)}
          onClick={onAiMove ? undefined : onAi}
        >
          <Bot size={24} />
        </button>
      )}
      {!hideTabbar && (
        <nav className="tabbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} data-tab-id={tab.id} className={active === tab.id ? 'active' : ''} onClick={() => onTab(tab.id)}>
                {variant === 'consumer-mp-shell' ? <img src={`/assets/miniprogram/sevenfresh/${tab.id === 'my' ? 'my' : tab.id}${active === tab.id ? '-active' : ''}.png`} alt="" /> : variant === 'farmer-mp-shell' ? <img src={`/assets/miniprogram/farmer-icons/${({ environment: 'trace', shop: 'mall', farmHome: 'home', farming: 'leaf', farmerMy: 'my' } as Record<string, string>)[tab.id]}${active === tab.id ? '' : '-muted'}.png`} alt="" /> : <Icon size={21} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </section>
  );
}

const HOME_BANNERS: Array<{ id: string; image: string; title: string; target: 'seasonal' | 'adopt' | 'trace' | 'mall' | 'category' }> = [
  { id: 'banner-fresh', image: '/assets/miniprogram/banners/banner-fresh.jpg', title: '产地直连 把新鲜带回家', target: 'seasonal' },
  { id: 'banner-v5-mango', image: '/assets/miniprogram/banners/banner-v5-mango.jpg', title: '时令鲜果 果园现摘', target: 'seasonal' },
  { id: 'banner-adopt', image: '/assets/miniprogram/banners/banner-adopt.jpg', title: '云认养 见证生长', target: 'adopt' },
  { id: 'banner-v5-apple', image: '/assets/miniprogram/banners/banner-v5-apple.jpg', title: '枝头到舌尖 只差一键', target: 'seasonal' },
  { id: 'banner-own', image: '/assets/miniprogram/banners/banner-own.jpg', title: '耘露优选 自有品牌', target: 'category' },
  { id: 'banner-v5-veggie', image: '/assets/miniprogram/banners/banner-v5-veggie.jpg', title: '时令蔬菜 每日现采', target: 'seasonal' },
  { id: 'banner-reference-v4', image: '/assets/miniprogram/banners/banner-reference-v4.jpg', title: '耘露好物 轻松挑选', target: 'mall' }
];
function ConsumerHome({ onTab, onProduct, notify, products, source, loading, error, banners, categories, onOpenPage, onMallCategory, onSearch, onAddCart }: { onTab: (tab: ConsumerTab) => void; onProduct: (item: Product) => void; notify: (message: string) => void; products: Product[]; source: ApiDataSource; loading: boolean; error: string; banners: Banner[]; categories: RawCategory[]; onOpenPage: (page: ConsumerPage) => void; onMallCategory: (categoryId: string) => void; onSearch: (keyword: string) => void; onAddCart: (item: Product) => Promise<void> | void }) {
  const [keyword, setKeyword] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [regionFeed, setRegionFeed] = useState<RegionFeed | null>(null);
  // region = 收货地区（结算/配送用）；contentRegion = 地域内容推荐地区（只影响首页地域流）
  const [region] = useState<StoredRegion | null>(() => readStoredRegion(REGION_STORAGE_KEY));
  const [contentRegion] = useState<StoredRegion | null>(() => readStoredRegion(CONTENT_REGION_STORAGE_KEY));
  const [homeCategories, setHomeCategories] = useState<RawCategory[]>([]);
  const catalogOnly = source !== 'real';
  const displayed = products.slice(0, 8);
  const homeBanners: Array<{ id?: string; image: string; title: string; sub?: string; target?: string }> = [...HOME_BANNERS, ...(banners || [])];
  const smartServices = [
    { label: 'AI 农事问答', sub: '小露帮你挑', icon: Bot, action: () => onTab('assistant') },
    { label: '一物一码溯源', sub: '来源可查', icon: ScanLine, action: () => onTab('trace') },
    { label: '云认养农田', sub: '见证生长', icon: Sprout, action: () => onTab('adopt') },
    { label: '数字农田', sub: '环境实时监测', icon: CloudSun, action: () => onTab('mall') }
  ];
  const openBannerTarget = (banner: { target?: string; targetId?: string }) => {
    if (banner.target === 'adopt') onTab('adopt');
    else if (banner.target === 'trace') onTab('trace');
    else if (banner.target === 'category') onMallCategory('');
    else onTab('mall');
  };
  const openRegionItem = (item: { actionType?: string; actionTarget?: string }) => {
    const action = item.actionType || 'none';
    if (action === 'adopt') onTab('adopt');
    else if (action === 'trace') onTab('trace');
    else onTab('mall');
  };
  // 地域流优先用「切换地区」选中的推荐地区，未设置时回退到收货地区
  const feedProvince = contentRegion?.province || region?.province || undefined;
  const feedCity = contentRegion?.city || undefined;
  useEffect(() => {
    let alive = true;
    fetchRegionContent(feedProvince, feedCity).then((feed) => { if (alive) setRegionFeed(feed); }).catch(() => {});
    fetchRawCategories().then((list) => { if (alive && list.length) setHomeCategories(list); }).catch(() => {});
    return () => { alive = false; };
  }, [feedProvince, feedCity]);
  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = window.setInterval(() => setBannerIndex((index) => (index + 1) % homeBanners.length), 4200);
    return () => window.clearInterval(timer);
  }, [homeBanners.length]);
  return <div className="mp-consumer-home">
    <header className="mp-home-head">
      <div className="mp-home-nav"><button onClick={() => onOpenPage('region')}><img src="/assets/miniprogram/farmer-icons/pin.png" alt=""/>{region?.label || region?.city || region?.province || '选择收货地区'}⌄</button><button onClick={() => onOpenPage('messages')}><img src="/assets/miniprogram/farmer-icons/chat.png" alt=""/>消息</button></div>
      <form className="mp-home-search" onSubmit={(event) => { event.preventDefault(); if (keyword.trim()) onSearch(keyword.trim()); }}><Search size={17}/><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索商品、产地"/><button>搜索</button></form>
    </header>
    <div className="mp-home-body">
      {homeBanners.length > 0 ? (
        <div className="mp-home-swiper">
          <div className="mp-home-swiper-track" style={{ transform: `translateX(-${bannerIndex * 100}%)` }}>
            {homeBanners.map((banner, index) => (
              <button key={banner.id || index} className="mp-home-swiper-item" onClick={() => openBannerTarget(banner)}>
                <img src={banner.image} alt=""/>
                <span className="mp-hero-shade"/>
                <span className="mp-hero-copy"><small>耘露</small><b>{banner.title}</b><em>耘露好物 轻松挑选 ›</em></span>
              </button>
            ))}
          </div>
          {homeBanners.length > 1 && <div className="mp-home-swiper-dots">{homeBanners.map((_, index) => <i key={index} className={index === bannerIndex ? 'active' : ''} />)}</div>}
        </div>
      ) : (
        <button className="mp-seasonal-hero" onClick={() => onTab('mall')}><img src="/assets/miniprogram/hero-farm.jpg" alt=""/><span className="mp-hero-shade"/><span className="mp-hero-copy"><small>耘露</small><b>把新鲜带回家</b><i>发现土地里的好味道</i><em>逛逛当季农货 ›</em></span></button>
      )}
      <section className="mp-category-grid">{(homeCategories.length ? homeCategories : (categories || [])).slice(0, 8).map((item) => {
        const catIcons: Record<string, string> = { '精选推荐': 'cat-medal', '特产': 'cat-mountain', '农产品': 'cat-rice', '助农产品': 'cat-help', '冷链生鲜': 'cat-snow', '养生滋补': 'cat-herb', '粮油米面': 'cat-wheat', '新鲜水果': 'cat-medal', '时令蔬菜': 'chip-sprout', '肉禽蛋品': 'chip-box', '海鲜水产': 'cat-snow', '乳品烘焙': 'chip-wallet', '粮油调味': 'cat-wheat', '休闲零食': 'chip-search', '酒水饮料': 'cat-herb', '耘露优选': 'cat-medal', '日用百货': 'chip-box', '茶饮冲调': 'cat-herb', '坚果干货': 'cat-wheat' };
        const icon = catIcons[item.name];
        return (
          <button key={item.id || item.name} onClick={() => onMallCategory(item.id)}>
            <span>
              {item.imageUrl ? <img src={imageURL(item.imageUrl)} alt="" />
                : icon ? <img className="kk-icon" src={`/assets/miniprogram/ui-v2/icons/${icon}.png`} alt="" />
                : <i className="kk-letter">{item.name.slice(0, 1)}</i>}
            </span>
            <b>{item.name}</b>
          </button>
        );
      })}</section>
      <section className="mp-smart-section">
        <div className="mp-smart-head">
          <div><b>耘露智慧 · 数字农业</b><span>数字赋能乡村振兴</span></div>
          <em>AI</em>
        </div>
        <div className="mp-smart-grid">{smartServices.map((item) => <button key={item.label} onClick={item.action}><span><item.icon size={20}/></span><b>{item.label}</b><small>{item.sub}</small></button>)}</div>
      </section>
      {regionFeed && regionFeed.groups.length > 0 && (
        <section className="mp-region-feed">
          <div className="mp-region-head">
            <div className="mp-region-title-block">
              <div className="mp-region-title-row"><b>{regionFeed.city || regionFeed.province}</b><em>{regionFeed.located ? '已定位' : '为你推荐'}</em></div>
              <span>{regionFeed.slogan}</span>
            </div>
            <button onClick={() => onOpenPage('regionContent')}>切换地区 ›</button>
          </div>
          {regionFeed.groups.map((group) => (
            <div className="mp-region-group" key={group.type || group.title}>
              <div className="mp-region-group-head"><b>{group.title}</b><span>{group.subtitle}</span></div>
              <div className="mp-region-scroll">
                {group.items.map((item) => (
                  <button className="mp-region-card" key={item.id} onClick={() => openRegionItem(item)}>
                    <div className="mp-region-media">{item.imageUrl ? <img src={imageURL(item.imageUrl)} alt=""/> : <img src="/assets/miniprogram/farmer-icons/leaf.png" alt=""/>}</div>
                    <div className="mp-region-body">
                      <b>{item.title}</b>
                      <span>{item.subtitle}</span>
                      {item.tags.length > 0 && <div className="mp-region-tags">{item.tags.map((tag) => <em key={tag}>{tag}</em>)}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {error && <div className="mp-catalogue-note">商品加载失败：{error} <button onClick={() => window.location.reload()}>重试</button></div>}
      {products.length > 0 && <section className="mp-home-zones"><div className="mp-section-heading"><b>当季农货</b><button onClick={() => onTab('mall')}>查看分类 ›</button></div><div className="mp-zone-products">{products.slice(0, 3).map((item) => <button key={item.id} onClick={() => onProduct(item)}><img src={item.image} alt=""/><b>{item.name}</b><small>{item.origin || '产地信息待补充'}</small>{!catalogOnly && item.price > 0 ? <strong>¥{item.price}</strong> : <em>待上架</em>}</button>)}</div></section>}
      {catalogOnly && <p className="mp-catalogue-note">商品资料预览 · 交易服务尚未接入</p>}
      <section className="mp-products-section"><div className="mp-section-heading"><b>发现好农货</b><span>{catalogOnly ? '图册预览' : '商品'}</span></div>{loading ? <div className="mp-loading">正在加载商品…</div> : displayed.length ? <div className="mp-goods-grid">{displayed.map((item) => <button className="mp-goods-card" key={item.id} onClick={() => onProduct(item)}><span className="mp-goods-photo"><img src={item.image} alt=""/>{catalogOnly && <i>待上架</i>}</span><b>{item.name}</b><small>{item.origin || '产地待确认'}{item.unit ? ` · ${item.unit}` : ''}</small><div>{catalogOnly || !item.price ? <em>待上架</em> : <strong>¥{item.price}</strong>}<i className="mp-quick-add" onClick={(event) => { event.stopPropagation(); onAddCart(item); }}>+</i></div></button>)}</div> : <div className="mp-empty"><img src="/assets/miniprogram/farmer-icons/bag.png" alt=""/><b>还没有在售商品</b><span>商品上架后，会在这里展示</span></div>}</section>
      <button className="mp-home-end" onClick={() => onTab('mall')}>去分类发现更多农货 ›</button>
    </div>
  </div>;
}

function DataSourceBadge({ source, compact = false }: { source: ApiDataSource; compact?: boolean }) {
  const copy = source === 'real' ? '后台实时数据' : source === 'fallback' ? '兼容数据' : '暂未接入';
  return <span className={`data-source-badge ${source} ${compact ? 'compact' : ''}`} title={source === 'real' ? '来自后台 4.0 移动端接口' : '当前不是后台 4.0 实时数据'}>{copy}</span>;
}

function Mall({ category, setCategory, categories, products: list, productError, source, categorySource, canPurchase = source === 'real', onProduct, onAddCart, notify, onOpenCart, onBack }: { category: string; setCategory: (v: string) => void; categories: RawCategory[]; products: Product[]; productError: string; source: ApiDataSource; categorySource: ApiDataSource; canPurchase?: boolean; onProduct: (item: Product) => void; onAddCart: (item: Product) => Promise<void> | void; notify: (message: string) => void; onOpenCart: () => void; onBack: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');
  const keywordTrim = keyword.trim();
  const activeCategoryName = category === '' ? '全部商品' : (categories.find((c) => String(c.id) === category)?.name || '全部商品');
  const visibleList = useMemo(() => {
    let result = list.filter((item) =>
      !keywordTrim || `${item.name}${item.origin}${item.tag}`.toLowerCase().includes(keywordTrim.toLowerCase()),
    );
    if (sort === 'priceAsc') result = [...result].sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [keywordTrim, list, sort]);

  const togglePriceSort = () =>
    setSort((current) => (current === 'priceAsc' ? 'priceDesc' : current === 'priceDesc' ? 'default' : 'priceAsc'));

  return (
    <div className="mall-market-page">
      <section className="mall-top">
        <div className="mall-search-row">
          <button className="mall-back" onClick={onBack} aria-label="返回"><ChevronLeft size={18} /></button>
          <div className="mall-search">
            <Search size={15} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索商品、产地"
              aria-label="搜索商品或产地"
            />
            {keyword ? (
              <button className="mall-search-clear" onClick={() => setKeyword('')} aria-label="清空搜索">×</button>
            ) : null}
            <button className="mall-search-submit" onClick={() => notify('已为你筛选')}>搜索</button>
          </div>
        </div>
        <div className="mall-departments">
          <div className="department-scroll">
            <div className="department-row">
              {categories.map((item) => (
                <button
                  key={item.id}
                  className={`department ${category === String(item.id) ? 'selected' : ''}`}
                  onClick={() => setCategory(String(item.id))}
                >
                  <span className="department-photo">
                    {item.imageUrl
                      ? <img src={imageURL(item.imageUrl)} alt="" />
                      : <span className="dept-fallback">{item.name.slice(0, 1)}</span>}
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="department-all" onClick={() => setCategory('')}><span>全部</span><span>⌄</span></button>
        </div>
      </section>

      <section className="mall-body">
        <aside className="mall-categories">
          <button className={`mall-category ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>全部商品</button>
          {categories.map((item) => (
            <button
              key={item.id}
              className={`mall-category ${category === String(item.id) ? 'active' : ''}`}
              onClick={() => setCategory(String(item.id))}
            >
              {item.name}
            </button>
          ))}
        </aside>

        <section className="mall-shelf">
          <div className="mall-subcategory"><b>{activeCategoryName}</b></div>
          <div className="mall-sort-bar">
            <button className={sort === 'default' ? 'active' : ''} onClick={() => setSort('default')}>综合</button>
            <button className={sort !== 'default' ? 'active' : ''} onClick={togglePriceSort}>
              价格 <span>{sort === 'priceAsc' ? '↑' : sort === 'priceDesc' ? '↓' : '↕'}</span>
            </button>
          </div>
          {categorySource !== 'real' && <p className="mall-data-hint">分类为本地兼容展示，后台分类恢复后将自动同步。</p>}
          {productError ? (
            <div className="mall-state">
              <span className="mall-state-title">商品接口异常</span>
              <span className="mall-state-description">{productError}</span>
              <button className="mall-state-button" onClick={() => { setKeyword(''); setCategory(''); }}>重新加载</button>
            </div>
          ) : visibleList.length ? (
            <div className="mall-product-scroll">
              {visibleList.map((item) => (
                <article key={item.id} className="mall-product" onClick={() => onProduct(item)}>
                  <div className="mall-product-photo"><ProductImage item={item} /></div>
                  <div className="mall-product-info">
                    <b className="mall-product-name">{item.name}</b>
                    {item.origin ? <span className="mall-product-origin">{item.origin}</span> : null}
                    {item.unit ? <span className="mall-product-unit">{item.unit}</span> : null}
                    <div className="mall-product-bottom">
                      {canPurchase && item.price > 0
                        ? <span className="mall-product-price"><span>¥</span>{item.price}</span>
                        : <span className="mall-product-pending">{canPurchase ? '待上架' : '商品资料预览'}</span>}
                      {canPurchase && item.price > 0 && (
                        <button
                          className="mall-product-open"
                          onClick={(event) => { event.stopPropagation(); void onAddCart(item); }}
                          aria-label={`加入购物车：${item.name}`}
                        >+</button>
                      )}
                    </div>
                    {!canPurchase && <span className="mall-product-stock">价格库存尚未接入</span>}
                  </div>
                </article>
              ))}
              <div className="mall-list-footer">已经到底了</div>
            </div>
          ) : (
            <div className="mall-state">
              <span className="mall-state-title">{keywordTrim ? '没有找到相关商品' : '这个分类还没有商品'}</span>
              <span className="mall-state-description">换个关键词，或看看其他分类</span>
              <button className="mall-state-button" onClick={() => { setKeyword(''); setCategory(''); }}>查看全部</button>
            </div>
          )}
        </section>
      </section>

      <section className="mall-checkout-bar">
        <button className="mall-checkout-icon" onClick={onOpenCart} aria-label="打开购物车"><ShoppingCart size={22} /></button>
        <div className="mall-checkout-copy"><span>购物车</span><span>按农户分别结算</span></div>
        <button onClick={onOpenCart}>查看购物车</button>
      </section>
    </div>
  );
}

function Trace({ onResult, notify, traceTimeline, safeProduct, onTraceResult }: { onResult: () => void; notify: (message: string) => void; traceTimeline: TraceStep[]; safeProduct: (idx: number) => Product; onTraceResult: (result: { events: TraceStep[] }) => void }) {
  const [traceTab, setTraceTab] = useState<'lifecycle' | 'scan'>('lifecycle');
  const [traceCode, setTraceCode] = useState('XMHT-0003-0609');
  const [querying, setQuerying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [querySource, setQuerySource] = useState<ApiDataSource>('unavailable');
  const [queryError, setQueryError] = useState('请输入批次号后查询后台 4.0 溯源记录');
  const [queriedEvents, setQueriedEvents] = useState<TraceStep[]>([]);
  const [scanRecord, setScanRecord] = useState<Record<string, unknown> | null>(null);
  const traceProducts = [safeProduct(2), safeProduct(0), safeProduct(1), safeProduct(3), safeProduct(4)].filter(Boolean);
  const [selectedTraceId, setSelectedTraceId] = useState(traceProducts[0].id);
  const traceProduct = traceProducts.find((item) => item.id === selectedTraceId) || traceProducts[0];
  const recordText = (...keys: string[]): string => {
    if (!scanRecord) return '—';
    for (const key of keys) {
      const value = scanRecord[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') return String(value);
    }
    return '—';
  };
  const submitTrace = async () => {
    if (!traceCode.trim()) {
      notify('请输入批次号或扫描商品二维码');
      return;
    }
    setVerified(false);
    setQuerying(true);
    setScanRecord(null);
    setQueriedEvents([]);
    setQueryError('正在核验产地、检测与冷链记录');
    try {
      const result = await queryTrace(traceCode.trim());
      setQuerySource(result.source);
      setQueriedEvents(result.events);
      setScanRecord(result.record);
      onTraceResult(result);
      if (result.source !== 'real' || !result.record) {
        setQueryError(result.fallbackReason || '未找到该批次的后台验真记录');
        notify(result.fallbackReason || '溯源验真服务暂不可用');
        return;
      }
      setVerified(true);
      setQueryError('该批次已通过后台 4.0 官方验真');
      notify('验真通过，已加载本批次真实记录');
    } catch (error) {
      setQuerySource('unavailable');
      setScanRecord(null);
      setQueriedEvents([]);
      setQueryError(error instanceof Error ? error.message : '溯源查询失败，请稍后重试');
      notify('溯源查询失败，请稍后重试');
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="trace-clone-page">
      <div className="trace-clone-tabs">
        <button className={traceTab === 'lifecycle' ? 'active' : ''} onClick={() => setTraceTab('lifecycle')}>生命周期追溯</button>
        <button className={traceTab === 'scan' ? 'active' : ''} onClick={() => setTraceTab('scan')}>扫码溯源</button>
      </div>

      {traceTab === 'lifecycle' ? (
        <>
          <section className="trace-product-picker">
            <div><b>选择溯源商品</b><span>切换商品查看对应批次信息</span></div>
            <div className="trace-product-scroll">
              {traceProducts.map((item) => (
                <button key={item.id} className={item.id === selectedTraceId ? 'active' : ''} onClick={() => { setSelectedTraceId(item.id); notify(`已切换到${item.name}`); }}>
                  <img src={item.image} alt="" />
                  <span>{item.name}</span>
                  <small>{item.origin}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="trace-clone-hero">
            <div className="trace-clone-copy">
              <span><ShieldCheck size={14} />{traceTimeline.length ? '已接入溯源记录' : '溯源待接入'}</span>
              <h2>{traceProduct.name}</h2>
              <p>产地、检测与批次记录以后台 4.0 溯源接口为准。</p>
              <div className="trace-clone-meta">
                <p><MapPin size={16} />产地 <b>{traceProduct.origin}</b></p>
                <p><Leaf size={16} />品类 <b>{traceProduct.category_name}</b></p>
                <p><PackageSearch size={16} />溯源记录 <b>{traceTimeline.length ? `${traceTimeline.length} 条` : '暂未接入'}</b></p>
              </div>
              <button onClick={() => setTraceTab('scan')}><ScanLine size={17} />扫码溯源</button>
            </div>
            <img src={traceProduct.image} alt="" />
          </section>

          <section className="trace-clone-origin">
            <div>
              <b>产地信息</b>
              <p><MapPin size={14} />{traceProduct.origin}</p>
              <small>生命周期追溯 · 以后台溯源记录为准</small>
            </div>
            <div className="trace-clone-map"><DataSourceBadge source={traceTimeline.length ? 'real' : 'unavailable'} compact /><MapPin size={24} /></div>
          </section>

          <section className="trace-clone-flow">
            <div className="trace-clone-title"><b>溯源流程</b><span>{traceTimeline.length ? '本批次真实记录' : '暂未接入'}</span></div>
            {!traceTimeline.length && <p className="data-source-hint">该产品溯源记录暂未接入，请切换到「扫码溯源」查询真实批次。</p>}
            {traceTimeline.map((item, index) => (
              <article key={`${item.stage}-${index}`} className="plain">
                <i />
                <div>
                  <b>{item.stage}</b>
                  <p>{item.desc}</p>
                  <small>{item.time || '时间待补充'}</small>
                </div>
                <button onClick={() => notify('该记录详情待后台补充')}><span>已记录</span><em>查看</em></button>
              </article>
            ))}
          </section>

          <section className="trace-clone-chain">
            <ShieldCheck size={25} />
            <div>
              <b>区块链存证 · 全程可信</b>
              <p>本商品溯源信息已上链存证，真实可靠不可篡改</p>
            </div>
            <ChevronRight size={18} />
          </section>
        </>
      ) : (
        <>
          <section className="trace-scan-search">
            <div className="trace-input-box">
              <Search size={16} />
              <input value={traceCode} onChange={(event) => setTraceCode(event.target.value)} placeholder="输入批次号，如 XMHT-0003-0609" />
            </div>
            <div className="trace-scan-actions">
              <button onClick={() => { void submitTrace(); }} disabled={querying}>{querying ? '查询中…' : '查询溯源'}</button>
              <button className="scan" onClick={() => notify('扫码功能建设中，请手动输入批次号')}><ScanLine size={17} />扫码</button>
            </div>
          </section>

          {scanRecord && (
            <section className="trace-scan-result">
              <div className="trace-clone-title"><b>溯源结果</b><span>{verified ? '已通过验真' : '待验证'}</span></div>
              <div className="trace-scan-status"><DataSourceBadge source={querySource} compact /><small>{verified ? '该批次已通过后台 4.0 官方验真' : '正在核验批次记录'}</small></div>
              <div className="trace-scan-meta">
                <p><span>产品</span><b>{recordText('product')}</b></p>
                <p><span>农户</span><b>{recordText('farmer')}</b></p>
                <p><span>批次</span><b>{recordText('code', 'batchNo')}</b></p>
                <p><span>采收时间</span><b>{recordText('harvestTime')}</b></p>
              </div>
            </section>
          )}

          <section className="trace-clone-flow">
            <div className="trace-clone-title"><b>溯源时间线</b><span>{verified ? '本批次真实记录' : '查询后展示'}</span></div>
            {!queriedEvents.length && <p className="data-source-hint">{queryError}</p>}
            {queriedEvents.map((item, index) => (
              <article key={`${item.stage}-${index}`} className="plain">
                <i />
                <div>
                  <b>{item.stage}</b>
                  <p>{item.desc}</p>
                  <small>{item.time || '时间待补充'}</small>
                </div>
                <button onClick={() => notify('该记录详情待后台补充')}><span>{verified ? '已核验' : '已记录'}</span><em>查看</em></button>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );

}

function AdoptV2({ onDetail, notify, projects, source }: { onDetail: () => void; notify: (message: string) => void; projects: AdoptItem[]; source: ApiDataSource }) {
  const [view, setView] = useState<'available' | 'mine'>('available');
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('xm-adopt-saved') || '[]') as string[]; } catch { return []; } });
  const [orders, setOrders] = useState<AdoptionOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOrdersLoading(true);
    fetchAdoptionOrders()
      .then((list) => { if (!cancelled) setOrders(list); })
      .catch(() => { if (!cancelled) setOrders([]); })
      .finally(() => { if (!cancelled) setOrdersLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loggedIn = Boolean(getStoredSession());

  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem('xm-adopt-saved', JSON.stringify(next));
    notify(current.includes(id) ? '已取消关注' : '已关注该认养方案');
    return next;
  });

  const clampProgress = (value: number) => Math.min(100, Math.max(0, value));

  const orderStatusText = (order: AdoptionOrder) => {
    if (order.statusText) return order.statusText;
    switch (order.status) {
      case 'growing': return '生长中';
      case 'shipped': return '已发货';
      case 'harvested': return '待采收';
      case 'completed': return '已完成';
      default: return '认养中';
    }
  };

  const ongoingCount = orders.filter((order) => order.status === 'growing').length;
  const shippedCount = orders.filter((order) => order.status === 'shipped').length;

  return <div className="mp-adopt-page">
    <header className="mp-adopt-head"><b>云认养</b><span>从田间到餐桌</span></header>
    <div className="mp-adopt-switch"><button className={view === 'available' ? 'active' : ''} onClick={() => setView('available')}>发现农场</button><button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>我的认养</button></div>
    {view === 'available' ? (
      <>
        <button className="mp-adopt-hero" onClick={onDetail}>
          <img src="/assets/miniprogram/hero-farm.jpg" alt=""/>
          <span><small>耘露 · 田园生活</small><b>和一季新鲜，慢慢相遇</b><i>看见生长的每一步，读懂餐桌上的好食材</i><em>走进农场 ›</em></span>
        </button>
        <div className="mp-adopt-quick">
          <button onClick={onDetail}><img src="/assets/miniprogram/farmer-icons/home.png" alt=""/><span><b>走进农场</b><small>认识土地和种植</small></span>›</button>
          <button onClick={onDetail}><img src="/assets/miniprogram/farmer-icons/camera.png" alt=""/><span><b>生长日记</b><small>图文记录这一季</small></span>›</button>
        </div>
        <section className="mp-adopt-section">
          <div><b>认养一份期待</b><small>先了解周期与交付，再选择你的那一季</small></div>
          <em>{projects.length} 个方案</em>
        </section>
        {projects.length > 0 ? projects.map((item) => (
          <article className="mp-adopt-project" key={item.id}>
            <button className="mp-adopt-photo" onClick={onDetail}>
              <img src={item.image} alt={item.name}/>
              <span>{item.stage || '认养中'}</span>
            </button>
            <div className="mp-adopt-info">
              <b>{item.name}</b>
              <small>{item.output}</small>
              <div>
                <span>生长周期 <strong>{item.period}</strong></span>
                <span>剩余份数 <strong>{item.left > 0 ? `${item.left} 份` : '已售罄'}</strong></span>
              </div>
              <div className="mp-adopt-progress">
                <span>生长进度 <strong>{item.progress}%</strong></span>
                <i><em style={{ width: `${clampProgress(item.progress)}%` }} /></i>
              </div>
              <footer>
                <i>¥{item.price || '待定'}/份</i>
                <button onClick={onDetail}>了解这一季 ›</button>
                <button className={saved.includes(String(item.id)) ? 'saved' : ''} onClick={() => toggleSaved(String(item.id))}>{saved.includes(String(item.id)) ? '♥' : '♡'}</button>
              </footer>
            </div>
          </article>
        )) : (
          <div className="mp-adopt-empty">
            <img src="/assets/miniprogram/farmer-icons/heart.png" alt=""/>
            <b>{source !== 'real' ? '认养方案加载中…' : '暂无认养方案'}</b>
            <span>{source !== 'real' ? '正在从农场获取最新认养方案，请稍候。' : '农场暂未上架可认养的方案，敬请期待。'}</span>
          </div>
        )}
      </>
    ) : (
      <section className="mp-adopt-mine">
        {!loggedIn ? (
          <div className="mp-adopt-empty">
            <img src="/assets/miniprogram/farmer-icons/heart.png" alt=""/>
            <b>登录后查看我的认养</b>
            <span>登录后可查看认养订单、生长进度与预计采收时间。</span>
          </div>
        ) : ordersLoading && orders.length === 0 ? (
          <div className="mp-adopt-empty"><b>认养订单加载中…</b><span>正在同步你的认养订单。</span></div>
        ) : orders.length === 0 ? (
          <div className="mp-adopt-empty">
            <img src="/assets/miniprogram/farmer-icons/heart.png" alt=""/>
            <b>还没有认养订单</b>
            <span>去发现农场挑选一份认养方案，开始这一季的陪伴。</span>
          </div>
        ) : (
          <>
            <div className="mp-adopt-stats">
              <div><b>{orders.length}</b><span>认养订单</span></div>
              <div><b>{ongoingCount}</b><span>进行中</span></div>
              <div><b>{shippedCount}</b><span>待收货</span></div>
            </div>
            {orders.map((order) => (
              <article className="mp-adopt-order" key={order.id || order.orderNo}>
                <div className="mp-adopt-order-head">
                  <b>{order.packageName || order.productName || '认养订单'}</b>
                  <span>{orderStatusText(order)}</span>
                </div>
                <div className="mp-adopt-order-growth">
                  <span>生长进度 <b>{order.growthPercent}%</b></span>
                  <i><em style={{ width: `${clampProgress(order.growthPercent)}%` }} /></i>
                </div>
                <div className="mp-adopt-order-meta">
                  <span>订单号 <b>{order.orderNo}</b></span>
                  <span>预计采收 <b>{order.harvestDate || '待定'}</b></span>
                </div>
                <footer><button onClick={onDetail}>查看生长日记 ›</button></footer>
              </article>
            ))}
          </>
        )}
      </section>
    )}
  </div>;
}

function Adopt({ onDetail, notify }: { onDetail: () => void; notify: (message: string) => void }) {
  const [energy, setEnergy] = useState(128);
  const [growth, setGrowth] = useState(76);
  const [collectedEnergy, setCollectedEnergy] = useState<number[]>([]);
  const [watering, setWatering] = useState(false);
  const [finishedTasks, setFinishedTasks] = useState<string[]>([]);
  const [carePulse, setCarePulse] = useState<string | null>(null);
  const [showLive, setShowLive] = useState(false);
  const [liveCared, setLiveCared] = useState(false);
  const adoptProjects = [
    { id: 1, name: '寿光智慧大棚认养', image: '/assets/farm/greenhouse.jpg', stage: '开花坐果期', period: '90天', output: '约12斤番茄', progress: growth, left: 18, price: 199, tag: '实时看棚' },
    { id: 2, name: '稻田守护计划', image: '/assets/farm/rice-field.jpg', stage: '拔节生长期', period: '120天', output: '约20斤新米', progress: 58, left: 25, price: 269, tag: '秋收寄送' },
    { id: 3, name: '加工番茄采收季', image: '/assets/farm/tomato-harvest.jpg', stage: '成熟采收期', period: '60天', output: '约15斤番茄', progress: 86, left: 12, price: 239, tag: '采收直播' }
  ];

  const collectEnergy = (id: number, amount: number) => {
    if (collectedEnergy.includes(id)) {
      notify('这份能量已经收取过了');
      return;
    }
    setCollectedEnergy((value) => [...value, id]);
    setEnergy((value) => value + amount);
    setCarePulse(`+${amount} 能量`);
    window.setTimeout(() => setCarePulse(null), 900);
    notify(`已收取 ${amount}g 农场能量`);
  };

  const waterFarm = () => {
    if (energy < 20) {
      notify('能量不足，完成任务可获得更多能量');
      return;
    }
    setEnergy((value) => Math.max(value - 20, 0));
    setGrowth((value) => Math.min(value + 3, 100));
    setWatering(true);
    setCarePulse('浇水完成 +3%');
    window.setTimeout(() => setWatering(false), 1100);
    window.setTimeout(() => setCarePulse(null), 1100);
    notify('浇水成功，番茄成长值 +3%');
  };

  const openLive = () => {
    setShowLive(true);
    setCarePulse('打开今日实况');
    window.setTimeout(() => setCarePulse(null), 900);
    notify('今日农场实况已更新');
  };

  const careFromLive = () => {
    if (energy < 20) {
      waterFarm();
      return;
    }
    waterFarm();
    setLiveCared(true);
  };

  const finishTask = (name: string, award: string) => {
    if (finishedTasks.includes(name)) {
      notify('今日任务已完成');
      return;
    }
    setFinishedTasks((value) => [...value, name]);
    setEnergy((value) => value + Number(award.replace(/\D/g, '')));
    setCarePulse(`${award} 能量`);
    window.setTimeout(() => setCarePulse(null), 900);
    notify(`${name}完成，能量 ${award}`);
  };
  const harvestDays = Math.max(1, Math.round((100 - growth) * 0.75));

  return (
    <div className="adopt-page-red adopt-forest-page">
      <section className={`forest-hero ${watering ? 'watering' : ''}`}>
        <div className="forest-sky">
          <button className={`energy-bubble b1 ${collectedEnergy.includes(1) ? 'collected' : ''}`} onClick={() => collectEnergy(1, 18)}>+18</button>
          <button className={`energy-bubble b2 ${collectedEnergy.includes(2) ? 'collected' : ''}`} onClick={() => collectEnergy(2, 26)}>+26</button>
          <button className={`energy-bubble b3 ${collectedEnergy.includes(3) ? 'collected' : ''}`} onClick={() => collectEnergy(3, 12)}>+12</button>
          <div className="forest-copy">
            <span>ADOPTED FARM</span>
            <h2>我的认养番茄</h2>
            <p>每天轻轻照料一次，等它成熟后从产地寄到家。</p>
          </div>
          <div className="forest-energy-card">
            <small>陪伴值</small>
            <b>{energy}</b>
          </div>
          <div className="adopt-immersive-stage">
            <div className="farm-weather-chip"><CloudSun size={16} /><span>26°C · 湿度 68%</span></div>
            <div className="farm-live-chip"><i />农场实时在线</div>
            <div className="farm-sunbeam" />
            <div className="farm-depth-row r1" />
            <div className="farm-depth-row r2" />
            <div className="farm-depth-row r3" />
            <div className="tomato-plant">
              <i className="stem" />
              <i className="leaf l1" />
              <i className="leaf l2" />
              <i className="leaf l3" />
              <i className="leaf l4" />
              <i className="fruit f1" />
              <i className="fruit f2" />
              <i className="fruit f3" />
              <i className="fruit f4" />
            </div>
            <div className="farm-ground">
              <span />
              <span />
              <span />
            </div>
            <div className="farm-stage-progress">
              <b>{growth}%</b>
              <span>{harvestDays} 天后预计采收</span>
            </div>
            {watering && <div className="stage-water-drops"><i /><i /><i /><i /><i /><i /></div>}
            {carePulse && <div className="care-pulse-toast">{carePulse}</div>}
          </div>
          {watering && <div className="water-rain"><i /><i /><i /><i /><i /></div>}
        </div>
        <div className="farm-island">
          <div className="care-orb-scene">
            <div className="care-ring" style={{ ['--growth' as string]: `${growth}%` }}>
              <div className="care-ring-inner">
                <Sprout size={36} />
                <b>{growth}%</b>
                <span>成长中</span>
              </div>
            </div>
            <div className="care-orb-caption">
              <b>距离采收约 18 天</b>
              <span>今日农场已更新照片</span>
            </div>
          </div>
        </div>
        <div className="forest-actions">
          <button onClick={waterFarm}>浇水照料</button>
          <button onClick={openLive}>看实况</button>
          <button onClick={onDetail}>成长档案</button>
        </div>
      </section>

      <section className="adopt-retention-card">
        <div>
          <span>连续陪伴 7 天</span>
          <b>今天再照料一次，采收权益将提升</b>
          <p>可解锁专属采收提醒、优先发货和成长证书。</p>
        </div>
        <button onClick={waterFarm}>去照料</button>
      </section>

      <section className="forest-progress-card">
        <div className="trace-section-head"><b>寿光智慧大棚成长中</b><span>{growth}%</span></div>
        <div className="progress"><span style={{ width: `${growth}%` }} /></div>
        <div className="forest-progress-meta">
          <span>已陪伴 72 天</span>
          <span>18 天后采收</span>
          <span>收获寄到家</span>
        </div>
      </section>

      <section className="farm-live-panel forest-live-panel">
        <div className="farm-live-title"><b>今天的农场</b><button onClick={openLive}>查看照片</button></div>
        <div className="farm-live-grid">
          <span>已晨检<b>长势好</b></span>
          <span>新照片<b>3 张</b></span>
          <span>预计采收<b>18 天</b></span>
        </div>
      </section>

      <section className="forest-task-card">
        <div className="trace-section-head"><b>今日轻互动</b><span>让农场更亲近</span></div>
        {[
          ['照料一次番茄', '+20'],
          ['查看今日照片', '+18'],
          ['领取成长周报', '+18']
        ].map(([name, award]) => (
          <button key={name} className={finishedTasks.includes(name) ? 'done' : ''} onClick={() => finishTask(name, award)}>
            <Sprout size={17} />
            <span>{name}</span>
            <b>{finishedTasks.includes(name) ? '已完成' : award}</b>
          </button>
        ))}
      </section>

      <section className="farm-diary-card">
        <div className="trace-section-head"><b>农场主今日更新</b><span>08:42</span></div>
        <div className="farm-diary-body">
          <img src="/assets/farm/tomato-harvest.jpg" alt="" />
          <div>
            <h3>大棚完成晨检，番茄坐果稳定</h3>
            <p>农场主今天上传了 3 张现场照片，番茄果实饱满，预计 18 天后进入采收。</p>
            <button onClick={onDetail}>查看成长档案</button>
          </div>
        </div>
      </section>

      <div className="trace-section-head adopt-list-head forest-list-head"><b>可认养农场</b><span>真实产出，到季寄送</span></div>
      {adoptProjects.map((item) => (
        <article className="adopt-project-card forest-project-card" key={item.id} onClick={onDetail} role="button" tabIndex={0} aria-label={`查看${item.name}`}>
          <img src={item.image} alt="" />
          <div className="adopt-project-body">
            <div className="adopt-project-title"><h3>{item.name}</h3><span>{item.tag}</span></div>
            <p>{item.stage} · 周期 {item.period} · 预计产出 {item.output}</p>
            <div className="progress"><span style={{ width: `${item.progress}%` }} /></div>
            <div className="adopt-project-foot">
              <small>剩余 {item.left} 份</small>
              <strong>¥{item.price}<em>/季起</em></strong>
            </div>
          </div>
        </article>
      ))}

      {showLive && (
        <div className="adopt-live-mask" onClick={() => setShowLive(false)}>
          <section className="adopt-live-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="adopt-live-head">
              <div>
                <span>今日实况</span>
                <b>寿光智慧大棚 · 08:42 更新</b>
              </div>
              <button onClick={() => setShowLive(false)}>关闭</button>
            </div>
            <div className="adopt-live-main">
              <img src="/assets/farm/tomato-harvest.jpg" alt="番茄大棚现场" />
              <div className="adopt-live-status">
                <span><i />{liveCared ? '你已完成今日照料' : '农场主已巡检'}</span>
                <b>番茄坐果稳定，叶面水分充足</b>
                <p>今天完成晨检、补光和温湿度复核。预计 16 天后进入采收排期，到季优先为认养用户发货。</p>
              </div>
            </div>
            <div className="adopt-live-proof">
              <span>温度<b>26°C</b></span>
              <span>湿度<b>68%</b></span>
              <span>新照片<b>3 张</b></span>
              <span>采收<b>16 天</b></span>
            </div>
            <button className={`adopt-live-primary ${liveCared ? 'done' : ''}`} onClick={careFromLive}>
              {liveCared ? '已照料，成长 +3%' : '顺手照料一次'}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

const farmerReminders = [
  { id: 1, name: '小番茄二次追肥', time: '08:30', type: '重要', done: true, desc: '1号棚坐果稳定，建议水肥一体化 20 分钟。' },
  { id: 2, name: '辣椒棚除草巡检', time: '10:00', type: '日常', done: false, desc: '重点检查边沟杂草和叶背虫卵。' },
  { id: 3, name: '大棚通风设备检查', time: '14:30', type: '紧急', done: false, desc: '午后棚内温度偏高，通风窗需复核。' },
  { id: 4, name: '玉米地灌溉计划', time: '17:00', type: '计划', done: false, desc: 'A区土壤湿度低于阈值，建议傍晚补水。' }
];

const farmerCrops = [
  { name: '阳光小番茄', icon: '🍅', status: '生长中', progress: 76, area: '3.2亩', location: '1号智能棚', harvest: '18天后', health: '优' },
  { name: '水果黄瓜', icon: '🥒', status: '待采收', progress: 88, area: '1.8亩', location: '2号智能棚', harvest: '7天后', health: '良' },
  { name: '甜玉米', icon: '🌽', status: '拔节期', progress: 52, area: '6亩', location: '露天A区', harvest: '36天后', health: '优' }
];

const farmerArchives = [
  { id: 1, name: '高原番茄', icon: '/assets/icons/icon-tomato.png', area: '3.5亩', plantDays: 65, status: '生长期', yield: '约2800斤', photo: '/assets/products/market/tomato.jpg', note: '使用有机肥，长势良好。注意预防晚疫病。' },
  { id: 2, name: '线椒', icon: '/assets/icons/icon-bell-pepper.png', area: '2.0亩', plantDays: 42, status: '结果期', yield: '约1500斤', photo: '/assets/products/market/green-vegetable.jpg', note: '已进入采收期，注意及时采摘避免老化。' },
  { id: 3, name: '紫皮土豆', icon: '/assets/icons/icon-potato.png', area: '5.0亩', plantDays: 15, status: '幼苗期', yield: '约6000斤', photo: '/assets/farm/field-base.jpg', note: '刚出苗，注意保温和浇水管理。' }
];

const farmerHistory = [
  { id: 1, crop: '番茄叶片', date: '今天 09:30', status: '已处理', icon: '/assets/icons/icon-tomato.png', desc: '叶片健康，无病害迹象，光合作用状态良好。' },
  { id: 2, crop: '辣椒蚜虫', date: '昨天 14:20', status: '待观察', icon: '/assets/icons/icon-bell-pepper.png', desc: '少量蚜虫聚集，建议 3 天后复查虫口密度。' },
  { id: 3, crop: '黄瓜白粉病', date: '03-26 08:45', status: '待观察', icon: '/assets/icons/icon-cucumber.png', desc: '检测到白粉病早期症状，建议加强通风。' }
];

const farmerCommunityPosts = [
  {
    id: 1,
    userName: '老李种菜',
    levelText: '💎钻石',
    location: '云南·大理',
    time: '2小时前',
    content: '分享一下我种番茄的心得：番茄开花期一定要控制好温度，白天25-28度最好。有机肥配合叶面肥，今年产量比去年高了三成。',
    hasVoice: false,
    voiceDuration: '',
    likes: 86,
    comments: 23,
    views: 520,
    liked: false,
    showComments: true,
    commentList: ['学到了！我也试试这个方法', '请问用的什么品种的番茄苗？']
  },
  {
    id: 2,
    userName: '高原农夫',
    levelText: '⭐星耀',
    location: '四川·凉山',
    time: '5小时前',
    content: '今天发现辣椒地有蚜虫了，赶紧用吡虫啉1500倍液喷了一遍。大家最近要注意预防，气温升高后病虫害容易爆发。',
    hasVoice: true,
    voiceDuration: '28',
    likes: 124,
    comments: 45,
    views: 892,
    liked: true,
    showComments: false,
    commentList: ['谢谢提醒！我明天检查一下', '黄色粘虫板也管用']
  },
  {
    id: 3,
    userName: '丰收在望',
    levelText: '👑传奇',
    location: '甘肃·兰州',
    time: '昨天',
    content: '用了小露AI识别功能，提前发现了玉米叶斑病。及时处理后保住了大部分产量，科技确实能改变农业。',
    hasVoice: true,
    voiceDuration: '45',
    likes: 256,
    comments: 78,
    views: 1560,
    liked: false,
    showComments: false,
    commentList: ['请问怎么使用拍照识别功能？']
  }
];

const stationDevicesMock = [
  { id: 1, name: '3号基地监测站', location: '东区大棚', lastSeen: '最后在线: 2分钟前', isOnline: true, isEnabled: false },
  { id: 2, name: '1号基地监测站', location: '西区大棚', lastSeen: '最后在线: 5分钟前', isOnline: true, isEnabled: false },
  { id: 3, name: '2号基地监测站', location: '南区大棚', lastSeen: '最后在线: 2小时前', isOnline: false, isEnabled: false },
  { id: 4, name: '5号基地监测站', location: '北区大棚', lastSeen: '最后在线: 1分钟前', isOnline: true, isEnabled: false }
];

const cameraDevicesMock = [
  { id: 101, name: '摄像头 CAM-01', location: '东区入口', lastSeen: '最后在线: 刚刚', isOnline: true, isEnabled: false },
  { id: 102, name: '摄像头 CAM-02', location: '西区仓库', lastSeen: '最后在线: 刚刚', isOnline: true, isEnabled: false },
  { id: 103, name: '摄像头 CAM-03', location: '南区道路', lastSeen: '最后在线: 刚刚', isOnline: true, isEnabled: false },
  { id: 104, name: '摄像头 CAM-04', location: '北门口', lastSeen: '最后在线: 3小时前', isOnline: false, isEnabled: false }
];

const mpCrops = [
  { id: 1, icon: '🍅', name: '阳光番茄', status: 'growing', statusText: '生长中', progress: 76, color: '#FF7043', plantDate: '2026-03-28', expectHarvest: '2026-07-06', area: '3.2亩', healthStatus: '优秀', greenhouse: 'A区1号棚', daysToHarvest: 18 },
  { id: 2, icon: '🌶️', name: '线椒', status: 'warning', statusText: '需关注', progress: 54, color: '#43A047', plantDate: '2026-04-12', expectHarvest: '2026-07-20', area: '2.1亩', healthStatus: '需关注', greenhouse: 'B区2号棚', daysToHarvest: 32 },
  { id: 3, icon: '🌽', name: '甜玉米', status: 'mature', statusText: '待采收', progress: 92, color: '#F9A825', plantDate: '2026-02-26', expectHarvest: '2026-06-22', area: '6.5亩', healthStatus: '良好', greenhouse: '露天A区', daysToHarvest: 5 }
];

function FarmerHeaderMP({ title, right }: { title: string; right?: import('react').ReactNode }) {
  return (
    <section className="mp-page-header">
      <h2>{title}</h2>
      {right}
    </section>
  );
}

function FarmerHomeMP({ onTab, onPage }: { onTab: (tab: FarmerTab) => void; onPage: (page: FarmerPage) => void }) {
  const [noticeRead, setNoticeRead] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [cropCount, setCropCount] = useState(0);
  const [weatherText, setWeatherText] = useState('晴 26°C');
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiAdviceLoading, setAiAdviceLoading] = useState(true);
  const reminders = [
    { name: '番茄第二茬追肥', tag: '进行中', time: '今天 09:00', status: 'doing' },
    { name: '辣椒地除草作业', tag: '待处理', time: '明天 08:00', status: 'todo' },
    { name: '检查大棚通风设备', tag: '紧急', time: '今天 15:00前', status: 'urgent' }
  ];

  useEffect(() => {
    let alive = true;
    Promise.all([fetchFarmTasks(), fetchFarmerCrops(), fetchWeather()]).then(([tasks, crops, weather]) => {
      if (!alive) return;
      if (tasks.length) { setTaskCount(tasks.length); setDoneCount(tasks.filter((t) => t.completed).length); }
      if (crops.length) setCropCount(crops.length);
      if (weather) setWeatherText(`${weather.desc || '晴'} ${weather.temp}°C`);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setAiAdviceLoading(true);
    askAi('给我一条今日农事管理建议', 'farmer')
      .then((answer) => {
        if (!alive) return;
        setAiAdvice(answer);
        setAiAdviceLoading(false);
      })
      .catch(() => {
        if (alive) setAiAdviceLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const pendingCount = Math.max(0, taskCount - doneCount);
  const progressPercent = taskCount ? Math.round((doneCount / taskCount) * 100) : 20;
  return (
    <div className="farmer-mp home-mp home-replica">
      <section className="home-top-card">
        <div className="home-nav-row">
          <button onClick={() => onPage('locationMap')}><img src="/assets/icons/icon-location.png" alt="" className="fmy-inline-icon" /> 昆明</button>
          <button onClick={() => onPage('weatherDetail')}><img src="/assets/icons/icon-sun.png" alt="" className="fmy-inline-icon" /> {weatherText}</button>
          <button className={noticeRead ? 'read' : ''} onClick={() => setNoticeRead(true)}><img src="/assets/icons/icon-bell.png" alt="" className="fmy-grid-icon" /></button>
        </div>
        <h2>下午好，农友</h2>
        <p>今日 {todayMonthDay} · {pendingCount || '暂无'}项农事待处理</p>
        <small className="farmer-sample-note">{taskCount ? '数据已同步' : '体验样板 · 天气、任务与农场数据为示例'}</small>
      </section>

      <section className="assistant-card">
        <div className="assistant-head">
          <div className="assistant-title-row">
            <span><img src="/assets/icons/icon-rice.png" alt="" className="fmy-grid-icon" /></span>
            <div><b>农事助手</b><small>今日 {todayMonthDay} · 午后作业提醒</small></div>
          </div>
          <em>{pendingCount}项待办</em>
        </div>
        <div className="assistant-progress-row">
          <div className="mp-progress"><i style={{ width: `${progressPercent}%` }} /></div>
          <div><span><img src="/assets/icons/icon-check.png" alt="" className="fmy-inline-icon" /> 已完成{doneCount}</span><span>{taskCount}项</span></div>
        </div>
        <div className="assistant-grid">
          <button onClick={() => onTab('farming')}><span><img src="/assets/icons/icon-calendar.png" alt="" className="fmy-grid-icon" /></span><b>农事日历</b><small>{taskCount}项今日</small></button>
          <button onClick={() => onPage('myCrops')}><span><img src="/assets/icons/icon-rice.png" alt="" className="fmy-grid-icon" /></span><b>种植档案</b><small>{cropCount}种在管</small></button>
          <button onClick={() => onPage('myCrops')}><span><img src="/assets/icons/icon-chart.png" alt="" className="fmy-grid-icon" /></span><b>收益统计</b><small>查看明细</small></button>
          <button onClick={() => onTab('environment')}><span><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-grid-icon" /></span><b>环境监测</b><small>实时监控</small></button>
        </div>
        <div className="weather-strip"><b><img src="/assets/icons/icon-sun.png" alt="" className="fmy-inline-icon" /> {weatherText}</b><span>晴朗</span><i /> <span><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" />58%</span><i /><span><img src="/assets/icons/icon-fog.png" alt="" className="fmy-inline-icon" />2级风</span></div>
        <div className="ai-tip"><span><img src="/assets/icons/icon-ai.png" alt="" className="fmy-grid-icon" /></span><p>AI 农事建议已接入，天气与传感器数据实时同步，点击「AI 智能决策」查看今日建议。</p></div>
      </section>

      <section className="mp-grid-six">
        <button onClick={() => onPage('voiceAssistant')}><span><img src="/assets/icons/icon-camera.png" alt="" className="fmy-grid-icon" /></span><b>拍照识别</b></button>
        <button onClick={() => onPage('myCrops')}><span><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-grid-icon" /></span><b>我的作物</b></button>
        <button onClick={() => onPage('voiceAssistant')}><span><img src="/assets/icons/icon-mic.png" alt="" className="fmy-grid-icon" /></span><b>语音助手</b></button>
        <button onClick={() => onPage('warningCenter')}><span><img src="/assets/icons/icon-announce.png" alt="" className="fmy-grid-icon" /></span><b>最新预警</b></button>
        <button onClick={() => onPage('techSupport')}><span><img src="/assets/icons/icon-expert.png" alt="" className="fmy-grid-icon" /></span><b>技术支持</b></button>
        <button onClick={() => onPage('weatherDetail')}><span><img src="/assets/icons/icon-cloudy.png" alt="" className="fmy-grid-icon" /></span><b>天气详情</b></button>
      </section>

      <section className="decision-card">
        <div className="mp-section-title"><b><img src="/assets/icons/icon-ai.png" alt="" className="fmy-inline-icon" /> AI智能决策</b><em>最新</em></div>
        <p>{aiAdviceLoading ? '正在生成建议…' : (aiAdvice || '当前展示农事建议体验样板，不连接实时气象、传感器或作物数据。')}</p>
        <footer><span>AI 农事建议</span><span>{aiAdviceLoading ? '生成中' : '已接入'}</span><button onClick={() => onPage('voiceAssistant')}>AI 对话 ›</button></footer>
      </section>

      <section className="home-reminder-card">
        <div className="mp-section-title"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 农事提醒</b><button onClick={() => onTab('farming')}>查看全部 ›</button></div>
        <div className="home-reminder-list">
          {reminders.map((item) => (
            <article key={item.name} className={item.status}>
              <i />
              <div><b>{item.name}</b><p><span>{item.tag}</span>{item.time}</p></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function FarmerShopMP({ onPage, notify }: { onPage: (page: FarmerPage) => void; notify: (message: string) => void }) {
  const [mode, setMode] = useState<'platform' | 'self'>('platform');
  const [filter, setFilter] = useState<'all' | 'selling' | 'review'>('all');
  const [sheet, setSheet] = useState<null | 'upload' | 'filter' | 'chat' | 'wallet' | 'logistics' | 'afterSale'>(null);
  const [draft, setDraft] = useState({ name: '', price: '', desc: '', unit: '份', category: '蔬菜', images: [] as string[], stock: '', origin: '', lat: undefined as number | undefined, lng: undefined as number | undefined });
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const unitOptions = ['斤', '袋', '盒', '箱', '份', '根', '个'];
  const shopCategoryOptions = APP_CATEGORIES.filter((item) => item.id !== 'all');
  const [productList, setProductList] = useState<Array<{ id: string; name: string; price: string; unit: string; sales: number; status: string; statusText: string; image: string; statusCode: number; rejectReason?: string }>>([]);

  const refreshProducts = () => {
    fetchFarmerProducts().then((list) => {
      const mapped = list.map((p) => ({ id: p.id, name: p.name, price: p.priceText, unit: p.unit, sales: p.sales, status: p.status === 1 ? 'selling' : 'review', statusText: p.statusText, image: p.image, statusCode: p.status, rejectReason: p.rejectReason }));
      setProductList(mapped);
    }).catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    fetchFarmerProducts().then((list) => {
      if (!alive) return;
      const mapped = list.map((p) => ({ id: p.id, name: p.name, price: p.priceText, unit: p.unit, sales: p.sales, status: p.status === 1 ? 'selling' : 'review', statusText: p.statusText, image: p.image, statusCode: p.status, rejectReason: p.rejectReason }));
      setProductList(mapped.length ? mapped : [
        { id: 'demo-1', name: '高原有机番茄', price: '38.00', unit: '5斤装', sales: 128, status: 'selling', statusText: '在售', image: '/assets/products/market/tomato.jpg', statusCode: 1 },
        { id: 'demo-2', name: '农家自种辣椒', price: '12.50', unit: '1斤', sales: 86, status: 'selling', statusText: '在售', image: '/assets/products/market/green-vegetable.jpg', statusCode: 1 },
        { id: 'demo-3', name: '云南紫皮土豆', price: '45.00', unit: '10斤', sales: 234, status: 'review', statusText: '待审核', image: '/assets/farm/field-base.jpg', statusCode: 2 }
      ]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const visible = filter === 'all' ? productList : productList.filter((item) => item.status === filter);
  const onPickImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('请选择图片文件');
      return;
    }
    if (draft.images.length >= 4) {
      notify('最多上传 4 张图片');
      return;
    }
    try {
      setUploading(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const result = await uploadImageBase64(file.type, base64);
      if (result.url) {
        setDraft((prev) => ({ ...prev, images: [...prev.images, imageURL(result.url)] }));
        notify('图片已上传');
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  };
  const locate = async () => {
    setLocating(true);
    try {
      const coords = await resolveCurrentCoords();
      if (coords) {
        setDraft((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }));
        notify('已定位');
      } else {
        notify('定位失败，可手动留空');
      }
    } catch {
      notify('定位失败，可手动留空');
    } finally {
      setLocating(false);
    }
  };
  const submit = async () => {
    if (!draft.name.trim() || !draft.price.trim()) {
      notify('请填写商品名称和价格');
      return;
    }
    const priceNum = Number(draft.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      notify('请输入有效价格');
      return;
    }
    const stockNum = Number(draft.stock);
    if (draft.stock.trim() !== '' && (!Number.isFinite(stockNum) || stockNum < 0)) {
      notify('请输入有效库存');
      return;
    }
    try {
      await createFarmerProduct({
        name: draft.name.trim(),
        priceFen: Math.round(priceNum * 100),
        description: draft.desc.trim(),
        unit: draft.unit,
        categoryId: draft.category,
        stock: draft.stock.trim() === '' ? 0 : Math.round(stockNum),
        origin: draft.origin.trim(),
        lat: draft.lat,
        lng: draft.lng,
        status: 2,
        images: draft.images,
      });
      setDraft({ name: '', price: '', desc: '', unit: '份', category: '蔬菜', images: [], stock: '', origin: '', lat: undefined, lng: undefined });
      setSheet(null);
      notify('商品已提交审核');
      // 刷新列表
      refreshProducts();
    } catch (error) {
      notify(error instanceof Error ? error.message : '商品提交失败');
    }
  };
  const resubmitProduct = async (id: string) => {
    try {
      await submitFarmerProduct(id);
      notify('已重新提交审核');
      refreshProducts();
    } catch (error) {
      notify(error instanceof Error ? error.message : '重新提交失败');
    }
  };
  const offShelfProduct = async (id: string) => {
    try {
      await offShelfFarmerProduct(id);
      notify('商品已下架');
      refreshProducts();
    } catch (error) {
      notify(error instanceof Error ? error.message : '下架失败');
    }
  };
  return (
    <div className="farmer-mp shop-mp shop-replica">
      <section className="shop-page-header"><h2><img src="/assets/icons/icon-cart.png" alt="" className="fmy-inline-icon" /> 我的店铺</h2><small className="farmer-sample-note">体验样板 · 商品与经营数据为示例</small></section>
      <section className="shop-mode-switch replica">
        <button className={`mode-btn ${mode === 'platform' ? 'active platform-mode' : ''}`} onClick={() => setMode('platform')}>
          <span className="mode-icon"><img src="/assets/icons/icon-cart.png" alt="" className="fmy-grid-icon" /></span><b className="mode-text">平台托管</b><small className="mode-desc">省心卖货</small>
        </button>
        <button className={`mode-btn self-mode ${mode === 'self' ? 'active' : ''}`} onClick={() => setMode('self')}>
          <span className="mode-icon"><img src="/assets/icons/icon-cart.png" alt="" className="fmy-grid-icon" /></span><b className="mode-text">自主售卖</b><small className="mode-desc">自己管理</small>
        </button>
      </section>
      <section className="shop-quick-entry">
        <button onClick={() => setSheet('upload')}><span><img src="/assets/icons/icon-camera.png" alt="" className="fmy-grid-icon" /></span><b>商品拍照上传</b></button>
        <button onClick={() => setSheet('filter')}><span><img src="/assets/icons/icon-search.png" alt="" className="fmy-grid-icon" /></span><b>品种筛选</b></button>
      </section>
      <section className="shop-func-grid">
        <button onClick={() => setSheet('chat')}><span><img src="/assets/icons/icon-chat.png" alt="" className="fmy-grid-icon" /></span><b>客户聊天</b><em>3</em></button>
        <button onClick={() => setSheet('wallet')}><span><img src="/assets/icons/icon-chart.png" alt="" className="fmy-grid-icon" /></span><b>收益钱包</b></button>
        <button onClick={() => setSheet('logistics')}><span><img src="/assets/icons/truck.png" alt="" className="fmy-grid-icon" /></span><b>物流管理</b></button>
        <button onClick={() => setSheet('afterSale')}><span><img src="/assets/icons/icon-chat.png" alt="" className="fmy-grid-icon" /></span><b>售后客服</b></button>
        <button onClick={() => onPage('farmerOrders')}><span><img src="/assets/icons/package.png" alt="" className="fmy-grid-icon" /></span><b>订单管理</b></button>
      </section>
      <section className="shop-cloud-card" onClick={() => onPage('adoptionCenter')}>
        <div>
          <b><img src="/assets/icons/icon-cloud.png" alt="" className="fmy-inline-icon" /> 云店铺</b>
          <span>认养订单管理中心</span>
          <small>6 个进行中认养</small>
        </div>
        <em>›</em>
      </section>
      <section className="shop-product-section">
        <div className="shop-section-header">
          <b><img src="/assets/icons/package.png" alt="" className="fmy-inline-icon" /> 我的商品</b>
          <div>
            {([['all', '全部'], ['selling', '在售'], ['review', '审核中']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
        </div>
        <div className="shop-product-list">
          {visible.map((item) => (
            <article className="shop-product-card" key={item.id}>
              <div className="shop-product-img" style={{ backgroundImage: `url(${item.image})` }}><em className={item.statusCode === 3 ? 'reject' : item.status}>{item.statusText}</em></div>
              <div className="shop-product-info">
                <b>{item.name}</b>
                <p><strong>¥{item.price}</strong><span>/{item.unit}</span></p>
                <small>已售 {item.sales}件</small>
                {item.statusCode === 3 && item.rejectReason ? <span className="shop-product-reject">驳回原因：{item.rejectReason}</span> : null}
                {(item.statusCode === 3 || item.statusCode === 1) && (
                  <div className="shop-product-actions">
                    {item.statusCode === 3 ? <button type="button" onClick={() => resubmitProduct(item.id)}>重新提交</button> : null}
                    {item.statusCode === 1 ? <button type="button" onClick={() => offShelfProduct(item.id)}>下架</button> : null}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      {sheet && (
        <div className="farmer-modal-mask" onClick={() => setSheet(null)}>
          <section className="mp-sheet shop-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head"><b>{sheet === 'upload' ? <><img src="/assets/icons/icon-camera.png" alt="" className="fmy-inline-icon" /> 商品拍照上传</> : sheet === 'filter' ? <><img src="/assets/icons/icon-search.png" alt="" className="fmy-inline-icon" /> 品种筛选</> : sheet === 'chat' ? '客户聊天' : sheet === 'wallet' ? '收益钱包' : sheet === 'logistics' ? '物流管理' : '售后客服'}</b><button onClick={() => setSheet(null)}>×</button></div>
            {sheet === 'upload' ? (
              <div className="mp-form">
                <div className="shop-upload-images">
                  {draft.images.map((url, index) => (
                    <span className="shop-upload-thumb" key={url}>
                      <img src={url} alt=""/>
                      <button type="button" onClick={() => setDraft((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}>×</button>
                    </span>
                  ))}
                  {draft.images.length < 4 && (
                    <button type="button" className="shop-upload-add" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? '上传中…' : '＋ 添加图片'}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void onPickImage(file); event.target.value = ''; }} />
                </div>
                <label>商品名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="如：高原有机番茄" /></label>
                <label>销售价格<input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="如：38" inputMode="decimal" /></label>
                <label>库存<input value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} placeholder="如：100" inputMode="numeric" /></label>
                <label>产地<input value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} placeholder="如：云南昆明" /></label>
                <div className="shop-form-field shop-locate-field">
                  <span>定位</span>
                  <button type="button" className="shop-locate-btn" onClick={locate} disabled={locating}>{locating ? '定位中…' : '📍 获取定位'}</button>
                  <small className="shop-locate-status">{draft.lat !== undefined && draft.lng !== undefined ? `已定位 纬度${draft.lat.toFixed(4)} 经度${draft.lng.toFixed(4)}` : '未定位'}</small>
                </div>
                <div className="shop-form-field"><span>单位</span><div className="shop-chip-row">{unitOptions.map((unit) => <button type="button" key={unit} className={draft.unit === unit ? 'active' : ''} onClick={() => setDraft({ ...draft, unit })}>{unit}</button>)}</div></div>
                <div className="shop-form-field"><span>品种分类</span><div className="shop-chip-row">{shopCategoryOptions.map((item) => <button type="button" key={item.id} className={draft.category === item.name ? 'active' : ''} onClick={() => setDraft({ ...draft, category: item.name })}>{item.name}</button>)}</div></div>
                <label>商品说明<textarea value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} placeholder="产地、规格、采摘时间、配送说明" /></label>
                <button className="mp-primary" onClick={submit} disabled={uploading}>提交审核</button>
              </div>
            ) : <ShopRows rows={sheet === 'filter' ? [['蔬菜类', '番茄、辣椒、土豆', '应用'], ['水果类', '草莓、橙子、苹果', '应用']] : sheet === 'wallet' ? [['累计收益', '¥12,680.50', '去提现'], ['本月收入', '¥3,240.00', '明细'], ['待结算', '¥856.00', '查看']] : sheet === 'logistics' ? [['高原有机番茄', '李女士 · 待发货', '安排发货'], ['云南紫皮土豆', '赵女士 · 运输中', '查看物流']] : sheet === 'afterSale' ? [['退换货申请', '番茄收到有损坏', '处理'], ['退款申请', '土豆规格发错', '查看']] : [['李女士', '番茄什么时候发货？', '回复'], ['王先生', '已下单，麻烦尽快发', '查看'], ['陈老板', '想批量采购辣椒100斤', '沟通']]} />}
          </section>
        </div>
      )}
    </div>
  );
}

function FarmingMP() {
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [done, setDone] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', time: '08:30', type: '巡检' });
  const [extraTasks, setExtraTasks] = useState<Array<{ title: string; time: string; type: string; plot: string; owner: string; priority: string; source: string }>>([]);
  const [serverTasks, setServerTasks] = useState<FarmTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchFarmTasks().then((list) => {
      if (!alive) return;
      if (list.length) {
        setServerTasks(list);
        setDone(list.filter((t) => t.completed).map((t) => t.name));
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { alive = false; };
  }, []);

  const toggle = (name: string) => {
    const willDone = !done.includes(name);
    setDone((prev) => willDone ? [...prev, name] : prev.filter((item) => item !== name));
    const task = serverTasks.find((t) => t.name === name);
    if (task) completeFarmTask(task.id, willDone).catch(() => {});
  };
  const monthDays = 30;
  const leadingBlank = 1;
  const cells = [
    ...Array.from({ length: leadingBlank }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => index + 1),
    ...Array.from({ length: 35 - leadingBlank - monthDays }, () => null)
  ];
  const taskDays = [3, 8, 13, 17, 22, 26];
  const baseTasks: Array<{ title: string; time: string; type: string; plot: string; owner: string; priority: string; source: string }> = serverTasks.length
    ? serverTasks.map((t) => ({ title: t.name, time: t.time || '08:30', type: t.typeLabel || t.type || '农事', plot: t.cropName ? `${t.cropName} · 农田` : '农田', owner: '我', priority: t.completed ? 'normal' : 'important', source: t.taskDate ? `计划于 ${t.taskDate}` : '农事计划' }))
    : [
      { title: '番茄棚补水', time: '08:30-09:00', type: '水肥管理', plot: '1号番茄棚 · A区', owner: '张大叔', priority: 'urgent', source: '环境湿度触发' },
      { title: '复核土壤湿度传感器', time: '09:10-09:25', type: '环境巡检', plot: '1号番茄棚 · 传感器03', owner: '李师傅', priority: 'normal', source: '设备巡检计划' },
      { title: '记录花期病虫害观察', time: '15:00-15:20', type: '植保记录', plot: '番茄花果期样本行', owner: '张大叔', priority: 'important', source: '作物阶段提醒' }
    ];
  const tasks = [...baseTasks, ...extraTasks];
  const priorityLabel: Record<string, string> = { urgent: '紧急', important: '重点', normal: '常规' };
  const submitTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await createFarmTask({ name: newTask.title.trim(), time: newTask.time, type: newTask.type, taskDate: `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}` });
    } catch {}
    setExtraTasks((prev) => [...prev, { ...newTask, title: newTask.title.trim(), plot: '临时农事安排', owner: '张大叔', priority: 'normal', source: '手动新增' }]);
    setNewTask({ title: '', time: '08:30', type: '巡检' });
    setShowAdd(false);
  };
  return (
    <div className="farmer-mp farming-mp farming-replica">
      <section className="farming-page-header">
        <div>
          <span>FARMING CALENDAR</span>
          <h2><img src="/assets/icons/icon-calendar.png" alt="" className="fmy-inline-icon" /> 农事日历</h2>
          <p>按天气、环境和作物阶段安排今日农事</p>
          <small className="farmer-sample-note">体验样板 · 日历与任务为示例</small>
        </div>
        <button onClick={() => setShowAdd(true)}>＋</button>
      </section>

      <section className="farming-calendar-section">
        <div className="farming-calendar-header">
          <button>‹</button>
          <b>{currentMonthTitle}</b>
          <button>›</button>
        </div>
        <div className="farming-weekday-row">{['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="farming-date-grid">
          {cells.map((day, index) => (
            <button
              key={`${day ?? 'blank'}-${index}`}
              className={`${day ? '' : 'blank'} ${day === todayDay ? 'today' : ''} ${day === selectedDay ? 'selected' : ''} ${day && taskDays.includes(day) ? 'has-task' : ''}`}
              disabled={!day}
              onClick={() => day && setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </section>

      <section className="farming-selected-date-card">
        <div><b>{todayMonth}月{selectedDay}日</b><span>{selectedDay === todayDay ? '今天' : '已选日期'}</span></div>
        <p>农历五月初三 · 适宜施肥、巡棚、除草，午后注意棚内通风。</p>
      </section>

      <section className="farming-lunar-info-bar">
        <span><img src="/assets/icons/icon-cloudy.png" alt="" className="fmy-inline-icon" /> 晴 26°C</span>
        <span><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" /> 湿度 68%</span>
        <span><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-inline-icon" /> 花果期</span>
      </section>

      <section className="farming-progress-section">
        <div className="farming-section-title"><b>今日任务进度</b><em>{done.length}/{tasks.length}</em></div>
        <div className="farming-progress"><i style={{ width: `${Math.min(100, (done.length / tasks.length) * 100)}%` }} /></div>
        <small>已完成 {done.length} 项，剩余 {Math.max(0, tasks.length - done.length)} 项</small>
      </section>

      <section className="farming-ai-section">
        <div className="farming-section-title"><b><img src="/assets/icons/icon-ai.png" alt="" className="fmy-inline-icon" /> AI 农事建议</b><em>根据环境生成</em></div>
        {[
          ['提前开启番茄棚通风', '棚内温度将在 14:00 后升高，建议提前 30 分钟通风。'],
          ['A区土壤补水20分钟', '土壤湿度低于目标值 6%，建议低压滴灌。']
        ].map(([name, desc]) => (
          <article key={name}>
            <div><b>{name}</b><p>{desc}</p></div>
            <button onClick={() => setExtraTasks((prev) => [...prev, { title: name, time: '14:00-14:30', type: 'AI推荐', plot: '1号番茄棚 · A区', owner: '张大叔', priority: 'important', source: 'AI环境模型推荐' }])}>采纳</button>
          </article>
        ))}
      </section>

      <section className="farming-task-section">
        <div className="farming-section-title farming-task-title">
          <div><b>当日任务清单</b><span>按执行时间排序，共 {tasks.length} 项</span></div>
          <button onClick={() => setShowAdd(true)}>＋ 添加</button>
        </div>
        <div className="farming-task-filter">
          <span className="active">全部 {tasks.length}</span>
          <span>待处理 {Math.max(0, tasks.length - done.length)}</span>
          <span>已完成 {done.length}</span>
        </div>
        {tasks.map((task) => (
          <article key={`${task.title}-${task.time}`} className={`farming-task-card ${done.includes(task.title) ? 'done' : ''}`}>
            <button className="task-check" onClick={() => toggle(task.title)}>{done.includes(task.title) ? <img src="/assets/icons/icon-check.png" alt="" className="fmy-grid-icon" /> : ''}</button>
            <div className="task-main">
              <div className="task-row-top">
                <b>{task.title}</b>
                <em className={`priority-${task.priority}`}>{priorityLabel[task.priority] ?? task.priority}</em>
              </div>
              <p>{task.plot}</p>
              <div className="task-meta-row">
                <span><img src="/assets/icons/clock.png" alt="" className="fmy-inline-icon" /> {task.time}</span>
                <span>{task.type}</span>
                <span>负责人：{task.owner}</span>
              </div>
              <div className="task-source-row">
                <small>{task.source}</small>
                <button>{done.includes(task.title) ? '查看记录' : '去处理'}</button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {showAdd && (
        <div className="farming-add-mask" onClick={() => setShowAdd(false)}>
          <section className="farming-add-modal" onClick={(event) => event.stopPropagation()}>
            <div><b>新增农事任务</b><button onClick={() => setShowAdd(false)}>×</button></div>
            <label>任务名称<input value={newTask.title} onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))} placeholder="例如：番茄棚追肥" /></label>
            <label>执行时间<input type="time" value={newTask.time} onChange={(event) => setNewTask((prev) => ({ ...prev, time: event.target.value }))} /></label>
            <label>任务类型<input value={newTask.type} onChange={(event) => setNewTask((prev) => ({ ...prev, type: event.target.value }))} placeholder="例如：水肥管理" /></label>
            <button onClick={submitTask}>保存任务</button>
          </section>
        </div>
      )}
    </div>
  );
}

function EnvironmentMP({ onPage, notify }: { onPage: (page: FarmerPage) => void; notify?: (message: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [chartTab, setChartTab] = useState<'temp' | 'humidity' | 'light'>('temp');
  const [stationName, setStationName] = useState('1号番茄智能棚');
  const [stationId, setStationId] = useState(0);
  const [stations, setStations] = useState<EnvironmentStation[]>([]);
  const [stationSheet, setStationSheet] = useState(false);
  const [addingStation, setAddingStation] = useState(false);
  const [stationDraft, setStationDraft] = useState({ name: '', location: '' });
  const [savingStation, setSavingStation] = useState(false);
  const [streams, setStreams] = useState<EnvironmentVideoStream | null>(null);
  const [camError, setCamError] = useState(false);
  const [overview, setOverview] = useState<EnvironmentOverview | null>(null);
  const [sensors, setSensors] = useState<EnvironmentSensor[]>([]);
  const [alerts, setAlerts] = useState<EnvironmentAlert[]>([]);
  const [autoTasks, setAutoTasks] = useState<EnvironmentAutoTask[]>([]);
  const [devices, setDevices] = useState([
    { id: 1, icon: '/assets/icons/icon-drip.png', name: '滴灌阀', on: true, state: '运行中', auto: true },
    { id: 2, icon: '/assets/icons/icon-fan.png', name: '通风机', on: true, state: '自动', auto: true },
    { id: 3, icon: '/assets/icons/icon-light.png', name: '补光灯', on: false, state: '已关闭', auto: false },
    { id: 4, icon: '/assets/icons/icon-camera.png', name: '摄像头', on: true, state: '在线', auto: false },
    { id: 5, icon: '/assets/icons/icon-fog.png', name: '雾化器', on: false, state: '已关闭', auto: true },
    { id: 6, icon: '/assets/icons/icon-curtain.png', name: '卷膜机', on: true, state: '通风中', auto: true }
  ]);

  const loadStation = async (sid: number) => {
    const devs = await fetchEnvironmentDevices(sid);
    if (devs.length) {
      setDevices(devs.map((d) => ({ id: d.id, icon: d.icon || '/assets/icons/settings.png', name: d.name, on: d.on, state: d.runningState || (d.on ? '运行中' : '已关闭'), auto: d.auto })));
    }
    const [ov, se, al, at] = await Promise.all([fetchEnvironmentOverview(sid), fetchEnvironmentSensors(sid), fetchEnvironmentAlerts(sid), fetchEnvironmentAutoTasks(sid)]);
    if (ov) setOverview(ov);
    setSensors(se);
    setAlerts(al);
    setAutoTasks(at);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, vs] = await Promise.all([fetchEnvironmentStations(), fetchEnvironmentVideoStreams()]);
      if (!alive) return;
      setStations(list);
      if (vs) setStreams(vs);
      if (list.length) {
        const sid = list[0].id;
        setStationId(sid);
        setStationName(list[0].name);
        await loadStation(sid);
      }
    })().catch(() => {});
    return () => { alive = false; };
  }, []);

  const switchStation = (st: EnvironmentStation) => {
    setStationSheet(false);
    if (st.id === stationId) return;
    setStationId(st.id);
    setStationName(st.name);
    setOverview(null);
    setSensors([]);
    setAlerts([]);
    setAutoTasks([]);
    loadStation(st.id).catch(() => {});
  };

  const sensorStatusText = (type: string, text?: string) => {
    if (text !== '正常') return text || '—';
    if (type === 'pm25') return '良';
    if (type === 'ph') return '适宜';
    return text;
  };

  const submitNewStation = async () => {
    const name = stationDraft.name.trim();
    if (!name) { notify?.('请填写基地名称'); return; }
    if (savingStation) return;
    setSavingStation(true);
    try {
      const created = await createEnvironmentStation(name, stationDraft.location.trim());
      const list = await fetchEnvironmentStations();
      setStations(list);
      setStationDraft({ name: '', location: '' });
      setAddingStation(false);
      setStationSheet(false);
      if (created.id) {
        setStationId(created.id);
        setStationName(created.name);
        setOverview(null);
        setSensors([]);
        setAlerts([]);
        setAutoTasks([]);
        loadStation(created.id).catch(() => {});
      }
      notify?.('大棚基地已添加');
    } catch (error) {
      notify?.(error instanceof Error ? error.message : '添加失败，请稍后重试');
    } finally {
      setSavingStation(false);
    }
  };

  const toggleDevice = (id: number) => {
    const device = devices.find((d) => d.id === id);
    setDevices((prev) => prev.map((row) => row.id === id ? { ...row, on: !row.on, state: !row.on ? '运行中' : '已关闭' } : row));
    if (device) toggleEnvironmentDevice(id, !device.on).catch(() => {});
  };
  const chartRows = [
    { day: '周一', temp: 22, humidity: 69, light: 122 },
    { day: '周二', temp: 24, humidity: 73, light: 135 },
    { day: '周三', temp: 25, humidity: 71, light: 148 },
    { day: '周四', temp: 26, humidity: 68, light: 161 },
    { day: '周五', temp: 24, humidity: 70, light: 152 },
    { day: '周六', temp: 27, humidity: 66, light: 178 }
  ];
  const maxVal = chartTab === 'temp' ? 32 : chartTab === 'humidity' ? 90 : 200;
  const unit = chartTab === 'temp' ? '°' : chartTab === 'humidity' ? '%' : 'k';
  return (
    <div className="farmer-mp env-mp env-v4">
      <section className="env-hero">
        <div>
          <span className="env-hero-kicker">IOT FARM MONITOR</span>
          <h2><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" /> 环境监测</h2>
          <p>视频、传感器、滴灌和自动化设备实时联动</p>
          <small className="farmer-sample-note">体验样板 · 读数与设备状态为示例</small>
        </div>
        <button onClick={() => onPage('warningCenter')}><img src="/assets/icons/icon-announce.png" alt="" className="fmy-inline-icon" /> 3</button>
      </section>

      <section className="env-station-bar">
        <button className="env-station-info" onClick={() => setStationSheet(true)}>
          <span className="env-station-icon"><img src="/assets/icons/icon-location.png" alt="" className="fmy-grid-icon" /></span>
          <b>{stationName}</b>
          <em><i />在线</em>
          <small>▼</small>
        </button>
        <button className="env-device-entry" onClick={() => onPage('myDevice')}><span><img src="/assets/icons/icon-phone.png" alt="" className="fmy-grid-icon" /></span><b>我的设备</b></button>
      </section>

      <section className="env-video-card" onClick={() => setPlaying(!playing)}>
        <img src="/assets/catalog/shouguang-greenhouse.jpg" alt="" />
        {playing && streams?.streamUrl && !camError && (
          <img
            className="env-live-stream"
            src={streams.streamUrl}
            alt="实时画面"
            onError={() => setCamError(true)}
          />
        )}
        <div className="env-live-tag"><i />LIVE</div>
        {!(playing && streams?.streamUrl && !camError) && (
          <div className="env-video-overlay">
            <button>{playing ? 'Ⅱ' : '▶'}</button>
            <span>{playing ? (camError ? '摄像头离线，请检查树莓派网络' : '正在连接摄像头…') : '点击播放实时画面'}</span>
          </div>
        )}
        <footer><span>{playing && !camError && streams?.streamUrl ? '摄像头在线' : (camError ? '摄像头离线' : '摄像头待连接')}</span><b><img src="/assets/icons/icon-camera.png" alt="" className="fmy-inline-icon" /> 北棚主摄像头</b><em><img src="/assets/icons/icon-fullscreen.png" alt="" className="fmy-grid-icon" /></em></footer>
      </section>

      <section className="env-overview-section">
        <div className="env-section-title"><b><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" /> 环境总览</b><button><img src="/assets/icons/icon-refresh.png" alt="" className="fmy-inline-icon" /> 更新 10:32</button></div>
        <div className="env-overview-grid">
          {[
            { cls: 'temp', icon: '/assets/icons/icon-humidity.png', label: '棚内温度', m: overview?.temp },
            { cls: 'ph', icon: '/assets/icons/icon-chart.png', label: '土壤酸碱度', m: overview?.ph },
            { cls: 'humi', icon: '/assets/icons/icon-humidity.png', label: '空气湿度', m: overview?.humidity },
            { cls: 'light', icon: '/assets/icons/icon-sun.png', label: '光照强度', m: overview?.light }
          ].map((item) => (
            <article className={`env-overview-card ${item.cls}`} key={item.label}>
              <div><img src={item.icon} alt="" className="fmy-grid-icon" /></div><strong>{item.m?.value || '--'}</strong><span>{item.label}</span><p>{item.m?.trend || '—'}</p><em>{item.m?.status || '—'}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="env-drip-card" onClick={() => onPage('myDevice')}>
        <div><span><img src="/assets/icons/icon-drip.png" alt="" className="fmy-grid-icon" /></span><p><b>智能滴灌系统</b><small>● 运行中 · 今日用水 12.5L · A区补水 20 分钟</small></p></div><em>›</em>
      </section>

      <section className="env-chart-section">
        <div className="env-chart-head">
          <b><img src="/assets/icons/icon-chart.png" alt="" className="fmy-inline-icon" /> 数据趋势</b>
          <div>
            {([['temp', '温度'], ['humidity', '湿度'], ['light', '光照']] as const).map(([id, label]) => <button key={id} className={chartTab === id ? 'active' : ''} onClick={() => setChartTab(id)}>{label}</button>)}
          </div>
        </div>
        <div className="env-chart-body">
          <aside>{['高', '中', '低'].map((item) => <span key={item}>{item}</span>)}</aside>
          <div className="env-bars">
            {chartRows.map((item) => {
              const val = item[chartTab];
              return <article key={item.day}><div><i className={chartTab} style={{ height: `${Math.max(12, val / maxVal * 100)}%` }}><span>{val}{unit}</span></i></div><b>{item.day}</b></article>;
            })}
          </div>
        </div>
      </section>

      <section className="env-device-section">
        <div className="env-section-title"><b><img src="/assets/icons/settings.png" alt="" className="fmy-inline-icon" /> 设备控制中心</b><button onClick={() => onPage('myDevice')}>全部设置 ›</button></div>
        <div className="env-device-grid">
          {devices.map((device) => (
            <button key={device.id} className={device.on ? 'on' : ''} onClick={() => toggleDevice(device.id)}>
              {device.auto && <small>自动</small>}
              <span><img src={device.icon} alt="" className="fmy-grid-icon" /></span>
              <b>{device.name}</b>
              <em>{device.on ? device.state : '已关闭'}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="env-alert-section">
        <div className="env-section-title"><b><img src="/assets/icons/icon-announce.png" alt="" className="fmy-inline-icon" /> 异常信息</b><button onClick={() => onPage('warningCenter')}>3 条 ›</button></div>
        <div className="env-alert-scroll">
          {alerts.length === 0 && <div className="tech-empty">暂无异常信息</div>}
          {alerts.map((a) => <article className={a.level} key={a.id}><div><span><img src={a.icon} alt="" className="fmy-grid-icon" /></span><b>{a.title}</b><em>{a.levelText}</em></div><p>{a.desc}</p><small>{a.time} · {a.source}</small></article>)}
        </div>
      </section>

      <section className="env-sensor-section">
        <div className="env-section-title"><b><img src="/assets/icons/icon-chart.png" alt="" className="fmy-inline-icon" /> 传感器详细数据</b></div>
        <div className="env-sensor-grid">
          {sensors.length === 0 && <div className="tech-empty">暂无传感器数据</div>}
          {sensors.map((s) => (
            <article key={s.id}>
              <span>{s.name}</span>
              <b>{Number(s.value || 0).toLocaleString('en-US')}{s.unit}</b>
              <em>{sensorStatusText(s.type, s.statusText)}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="env-auto-section">
        <div className="env-section-title"><b><img src="/assets/icons/icon-ai.png" alt="" className="fmy-inline-icon" /> 自动化任务</b></div>
        {autoTasks.length === 0 && <div className="tech-empty">暂无自动化任务</div>}
        {autoTasks.map((t) => <article key={t.id}><div><b>{t.name}</b><p>{t.description}</p></div><span className={t.enabled ? 'on' : ''}><i /></span></article>)}
      </section>

      {stationSheet && createPortal(
        <div className="st-sheet-mask" onClick={() => { setStationSheet(false); setAddingStation(false); }}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>{addingStation ? '添加大棚基地' : '选择智能棚'}</b><button onClick={() => { setStationSheet(false); setAddingStation(false); }}>×</button></div>
            {addingStation ? (
              <>
                <div className="st-fb-types" style={{ flexDirection: 'column' }}>
                  <input className="st-fb-contact" placeholder="基地名称（如：2号番茄智能棚）" value={stationDraft.name} onChange={(e) => setStationDraft({ ...stationDraft, name: e.target.value })} maxLength={64} />
                  <input className="st-fb-contact" placeholder="位置（选填，如：东区 3 号棚）" value={stationDraft.location} onChange={(e) => setStationDraft({ ...stationDraft, location: e.target.value })} maxLength={128} />
                  <button className="st-fb-submit" disabled={savingStation} onClick={submitNewStation}>{savingStation ? '添加中…' : '确认添加'}</button>
                  <button className="st-fb-cancel" onClick={() => setAddingStation(false)}>返回列表</button>
                </div>
                <small className="pay-tip">添加后基地初始为离线，绑定传感器设备后自动上线</small>
              </>
            ) : (
              <>
                {stations.map((st) => (
                  <button key={st.id} className={`st-sheet-row ${st.id === stationId ? 'active' : ''}`} onClick={() => switchStation(st)}>
                    <span>{st.name}</span>
                    <em>{st.statusText || (st.isOnline ? '在线' : '离线')}</em>
                  </button>
                ))}
                <button className="st-sheet-row st-add-row" onClick={() => setAddingStation(true)}>＋ 添加大棚基地</button>
              </>
            )}
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

function CommunityMP() {
  const [activeTab, setActiveTab] = useState<'hot' | 'latest'>('hot');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [list, setList] = useState<Array<{ id: number; userName: string; levelText: string; location: string; time: string; content: string; hasVoice: boolean; voiceDuration: string; likes: number; comments: number; views: number; liked: boolean }>>([]);

  useEffect(() => {
    let alive = true;
    fetchCommunityPosts().then((posts) => {
      if (!alive) return;
      if (posts.length) {
        setList(posts.map((p) => ({ id: p.id, userName: p.userName, levelText: p.levelText, location: p.location, time: p.time, content: p.content, hasVoice: false, voiceDuration: '', likes: p.likes, comments: p.comments, views: p.views, liked: p.liked })));
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const publish = async () => {
    if (!content.trim()) return;
    const text = content.trim();
    try {
      await createCommunityPost(text);
      setContent('');
      // 刷新
      fetchCommunityPosts().then((posts) => {
        setList(posts.map((p) => ({ id: p.id, userName: p.userName, levelText: p.levelText, location: p.location, time: p.time, content: p.content, hasVoice: false, voiceDuration: '', likes: p.likes, comments: p.comments, views: p.views, liked: p.liked })));
      }).catch(() => {});
    } catch {
      // 本地兜底：仍显示刚发的帖子
      setList((prev) => [{ id: Date.now(), userName: '我', levelText: '🥇黄金', location: '云南·昆明', time: '刚刚', content: text, hasVoice: false, voiceDuration: '', likes: 0, comments: 0, views: 0, liked: false }, ...prev]);
      setContent('');
    }
  };
  return (
    <div className="farmer-mp community-mp">
      <header className="community-nav"><b>农友社区</b></header>
      <div className="community-tabs"><button className={activeTab === 'hot' ? 'active' : ''} onClick={() => setActiveTab('hot')}><img src="/assets/icons/icon-flame.png" alt="" className="fmy-inline-icon" /> 热门</button><button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')}><img src="/assets/icons/clock.png" alt="" className="fmy-inline-icon" /> 最新</button></div>
      <section className="post-input-area">
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="分享你的种植经验..." />
        <button className={isRecording ? 'recording' : ''} onMouseDown={() => setIsRecording(true)} onMouseUp={() => { setIsRecording(false); setContent('今天天气不错，番茄长势很好！'); }}><img src="/assets/icons/icon-mic.png" alt="" className="fmy-grid-icon" /></button>
        <button onClick={publish}>发送</button>
      </section>
      {isRecording && <div className="recording-toast"><img src="/assets/icons/icon-play.png" alt="" className="fmy-inline-icon" /> 正在录音，松开发送...</div>}
      <section className="post-list">
        {list.map((post) => <article className="post-card" key={post.id}><div className="post-user-row"><div>{post.userName.slice(0, 1)}</div><p><b>{post.userName}<em>{post.levelText}</em></b><span>{post.location} · {post.time}</span></p></div><p>{post.content}</p>{post.hasVoice && <button className="voice-strip">▶ ▬▬▬▬▬ {post.voiceDuration}"</button>}<footer><button><img src="/assets/icons/icon-like.png" alt="" className="fmy-inline-icon" /> {post.likes}</button><button><img src="/assets/icons/icon-chat.png" alt="" className="fmy-inline-icon" /> {post.comments}</button><span><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> {post.views}</span></footer></article>)}
      </section>
    </div>
  );
}

function FarmerHome({ onTab, onPage }: { onTab: (tab: FarmerTab) => void; onPage: (page: FarmerPage) => void }) {
  const [noticeRead, setNoticeRead] = useState(false);
  const remindersReplica = [
    { name: '番茄第二茬追肥', tag: '进行中', time: '今天 09:00', status: 'doing' },
    { name: '辣椒地除草作业', tag: '待处理', time: '明天 08:00', status: 'pending' },
    { name: '检查大棚通风设备', tag: '紧急', time: '今天 15:00前', status: 'urgent' },
    { name: '玉米灌溉计划', tag: '待处理', time: '后天 07:00', status: 'pending' }
  ];
  return (
    <div className="farmer-home-replica">
      <section className="fh-header">
        <div className="fh-location-weather">
          <button onClick={() => onPage('locationMap')}><img src="/assets/icons/icon-location.png" alt="" className="fmy-inline-icon" />昆明</button>
          <button onClick={() => onPage('weatherDetail')}><img src="/assets/icons/icon-sun.png" alt="" className="fmy-inline-icon" />晴 26°C</button>
        </div>
        <div className="fh-greeting-row">
          <h2>下午好，农友</h2>
          <button className={noticeRead ? 'read' : ''} onClick={() => setNoticeRead(true)}>
            <img src="/assets/icons/icon-bell.png" alt="" className="fmy-grid-icon" />{noticeRead ? '已读' : ''}
          </button>
        </div>
      </section>

      <section className="fh-assistant-card">
        <div className="fh-assistant-head">
          <div className="fh-assistant-title">
            <span><img src="/assets/icons/icon-rice.png" alt="" className="fmy-grid-icon" /></span>
            <div>
              <b>农事助手</b>
              <small>今日 {todayMonthDay} · 下午好</small>
            </div>
          </div>
          <em>5项待办</em>
        </div>
        <div className="fh-progress-row">
          <div className="fh-progress"><i style={{ width: '20%' }} /></div>
          <div><span><img src="/assets/icons/icon-check.png" alt="" className="fmy-inline-icon" /> 已完成1</span><span>5项</span></div>
        </div>
        <div className="fh-fa-grid">
          <button onClick={() => onTab('farming')}><span><img src="/assets/icons/icon-calendar.png" alt="" className="fmy-grid-icon" /></span><b>农事日历</b><small>5项今日</small></button>
          <button onClick={() => onPage('myCrops')}><span><img src="/assets/icons/icon-rice.png" alt="" className="fmy-grid-icon" /></span><b>种植档案</b><small className="ok">4种在管</small></button>
          <button onClick={() => onPage('adoptionCenter')}><span><img src="/assets/icons/icon-chart.png" alt="" className="fmy-grid-icon" /></span><b>认养订单</b><small>6单在管</small></button>
          <button onClick={() => onTab('environment')}><span><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-grid-icon" /></span><b>环境监测</b><small>实时监控</small></button>
        </div>
        <div className="fh-weather-strip">
          <span><img src="/assets/icons/icon-sun.png" alt="" className="fmy-grid-icon" /></span><b>26°C</b><small>晴朗 · 适宜户外作业</small><i /> <small><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" />58%</small><i /><small><img src="/assets/icons/icon-fog.png" alt="" className="fmy-inline-icon" />3级风</small>
        </div>
        <div className="fh-ai-tip"><span><img src="/assets/icons/icon-ai.png" alt="" className="fmy-grid-icon" /></span><p>今日有小雨，建议室内整理农具，雨停后检查大棚排水</p></div>
      </section>

      <section className="fh-func-grid">
        <button onClick={() => onPage('voiceAssistant')}><span><img src="/assets/icons/icon-camera.png" alt="" className="fmy-grid-icon" /></span><b>拍照识别</b></button>
        <button onClick={() => onPage('myCrops')}><span><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-grid-icon" /></span><b>我的作物</b></button>
        <button onClick={() => onPage('voiceAssistant')}><span><img src="/assets/icons/icon-mic.png" alt="" className="fmy-grid-icon" /></span><b>语音助手</b></button>
        <button onClick={() => onPage('warningCenter')}><span><img src="/assets/icons/icon-announce.png" alt="" className="fmy-grid-icon" /></span><b>最新预警</b></button>
        <button onClick={() => onPage('techSupport')}><span><img src="/assets/icons/icon-expert.png" alt="" className="fmy-grid-icon" /></span><b>技术支持</b></button>
        <button onClick={() => onPage('weatherDetail')}><span><img src="/assets/icons/icon-cloudy.png" alt="" className="fmy-grid-icon" /></span><b>天气详情</b></button>
      </section>

      <section className="fh-ai-card">
        <div><b><img src="/assets/icons/icon-ai.png" alt="" className="fmy-inline-icon" /> AI智能决策</b><em>最新</em></div>
        <p>根据近期气象数据，建议您在3天内对番茄进行一次叶面施肥，注意保持土壤湿度在65%左右。预计本周后期有阵雨，请提前做好排水准备。</p>
        <footer><span>智能分析</span><span>数据驱动</span><button onClick={() => onPage('voiceAssistant')}>AI对话 <img src="/assets/icons/icon-chat.png" alt="" className="fmy-inline-icon" /></button></footer>
      </section>

      <section className="fh-reminders">
        <div className="fh-section-head"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 农事提醒</b><button onClick={() => onTab('farming')}>查看全部 ›</button></div>
        {remindersReplica.map((item) => (
          <article className={item.status} key={item.name}>
            <i />
            <div><b>{item.name}</b><p><span>{item.tag}</span>{item.time}</p></div>
          </article>
        ))}
      </section>
    </div>
  );
}

function FarmerShop({ onPage, notify }: { onPage: (page: FarmerPage) => void; notify: (message: string) => void }) {
  const [mode, setMode] = useState<'platform' | 'self'>('platform');
  const [filter, setFilter] = useState<'all' | 'selling' | 'review'>('all');
  const [sheet, setSheet] = useState<null | 'upload' | 'chat' | 'wallet' | 'logistics' | 'afterSale'>(null);
  const [productsState, setProductsState] = useState([
    { id: 1, name: '高原有机番茄', price: '38.00', unit: '5斤装', sales: 128, status: 'selling', statusText: '在售', image: '/assets/products/market/tomato.jpg' },
    { id: 2, name: '农家自种辣椒', price: '12.50', unit: '1斤', sales: 86, status: 'selling', statusText: '在售', image: '/assets/products/market/green-vegetable.jpg' },
    { id: 3, name: '云南紫皮土豆', price: '45.00', unit: '10斤', sales: 234, status: 'review', statusText: '审核中', image: '/assets/farm/field-base.jpg' },
    { id: 4, name: '生态种植甜玉米', price: '8.00', unit: '根', sales: 56, status: 'selling', statusText: '在售', image: '/assets/products/market/corn-field.jpg' }
  ]);
  const [draft, setDraft] = useState({ name: '', price: '', desc: '' });
  const visibleProducts = filter === 'all' ? productsState : productsState.filter((item) => item.status === filter);
  const submitProduct = () => {
    if (!draft.name.trim() || !draft.price.trim()) {
      notify('请填写商品名称和价格');
      return;
    }
    setProductsState((prev) => [{
      id: Date.now(),
      name: draft.name.trim(),
      price: Number(draft.price).toFixed(2),
      unit: '自定义规格',
      sales: 0,
      status: 'review',
      statusText: '审核中',
      image: '/assets/products/market/produce-table.jpg'
    }, ...prev]);
    setDraft({ name: '', price: '', desc: '' });
    setSheet(null);
    notify('商品已提交，等待审核');
  };

  return (
    <div className="farmer-shop-page">
      <section className="fsp-hero">
        <div>
          <span>GREEN SOURCE STORE</span>
          <h2>农户店铺工作台</h2>
          <p>商品上架、订单发货、认养经营和售后处理集中管理。</p>
        </div>
        <button onClick={() => setSheet('upload')}>＋ 发布商品</button>
      </section>

      <section className="fsp-mode">
        <button className={mode === 'platform' ? 'active' : ''} onClick={() => setMode('platform')}>
          <b>平台托管</b><span>平台代运营、统一发货</span>
        </button>
        <button className={mode === 'self' ? 'active' : ''} onClick={() => setMode('self')}>
          <b>自主售卖</b><span>自管商品、订单和客户</span>
        </button>
      </section>

      <section className="fsp-stats">
        <span><b>12,680</b>累计收入</span>
        <span><b>3,240</b>本月收入</span>
        <span><b>856</b>待提现</span>
        <span><b>3</b>待发货</span>
      </section>

      <section className="fsp-actions">
        <button onClick={() => setSheet('chat')}><MessageCircle size={19} /><b>客户消息</b><small>3条未读</small></button>
        <button onClick={() => setSheet('wallet')}><Gift size={19} /><b>钱包收益</b><small>可提现856元</small></button>
        <button onClick={() => setSheet('logistics')}><Truck size={19} /><b>物流管理</b><small>3单待发</small></button>
        <button onClick={() => setSheet('afterSale')}><ShieldCheck size={19} /><b>售后客服</b><small>2单待处理</small></button>
        <button onClick={() => onPage('adoptionCenter')}><Sprout size={19} /><b>云认养</b><small>6单在管</small></button>
        <button onClick={() => setSheet('upload')}><PackageSearch size={19} /><b>商品上架</b><small>拍照发布</small></button>
      </section>

      <section className="fsp-products">
        <div className="fsp-section-head">
          <div><b>我的商品</b><span>{mode === 'platform' ? '当前为平台托管模式' : '当前为自主售卖模式'}</span></div>
          <button onClick={() => setSheet('upload')}>新增</button>
        </div>
        <div className="fsp-filter">
          {[
            ['all', '全部'],
            ['selling', '在售'],
            ['review', '审核中']
          ].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id as typeof filter)}>{label}</button>)}
        </div>
        <div className="fsp-product-list">
          {visibleProducts.map((item) => (
            <article key={item.id}>
              <img src={item.image} alt="" />
              <div>
                <b>{item.name}</b>
                <p>{item.unit} · 已售 {item.sales}</p>
                <strong>¥{item.price}</strong>
              </div>
              <em className={item.status}>{item.statusText}</em>
            </article>
          ))}
        </div>
      </section>

      {sheet && (
        <div className="farmer-modal-mask" onClick={() => setSheet(null)}>
          <section className={`farmer-modal-card ${sheet !== 'upload' ? 'large' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head">
              <b>
                {sheet === 'upload' && '发布商品'}
                {sheet === 'chat' && '客户消息'}
                {sheet === 'wallet' && '钱包收益'}
                {sheet === 'logistics' && '物流管理'}
                {sheet === 'afterSale' && '售后客服'}
              </b>
              <button onClick={() => setSheet(null)}>×</button>
            </div>

            {sheet === 'upload' && (
              <div className="fsp-upload">
                <button className="fsp-photo"><img src="/assets/icons/icon-camera.png" alt="" className="fmy-inline-icon" /> 上传商品照片</button>
                <label>商品名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：高原有机番茄" /></label>
                <label>销售价格<input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="例如：38" inputMode="decimal" /></label>
                <label>商品说明<textarea value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} placeholder="产地、规格、采摘时间、配送说明" /></label>
                <button className="address-save-btn" onClick={submitProduct}>提交审核</button>
              </div>
            )}

            {sheet === 'chat' && <ShopRows rows={[['李女士', '番茄什么时候能发货？', '2条未读'], ['王先生', '好的，我下单了', '1条未读'], ['陈老板', '想批量订购辣椒100斤', '已回复']]} />}
            {sheet === 'wallet' && <ShopRows rows={[['累计收入', '¥12,680.50', '查看明细'], ['本月收入', '¥3,240.00', '趋势正常'], ['可提现', '¥856.00', '申请提现'], ['已提现', '¥8,584.50', '到账银行卡']]} />}
            {sheet === 'logistics' && <ShopRows rows={[['高原有机番茄', '李女士 · 待发货 · ¥76.00', '安排发货'], ['农家自种辣椒', '王先生 · 运输中 · ¥62.50', '查看物流'], ['农家土鸡蛋', '张阿姨 · 待发货 · ¥70.00', '安排发货']]} />}
            {sheet === 'afterSale' && <ShopRows rows={[['退换货申请', '番茄收到有损坏，要求换货', '待处理'], ['退款申请', '土豆规格发错，申请退款', '处理中'], ['物流咨询', '土鸡蛋配送时间咨询', '已解决']]} />}
          </section>
        </div>
      )}
    </div>
  );
}

function ShopRows({ rows }: { rows: string[][] }) {
  return (
    <div className="fsp-sheet-rows">
      {rows.map(([title, desc, action]) => (
        <article key={`${title}-${desc}`}>
          <div><b>{title}</b><p>{desc}</p></div>
          <button>{action}</button>
        </article>
      ))}
    </div>
  );
}

function Farming() {
  const [accepted, setAccepted] = useState<string[]>(['番茄棚补水']);
  const accept = (name: string) => setAccepted((prev) => prev.includes(name) ? prev : [...prev, name]);
  return (
    <div className="farmer-v2-page">
      <SectionTitle title="农事日历" action="新增任务" />
      <div className="farmer-v2-calendar">
        <div className="calendar-head"><ChevronLeft />{currentMonthTitle}<ChevronRight /></div>
        <div className="calendar-grid">
          {Array.from({ length: 30 }, (_, i) => <button key={i} className={i + 1 === todayDay ? 'today' : [3, 9, 14, 22].includes(i + 1) ? 'has-task' : ''}>{i + 1}</button>)}
        </div>
        <div className="farmer-v2-day-summary">
          <b>{todayMonthDay}任务进度</b>
          <span>已完成 1/4</span>
        </div>
      </div>

      <section className="farmer-v2-recommend">
        <div className="farmer-v2-section-head">
          <div><span>系统推荐任务</span><b>AI 大模型智能推荐</b></div>
          <em>实时</em>
        </div>
        {[
          { name: '提前开启番茄棚通风', reason: '13:00 后棚内温度预计升至 29°C' },
          { name: 'A区土壤补水 20 分钟', reason: '土壤湿度低于 20%，影响根系吸收' }
        ].map((item) => (
          <article key={item.name}>
            <Bot size={18} />
            <div><b>{item.name}</b><p>{item.reason}</p></div>
            <button className={accepted.includes(item.name) ? 'accepted' : ''} onClick={() => accept(item.name)}>
              {accepted.includes(item.name) ? '已采纳' : '采纳'}
            </button>
          </article>
        ))}
      </section>

      <section className="farmer-v2-task-list">
        <div className="farmer-v2-section-head"><div><span>当日任务清单</span><b>可勾选完成</b></div></div>
        {farmerReminders.map((task) => <FarmerTaskCard key={task.id} task={task} />)}
      </section>
    </div>
  );
}

function FarmerTaskCard({ task }: { task: (typeof farmerReminders)[number] }) {
  const [done, setDone] = useState(task.done);
  return (
    <article className={done ? 'done' : ''} onClick={() => setDone(!done)}>
      <CheckCircle2 size={20} />
      <div>
        <b>{task.name}</b>
        <p>{task.time} · {task.type} · {task.desc}</p>
      </div>
      <span>{done ? '完成' : '待办'}</span>
    </article>
  );
}

function Environment({ onPage }: { onPage: (page: FarmerPage) => void }) {
  const [devices, setDevices] = useState([
    { name: '智能滴灌阀', on: true, auto: true },
    { name: '北棚摄像头', on: true, auto: false },
    { name: '通风卷膜机', on: false, auto: true },
    { name: '补光灯组', on: true, auto: true }
  ]);
  return (
    <div className="farmer-v2-page">
      <section className="farmer-v2-env-hero">
        <div>
          <span>LIVE · 1号智能棚</span>
          <h2>环境监测</h2>
          <p>摄像头、传感器、滴灌设备在线联动</p>
        </div>
        <button onClick={() => onPage('myDevice')}>我的设备</button>
      </section>
      <section className="farmer-v2-camera">
        <img src="/assets/farm/greenhouse.jpg" alt="" />
        <div><span>实时画面</span><b>番茄棚长势稳定</b></div>
      </section>
      <div className="farmer-v2-metrics">
        {['棚内温度 26°C', '土壤酸碱 6.8', '空气湿度 71%', '光照 18200lux'].map((item) => <div key={item}>{item}</div>)}
      </div>
      <section className="farmer-v2-drip">
        <div><span>智能滴灌</span><b>3 个设备运行中 · 用水 12.5L</b></div>
        <button onClick={() => onPage('myDevice')}>管理</button>
      </section>
      <section className="farmer-v2-devices">
        <div className="farmer-v2-section-head"><div><span>设备控制中心</span><b>点击控制设备</b></div></div>
        {devices.map((device, index) => (
          <button key={device.name} className={device.on ? 'on' : ''} onClick={() => setDevices((prev) => prev.map((row, i) => i === index ? { ...row, on: !row.on } : row))}>
            <span>{device.name}</span>
            <b>{device.on ? '运行中' : '已关闭'}</b>
            {device.auto && <em>自动</em>}
          </button>
        ))}
      </section>
      <section className="farmer-v2-alerts" onClick={() => onPage('warningCenter')}>
        <article><Bell size={19} /><div><b>棚内温度过高</b><p>当前 26°C，超过安全值 24°C</p></div><ChevronRight size={18} /></article>
        <article><Bell size={19} /><div><b>土壤湿度过低</b><p>A区湿度 15.5%，建议开启滴灌</p></div><ChevronRight size={18} /></article>
      </section>
    </div>
  );
}

function Community() {
  const [activeTab, setActiveTab] = useState<'hot' | 'latest'>('hot');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [communityList, setCommunityList] = useState(farmerCommunityPosts);
  const publish = () => {
    const text = content.trim();
    if (!text) return;
    setCommunityList((prev) => [{
      id: Date.now(),
      userName: '我',
      levelText: '🥇黄金',
      location: '云南·昆明',
      time: '刚刚',
      content: text,
      hasVoice: false,
      voiceDuration: '',
      likes: 0,
      comments: 0,
      views: 0,
      liked: false,
      showComments: false,
      commentList: []
    }, ...prev]);
    setContent('');
  };
  const stopRecord = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setContent((prev) => `${prev ? `${prev}\n` : ''}今天天气不错，番茄长势很好！`);
  };
  return (
    <div className="farmer-community-replica">
      <header className="fc-nav-header">
        <span />
        <b>农友社区</b>
        <span />
      </header>
      <div className="fc-tab-bar">
        <button className={activeTab === 'hot' ? 'active' : ''} onClick={() => setActiveTab('hot')}><img src="/assets/icons/icon-flame.png" alt="" className="fmy-inline-icon" /> 热门</button>
        <button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')}><img src="/assets/icons/clock.png" alt="" className="fmy-inline-icon" /> 最新</button>
      </div>
      <section className="fc-post-input-area">
        <div className="fc-post-input-box">
          <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="分享你的种植经验..." />
          <button className={isRecording ? 'recording' : ''} onMouseDown={() => setIsRecording(true)} onMouseUp={stopRecord} onClick={() => !isRecording && setContent((prev) => `${prev}请教大家一下，大棚湿度太高怎么办？`)}>
            {isRecording ? <img src="/assets/icons/icon-play.png" alt="" className="fmy-grid-icon" /> : <img src="/assets/icons/icon-mic.png" alt="" className="fmy-grid-icon" />}
          </button>
        </div>
        <button className="fc-send-btn" onClick={publish}>发送</button>
      </section>
      {isRecording && <div className="fc-recording-toast"><img src="/assets/icons/icon-play.png" alt="" className="fmy-inline-icon" /> 正在录音，松开发送...</div>}
      <div className="fc-post-list">
        {communityList.map((post) => (
          <article className="fc-post-card" key={post.id}>
            <div className="fc-post-user-row">
              <div className="fc-user-avatar">{post.userName.slice(0, 1)}</div>
              <div className="fc-user-name-area">
                <p><b>{post.userName}</b><em>{post.levelText}</em></p>
                <small>{post.location} · {post.time}</small>
              </div>
            </div>
            <p>{post.content}</p>
            {post.hasVoice && (
              <button className="fc-voice-strip">
                <span>▶</span><i /><i /><i /><i /><i /><i /><i /><i /><em>{post.voiceDuration}"</em>
              </button>
            )}
            <div className="fc-post-actions">
              <button className={post.liked ? 'liked' : ''} onClick={() => setCommunityList((prev) => prev.map((row) => row.id === post.id ? { ...row, liked: !row.liked, likes: row.liked ? row.likes - 1 : row.likes + 1 } : row))}><img src="/assets/icons/icon-like.png" alt="" className="fmy-inline-icon" /> {post.likes}</button>
              <button onClick={() => setCommunityList((prev) => prev.map((row) => row.id === post.id ? { ...row, showComments: !row.showComments } : row))}><img src="/assets/icons/icon-chat.png" alt="" className="fmy-inline-icon" /> {post.comments}</button>
              <span><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> {post.views}</span>
            </div>
            {post.showComments && post.commentList.length > 0 && (
              <div className="fc-comments">
                {post.commentList.map((comment) => <p key={comment}>{comment}</p>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Profile({
  role,
  onSwitch,
  onOpenConsumerPage,
  onOpenFarmerPage,
  onLogin,
  loggedIn = false,
  session,
  safeProduct,
  orders,
  onEditProfile,
  recommendProducts,
  onProduct
}: {
  role: Role;
  onSwitch: () => void;
  onOpenConsumerPage?: (page: ConsumerPage) => void;
  onOpenFarmerPage?: (page: FarmerPage) => void;
  onLogin?: () => void;
  loggedIn?: boolean;
  session?: SessionUser | null;
  safeProduct: (idx: number) => Product;
  orders?: OrderRecord[];
  onEditProfile?: () => void;
  recommendProducts?: Product[];
  onProduct?: (item: Product) => void;
}) {
  if (role === 'consumer') {
    const open = (page: ConsumerPage) => onOpenConsumerPage?.(page);
    const count = (s: string) => (orders || []).filter((o) => o.status === s).length;
    const goEdit = () => { if (loggedIn) onEditProfile?.(); else onLogin?.(); };
    const isFarmer = Boolean(session?.roles?.includes('farmer'));
    const services: Array<[string, string, () => void]> = [
      ['/assets/icons/adopt.png', '我的认养', () => open('adoptDetail')],
      ['/assets/icons/chat.png', '在线客服', () => open('service')],
      ['/assets/icons/pin.png', '收货地址', () => open('address')],
      ['/assets/icons/heart.png', '我的收藏', () => open('favorites')],
      ['/assets/icons/message.png', '我的消息', () => open('messages')],
      ['/assets/icons/bag.png', '购物车', () => open('cart')],
      ['/assets/icons/settings.png', '账户设置', () => open('settings')],
      ...(isFarmer ? [['/assets/icons/truck.png', '农户订单', onSwitch] as [string, string, () => void]] : []),
    ];
    return (
      <div className="account-page">
        <header className="account-hero">
          <div className="account-top">
            <button onClick={() => open('member')} aria-label="会员中心"><img src="/assets/icons/member.png" alt="" /></button>
            <button onClick={() => open('messages')} aria-label="我的消息"><img src="/assets/icons/message.png" alt="" /></button>
            <button onClick={() => open('footprints')} aria-label="浏览足迹"><img src="/assets/icons/footprint.png" alt="" /></button>
          </div>
          <div className="account-profile" onClick={goEdit}>
            <div className="account-avatar">{session?.avatar ? <img src={session.avatar} alt="头像" /> : <img src="/assets/brand-logo.png" alt="默认头像" />}</div>
            <div className="account-user">
              <b className="account-name">{loggedIn ? (session?.nickname || '耘露用户') : '欢迎来到耘露'}</b>
              <span className="account-desc">{loggedIn ? (session?.city ? `📍 ${session.city}` : '我的新鲜生活') : '登录查看订单与收货信息'}</span>
            </div>
            {loggedIn
              ? <em className="account-chev">›</em>
              : <button className="account-login" onClick={(e) => { e.stopPropagation(); onLogin?.(); }}>登录</button>}
          </div>
        </header>
        <div className="account-content">
          <section className="account-card account-order-grid">
            {([
              ['/assets/icons/wallet.png', '待付款', 'pending', () => open('orders')],
              ['/assets/icons/package.png', '待发货', 'paid', () => open('orders')],
              ['/assets/icons/truck.png', '待收货', 'shipped', () => open('orders')],
              ['/assets/icons/return.png', '客服售后', '', () => open('service')],
              ['/assets/icons/orders.png', '全部订单', '', () => open('orders')],
            ] as Array<[string, string, string, () => void]>).map(([icon, label, status, action]) => (
              <button key={label} className="account-shortcut" onClick={action}>
                <span className="account-shortcut-icon"><img src={icon} alt="" /></span>
                <span>{label}</span>
                {status && loggedIn && <i className="account-badge">{count(status)}</i>}
              </button>
            ))}
          </section>
          <section className="account-card account-services">
            <div className="account-services-title">我的服务</div>
            <div className="account-services-grid">
              {services.map(([icon, label, action]) => (
                <button key={label} className="account-service" onClick={action}>
                  <span className="account-service-icon"><img src={icon} alt="" /></span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
          {(recommendProducts || []).length > 0 && (
            <section className="account-recommend">
              <div className="account-recommend-head">
                <b>为 · 你 · 推 · 荐</b>
                <span>GUESS YOU WILL LIKE</span>
              </div>
              <div className="account-recommend-grid">
                {(recommendProducts || []).slice(0, 6).map((item) => (
                  <button key={item.id} className="account-recommend-card" onClick={() => onProduct?.(item)}>
                    <span className="account-recommend-photo"><img src={item.image || item.coverImage} alt="" /></span>
                    <b>{item.name}</b>
                    <div className="account-recommend-meta">
                      <strong><i>¥</i>{item.price}</strong>
                      <small>{item.origin || item.unit || ''}</small>
                    </div>
                  </button>
                ))}
              </div>
              <p className="account-recommend-note">本地农货资料 · 购买服务以商品详情为准</p>
            </section>
          )}
          <button className="mp-profile-switch" onClick={onSwitch}>切换身份 <ChevronRight size={17} /></button>
        </div>
      </div>
    );
  }

  const [quickDevices, setQuickDevices] = useState([
    { id: 1, icon: '/assets/icons/icon-fan.png', name: '通风扇', on: true },
    { id: 2, icon: '/assets/icons/icon-curtain.png', name: '卷帘', on: true },
    { id: 3, icon: '/assets/icons/icon-drip.png', name: '滴灌系统', on: true },
    { id: 4, icon: '/assets/icons/icon-light.png', name: '补光灯', on: false }
  ]);
  const [mineModal, setMineModal] = useState<'addCrop' | 'cropDetail' | 'historyDetail' | 'allCrops' | 'allHistory' | null>(null);
  const [selectedCrop, setSelectedCrop] = useState(farmerArchives[0]);
  const [selectedHistory, setSelectedHistory] = useState(farmerHistory[0]);
  const [cropDraft, setCropDraft] = useState({ name: '', area: '', date: '' });
  const [extraCrops, setExtraCrops] = useState<typeof farmerArchives>([]);
  const [serverCrops, setServerCrops] = useState<typeof farmerArchives>([]);
  const cropList = serverCrops.length ? serverCrops : [...farmerArchives, ...extraCrops];

  useEffect(() => {
    let alive = true;
    fetchFarmerCrops().then((crops) => {
      if (!alive || !crops.length) return;
      const mapped = crops.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        area: c.area,
        plantDays: c.daysToHarvest,
        status: c.statusText,
        yield: '待评估',
        photo: '',
        note: '',
      }));
      setServerCrops(mapped);
      setSelectedCrop(mapped[0]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const addCrop = () => {
    if (!cropDraft.name.trim() || !cropDraft.area.trim()) return;
    setExtraCrops((prev) => [...prev, {
      id: Date.now(),
      name: cropDraft.name.trim(),
      icon: '/assets/icons/icon-leaf.png',
      area: `${cropDraft.area}亩`,
      plantDays: cropDraft.date ? Math.max(0, Math.ceil((Date.now() - new Date(cropDraft.date).getTime()) / 86400000)) : 0,
      status: '幼苗期',
      yield: '待评估',
      photo: '/assets/farm/greenhouse.jpg',
      note: '新增作物档案，等待完善生长记录。'
    }]);
    setCropDraft({ name: '', area: '', date: '' });
    setMineModal(null);
  };

  return (
    <div className="farmer-my-page farmer-my-replica">
      <section className="fmy-profile-header">
        {loggedIn && session ? (
          <>
            <div className="fmy-avatar-area" onClick={() => onEditProfile?.()}>
              <div className="fmy-avatar">
                {session.avatar ? <img src={session.avatar} alt="头像" /> : <img src="/assets/brand-logo.png" alt="头像" />}
              </div>
              <span>{session.memberLevelName || '农户会员'}</span>
            </div>
            <div className="fmy-user-info" onClick={() => onEditProfile?.()}>
              <h2>{session.nickname || '农户用户'}</h2>
              <p>ID: {session.phone || `FM${session.userId}`}</p>
              <em><img src="/assets/icons/icon-pin.png" alt="" className="fmy-inline-icon" /> {session.city || '未设置地区'}</em>
            </div>
            <button className="fmy-settings" onClick={() => onOpenFarmerPage?.('farmerSettings')}><img src="/assets/icons/settings.png" alt="" className="fmy-inline-icon" /> 设置</button>
          </>
        ) : (
          <>
            <div className="fmy-avatar-area">
              <div className="fmy-avatar"><img src="/assets/brand-logo.png" alt="默认头像" /></div>
            </div>
            <div className="fmy-user-info">
              <h2>登录后管理农场</h2>
              <p>登录后可同步作物档案、订单与农事数据</p>
            </div>
            <button className="fmy-settings" onClick={onLogin}>登录 / 注册</button>
          </>
        )}
      </section>

      <section className="fmy-stats-bar">
        <span><b>156</b>识别次数</span>
        <i />
        <span><b>{cropList.length}</b>作物档案</span>
        <i />
        <span><b>365</b>使用天数</span>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head">
          <b><img src="/assets/icons/icon-rice.png" alt="" className="fmy-inline-icon" /> 作物档案</b>
          <button onClick={() => setMineModal('addCrop')}>＋ 添加档案</button>
        </div>
        <div className="fmy-crop-scroll">
          {cropList.map((crop) => (
            <article key={crop.id} onClick={() => { setSelectedCrop(crop); setMineModal('cropDetail'); }}>
              <img src={crop.photo} alt="" />
              <b>{crop.name}</b>
              <span>{crop.area} · 种植{crop.plantDays}天</span>
              <em>{crop.status}</em>
              <small>预计产量：{crop.yield}</small>
            </article>
          ))}
        </div>
        <button className="fmy-view-all" onClick={() => setMineModal('allCrops')}>查看全部 ›</button>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head">
          <b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 历史识别记录</b>
          <button onClick={() => setMineModal('allHistory')}>更多 ›</button>
        </div>
        <div className="fmy-history-list">
          {farmerHistory.map((item) => (
            <article key={item.id} onClick={() => { setSelectedHistory(item); setMineModal('historyDetail'); }}>
              <span><img src={item.icon} alt="" className="fmy-grid-icon" /></span>
              <div><b>{item.crop}</b><p>{item.date} · {item.desc}</p></div>
              <em>{item.status}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="fmy-community-entry" onClick={() => onOpenFarmerPage?.('community')}>
        <div><span><img src="/assets/icons/icon-community.png" alt="" className="fmy-grid-icon" /></span><p><b>农友社区</b><small>与全国农友交流种植经验</small></p></div>
        <em>›</em>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 今日速览</b><span>{todayMonthDay} · {weekdayText}</span></div>
        <div className="fmy-today-grid">
          <button onClick={() => onOpenFarmerPage?.('weatherDetail')}><span><img src="/assets/icons/icon-sun.png" alt="" className="fmy-grid-icon" /></span><b>天气</b><em>晴 26°C</em><small>适宜作业</small></button>
          <button><span><img src="/assets/icons/icon-list.png" alt="" className="fmy-grid-icon" /></span><b>待办</b><em>5项</em><small>2已完成</small></button>
          <button onClick={() => onOpenFarmerPage?.('myDevice')}><span><img src="/assets/icons/device.png" alt="" className="fmy-grid-icon" /></span><b>设备</b><em>6/6</em><small>全部在线</small></button>
          <button onClick={() => onOpenFarmerPage?.('warningCenter')}><span><img src="/assets/icons/icon-bell.png" alt="" className="fmy-grid-icon" /></span><b>提醒</b><em>4条</em><small>1条紧急</small></button>
        </div>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head"><b><img src="/assets/icons/settings.png" alt="" className="fmy-inline-icon" /> 设备快捷</b><button onClick={() => onOpenFarmerPage?.('myDevice')}>管理 ›</button></div>
        <div className="fmy-quick-device">
          {quickDevices.map((device) => (
            <button key={device.id} className={device.on ? 'on' : ''} onClick={() => setQuickDevices((prev) => prev.map((row) => row.id === device.id ? { ...row, on: !row.on } : row))}>
              <span><img src={device.icon} alt="" className="fmy-inline-icon" /> {device.name}</span>
              <em>{device.on ? '运行中' : '已关闭'}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="fmy-alert-card">
        <div><span><img src="/assets/icons/icon-cloudy.png" alt="" className="fmy-inline-icon" /></span><b>明日天气预报</b><em>{tomorrowMonthDay}</em></div>
        <p>多云转晴 · 18~27°C。东南风3级，湿度62%，无降水，适合追肥和病虫害防治。</p>
        <footer><span><img src="/assets/icons/icon-sun.png" alt="" className="fmy-inline-icon" /> 适宜户外作业</span><span><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" /> 注意午间补水</span></footer>
      </section>

      <section className="fmy-alert-list">
        {[
          { icon: '/assets/icons/icon-tomato.png', title: '番茄追肥提醒', badge: '紧急', desc: '高原番茄进入花期，建议今日下午追加磷钾肥。', time: '今天 15:00 前' },
          { icon: '/assets/icons/icon-bell-pepper.png', title: '辣椒蚜虫复查', badge: '待处理', desc: '线椒蚜虫喷药已过3天，请检查虫口密度是否下降。', time: '明天 上午' }
        ].map((item) => (
          <article key={item.title}><div><span><img src={item.icon} alt="" className="fmy-grid-icon" /></span><b>{item.title}</b><em>{item.badge}</em></div><p>{item.desc}</p><small><img src="/assets/icons/clock.png" alt="" className="fmy-inline-icon" /> {item.time}</small></article>
        ))}
      </section>
      <button className="secondary-btn wide" onClick={onSwitch}>切换身份</button>
      {mineModal && (
        <div className="farmer-modal-mask" onClick={() => setMineModal(null)}>
          <section className={`farmer-modal-card ${mineModal === 'addCrop' || mineModal === 'allCrops' || mineModal === 'allHistory' ? 'large' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head">
              <b>
                {mineModal === 'addCrop' && <><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 添加作物档案</>}
                {mineModal === 'cropDetail' && <><img src="/assets/icons/icon-rice.png" alt="" className="fmy-inline-icon" /> 作物详情</>}
                {mineModal === 'historyDetail' && <><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 识别记录详情</>}
                {mineModal === 'allCrops' && <><img src="/assets/icons/icon-rice.png" alt="" className="fmy-inline-icon" /> 我的作物档案（共{cropList.length}个）</>}
                {mineModal === 'allHistory' && <><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 历史识别记录（共{farmerHistory.length}条）</>}
              </b>
              <button onClick={() => setMineModal(null)}>×</button>
            </div>
            {mineModal === 'addCrop' && (
              <div className="farmer-add-crop-form">
                <label>作物名称<input value={cropDraft.name} onChange={(event) => setCropDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="例如：冰糖橙" /></label>
                <label>种植面积（亩）<input value={cropDraft.area} onChange={(event) => setCropDraft((prev) => ({ ...prev, area: event.target.value }))} placeholder="例如：10" inputMode="decimal" /></label>
                <label>定植日期<input value={cropDraft.date} onChange={(event) => setCropDraft((prev) => ({ ...prev, date: event.target.value }))} type="date" /></label>
                <div className="farmer-upload-placeholder"><span><img src="/assets/icons/icon-camera.png" alt="" className="fmy-grid-icon" /></span><b>＋ 上传照片</b><small>支持相册/相机上传</small></div>
                <button className="farmer-modal-primary" onClick={addCrop}>确认添加</button>
              </div>
            )}
            {mineModal === 'cropDetail' && (
              <div className="farmer-crop-detail-modal">
                <img src={selectedCrop.photo} alt="" />
                <h3>{selectedCrop.name}</h3>
                <div>
                  <span>种植面积<b>{selectedCrop.area}</b></span>
                  <span>种植天数<b>{selectedCrop.plantDays}天</b></span>
                  <span>生长状态<b>{selectedCrop.status}</b></span>
                  <span>预计产量<b>{selectedCrop.yield}</b></span>
                </div>
                <p><b><img src="/assets/icons/icon-note.png" alt="" className="fmy-inline-icon" /> 备注</b>{selectedCrop.note}</p>
              </div>
            )}
            {mineModal === 'historyDetail' && (
              <div className="farmer-history-detail-modal">
                <div><span><img src={selectedHistory.icon} alt="" className="fmy-grid-icon" /></span><h3>{selectedHistory.crop}</h3></div>
                <p><b>识别时间</b>{selectedHistory.date}</p>
                <p><b>处理状态</b>{selectedHistory.status}</p>
                <p><b>AI诊断结果</b>{selectedHistory.desc}</p>
                <p><b>建议措施</b>保持当前管理方案，3天后复查并记录变化。</p>
              </div>
            )}
            {mineModal === 'allCrops' && (
              <div className="farmer-full-crop-grid">
                {cropList.map((crop) => <button key={crop.id} onClick={() => { setSelectedCrop(crop); setMineModal('cropDetail'); }}><img src={crop.photo} alt="" /><b>{crop.name}</b><span>{crop.area} · {crop.plantDays}天</span><em>{crop.status}</em></button>)}
              </div>
            )}
            {mineModal === 'allHistory' && (
              <div className="farmer-full-history-list">
                {farmerHistory.map((item) => <button key={item.id} onClick={() => { setSelectedHistory(item); setMineModal('historyDetail'); }}><span><img src={item.icon} alt="" className="fmy-grid-icon" /></span><div><b>{item.crop}</b><small>{item.date}</small></div><em>{item.status}</em></button>)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function FarmerSubPageMP({ page, onBack, onPage, nickname, onSwitch, onOpenGeneral, onLogout, onEditProfile, onAddress, onPrivacy, onProfileChanged, onLogin, loggedIn, notify, addresses, selectedAddress, onSelectAddress, onAddressesChanged }: { page: FarmerPage; onBack: () => void; onPage: (page: FarmerPage) => void; nickname?: string; onSwitch: () => void; onOpenGeneral?: () => void; onLogout?: () => void; onEditProfile?: () => void; onAddress?: () => void; onPrivacy?: () => void; onProfileChanged?: () => void; onLogin?: () => void; loggedIn?: boolean; notify?: (message: string) => void; addresses?: Address[]; selectedAddress?: Address | null; onSelectAddress?: (address: Address | null) => void; onAddressesChanged?: () => Promise<void> }) {
  const titles: Record<Exclude<FarmerPage, 'tabs'>, import('react').ReactNode> = {
    myCrops: <><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-inline-icon" /> 我的作物</>,
    cropDetail: '作物详情',
    warningCenter: '预警中心',
    adoptionCenter: '云认养管理中心',
    myDevice: '我的设备',
    techSupport: '技术支持',
    weatherDetail: '天气详情',
    voiceAssistant: '语音助手',
    locationMap: '基地地图',
    community: '农友社区',
    farmerSettings: '设置',
    farmerGeneral: '通用设置',
    farmerAddress: '收货地址',
    farmerPrivacy: '账户数据与隐私',
    farmerOrders: '订单管理',
    farmerOrderDetail: '订单详情',
    myOrders: '我的工单'
  };
  return (
    <div className="farmer-mp sub-mp">
      <header className="mp-sub-nav">
        <button onClick={onBack} aria-label="返回"><ChevronLeft size={16} />返回</button>
        <b>{titles[page as Exclude<FarmerPage, 'tabs'>]}</b>
        <span />
      </header>
      {page === 'myCrops' && <FarmerCropsPageMP onDetail={() => onPage('cropDetail')} />}
      {page === 'cropDetail' && <FarmerCropDetailPageMP />}
      {page === 'warningCenter' && <FarmerWarningPageMP />}
      {page === 'adoptionCenter' && <FarmerAdoptionOrdersMP />}
      {page === 'myDevice' && <FarmerDevicePageMP />}
      {page === 'techSupport' && <FarmerTechSupportMP onPage={onPage} />}
      {page === 'myOrders' && <FarmerWorkOrdersMP />}
          {page === 'weatherDetail' && <FarmerWeatherPageMP />}
          {page === 'voiceAssistant' && <FarmerVoiceAssistantMP />}
          {page === 'locationMap' && <FarmerLocationMapMP />}
          {page === 'community' && <CommunityMP />}
          {page === 'farmerSettings' && <FarmerSettingsMP nickname={nickname} loggedIn={loggedIn} onSwitch={onSwitch} onOpenGeneral={() => onPage('farmerGeneral')} onLogout={onLogout} onEditProfile={onEditProfile} onAddress={() => onPage('farmerAddress')} onPrivacy={() => onPage('farmerPrivacy')} onProfileChanged={onProfileChanged} onLogin={onLogin} notify={notify} />}
          {page === 'farmerGeneral' && <GeneralSettingsPage onBack={() => onPage('farmerSettings')} notify={notify || (() => {})} />}
          {page === 'farmerAddress' && <AddressPage addresses={addresses || []} selectedAddress={selectedAddress || null} onSelect={(a) => onSelectAddress?.(a)} onChanged={onAddressesChanged || (async () => {})} notify={notify || (() => {})} />}
          {page === 'farmerPrivacy' && <PrivacyPage />}
      {(page === 'farmerOrders' || page === 'farmerOrderDetail') && <FarmerOrdersMP />}
    </div>
  );
}

function FarmerOrdersMP() {
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipTarget, setShipTarget] = useState<FarmerOrder | null>(null);
  const [company, setCompany] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [tip, setTip] = useState('');
  const notify = (message: string) => { setTip(message); window.setTimeout(() => setTip(''), 1400); };

  useEffect(() => {
    let alive = true;
    fetchFarmerOrders().then((list) => { if (alive) { setOrders(list); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const doShip = async () => {
    if (!shipTarget) return;
    if (!company.trim() || !trackingNo.trim()) { notify('请填写物流公司和单号'); return; }
    try {
      await shipFarmerOrder(shipTarget.id, company.trim(), trackingNo.trim());
      notify('已发货');
      setShipTarget(null);
      setCompany(''); setTrackingNo('');
      const list = await fetchFarmerOrders();
      setOrders(list);
    } catch (e) {
      notify(e instanceof Error ? e.message : '发货失败');
    }
  };

  const statusText: Record<string, string> = { pending: '待支付', paid: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };

  return (
    <div className="ac-page-mp">
      <section className="ac-header-section-mp">
        <span className="ac-bg one"><img src="/assets/icons/package.png" alt="" className="fmy-grid-icon" /></span><span className="ac-bg two"><img src="/assets/icons/truck.png" alt="" className="fmy-grid-icon" /></span><span className="ac-bg three"><img src="/assets/icons/icon-cloud.png" alt="" className="fmy-grid-icon" /></span>
        <div className="ac-header-content-mp">
          <h2><img src="/assets/icons/package.png" alt="" className="fmy-inline-icon" /> 订单管理</h2>
          <p>处理消费者购买您农产品的订单</p>
        </div>
        <div className="ac-stats-card-mp">
          <span><b>{orders.length}</b><em>订单总数</em></span>
          <span><b>{orders.filter((o) => o.status === 'paid').length}</b><em>待发货</em></span>
          <span><b>{orders.filter((o) => o.status === 'shipped').length}</b><em>已发货</em></span>
        </div>
      </section>
      <div className="ac-list-header-mp"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 订单列表</b><span>共 {orders.length} 条</span></div>
      {loading && <p className="farmer-orders-empty">加载中…</p>}
      {!loading && orders.length === 0 && <div className="farmer-orders-empty"><b>暂无订单</b><p>消费者购买您的商品后会在这里展示。</p></div>}
      <section className="ac-order-list-mp">
        {orders.map((item) => (
          <article className="ac-order-card-mp" key={item.id}>
            <div className="aoc-top-mp">
              <div className="aoc-product-mp"><span style={{ background: '#E8F5E9' }}><img src="/assets/icons/icon-cart.png" alt="" className="fmy-grid-icon" /></span><div><b>订单 {item.orderNo}</b><small>{item.createdAt}</small></div></div>
              <em className={item.status}>{statusText[item.status] || item.statusText}</em>
            </div>
            <div className="aoc-detail-grid-mp">
              {item.items.slice(0, 4).map((it, idx) => <span key={idx}>{it.name}×{it.quantity}<b>¥{(it.priceFen / 100).toFixed(2)}</b></span>)}
            </div>
            <p className="aoc-shipping-mp">合计金额：<b>¥{item.totalAmount.toFixed(2)}</b></p>
            <footer>
              {item.status === 'paid' && <button onClick={() => setShipTarget(item)}><img src="/assets/icons/truck.png" alt="" className="fmy-inline-icon" /> 发货</button>}
              {item.status === 'shipped' && <button disabled>已发货</button>}
            </footer>
          </article>
        ))}
      </section>
      {shipTarget && (
        <div className="address-sheet-mask" onClick={() => setShipTarget(null)}>
          <section className="address-edit-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="trace-section-head"><b>订单发货</b><button onClick={() => setShipTarget(null)}>关闭</button></div>
            <label className="addr-field"><span>物流公司</span><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="如：顺丰速运" /></label>
            <label className="addr-field"><span>物流单号</span><input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="请输入运单号" /></label>
            <button className="address-save-btn" onClick={doShip}>确认发货</button>
          </section>
        </div>
      )}
      {tip && <div className="global-toast-red">{tip}</div>}
    </div>
  );
}

function FarmerSettingsMP({ nickname, onSwitch, onOpenGeneral, onLogout, onEditProfile, onAddress, onPrivacy, onProfileChanged, onLogin, loggedIn, notify }: { nickname?: string; onSwitch?: () => void; onOpenGeneral?: () => void; onLogout?: () => void; onEditProfile?: () => void; onAddress?: () => void; onPrivacy?: () => void; onProfileChanged?: () => void; onLogin?: () => void; loggedIn?: boolean; notify?: (message: string) => void }) {
  const [session] = useState(() => getStoredSession());
  const [city, setCity] = useState(session?.city || '');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [citySheet, setCitySheet] = useState(false);
  const [fontSheet, setFontSheet] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [savingCity, setSavingCity] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'suggest', content: '', contact: '' });
  const [submitting, setSubmitting] = useState(false);
  const isLoggedIn = loggedIn ?? Boolean(session);
  const displayName = session?.nickname?.trim() || nickname?.trim() || (isLoggedIn ? '农户用户' : '未登录');
  const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '昆明'];
  const FONT_LABEL: Record<number, string> = { 1: '小', 2: '标准', 3: '大' };

  useEffect(() => {
    let alive = true;
    fetchUserSettings().then((s) => { if (alive) setSettings(s); }).catch(() => { if (alive) setSettings({ orderNotify: true, logisticsNotify: true, promoNotify: true, communityNotify: true, personalizedRecommend: true, footprintVisible: true, voiceEnabled: false, dataSaver: false, fontScale: 2 }); });
    return () => { alive = false; };
  }, []);

  const togglePref = async (key: 'voiceEnabled' | 'dataSaver') => {
    if (!settings) return;
    const next = !settings[key];
    const prev = settings;
    setSettings({ ...settings, [key]: next });
    try { setSettings(await updateUserSettings({ [key]: next })); } catch { setSettings(prev); notify?.('保存失败，请稍后重试'); }
  };
  const chooseFont = async (scale: number) => {
    setFontSheet(false);
    if (!settings || scale === settings.fontScale) return;
    const prev = settings;
    setSettings({ ...settings, fontScale: scale });
    try { setSettings(await updateUserSettings({ fontScale: scale })); notify?.('字体大小已更新'); } catch { setSettings(prev); notify?.('保存失败，请稍后重试'); }
  };
  const chooseCity = async (c: string) => {
    setCitySheet(false);
    if (savingCity || c === city) return;
    setSavingCity(true);
    try {
      await updateProfile({ city: c });
      setCity(c);
      notify?.('城市已更新');
      onProfileChanged?.();
    } catch (error) {
      notify?.(error instanceof Error ? error.message : '城市保存失败');
    } finally {
      setSavingCity(false);
    }
  };
  const openHelp = () => {
    setHelpOpen(true);
    fetchFaqs().then(setFaqs).catch(() => {});
  };
  const submit = async () => {
    const content = feedback.content.trim();
    if (!content) { notify?.('请填写反馈内容'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback(feedback.type, content, feedback.contact.trim());
      setFeedbackOpen(false);
      setFeedback({ type: 'suggest', content: '', contact: '' });
      notify?.('感谢你的反馈');
    } catch (error) {
      notify?.(error instanceof Error ? error.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };
  const goEdit = () => { if (isLoggedIn) onEditProfile?.(); else onLogin?.(); };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button className={`st-toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-label="开关"><i /></button>
  );

  return (
    <div className="settings-red mp-settings-page st-page">
      <section className="st-group">
        <div className="st-group-title">个人信息</div>
        <button className="st-row" onClick={goEdit}>
          <span className="st-icon"><img src="/assets/icons/user.png" alt="" /></span><span className="st-label">昵称</span>
          <em>{displayName}</em><ChevronRight size={16} />
        </button>
        <button className="st-row" disabled={!isLoggedIn} onClick={() => setCitySheet(true)}>
          <span className="st-icon"><img src="/assets/icons/pin.png" alt="" /></span><span className="st-label">城市</span>
          <em className={city ? '' : 'st-placeholder'}>{city || '未设置'}</em><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <div className="st-group-title">通用</div>
        <button className="st-row" onClick={() => setFontSheet(true)}>
          <span className="st-icon"><img src="/assets/icons/font.png" alt="" /></span><span className="st-label">字体大小</span>
          <em>{FONT_LABEL[settings?.fontScale ?? 2] || '标准'}</em><ChevronRight size={16} />
        </button>
        <div className="st-row">
          <span className="st-icon"><img src="/assets/icons/voice.png" alt="" /></span><span className="st-label">语音播报</span>
          <Toggle on={Boolean(settings?.voiceEnabled)} onChange={() => togglePref('voiceEnabled')} />
        </div>
        <div className="st-row">
          <span className="st-icon"><img src="/assets/icons/signal.png" alt="" /></span><span className="st-label">图片省流模式</span>
          <Toggle on={Boolean(settings?.dataSaver)} onChange={() => togglePref('dataSaver')} />
        </div>
      </section>

      <section className="st-group">
        <div className="st-group-title">通用设置</div>
        <button className="st-row" onClick={() => onOpenGeneral?.()}>
          <span className="st-icon"><img src="/assets/icons/general.png" alt="" /></span><span className="st-label">通用设置</span>
          <em className="st-placeholder">修改密码 · 消息通知 · 隐私</em><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <div className="st-group-title">更多</div>
        <button className="st-row" disabled={!isLoggedIn} onClick={() => onAddress?.()}>
          <span className="st-icon"><img src="/assets/icons/truck.png" alt="" /></span><span className="st-label">收货地址</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={() => onPrivacy?.()}>
          <span className="st-icon"><img src="/assets/icons/shield.png" alt="" /></span><span className="st-label">账户数据与隐私</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={() => setFeedbackOpen(true)}>
          <span className="st-icon"><img src="/assets/icons/chat.png" alt="" /></span><span className="st-label">意见反馈</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={openHelp}>
          <span className="st-icon"><img src="/assets/icons/help.png" alt="" /></span><span className="st-label">帮助中心</span><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <button className="st-row" onClick={() => onSwitch?.()}>
          <span className="st-icon"><img src="/assets/icons/swap.png" alt="" /></span><span className="st-label">切换使用身份</span><ChevronRight size={16} />
        </button>
      </section>

      {isLoggedIn
        ? <button className="st-logout" onClick={() => { if (window.confirm('本机会话将移除，重新登录后可继续查看订单和地址。')) onLogout?.(); }}>退出当前账户</button>
        : <button className="mp-login-button" onClick={() => onLogin?.()}>登录</button>}

      <section className="mp-settings-about">
        <img src="/assets/brand-logo.png" alt="耘露" />
        <b>耘露</b>
        <span>新鲜农货 · 产品溯源 · 云认养</span>
        <small>Version 5.0</small>
      </section>

      {citySheet && createPortal(
        <div className="st-sheet-mask" onClick={() => setCitySheet(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>选择城市</b><button onClick={() => setCitySheet(false)}>×</button></div>
            {CITIES.map((c) => (
              <button key={c} className={`st-sheet-row ${c === city ? 'active' : ''}`} disabled={savingCity} onClick={() => chooseCity(c)}>
                {c}{c === city && <em>当前</em>}
              </button>
            ))}
            <button className="st-sheet-row" disabled={savingCity} onClick={() => chooseCity('其他')}>其他</button>
          </section>
        </div>,
        document.body
      )}

      {fontSheet && createPortal(
        <div className="st-sheet-mask" onClick={() => setFontSheet(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>字体大小</b><button onClick={() => setFontSheet(false)}>×</button></div>
            {([1, 2, 3] as number[]).map((s) => (
              <button key={s} className={`st-sheet-row ${settings?.fontScale === s ? 'active' : ''}`} onClick={() => chooseFont(s)}>
                {FONT_LABEL[s]}{settings?.fontScale === s && <em>当前</em>}
              </button>
            ))}
          </section>
        </div>,
        document.body
      )}

      {feedbackOpen && createPortal(
        <div className="st-sheet-mask" onClick={() => setFeedbackOpen(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>意见反馈</b><button onClick={() => setFeedbackOpen(false)}>×</button></div>
            <div className="st-fb-types">
              {([['suggest', '建议'], ['bug', '问题'], ['other', '其他']] as Array<[string, string]>).map(([val, label]) => (
                <button key={val} className={feedback.type === val ? 'active' : ''} onClick={() => setFeedback({ ...feedback, type: val })}>{label}</button>
              ))}
            </div>
            <textarea className="st-fb-text" rows={4} maxLength={1000} placeholder="请描述你的建议或遇到的问题…" value={feedback.content} onChange={(e) => setFeedback({ ...feedback, content: e.target.value })} />
            <input className="st-fb-contact" placeholder="联系方式（选填）" value={feedback.contact} onChange={(e) => setFeedback({ ...feedback, contact: e.target.value })} />
            <button className="st-fb-submit" disabled={submitting} onClick={submit}>{submitting ? '提交中…' : '提交反馈'}</button>
          </section>
        </div>,
        document.body
      )}

      {helpOpen && createPortal(
        <div className="st-sheet-mask" onClick={() => setHelpOpen(false)}>
          <section className="st-sheet st-help-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>帮助中心</b><button onClick={() => setHelpOpen(false)}>×</button></div>
            {faqs.length === 0 && <p className="st-help-empty">正在加载常见问题…</p>}
            {faqs.map((f) => (
              <div key={f.q} className="st-faq">
                <b>{f.q}</b>
                <p>{f.a}</p>
              </div>
            ))}
            <p className="st-help-foot">更多帮助可联系在线客服</p>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

function FarmerCropsPageMP({ onDetail }: { onDetail: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [crops, setCrops] = useState<FarmerCrop[]>([]);
  useEffect(() => {
    let alive = true;
    fetchFarmerCrops().then((list) => { if (alive) setCrops(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const growingCount = crops.filter((c) => c.status === 'growing').length;
  const matureCount = crops.filter((c) => c.status === 'mature').length;
  return (
    <div className="crop-page-mp">
      <section className="crop-stats-card">
        <span><b>{crops.length || 0}</b>种植总数</span><i /><span><b>{growingCount}</b>生长中</span><i /><span><b>{matureCount}</b>待采收</span>
      </section>
      <section className="crop-list-mp">
        {crops.map((crop) => <article className="crop-card-mp" key={crop.id} onClick={onDetail}><i style={{ background: crop.color }} /><div><div className="crop-top-row"><b><span><img src={crop.icon} alt="" className="fmy-grid-icon" /></span>{crop.name}</b><em className={crop.status}>{crop.statusText}</em></div><div className="progress-header"><span>生长进度</span><b>{crop.progress}%</b></div><div className="mp-progress"><i style={{ width: `${crop.progress}%`, background: crop.color }} /></div><div className="info-grid"><span>种植时间<b>{crop.plantDate}</b></span><span>预计采收<b>{crop.expectHarvest}</b></span><span>种植面积<b>{crop.area}</b></span><span>健康状态<b>{crop.healthStatus}</b></span></div><footer><img src="/assets/icons/icon-location.png" alt="" className="fmy-inline-icon" /> {crop.greenhouse}<small>距采收 {crop.daysToHarvest}天</small></footer></div><strong>›</strong></article>)}
        {!crops.length && <div className="mp-empty"><img src="/assets/miniprogram/farmer-icons/bag.png" alt=""/><b>还没有作物档案</b><span>点击右下角添加第一份作物档案</span></div>}
      </section>
      <button className="floating-add" onClick={() => setShowAdd(true)}>＋ 添加作物</button>
      {showAdd && <div className="farmer-modal-mask" onClick={() => setShowAdd(false)}><section className="mp-sheet" onClick={(event) => event.stopPropagation()}><div className="farmer-modal-head"><b><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-inline-icon" /> 添加新作物</b><button onClick={() => setShowAdd(false)}>×</button></div><div className="mp-form"><label>作物名称<input placeholder="如：番茄、辣椒、黄瓜" /></label><label>种植日期<input type="date" /></label><label>预计采收<input type="date" /></label><label>种植位置<input placeholder="如：A区1号棚" /></label><button className="mp-primary" onClick={() => setShowAdd(false)}>确认添加</button></div></section></div>}
    </div>
  );
}

function FarmerCropDetailPageMP() {
  const [crop, setCrop] = useState<FarmerCrop | null>(null);
  useEffect(() => {
    let alive = true;
    fetchFarmerCrops().then((list) => { if (alive && list.length) setCrop(list[0]); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!crop) return <div className="crop-detail-mp"><section className="mp-empty"><img src="/assets/miniprogram/farmer-icons/bag.png" alt=""/><b>加载中…</b><span>正在读取作物档案</span></section></div>;
  return (
    <div className="crop-detail-mp">
      <section className="detail-header-mp" style={{ background: `linear-gradient(160deg, ${crop.color}, ${crop.color}99 55%, #F5F7FA)` }}>
        <div className="hero-card"><div className="hero-icon-wrap">{crop.icon}</div><h2>{crop.name}</h2><p>{crop.category || '作物'} · 生长中</p><div><em>{crop.statusText}</em><em>{crop.healthStatus}</em></div><div className="progress-ring"><b>{crop.progress}</b><span>%</span><small>生长进度</small></div></div>
      </section>
      <section className="section-card"><div className="mp-section-title"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 基本信息</b></div><div className="info-grid-detail">{[`品种|${crop.name}`, `位置|${crop.greenhouse || '未设置'}`, `面积|${crop.area}`, `已生长|${crop.daysToHarvest}天`].map((row) => { const [label, value] = row.split('|'); return <article key={label}><span>{label}</span><b>{value}</b></article>; })}</div></section>
      <section className="section-card"><div className="mp-section-title"><b><img src="/assets/icons/icon-herb.png" alt="" className="fmy-inline-icon" /> 生长阶段</b></div><div className="timeline-mp">{['播种建档', '移栽定植', '开花坐果', '采收入库'].map((item, index) => <p key={item} className={index <= 2 ? 'active' : ''}><i />{item}<span>{index < 2 ? '已完成' : index === 2 ? '进行中' : '待开始'}</span></p>)}</div></section>
      <section className="section-card"><div className="mp-section-title"><b><img src="/assets/icons/icon-note.png" alt="" className="fmy-inline-icon" /> 最近农事记录</b><button>查看全部 ›</button></div>{['种植日期：' + crop.plantDate, '预计采收：' + crop.expectHarvest, '健康状态：' + crop.healthStatus].map((item) => <article className="record-item" key={item}>{item}</article>)}</section>
      <section className="section-card env-grid-detail">{[`种植面积 ${crop.area}`, `种植位置 ${crop.greenhouse || '未设置'}`, `健康状态 ${crop.healthStatus}`, `距采收 ${crop.daysToHarvest}天`].map((item) => <span key={item}>{item}</span>)}</section>
    </div>
  );
}

function FarmerWarningPageMP() {
  const [tab, setTab] = useState<'all' | 'weather' | 'device' | 'crop'>('all');
  const [status, setStatus] = useState<'open' | 'processing' | 'done'>('open');
  const [warnings, setWarnings] = useState<Array<{ id: number; cat: string; icon: string; title: string; target: string; desc: string; advice: string; level: string; levelText: string; time: string; read: boolean; state: string; metric: string; value: string; threshold: string }>>([]);

  useEffect(() => {
    let alive = true;
    fetchFarmerWarnings().then((list) => {
      if (!alive) return;
      const mapped = list.map((w) => ({
        id: w.id,
        cat: w.cat,
        icon: w.icon || '/assets/icons/icon-announce.png',
        title: w.title,
        target: '',
        desc: w.desc,
        advice: '',
        level: w.level,
        levelText: w.levelText,
        time: w.time,
        read: w.read,
        state: w.read ? 'done' : 'open',
        metric: '',
        value: '',
        threshold: '',
      }));
      setWarnings(mapped.length ? mapped : [
        { id: 1, cat: 'weather', icon: '/assets/icons/icon-rain.png', title: '强降雨风险预警', target: '昆明基地 · 全园区', desc: '未来6小时可能出现短时强降雨，低洼地块有积水风险。', advice: '立即检查排水沟、关闭低位配电箱，并暂停露天施肥作业。', level: 'red', levelText: '紧急', time: '10分钟前', read: false, state: 'open', metric: '降雨量', value: '38mm', threshold: '25mm' },
        { id: 2, cat: 'device', icon: '/assets/icons/device.png', title: '1号棚温度过高', target: '温湿度传感器 TH-01', desc: '棚内温度持续 20 分钟高于安全阈值。', advice: '建议开启通风扇和卷膜机。', level: 'orange', levelText: '重要', time: '20分钟前', read: false, state: 'open', metric: '当前温度', value: '31.6°C', threshold: '28°C' },
        { id: 3, cat: 'crop', icon: '/assets/icons/icon-leaf.png', title: '小番茄灰霉病风险', target: '阳光番茄 · A区1号棚', desc: '叶面湿度偏高，灰霉病风险升高。', advice: '加强通风，摘除病残叶。', level: 'yellow', levelText: '提醒', time: '1小时前', read: false, state: 'open', metric: '风险指数', value: '72', threshold: '60' }
      ]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const list = (tab === 'all' ? warnings : warnings.filter((item) => item.cat === tab)).filter((item) => item.state === status);
  const unread = warnings.filter((item) => !item.read).length;
  const counts = {
    weather: warnings.filter((item) => item.cat === 'weather').length,
    device: warnings.filter((item) => item.cat === 'device').length,
    crop: warnings.filter((item) => item.cat === 'crop').length
  };
  const markAllRead = () => setWarnings((prev) => prev.map((item) => ({ ...item, read: true })));
  const updateWarning = (id: number, next: 'read' | 'done') => setWarnings((prev) => prev.map((item) => item.id === id ? { ...item, read: true, state: next === 'done' ? 'done' : item.state } : item));
  return (
    <div className="warning-mp warning-replica">
      <section className="warn-summary">
        <div className="summary-main">
          <div className={`summary-icon-area ${unread > 0 ? 'has-warning' : ''}`}>
            <span><img src="/assets/icons/icon-announce.png" alt="" className="fmy-grid-icon" /></span>
            {unread > 0 && <em>{unread}</em>}
          </div>
          <div>
            <b>预警中心</b>
            <small>{unread > 0 ? `您有 ${unread} 条未读预警需要关注` : '当前预警均已读取，继续保持监测'}</small>
          </div>
        </div>
        <div className="summary-stats">
          <button className={tab === 'weather' ? 'active' : ''} onClick={() => setTab('weather')}><img src="/assets/icons/icon-rain.png" alt="" className="fmy-inline-icon" /><b>{counts.weather}</b><span>天气</span></button>
          <i />
          <button className={tab === 'device' ? 'active' : ''} onClick={() => setTab('device')}><img src="/assets/icons/device.png" alt="" className="fmy-inline-icon" /><b>{counts.device}</b><span>设备</span></button>
          <i />
          <button className={tab === 'crop' ? 'active' : ''} onClick={() => setTab('crop')}><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-inline-icon" /><b>{counts.crop}</b><span>作物</span></button>
        </div>
      </section>

      <section className="warn-control-card">
        <div className="warn-tabs">{(['all', 'weather', 'device', 'crop'] as const).map((id) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{id === 'all' ? '全部' : id === 'weather' ? '天气预警' : id === 'device' ? '设备预警' : '作物提示'}</button>)}</div>
        <div className="warn-status-tabs">{(['open', 'processing', 'done'] as const).map((id) => <button key={id} className={status === id ? 'active' : ''} onClick={() => setStatus(id)}>{id === 'open' ? '待处理' : id === 'processing' ? '处理中' : '已处理'}</button>)}</div>
        <button className="warn-read-all" onClick={markAllRead}><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 全部标记已读</button>
      </section>

      <section className="warn-list">
        {list.length === 0 && <div className="warn-empty"><span><img src="/assets/icons/icon-check.png" alt="" className="fmy-grid-icon" /></span><b>该分类下暂无预警</b><p>系统将持续监测天气、设备和作物风险。</p></div>}
        {list.map((item) => (
          <article className={`warn-card warn-${item.level} ${item.cat}`} key={item.id}>
            <i />
            <div className="warn-card-body">
              <div className="warn-card-top">
                <em>{item.levelText}</em>
                <span>{item.read ? '已读' : '未读'} · {item.time}</span>
              </div>
              <div className="warn-card-title">
                <span><img src={item.icon} alt="" className="fmy-grid-icon" /></span>
                <div><h3>{item.title}</h3><p>{item.target}</p></div>
              </div>
              <div className="warn-param-row">
                <span><b>{item.value}</b><small>{item.metric}</small></span>
                <i />
                <span><b>{item.threshold}</b><small>安全阈值</small></span>
              </div>
              <p className="warn-desc">{item.desc}</p>
              <div className="warn-advice"><b>处理建议</b><p>{item.advice}</p></div>
              <footer>
                <button onClick={() => updateWarning(item.id, 'read')}>标记已读</button>
                <button onClick={() => updateWarning(item.id, 'done')}>已处理</button>
                <button>查看详情</button>
              </footer>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function FarmerAdoptionOrdersMP() {
  const [data, setData] = useState<FarmerAdoptionList>({ totalOrders: 0, totalIncome: '0', fansCount: 0, categorySummary: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [shipTarget, setShipTarget] = useState<FarmerAdoptionOrder | null>(null);
  const [company, setCompany] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [tip, setTip] = useState('');
  const notify = (message: string) => { setTip(message); window.setTimeout(() => setTip(''), 1400); };

  useEffect(() => {
    let alive = true;
    fetchFarmerAdoptionOrders().then((list) => { if (alive) { setData(list); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const doShip = async () => {
    if (!shipTarget) return;
    if (!company.trim() || !trackingNo.trim()) { notify('请填写物流公司和单号'); return; }
    try {
      await shipFarmerAdoptionOrder(shipTarget.id, company.trim(), trackingNo.trim());
      notify('已发货');
      setShipTarget(null);
      setCompany(''); setTrackingNo('');
      const list = await fetchFarmerAdoptionOrders();
      setData(list);
    } catch (e) {
      notify(e instanceof Error ? e.message : '发货失败');
    }
  };

  return (
    <div className="ac-page-mp">
      <section className="ac-header-section-mp">
        <span className="ac-bg one"><img src="/assets/icons/icon-rice.png" alt="" className="fmy-grid-icon" /></span><span className="ac-bg two"><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-grid-icon" /></span><span className="ac-bg three"><img src="/assets/icons/icon-cloud.png" alt="" className="fmy-grid-icon" /></span>
        <div className="ac-header-content-mp">
          <h2><img src="/assets/icons/icon-cloud.png" alt="" className="fmy-inline-icon" /> 云认养管理中心</h2>
          <p>实时查看消费者认养您的农产品情况</p>
        </div>
        <div className="ac-stats-card-mp">
          <span><b>{data.totalOrders}</b><em>认养订单</em></span>
          <span><b>¥{data.totalIncome}</b><em>认养收入</em></span>
          <span><b>{data.fansCount}</b><em>认养粉丝</em></span>
        </div>
      </section>
      <section className="ac-category-row-mp">
        {data.categorySummary.length ? data.categorySummary.map((item) => <button key={item.name}><img src={item.icon} alt="" className="fmy-inline-icon" /> {item.name} {item.count}单</button>) : <button>暂无认养分类</button>}
      </section>
      <div className="ac-list-header-mp"><b><img src="/assets/icons/icon-list.png" alt="" className="fmy-inline-icon" /> 认养订单详情</b><span>共 {data.orders.length} 条记录</span></div>
      {loading && <p className="farmer-orders-empty">加载中…</p>}
      {!loading && data.orders.length === 0 && <div className="farmer-orders-empty"><b>暂无认养订单</b><p>消费者认养您的农产品后会在这里展示。</p></div>}
      <section className="ac-order-list-mp">
        {data.orders.map((item) => (
          <article className="ac-order-card-mp" key={item.id}>
            <div className="aoc-top-mp">
              <div className="aoc-product-mp"><span style={{ background: item.bg }}><img src={item.icon} alt="" className="fmy-grid-icon" /></span><div><b>{item.productName}</b><small>方案：{item.packageName}</small></div></div>
              <em className={item.statusKey}>{item.statusText}</em>
            </div>
            <div className="aoc-customer-row-mp"><img src="/assets/icons/user.png" alt="" className="fmy-inline-icon" /> <b>{item.customerName}</b><span>{item.customerPhone}</span></div>
            <div className="aoc-detail-grid-mp">
              <span>认养数量<b>{item.quantity}</b></span>
              <span>认养金额<b>¥{item.amount}</b></span>
              <span>开始日期<b>{item.startDate}</b></span>
              <span>预计收获<b>{item.harvestDate}</b></span>
            </div>
            <p className="aoc-shipping-mp"><img src="/assets/icons/icon-location.png" alt="" className="fmy-inline-icon" /> 收货地址：{item.shipAddress}</p>
            {item.remark && <p className="aoc-remark-mp"><img src="/assets/icons/icon-note.png" alt="" className="fmy-inline-icon" /> 备注：{item.remark}</p>}
            <div className="aoc-growth-section-mp"><div><b><img src="/assets/icons/icon-leaf.png" alt="" className="fmy-inline-icon" /> 生长进度</b><span>{item.growthPercent}%</span></div><i><em style={{ width: `${item.growthPercent}%` }} /></i><p>{item.growthStage}</p></div>
            <footer>
              <button><img src="/assets/icons/icon-phone.png" alt="" className="fmy-inline-icon" /> 联系认养人</button>
              <button><img src="/assets/icons/icon-herb.png" alt="" className="fmy-inline-icon" /> 查看生长</button>
              {item.canShip && <button onClick={() => setShipTarget(item)}><img src="/assets/icons/truck.png" alt="" className="fmy-inline-icon" /> 安排发货</button>}
            </footer>
          </article>
        ))}
      </section>
      {shipTarget && (
        <div className="address-sheet-mask" onClick={() => setShipTarget(null)}>
          <section className="address-edit-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="trace-section-head"><b>认养发货</b><button onClick={() => setShipTarget(null)}>关闭</button></div>
            <label className="addr-field"><span>物流公司</span><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="如：顺丰速运" /></label>
            <label className="addr-field"><span>物流单号</span><input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="请输入运单号" /></label>
            <button className="address-save-btn" onClick={doShip}>确认发货</button>
          </section>
        </div>
      )}
      {tip && <div className="global-toast-red">{tip}</div>}
    </div>
  );
}

function FarmerDevicePageMP() {
  const [devices, setDevices] = useState<Array<{ id: number; name: string; location: string; lastSeen: string; isOnline: boolean; isEnabled: boolean; kind: 'station' | 'camera' }>>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchFarmerDevices().then(({ stations, cameras }) => {
      if (!alive) return;
      const mapped = [
        ...stations.map((d) => ({ id: d.id, name: d.name, location: d.location, lastSeen: d.lastSeen, isOnline: d.isOnline, isEnabled: d.isEnabled, kind: 'station' as const })),
        ...cameras.map((d) => ({ id: d.id + 1000, name: d.name, location: d.location, lastSeen: d.lastSeen, isOnline: d.isOnline, isEnabled: d.isEnabled, kind: 'camera' as const })),
      ];
      setDevices(mapped);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const stationRows = devices.filter((item) => item.kind === 'station');
  const cameraRows = devices.filter((item) => item.kind === 'camera');
  const toggleDevice = (id: number) => {
    const device = devices.find((row) => row.id === id);
    setDevices((prev) => prev.map((row) => row.id === id ? { ...row, isEnabled: !row.isEnabled } : row));
    if (device) setFarmerDeviceEnabled(device.kind === 'camera' ? device.id - 1000 : device.id, !device.isEnabled).catch(() => {});
  };
  const groups = [
    { icon: '/assets/icons/icon-humidity.png', title: '监测站设备', rows: stationRows, cam: false },
    { icon: '/assets/icons/icon-camera.png', title: '摄像头设备', rows: cameraRows, cam: true }
  ];
  return (
    <div className="device-mp device-replica">
      <section className="device-summary-card">
        <div>
          <span><img src="/assets/icons/device.png" alt="" className="fmy-grid-icon" /></span>
          <p><b>{devices.filter((item) => item.isOnline).length}/{devices.length}</b><small>设备在线</small></p>
        </div>
        <div>
          <span><img src="/assets/icons/settings.png" alt="" className="fmy-grid-icon" /></span>
          <p><b>{devices.filter((item) => item.isEnabled).length}</b><small>已启用</small></p>
        </div>
        <button onClick={() => setAddOpen(true)}>＋ 添加</button>
      </section>

      {groups.map((group) => (
        <section className="md-section" key={group.title}>
          <div className="md-section-title">
            <span><img src={group.icon} alt="" className="fmy-grid-icon" /></span>
            <b>{group.title}</b>
            <em>({group.rows.length})</em>
          </div>
          <div className="md-device-list">
            {group.rows.map((device) => (
              <article className={`md-device-card ${device.isOnline ? 'card-online' : 'card-offline'}`} key={device.id}>
                <div className={`md-dev-icon-wrap ${group.cam ? 'cam-icon' : ''} ${device.isOnline ? 'icon-online' : 'icon-offline'}`}>
                  <span><img src={group.icon} alt="" className="fmy-grid-icon" /></span>
                </div>
                <div className="md-dev-info">
                  <div className="dev-top-row">
                    <i className={device.isOnline ? 'dot-online' : 'dot-offline'} />
                    <b>{device.name}</b>
                  </div>
                  <p>{device.location}</p>
                  <small>{device.lastSeen}</small>
                </div>
                <button className={`md-big-switch ${device.isEnabled ? 'on' : ''}`} onClick={() => toggleDevice(device.id)}><i /></button>
              </article>
            ))}
          </div>
        </section>
      ))}

      <button className="md-add-btn" onClick={() => setAddOpen(true)}><span>＋</span>添加新设备</button>

      {addOpen && (
        <div className="farmer-modal-mask" onClick={() => setAddOpen(false)}>
          <section className="device-add-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head"><b>添加新设备</b><button onClick={() => setAddOpen(false)}>×</button></div>
            <button onClick={() => setAddOpen(false)}><img src="/assets/icons/icon-humidity.png" alt="" className="fmy-inline-icon" /> 添加监测站传感器</button>
            <button onClick={() => setAddOpen(false)}><img src="/assets/icons/icon-camera.png" alt="" className="fmy-inline-icon" /> 添加摄像头设备</button>
            <button onClick={() => setAddOpen(false)}>▣ 扫码添加</button>
          </section>
        </div>
      )}
    </div>
  );
}

function FarmerTechSupportMP({ onPage }: { onPage: (page: FarmerPage) => void }) {
  const [tab, setTab] = useState<'service' | 'expert' | 'orders'>('service');
  const [sheet, setSheet] = useState<null | { title: string; action: string }>(null);
  const serviceCards = [
    {
      id: 'device',
      tag: '2小时响应',
      title: '设备故障报修',
      desc: '传感器、网关、摄像头、滴灌阀远程诊断与现场维修。',
      image: '/assets/farm/greenhouse.jpg',
      price: '远程诊断免费',
      specs: ['在线诊断', '备件更换', '巡检报告'],
      action: '申请报修'
    },
    {
      id: 'drone',
      tag: '热门服务',
      title: '无人机飞防作业',
      desc: '药剂喷洒、叶面肥、病虫害应急处理，支持按亩计价。',
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Agricultural_drone_spraying_on_paddy_field.jpg',
      price: '8元/亩起',
      specs: ['飞手认证', '航线规划', '作业回执'],
      action: '预约飞防'
    },
    {
      id: 'machine',
      tag: '农机合作社',
      title: '播种/收割农机服务',
      desc: '精量播种、旋耕整地、联合收割，按作业面积排期。',
      image: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/National_Agro_Happy_Seeder.jpg?width=800',
      price: '按地块报价',
      specs: ['合作社派单', '作业保险', '油耗透明'],
      action: '预约农机'
    },
    {
      id: 'soil',
      tag: '采样检测',
      title: '土壤与水肥方案',
      desc: '土壤采样、pH/EC/有机质检测，并生成水肥管理建议。',
      image: '/assets/farm/field-base.jpg',
      price: '99元/次起',
      specs: ['土壤检测', '配方施肥', '复查提醒'],
      action: '申请检测'
    }
  ];
  const [experts, setExperts] = useState<TechSupportExpert[]>([]);
  const [repairs, setRepairs] = useState<TechRepair[]>([]);
  const [bookings, setBookings] = useState<TechBooking[]>([]);
  const [contact, setContact] = useState<TechContactInfo | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([fetchTechExperts(), fetchRepairs(1, 20), fetchBookings(1, 20), fetchTechContact()])
      .then(([ex, rep, bk, ct]) => { if (alive) { setExperts(ex); setRepairs(rep.list); setBookings(bk.list); setContact(ct); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div className="tech-mp tech-replica">
      <section className="tech-hero-pro">
        <div>
          <span>TECH SUPPORT</span>
          <h2>技术支持中心</h2>
          <p>设备报修、无人机飞防、农机作业和专家顾问一站式服务</p>
        </div>
        <button onClick={() => setSheet({ title: '紧急技术支持', action: '提交加急工单' })}>加急</button>
      </section>

      <section className="tech-sla-row">
        <span><b>2h</b><em>平均响应</em></span>
        <span><b>96%</b><em>一次解决率</em></span>
        <span><b>24h</b><em>在线支持</em></span>
      </section>

      {contact && (
        <section className="tech-contact-bar">
          <span><img src="/assets/icons/icon-phone.png" alt="" className="fmy-inline-icon" /> {contact.phoneDisplay}</span>
          <span>{contact.workTime}</span>
          {contact.onlineService && <em>在线客服</em>}
        </section>
      )}

      <div className="tech-tabs">
        <button className={tab === 'service' ? 'active' : ''} onClick={() => setTab('service')}>服务项目</button>
        <button className={tab === 'expert' ? 'active' : ''} onClick={() => setTab('expert')}>专家顾问</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>服务工单</button>
      </div>

      {tab === 'service' && (
        <section className="tech-service-list">
          {serviceCards.map((item) => (
            <article className="tech-service-card" key={item.id}>
              <img src={item.image} alt="" />
              <div className="tech-service-body">
                <div><b>{item.title}</b><em>{item.tag}</em></div>
                <p>{item.desc}</p>
                <div className="tech-specs">{item.specs.map((spec) => <span key={spec}>{spec}</span>)}</div>
                <footer><strong>{item.price}</strong><button onClick={() => setSheet({ title: item.title, action: item.action })}>{item.action}</button></footer>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'expert' && (
        <section className="tech-expert-list">
          {experts.map((expert) => (
            <article className="tech-expert-card" key={expert.id}>
              <div className="expert-avatar-pro"><span>{expert.name.charAt(0)}</span><i className={expert.isOnline ? 'online' : ''} /></div>
              <div className="expert-main">
                <div className="expert-name-row"><b>{expert.name}</b><em>{expert.title}</em></div>
                <p>{expert.organization}</p>
                <div className="expert-fields-pro">{expert.fields.map((field) => <span key={field}>{field}</span>)}</div>
                <small>{expert.tagText}</small>
                <footer><span><img src="/assets/icons/star.png" alt="" className="fmy-inline-icon" /> {expert.rating}</span><span>咨询{expert.consultCount}次</span><span>{expert.isOnline ? '在线' : '离线'}</span></footer>
              </div>
              <button onClick={() => setSheet({ title: `${expert.name} · ${expert.title}`, action: '发起咨询' })}>咨询</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'orders' && (
        <section className="tech-order-list">
          <button className="tech-orders-entry" onClick={() => onPage('myOrders')}>查看全部工单 →</button>
          {repairs.length === 0 && bookings.length === 0 && <div className="tech-empty">暂无服务工单，提交报修或预约后这里会显示进度。</div>}
          {repairs.map((repair) => (
            <article key={`r${repair.id}`}>
              <div><b>{repair.deviceTypeName} · {repair.faultType}</b><em>{repair.statusText}</em></div>
              <p>{repair.createdAt} · 工单号 {repair.repairNo}</p>
            </article>
          ))}
          {bookings.map((booking) => (
            <article key={`b${booking.id}`}>
              <div><b>{booking.serviceName}</b><em>{booking.statusText}</em></div>
              <p>{booking.bookDate} · 预约号 {booking.bookingNo}</p>
            </article>
          ))}
        </section>
      )}

      {sheet && (
        <div className="farmer-modal-mask" onClick={() => setSheet(null)}>
          <section className="tech-book-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head"><b>{sheet.title}</b><button onClick={() => setSheet(null)}>×</button></div>
            <label>服务地块<input placeholder="例如：1号番茄棚 / A区12亩" /></label>
            <label>问题描述<textarea placeholder="请描述故障、作业面积、作物阶段或希望咨询的问题" /></label>
            <label>期望时间<input type="datetime-local" /></label>
            <button onClick={() => setSheet(null)}>{sheet.action}</button>
          </section>
        </div>
      )}
    </div>
  );
}

function FarmerWorkOrdersMP() {
  const [tab, setTab] = useState<'repair' | 'booking'>('repair');
  const [repairs, setRepairs] = useState<TechRepair[]>([]);
  const [bookings, setBookings] = useState<TechBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchRepairs(1, 50), fetchBookings(1, 50)])
      .then(([repairResult, bookingResult]) => {
        if (!alive) return;
        setRepairs(repairResult.list);
        setBookings(bookingResult.list);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="farmer-work-orders">
      <div className="fwo-tabs">
        <button className={tab === 'repair' ? 'active' : ''} onClick={() => setTab('repair')}>报修工单</button>
        <button className={tab === 'booking' ? 'active' : ''} onClick={() => setTab('booking')}>服务预约</button>
      </div>
      {loading && <div className="fwo-empty">加载中…</div>}
      {!loading && tab === 'repair' && (
        <div className="fwo-list">
          {repairs.length === 0 && <div className="fwo-empty">暂无工单</div>}
          {repairs.map((repair) => (
            <article key={`r${repair.id}`}>
              <div><b>{repair.deviceTypeName} · {repair.faultType}</b><em>{repair.statusText}</em></div>
              <p>{repair.createdAt} · 工单号 {repair.repairNo}</p>
              {repair.description && <small>{repair.description}</small>}
            </article>
          ))}
        </div>
      )}
      {!loading && tab === 'booking' && (
        <div className="fwo-list">
          {bookings.length === 0 && <div className="fwo-empty">暂无预约</div>}
          {bookings.map((booking) => (
            <article key={`b${booking.id}`}>
              <div><b>{booking.serviceName}</b><em>{booking.statusText}</em></div>
              <p>{booking.bookDate} · 预约号 {booking.bookingNo}</p>
              {booking.contactName && <small>{booking.contactName} · {booking.contactPhone}</small>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FarmerWeatherPageMP() {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetchWeather().then((data) => {
      if (alive && data) setWeather(data);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const weatherEmoji = (icon?: string) => {
    const map: Record<string, string> = {
      sunny: '/assets/icons/icon-sun.png', clear: '/assets/icons/icon-sun.png', cloudy: '/assets/icons/icon-cloudy.png', overcast: '/assets/icons/icon-cloud.png',
      rain: '/assets/icons/icon-rain.png', rainy: '/assets/icons/icon-rain.png', shower: '/assets/icons/icon-cloudy.png', storm: '/assets/icons/icon-rain.png',
      snow: '/assets/icons/icon-rain.png', fog: '/assets/icons/icon-fog.png', wind: '/assets/icons/icon-fog.png'
    };
    return map[(icon || '').toLowerCase()] || '/assets/icons/icon-cloudy.png';
  };

  const temp = weather?.temp && weather.temp !== '--' ? weather.temp : '26';
  const desc = weather?.desc || '晴';
  const humidity = weather?.humidity || '58%';
  const wind = weather?.wind || '东南风3级';
  const location = weather?.location || '昆明';
  const advice = weather?.advice || '今日适宜户外作业，午后棚内温度升高，注意通风和补水。';

  const hours = [
    ['现在', '/assets/icons/icon-sun.png', '26°', '58%'],
    ['12:00', '/assets/icons/icon-sun.png', '28°', '54%'],
    ['15:00', '/assets/icons/icon-cloudy.png', '29°', '52%'],
    ['18:00', '/assets/icons/icon-cloudy.png', '25°', '66%'],
    ['21:00', '/assets/icons/icon-moon.png', '22°', '72%'],
    ['00:00', '/assets/icons/icon-moon.png', '19°', '76%']
  ];
  const mockDays = [
    { date: '今天', week: '周三', icon: '/assets/icons/icon-sun.png', desc: '晴', high: '29°', low: '18°', tip: '适宜通风' },
    { date: '明天', week: '周四', icon: '/assets/icons/icon-cloudy.png', desc: '阵雨', high: '27°', low: '19°', tip: '暂停打药' },
    { date: '6/19', week: '周五', icon: '/assets/icons/icon-cloudy.png', desc: '多云', high: '28°', low: '18°', tip: '适宜追肥' },
    { date: '6/20', week: '周六', icon: '/assets/icons/icon-rain.png', desc: '小雨', high: '24°', low: '17°', tip: '防积水' },
    { date: '6/21', week: '周日', icon: '/assets/icons/icon-sun.png', desc: '晴', high: '30°', low: '20°', tip: '加强补水' }
  ];
  const days = weather && weather.forecast.length
    ? weather.forecast.map((item) => ({
        date: item.date || '未来',
        week: '',
        icon: weatherEmoji(item.icon),
        desc: item.weather || '--',
        high: item.tempHigh ? `${item.tempHigh}°` : '--',
        low: item.tempLow ? `${item.tempLow}°` : '--',
        tip: ''
      }))
    : mockDays;
  const fieldRisks = [
    { name: '1号番茄棚', risk: '中', desc: '午后棚温偏高，建议 13:00 后通风。', color: '#ff9800' },
    { name: '露天A区玉米', risk: '低', desc: '风力较小，适合追肥和巡田。', color: '#43a047' },
    { name: '2号辣椒棚', risk: '中', desc: '夜间湿度上升，注意灰霉病预防。', color: '#ff9800' }
  ];
  const detailItems: Array<[string, string, string]> = [
    ['/assets/icons/icon-humidity.png', '当前温度', `${temp}°C`],
    ['/assets/icons/icon-humidity.png', '空气湿度', humidity || '--'],
    ['/assets/icons/icon-fog.png', '风力风向', wind || '--'],
    ['/assets/icons/icon-rain.png', '降水概率', '--'],
    ['/assets/icons/icon-chart.png', '气压', '--'],
    ['/assets/icons/icon-sun.png', '紫外线', '--']
  ];
  return (
    <div className="weather-mp weather-replica">
      <section className="current-weather">
        <div className="weather-city-row"><div><b>{location} · 智慧农业示范基地</b><span>更新于 10:30 · 自动站 TH-01</span></div><button>切换基地</button></div>
        <div className="weather-main"><span><img src={weatherEmoji(weather?.icon)} alt="" /></span><strong>{temp}°</strong><div><b>{desc}</b><small>能见度 12km</small></div></div>
        <p>{advice}</p>
      </section>

      <section className="weather-detail-grid">
        {detailItems.map(([icon, label, value]) => <article key={label}><span><img src={icon} alt="" className="fmy-grid-icon" /></span><small>{label}</small><b>{value}</b></article>)}
      </section>

      <section className="weather-aqi-card">
        <div><b>空气质量</b><em>优</em></div>
        <div className="aqi-main-pro"><strong>38</strong><p>AQI 指数 · PM2.5 18 · PM10 34<br />适宜开窗通风和户外农事作业。</p></div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>24小时农业气象</b><span>温度 / 湿度</span></div>
        <div className="weather-hour-scroll">{hours.map(([time, icon, temp, hum]) => <article key={time}><span>{time}</span><b><img src={icon} alt="" className="fmy-grid-icon" /></b><strong>{temp}</strong><small>{hum}</small></article>)}</div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>未来5天趋势</b><span>作业建议</span></div>
        <div className="weather-day-list">
          {days.map((item) => <article key={item.date}><div><b>{item.date}</b><span>{item.week}</span></div><em><img src={item.icon} alt="" className="fmy-grid-icon" /></em><p>{item.desc}</p><strong>{item.high}/{item.low}</strong><small>{item.tip}</small></article>)}
        </div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>地块气象风险</b><span>实时评估</span></div>
        <div className="field-risk-list">
          {fieldRisks.map((item) => <article key={item.name}><i style={{ background: item.color }} /><div><b>{item.name}</b><p>{item.desc}</p></div><em style={{ color: item.color }}>风险{item.risk}</em></article>)}
        </div>
      </section>

      <section className="weather-farm-index">
        <div className="weather-section-title"><b><img src="/assets/icons/icon-rice.png" alt="" className="fmy-inline-icon" /> 农事指数</b><span>今日建议</span></div>
        {[
          ['适宜追肥', '上午 10 点前或傍晚 18 点后进行，避开高温时段。'],
          ['适宜巡棚', '重点检查番茄棚温度、滴灌阀和通风设备。'],
          ['病虫害风险中等', '夜间湿度升高，辣椒棚需复查灰霉病和蚜虫。']
        ].map(([title, desc]) => <article key={title}><b>{title}</b><p>{desc}</p><button>加入农事任务</button></article>)}
      </section>
    </div>
  );
}

function FarmerVoiceAssistantMP() {
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    { role: 'ai', text: '你好，我是露露农事助手。关于种植、病虫害、施肥浇水、天气预报都可以问我，我会给你实用的建议。' }
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const quickPrompts = ['番茄叶子发黄怎么办？', '今天怎么管棚？', '现在适合浇水吗？'];
  const sendMessage = async (text = draft.trim()) => {
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setIsThinking(true);
    try {
      const answer = await askAi(text, 'farmer');
      setMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '露露正在思考时遇到了一点问题，请稍后再试。你也可以查看农事日历、环境监测或联系农技专家。' }]);
    } finally {
      setIsThinking(false);
    }
  };
  return (
    <div className="farmer-chat-panel farmer-ai-chat-page">
      <header className="farmer-chat-head">
        <img className="lulu-avatar mini" src="/assets/miniprogram/ui-v2/ai-lulu.png" alt="露露" />
        <div><b>露露</b><small><i /> 农事智能助手在线</small></div>
        <span />
      </header>
      <div className="farmer-chat-body">
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`farmer-chat-bubble ${item.role}`}>
            <span>{item.text}</span>
          </div>
        ))}
        {isThinking && <div className="farmer-chat-bubble ai thinking"><span>露露正在思考…</span><i /><i /><i /></div>}
      </div>
      <div className="farmer-chat-prompts">
        {quickPrompts.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}
      </div>
      <footer className="farmer-chat-input" style={{ gridTemplateColumns: 'minmax(0, 1fr) 54px' }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="问我农事、病虫害、设备、天气..." />
        <button className={`send ${draft.trim() ? 'active' : ''}`} onClick={() => sendMessage()}>发送</button>
      </footer>
    </div>
  );
}

function FarmerLocationMapMP() {
  return (
    <div className="location-mp">
      <section className="map-card"><MapPin size={40} /><h2>昆明智慧农业示范基地</h2><p>1号棚、2号棚、露天A区、仓储中心</p></section>
      {['1号智能棚 · 番茄 · 在线', '2号智能棚 · 辣椒 · 在线', '露天A区 · 玉米 · 待巡检', '仓储中心 · 冷库 · 正常'].map((item) => <article key={item}>{item}<span>›</span></article>)}
    </div>
  );
}

function FarmerSubPage({ page, onBack, onPage }: { page: FarmerPage; onBack: () => void; onPage: (page: FarmerPage) => void }) {
  const titles: Record<Exclude<FarmerPage, 'tabs'>, string> = {
    myCrops: '我的作物',
    cropDetail: '作物详情',
    warningCenter: '预警中心',
    adoptionCenter: '认养订单',
    myDevice: '我的设备',
    techSupport: '技术支持',
    weatherDetail: '天气详情',
    voiceAssistant: '智能助手',
    locationMap: '基地地图',
    community: '农友社区',
    farmerSettings: '设置',
    farmerGeneral: '通用设置',
    farmerAddress: '收货地址',
    farmerPrivacy: '账户数据与隐私',
    farmerOrders: '订单管理',
    farmerOrderDetail: '订单详情',
    myOrders: '我的工单'
  };

  return (
    <div className="farmer-v2-sub-page">
      <header className="sub-nav-red farmer-v2-sub-nav">
        <button className="sub-back-visible" onClick={onBack} aria-label="返回"><ChevronLeft size={18} />返回</button>
        <strong>{titles[page as Exclude<FarmerPage, 'tabs'>]}</strong>
        <span />
      </header>
      <div className="farmer-v2-page">
        {page === 'myCrops' && <FarmerCropsPage onDetail={() => onPage('cropDetail')} />}
        {page === 'cropDetail' && <FarmerCropDetailPage />}
        {page === 'warningCenter' && <FarmerWarningPage />}
        {page === 'adoptionCenter' && <FarmerAdoptionOrders />}
        {page === 'myDevice' && <FarmerDevicePage />}
        {page === 'techSupport' && <FarmerTechSupport />}
        {page === 'weatherDetail' && <FarmerWeatherPage />}
        {page === 'voiceAssistant' && <FarmerVoiceAssistant />}
        {page === 'locationMap' && <FarmerLocationMap />}
        {page === 'farmerSettings' && <FarmerSettingsMP />}
      </div>
    </div>
  );
}

function FarmerCropsPage({ onDetail }: { onDetail: () => void }) {
  return (
    <>
      <section className="farmer-v2-crop-stats">
        <span><b>3</b>种植总数</span>
        <span><b>2</b>生长中</span>
        <span><b>1</b>待采收</span>
      </section>
      <div className="farmer-v2-crop-list">
        {farmerCrops.map((crop) => (
          <article key={crop.name} onClick={onDetail}>
            <div className="farmer-v2-crop-icon">{crop.icon}</div>
            <div>
              <b>{crop.name}<em>{crop.status}</em></b>
              <p>{crop.location} · {crop.area} · 健康 {crop.health}</p>
              <div className="farmer-v2-progress"><i style={{ width: `${crop.progress}%` }} /></div>
              <span>预计 {crop.harvest} 采收</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function FarmerCropDetailPage() {
  return (
    <>
      <section className="farmer-v2-crop-detail">
        <div className="farmer-v2-crop-icon big"><img src="/assets/icons/icon-tomato.png" alt="" /></div>
        <div><span>1号智能棚</span><h2>阳光小番茄</h2><p>开花坐果期 · 健康状态优</p></div>
        <strong>76%</strong>
      </section>
      <div className="farmer-v2-metrics compact">
        {['种植面积 3.2亩', '已生长 72天', '采收倒计时 18天', '预计产量 1200斤'].map((item) => <div key={item}>{item}</div>)}
      </div>
      <section className="farmer-v2-timeline">
        {['播种建档', '移栽定植', '开花坐果', '采收入库'].map((item, index) => <p key={item} className={index <= 2 ? 'active' : ''}><i />{item}</p>)}
      </section>
    </>
  );
}

function FarmerWarningPage() {
  return (
    <>
      <section className="farmer-v2-warning-summary">
        <span><b>2</b>设备预警</span>
        <span><b>1</b>天气预警</span>
        <span><b>1</b>作物提醒</span>
      </section>
      <div className="farmer-v2-alerts">
        {[
          ['暴雨橙色预警', '未来 6 小时可能出现强降雨，请检查排水沟。'],
          ['棚内温度过高', '1号棚温度 26°C，建议开启通风卷膜。'],
          ['小番茄病害风险', '叶片湿度偏高，注意灰霉病预防。']
        ].map(([title, desc]) => <article key={title}><Bell size={19} /><div><b>{title}</b><p>{desc}</p></div><ChevronRight size={18} /></article>)}
      </div>
    </>
  );
}

function FarmerAdoptionOrders() {
  const [orders, setOrders] = useState([
    { id: 1, icon: '橙', productName: '冰糖橙树 #001', packageName: '橙子树认养 · 年度方案', customerName: '李女士', phone: '138****5678', quantity: '1棵', amount: '199.00', start: '2026-01-15', harvest: '2026年11月', address: '云南省昆明市五华区xx路xx号xx小区3栋201室', remark: '希望收获季多拍一些果树照片发给我', status: '生长中', key: 'growing', progress: 65, stage: '果实膨大期，预计11月中旬成熟', canShip: false },
    { id: 2, icon: '菜', productName: '有机蔬菜地 #A03', packageName: '蔬菜地认养 · 季度方案', customerName: '王先生', phone: '139****1234', quantity: '1块', amount: '99.00', start: '2026-02-01', harvest: '持续配送中', address: '云南省大理市古城xx巷xx号', remark: '', status: '生长中', key: 'growing', progress: 40, stage: '第二季蔬菜播种期，两周后首次配送', canShip: false },
    { id: 3, icon: '莓', productName: '草莓大棚 #B02', packageName: '草莓大棚认养 · 季度方案', customerName: '张阿姨', phone: '137****9876', quantity: '1个区域', amount: '299.00', start: '2026-03-10', harvest: '2026年6月底', address: '云南省丽江市古城区xx路xx号', remark: '第一次认养草莓，很期待', status: '生长中', key: 'growing', progress: 25, stage: '苗期生长阶段，开花中', canShip: false },
    { id: 4, icon: '橙', productName: '冰糖橙树 #007', packageName: '橙子树认养 · 年度方案', customerName: '陈老板', phone: '136****4567', quantity: '1棵', amount: '199.00', start: '2025-08-20', harvest: '2025年12月 已发货', address: '云南省玉溪市红塔区xx路xx农产品市场B区12号', remark: '去年认养的橙子很甜，今年继续', status: '已发货', key: 'shipped', progress: 100, stage: '本年度已完结，感谢支持', canShip: false },
    { id: 5, icon: '菜', productName: '有机蔬菜地 #A07', packageName: '蔬菜地认养 · 季度方案', customerName: '赵女士', phone: '135****2345', quantity: '1块', amount: '99.00', start: '2026-03-15', harvest: '2026年6月', address: '云南省曲靖市麒麟区xx街xx花园小区5栋102', remark: '', status: '待发货', key: 'ready', progress: 82, stage: '第一季蔬菜已采收，待安排配送', canShip: true },
    { id: 6, icon: '茶', productName: '古树茶片区 #T03', packageName: '茶园包片认养 · 年度方案', customerName: '周先生', phone: '133****8901', quantity: '1片区域', amount: '588.00', start: '2026-01-01', harvest: '2026年春茶 / 秋茶', address: '云南省普洱市思茅区xx路xx号', remark: '春茶茶饼希望包装精致一些，准备送人', status: '生长中', key: 'growing', progress: 55, stage: '春茶采摘已完成，秋茶培育中', canShip: false }
  ]);
  const ship = (id: number) => {
    setOrders((prev) => prev.map((item) => item.id === id ? { ...item, status: '已发货', key: 'shipped', canShip: false, progress: 100, stage: '已安排冷链配送，等待消费者确认收货' } : item));
  };
  const cats = [
    { icon: '橙', name: '橙子树认养', count: 2 },
    { icon: '莓', name: '草莓大棚认养', count: 1 },
    { icon: '茶', name: '茶园包片认养', count: 1 },
    { icon: '菜', name: '蔬菜地认养', count: 2 }
  ];
  return (
    <div className="farmer-adoption-replica">
      <section className="fac-hero">
        <div>
          <span>GREEN SOURCE FARM</span>
          <h2>云认养管理中心</h2>
          <p>消费者认养订单、生长进度、发货安排集中管理。</p>
        </div>
        <button>刷新数据</button>
      </section>
      <div className="fac-stats">
        <span><b>{orders.length}</b>进行中认养</span>
        <span><b>3,884</b>累计收益(元)</span>
        <span><b>6</b>认养粉丝数</span>
      </div>
      <div className="fac-cats">
        {cats.map((item) => <button key={item.name}><span>{item.icon}</span><b>{item.name}</b><em>{item.count}单</em></button>)}
      </div>
      <div className="fac-list-head"><b>认养订单详情</b><span>共 {orders.length} 条</span></div>
      <div className="fac-orders">
        {orders.map((item) => (
          <article key={item.id}>
            <div className="fac-order-top">
              <span>{item.icon}</span>
              <div><b>{item.productName}</b><p>{item.packageName}</p></div>
              <em className={item.key}>{item.status}</em>
            </div>
            <div className="fac-customer">{item.customerName} · {item.phone}</div>
            <div className="fac-detail">
              <span>认养数量<b>{item.quantity}</b></span>
              <span>认养金额<b>¥{item.amount}</b></span>
              <span>开始日期<b>{item.start}</b></span>
              <span>预计收获<b>{item.harvest}</b></span>
            </div>
            <p className="fac-address">收货地址：{item.address}</p>
            {item.remark && <p className="fac-remark">备注：{item.remark}</p>}
            <div className="fac-progress-row"><span>生长进度 {item.progress}%</span><b>{item.stage}</b></div>
            <div className="farmer-v2-progress"><i style={{ width: `${item.progress}%` }} /></div>
            <div className="fac-actions">
              <button>联系认养人</button>
              <button>查看生长</button>
              {item.canShip && <button onClick={() => ship(item.id)}>安排发货</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FarmerDevicePage() {
  const [stations, setStations] = useState([
    { id: 1, name: '3号基地监测站', location: '东区大棚', lastSeen: '2分钟前', isOnline: true, isEnabled: true },
    { id: 2, name: '1号基地监测站', location: '西区大棚', lastSeen: '5分钟前', isOnline: true, isEnabled: true },
    { id: 3, name: '2号基地监测站', location: '南区大棚', lastSeen: '2小时前', isOnline: false, isEnabled: false },
    { id: 4, name: '5号基地监测站', location: '北区大棚', lastSeen: '1分钟前', isOnline: true, isEnabled: true },
    { id: 5, name: '4号基地监测站', location: '中区大棚', lastSeen: '1天前', isOnline: false, isEnabled: false }
  ]);
  const [cameras, setCameras] = useState([
    { id: 11, name: 'CAM-01 东区入口', location: '东区入口', lastSeen: '刚刚', isOnline: true, isEnabled: true },
    { id: 12, name: 'CAM-02 西区仓库', location: '西区仓库', lastSeen: '刚刚', isOnline: true, isEnabled: true },
    { id: 13, name: 'CAM-03 南区道路', location: '南区道路', lastSeen: '刚刚', isOnline: true, isEnabled: true },
    { id: 14, name: 'CAM-04 北门口', location: '北门口', lastSeen: '3小时前', isOnline: false, isEnabled: false }
  ]);
  const toggleStation = (id: number) => setStations((prev) => prev.map((item) => item.id === id ? { ...item, isEnabled: !item.isEnabled } : item));
  const toggleCamera = (id: number) => setCameras((prev) => prev.map((item) => item.id === id ? { ...item, isEnabled: !item.isEnabled } : item));
  return (
    <div className="farmer-device-replica">
      <DeviceGroup title="监测站设备" icon="站" devices={stations} onToggle={toggleStation} />
      <DeviceGroup title="摄像头设备" icon="摄" devices={cameras} onToggle={toggleCamera} />
      <button className="md-add-btn">添加新设备</button>
    </div>
  );
}

function DeviceGroup({
  title,
  icon,
  devices,
  onToggle
}: {
  title: string;
  icon: string;
  devices: Array<{ id: number; name: string; location: string; lastSeen: string; isOnline: boolean; isEnabled: boolean }>;
  onToggle: (id: number) => void;
}) {
  return (
    <section className="md-section">
      <div className="md-section-head"><b>{title}</b><span>{devices.filter((item) => item.isOnline).length}/{devices.length} 在线</span></div>
      <div className="md-device-list">
        {devices.map((device) => (
          <article className={`md-device-card ${device.isOnline ? 'online' : 'offline'}`} key={device.id}>
            <span className="md-device-icon">{icon}<i /></span>
            <div>
              <b>{device.name}</b>
              <p>{device.location}</p>
              <small>{device.isOnline ? '在线' : '离线'} · {device.lastSeen}</small>
            </div>
            <button className={`md-switch ${device.isEnabled ? 'on' : ''}`} onClick={() => onToggle(device.id)}><i /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FarmerTechSupport() {
  const [open, setOpen] = useState('device');
  const sections = [
    { id: 'device', title: '设备故障报修', subtitle: '环境监测设备异常、传感器校准、摄像头维护', badge: '6类设备', items: ['温湿度传感器', '土壤传感器', '光照传感器', '气象站设备', '智能摄像头', '自动灌溉系统'] },
    { id: 'drone', title: '无人机作业', subtitle: '植保喷洒、施肥、航拍巡检、长势分析', badge: '2项服务', items: ['无人机喷洒农药 · 8元/亩起', '无人机施肥 · 6元/亩起'] },
    { id: 'machine', title: '农机服务', subtitle: '播种机、收割机、整地设备预约调度', badge: '2类农机', items: ['精量播种机 · 25元/亩起', '联合收割机 · 60元/亩起'] },
    { id: 'expert', title: '技术专家', subtitle: '种植、病虫害、水肥管理专家在线支持', badge: '4位专家', items: ['李明远 · 高级农艺师 · 在线', '王秀兰 · 蔬菜栽培专家 · 在线', '张建国 · 果树种植研究员 · 离线', '陈晓燕 · 土壤肥料专家 · 在线'] }
  ];
  return (
    <div className="farmer-tech-replica">
      <section className="fts-hero">
        <span>TECH</span>
        <div><h2>技术支持中心</h2><p>报修、预约、专家咨询，形成农事服务闭环。</p></div>
      </section>
      <div className="fts-quick-stats">
        <span><b>6</b>可报修设备</span>
        <span><b>2</b>无人机服务</span>
        <span><b>2</b>农机服务</span>
        <span><b>4</b>技术专家</span>
      </div>
      {sections.map((section) => (
        <section className="fts-section" key={section.id}>
          <button className="fts-section-head" onClick={() => setOpen(open === section.id ? '' : section.id)}>
            <div><b>{section.title}</b><p>{section.subtitle}</p></div>
            <em>{section.badge}</em>
          </button>
          {open === section.id && (
            <div className="fts-card-list">
              {section.items.map((item) => (
                <article key={item}>
                  <b>{item}</b>
                  <p>{section.id === 'device' ? '提交后生成维修工单，平台技术员10分钟内响应。' : section.id === 'expert' ? '可发起图文咨询，记录会沉淀到农事档案。' : '选择日期、面积和地址后生成预约单。'}</p>
                  <button>{section.id === 'expert' ? '发起咨询' : section.id === 'device' ? '提交报修' : '立即预约'}</button>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
      <section className="fts-contact">
        <b>联系平台</b>
        <p>服务热线 400-888-9999 · 工作时间 08:00-20:00</p>
        <div><button>在线客服</button><button>我的工单</button></div>
      </section>
    </div>
  );
}
function FarmerWeatherPage() {
  return (
    <>
      <section className="farmer-v2-env-hero weather"><div><span>昆明基地</span><h2>晴 26°C</h2><p>湿度 71% · 东南风 2级 · 紫外线中等</p></div></section>
      <div className="farmer-v2-metrics">{['09:00 24°C', '12:00 28°C', '15:00 29°C', '18:00 25°C'].map((item) => <div key={item}>{item}</div>)}</div>
      <section className="farmer-v2-decision"><div><span>农事建议</span><b>午后通风，傍晚补水</b><p>强光时段避免叶面喷施，降低灼伤风险。</p></div></section>
    </>
  );
}

function FarmerVoiceAssistant() {
  return (
    <section className="farmer-v2-voice">
      <Bot size={42} />
      <h2>小源农事助手</h2>
      <p>支持语音问答、拍照识别病虫害、生成农事建议。</p>
      {['番茄叶片发黄怎么办？', '今天要不要浇水？', '生成本周农事计划'].map((item) => <button key={item}>{item}</button>)}
    </section>
  );
}

function FarmerLocationMap() {
  return (
    <section className="farmer-v2-map">
      <div><MapPin size={36} /><b>昆明智慧农业示范基地</b><p>1号棚、2号棚、露天A区、仓储中心</p></div>
    </section>
  );
}

function ConsumerSubPage({
  page,
  product,
  cartItems,
  onBack,
  onPage,
  onAddCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  addresses,
  selectedAddress,
  onSelectAddress,
  onAddressesChanged,
  orders,
  activeOrder,
  onSelectOrder,
  onCheckout,
  onPay,
  onPayOrder,
  onCancelOrder,
  onEditProfile,
  onProfileChanged,
  notify,
  onLogout,
  onIdentity,
  onLogin,
  loggedIn,
  safeProduct,
  traceTimeline,
  products,
  categories,
  productError,
  productSource,
  categorySource,
  canPurchase,
  onCartTab,
  category,
  setCategory,
  onProductSelected,
  onTraceResult,
  adopts
}: {
  page: ConsumerPage;
  product: Product;
  cartItems: CartItem[];
  onBack: () => void;
  onPage: (page: ConsumerPage) => void;
  onAddCart: (product: Product, spec: string) => void | Promise<void>;
  onUpdateCartQuantity: (productId: string, spec: string, nextQuantity: number) => void;
  onRemoveCartItem: (productId: string, spec: string) => void;
  addresses: Address[];
  selectedAddress: Address | null;
  onSelectAddress: (address: Address | null) => void;
  onAddressesChanged: () => Promise<void>;
  orders: OrderRecord[];
  activeOrder: OrderRecord | null;
  onSelectOrder: (order: OrderRecord | null) => void;
  onCheckout: () => void;
  onPay: () => Promise<void>;
  onPayOrder: (order: OrderRecord) => void;
  onCancelOrder: (order: OrderRecord) => Promise<void>;
  onEditProfile: () => void;
  onProfileChanged: () => void;
  notify: (message: string) => void;
  onLogout: () => void;
  onIdentity: () => void;
  onLogin: () => void;
  loggedIn: boolean;
  safeProduct: (idx: number) => Product;
  traceTimeline: TraceStep[];
  products: Product[];
  categories: RawCategory[];
  productError: string;
  productSource: ApiDataSource;
  categorySource: ApiDataSource;
  canPurchase: boolean;
  onCartTab: () => void;
  category: string;
  setCategory: (category: string) => void;
  onProductSelected: (product: Product) => void;
  onTraceResult: (result: { events: TraceStep[] }) => void;
  adopts: AdoptItem[];
}) {
  const titles: Record<Exclude<ConsumerPage, 'tabs'>, string> = {
    mall: '商品分类',
    trace: '产品溯源',
    productDetail: '商品详情',
    cart: '购物车',
    checkout: '确认订单',
    paySuccess: '订单状态',
    orders: '我的订单',
    orderDetail: '订单详情',
    address: '地址管理',
    messages: '消息通知',
    service: '客服中心',
    settings: '设置',
    privacy: '账户数据说明',
    general: '通用设置',
    member: '会员中心',
    favorites: '我的收藏',
    footprints: '浏览足迹',
    adoptDetail: '认养详情',
    adoptConfirm: '确认认养',
    adoptSuccess: '认养成功',
    traceResult: '溯源结果',
    region: '收货地区',
    regionContent: '切换推荐地区'
  };

  const [selectedAdopt, setSelectedAdopt] = useState<AdoptItem | null>(null);
  const [adoptOrderNo, setAdoptOrderNo] = useState('');
  const [adoptPlacing, setAdoptPlacing] = useState(false);

  useEffect(() => {
    if (page === 'adoptDetail' && !selectedAdopt && adopts.length > 0) {
      setSelectedAdopt(adopts[0]);
    }
  }, [page, adopts, selectedAdopt]);

  const placeAdoptOrder = async () => {
    if (!selectedAdopt) return;
    if (!selectedAddress) { notify('请先选择收货地址'); return; }
    setAdoptPlacing(true);
    try {
      const result = await createAdoptionOrder(selectedAdopt.id, selectedAddress.detailAddress || selectedAddress.city, '');
      setAdoptOrderNo(result.adoptionNo || result.adoptionId);
      onPage('adoptSuccess');
    } catch (error) {
      notify(error instanceof Error ? error.message : '认养下单失败');
    } finally {
      setAdoptPlacing(false);
    }
  };

  // 通用设置从「设置」页进入，返回时回到设置页，避免直接跳回首页
  const handleBack = page === 'general' ? () => onPage('settings') : onBack;

  return (
    <div className="sub-page-red">
      <header className="sub-nav-red">
        <button className="sub-back-visible" onClick={handleBack} aria-label="返回"><ChevronLeft size={18} />返回</button>
        <strong>{titles[page as Exclude<ConsumerPage, 'tabs'>]}</strong>
        <span />
      </header>
      <div className="sub-content-red">
        {page === 'mall' && <Mall category={category} setCategory={setCategory} categories={categories} products={products} productError={productError} source={productSource} categorySource={categorySource} canPurchase={canPurchase} notify={notify} onAddCart={(item) => onAddCart(item, item.unit)} onProduct={onProductSelected} onOpenCart={onCartTab} onBack={onBack} />}
        {page === 'trace' && <Trace onResult={() => onPage('traceResult')} notify={notify} traceTimeline={traceTimeline} safeProduct={safeProduct} onTraceResult={onTraceResult} />}
        {page === 'productDetail' && <ProductDetail product={product} canPurchase={canPurchase} notify={notify} onCart={onCartTab} onTrace={() => onPage('trace')} onAddCart={onAddCart} onBuy={() => onCheckout()} />}
        {page === 'cart' && <CartPage cartItems={cartItems} onCheckout={onCheckout} onShop={() => onPage('tabs')} onUpdateQuantity={onUpdateCartQuantity} onRemove={onRemoveCartItem} />}
        {page === 'checkout' && <CheckoutPage cartItems={cartItems} address={selectedAddress} onPay={onPay} onAddress={() => onPage('address')} />}
        {page === 'paySuccess' && <PaySuccessPage onOrders={() => onPage('orders')} onDetail={() => onPage('orderDetail')} />}
        {page === 'orders' && <OrdersPage orders={orders} loggedIn={loggedIn} onLogin={onLogin} notify={notify} onDetail={(order) => { onSelectOrder(order); onPage('orderDetail'); }} onPayOrder={(order) => { onSelectOrder(order); onPayOrder(order); }} />}
        {page === 'orderDetail' && <OrderDetailPage order={activeOrder} onPayOrder={onPayOrder} onCancelOrder={onCancelOrder} />}
        {page === 'address' && <AddressPage addresses={addresses} selectedAddress={selectedAddress} onSelect={onSelectAddress} onChanged={onAddressesChanged} notify={notify} />}
        {page === 'messages' && <MessagesPage onPage={onPage} />}
        {page === 'service' && <ServicePage onOrders={() => onPage('orders')} />}
        {page === 'settings' && <SettingsPage loggedIn={loggedIn} onLogout={onLogout} onIdentity={onIdentity} onLogin={onLogin} onPrivacy={() => onPage('privacy')} onOpenGeneral={() => onPage('general')} onEditProfile={onEditProfile} onAddress={() => onPage('address')} notify={notify} onProfileChanged={onProfileChanged} />}
        {page === 'general' && <GeneralSettingsPage onBack={() => onPage('settings')} notify={notify} />}
        {page === 'privacy' && <PrivacyPage />}
        {page === 'member' && <MemberPage onBack={onBack} notify={notify} />}
        {page === 'favorites' && <FavoritesPage onBack={onBack} notify={notify} />}
        {page === 'footprints' && <FootprintsPage onBack={onBack} />}
        {page === 'region' && <RegionPage onBack={onBack} onManageAddress={() => onPage('address')} notify={notify} />}
        {page === 'regionContent' && <RegionContentPage onBack={onBack} notify={notify} />}
        {page === 'adoptDetail' && (
          <div className="adopt-detail-red adopt-detail-pro">
            <section className="adopt-detail-hero">
              <img src={selectedAdopt?.image || '/assets/farm/greenhouse.jpg'} alt="" />
              <div>
                <span>云认养农场</span>
                <h2>{selectedAdopt?.name || '认养方案'}</h2>
                <p>{selectedAdopt?.stage || '认养后由农场主定期更新生长记录'}</p>
              </div>
            </section>
            <section className="adopt-owner-card adopt-rights-card">
              <div className="trace-section-head"><b>认养后你会得到</b><span>一季权益</span></div>
              <div>
                <span>专属认养牌</span>
                <span>每周成长照片</span>
                <span>采收后寄到家</span>
                <span>坏果优先补发</span>
              </div>
            </section>
            <section className="adopt-owner-card">
              <div className="trace-section-head"><b>方案说明</b></div>
              <p>{selectedAdopt?.output || '暂无方案说明'}</p>
              <p>认养周期：{selectedAdopt?.period || '—'}</p>
            </section>
            {adopts.length > 0 && (
              <section className="adopt-photo-strip">
                <div className="trace-section-head"><b>其他认养方案</b><span>共 {adopts.length} 个</span></div>
                <div className="adopt-options-row">
                  {adopts.map((item) => (
                    <button key={item.id} className={selectedAdopt?.id === item.id ? 'active' : ''} onClick={() => setSelectedAdopt(item)}>
                      <img src={item.image} alt="" />
                      <b>{item.name}</b>
                      <span>¥{item.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="adopt-bottom-action">
              <div><span>一季认养</span><b>¥{selectedAdopt ? selectedAdopt.price.toFixed(2) : '0.00'}</b></div>
              <button onClick={() => onPage('adoptConfirm')}>确认认养</button>
            </section>
          </div>
        )}
        {page === 'adoptConfirm' && (
          <div className="adopt-confirm-page">
            <section className="adopt-confirm-hero">
              <img src={selectedAdopt?.image || '/assets/farm/greenhouse.jpg'} alt="" />
              <div>
                <span>云认养农场</span>
                <h2>{selectedAdopt?.name || '认养方案'}</h2>
                <p>{selectedAdopt?.output || ''}</p>
              </div>
            </section>
            <section className="adopt-confirm-card">
              <h3>认养权益</h3>
              {['专属认养牌', '每周成长照片', '采收后包邮到家', '坏果优先补发'].map((item) => (
                <p key={item}><CheckCircle2 size={16} /><span>{item}</span></p>
              ))}
            </section>
            <section className="adopt-confirm-card">
              <h3>收获寄送</h3>
              <button onClick={() => onPage('address')}><MapPin size={17} /><span>{selectedAddress ? `${selectedAddress.name} ${selectedAddress.phone}<br/>${selectedAddress.detailAddress}` : '请选择收货地址'}</span><ChevronRight size={16} /></button>
            </section>
            <section className="adopt-confirm-card adopt-pay-summary">
              <p><span>认养金额</span><b>¥{selectedAdopt ? selectedAdopt.price.toFixed(2) : '0.00'}</b></p>
              <p><span>平台保障</span><b>免费</b></p>
              <p><span>实付</span><strong>¥{selectedAdopt ? selectedAdopt.price.toFixed(2) : '0.00'}</strong></p>
            </section>
            <div className="adopt-confirm-bottom"><span>实付 <b>¥{selectedAdopt ? selectedAdopt.price.toFixed(2) : '0.00'}</b></span><button onClick={placeAdoptOrder} disabled={adoptPlacing}>{adoptPlacing ? '提交中…' : '支付认养'}</button></div>
          </div>
        )}
        {page === 'adoptSuccess' && (
          <div className="adopt-success-page">
            <CheckCircle2 size={54} />
            <h2>认养成功</h2>
            <p>你的专属农场已建档，农场主将在每周同步成长照片。</p>
            <section>
              <span>认养编号</span><b>{adoptOrderNo || '—'}</b>
              <span>认养方案</span><b>{selectedAdopt?.name || '—'}</b>
              <span>认养金额</span><b>¥{selectedAdopt ? selectedAdopt.price.toFixed(2) : '0.00'}</b>
            </section>
            <div><button onClick={() => onPage('tabs')}>回到首页</button><button className="primary" onClick={() => onPage('adoptDetail')}>查看农场</button></div>
          </div>
        )}
        {page === 'traceResult' && <TraceResultPage product={product} traceTimeline={traceTimeline} />}
      </div>
    </div>
  );
}

function ProductDetail({
  product,
  canPurchase,
  onCart,
  onTrace,
  onAddCart,
  onBuy,
  notify
}: {
  product: Product;
  canPurchase: boolean;
  onCart: () => void;
  onTrace: () => void;
  onAddCart: (product: Product, spec: string) => void | Promise<void>;
  onBuy: () => void;
  notify: (message: string) => void;
}) {
  const [spec, setSpec] = useState<string>(product.unit);
  const [added, setAdded] = useState(false);
  const saved = Math.max(product.originalPrice - product.price, 0).toFixed(1);
  const batchCode = `LYYN-20260610-${String(product.id).padStart(2, '0')}`;
  const specs = [
    { name: product.unit, desc: '适合 1-2 人尝鲜' },
    { name: `家庭装 ${product.unit}`, desc: '家庭囤货更划算' },
    { name: '尝鲜装', desc: '新人首单推荐' }
  ];
  const detailPoints = [
    { label: '发货地', value: product.origin },
    { label: '预计到达', value: '明日 18:00 前' },
    { label: '服务', value: '坏果包赔 / 不满意可退' },
    { label: '批次', value: batchCode }
  ];

  const add = () => {
    if (!canPurchase) { notify('商品资料预览，交易服务尚未接入'); return; }
    onAddCart(product, spec);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  const buyNow = async () => {
    if (!canPurchase) { notify('商品资料预览，交易服务尚未接入'); return; }
    try {
      await onAddCart(product, spec);
    } catch {
      return;
    }
    onBuy();
  };

  return (
    <div className="product-detail-red">
      <section className="detail-visual-shell">
        <img className="detail-hero-img" src={product.image} alt="" />
        <div className="detail-visual-badge">
          <ShieldCheck size={15} />
          官方溯源
        </div>
      </section>
      <section className="detail-price-card">
        <div className="detail-price-top">
          <div className="detail-price"><em>¥</em>{product.price}<del>¥{product.originalPrice}</del></div>
          <span>已省 ¥{saved}</span>
        </div>
        <p>{product.sales}人已拼 · 今日产地直发 · 平台补贴中</p>
        <h1>{product.name} {product.unit}</h1>
        <div className="detail-tags"><span>百亿农补</span><span>{product.tag}</span><span>{product.origin}</span></div>
        <div className="detail-buyer-row">
          <span>同城 24 小时内达</span>
        </div>
      </section>

      <section className="detail-card detail-delivery-card">
        {detailPoints.map((item) => (
          <p key={item.label}><span>{item.label}</span><b>{item.value}</b></p>
        ))}
      </section>

      <section className="detail-card">
        <h3>选择规格</h3>
        <div className="spec-choice-red">
          {specs.map((item) => (
            <button key={item.name} className={spec === item.name ? 'active' : ''} onClick={() => setSpec(item.name)}>
              <b>{item.name}</b>
              <small>{item.desc}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="detail-service-card">
        <div><CheckCircle2 size={16} /><span>坏果包赔</span></div>
        <div><Truck size={16} /><span>产地直发</span></div>
        <div><ShieldCheck size={16} /><span>农残检测合格</span></div>
      </section>

      <section className="detail-card detail-trace-entry">
        <div>
          <ScanLine size={22} />
          <span>
            <b>查看本批次溯源报告</b>
            <small>采收、检测、冷链温控全流程可查</small>
          </span>
        </div>
        <button onClick={onTrace}>去查看</button>
      </section>

      <section className="detail-card detail-quality-card">
        <div className="trace-section-head"><b>品质保障</b><span>平台验真</span></div>
        <div className="guarantee-grid"><span>源头直采</span><span>极速发货</span><span>溯源码</span><span>售后无忧</span></div>
        <div className="quality-flow">
          <p><ClipboardCheck size={15} /> 基地采收</p>
          <p><ShieldCheck size={15} /> 快检合格</p>
          <p><Truck size={15} /> 打包发出</p>
        </div>
      </section>

      <section className="detail-card detail-review-card">
        <div className="trace-section-head"><b>买家真实评价</b><span>真实评价待接入</span></div>
        <p>真实评价与评分数据待接入，接入后将展示真实买家评价。</p>
      </section>

      <section className="detail-card">
        <h3>商品详情</h3>
        <p>精选{product.origin}优质产区，成熟采摘，冷链或产地直发。每批次支持品质追踪，适合家庭日常囤货。</p>
        <div className="detail-photo-strip">
          <img src={product.image} alt="" />
          <div>
            <b>产地实拍</b>
            <span>按批次同步采收、质检和发货记录，减少消费者对农产品“看不见来源”的顾虑。</span>
          </div>
        </div>
      </section>
      {added && <div className="toast-red">已加入购物车</div>}
      <div className="detail-bottom-bar detail-bottom-5">
        <button onClick={() => notify('已打开客服入口')}>客服</button>
        <button onClick={() => notify('已收藏商品')}>收藏</button>
        <button onClick={onCart}>购物车</button>
        <button className="cart" onClick={add}>加入购物车</button>
        <button className="buy" onClick={buyNow}>立即拼单</button>
      </div>
    </div>
  );
}

function CartPage({
  cartItems,
  onCheckout,
  onShop,
  onUpdateQuantity,
  onRemove
}: {
  cartItems: CartItem[];
  onCheckout: () => void;
  onShop: () => void;
  onUpdateQuantity: (productId: string, spec: string, nextQuantity: number) => void;
  onRemove: (productId: string, spec: string) => void;
}) {
  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = 0;
  const payable = total;

  if (!cartItems.length) {
    return (
      <div className="cart-red mp-cart">
        <section className="empty-state-red">
          <PackageSearch size={42} />
          <h3>购物车还是空的</h3>
          <p>商品上架后，可以在这里查看购物车</p>
          <button onClick={onShop}>去逛逛</button>
        </section>
      </div>
    );
  }

  return (
    <div className="cart-red mp-cart">
      <section className="cart-promo-red"><b>购物车</b><span>商品可售状态以服务端为准</span></section>
      {cartItems.map((item) => (
        <article className="cart-item-red" key={`${item.product.id}-${item.spec}`}>
          <input type="checkbox" checked readOnly />
          <img src={item.product.image} alt="" />
          <div>
            <h3>{item.product.name}</h3>
            <p>{item.spec}</p>
            <strong>¥{item.product.price}</strong>
            <div className="cart-item-actions-red">
              <button onClick={() => onRemove(item.product.id, item.spec)}>删除</button>
              <div className="qty-stepper-red">
                <button onClick={() => onUpdateQuantity(item.product.id, item.spec, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.product.id, item.spec, item.quantity + 1)}>+</button>
              </div>
            </div>
          </div>
        </article>
      ))}
      <div className="cart-bottom-red"><span>商品金额：<b>¥{payable.toFixed(1)}</b><small>运费及优惠以下单页服务端核算为准</small></span><button onClick={onCheckout}>去结算</button></div>
    </div>
  );
}

function CheckoutPage({
  cartItems,
  address,
  onPay,
  onAddress
}: {
  cartItems: CartItem[];
  address: Address | null;
  onPay: () => Promise<void>;
  onAddress: () => void;
}) {
  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const payable = total;
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!address || submitting) return;
    setSubmitting(true);
    try {
      await onPay();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-red">
      <section className="checkout-address-red" onClick={onAddress}>
        <MapPin size={18} />
        <div><b>{address ? `${address.name} ${address.phone}` : '请选择收货地址'}</b><p>{address ? `${address.province}${address.city}${address.district}${address.detailAddress}` : '新增地址后即可提交订单'}</p></div>
        <ChevronRight size={17} />
      </section>
      <section className="checkout-shop-red">
        <h3>耘露产地店</h3>
        {cartItems.map((item) => (
          <div className="checkout-product-red" key={`${item.product.id}-${item.spec}`}>
            <img src={item.product.image} alt="" />
            <div><b>{item.product.name}</b><p>{item.spec}</p><span>¥{item.product.price} x {item.quantity}</span></div>
          </div>
        ))}
      </section>
      <section className="checkout-fee-red">
        <p><span>商品金额</span><b>¥{total.toFixed(1)}</b></p>
        <p><span>运费</span><b>以后台核算为准</b></p>
        <p><span>付款与配送</span><b>提交订单后确认</b></p>
      </section>
      <section className="checkout-note-red"><span>订单说明</span><b>提交订单不代表已付款或已安排配送</b></section>
      <div className="cart-bottom-red"><span>商品金额：<b>¥{payable.toFixed(1)}</b><small>最终金额以服务端订单信息为准</small></span><button disabled={!address || submitting} onClick={submit}>{submitting ? '正在提交…' : '提交订单'}</button></div>
    </div>
  );
}

function ProfileEditPage({ role, onClose, notify }: { role: Role; onClose: () => void; notify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<number>(0);
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatar] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFarmer = role === 'farmer';

  useEffect(() => {
    let alive = true;
    fetchCurrentUser().then((u) => {
      if (!alive) return;
      setNickname(u.nickname || '');
      setGender(u.gender ?? 0);
      setBirthday(u.birthday || '');
      setAvatar(u.avatar || '');
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const pickAvatar = () => fileRef.current?.click();
  const onFile = async (event: { target: { files: FileList | null; value: string } }) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { notify('图片不能超过 5MB'); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const result = await uploadImageBase64(file.type, base64);
      if (result.url) { setAvatar(imageURL(result.url)); notify('头像已更新，保存后生效'); }
    } catch (error) {
      notify(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const name = nickname.trim();
    if (!name) { notify('请填写昵称'); return; }
    if (name.length > 20) { notify('昵称不超过 20 个字'); return; }
    setSaving(true);
    try {
      const body: { nickname: string; gender: number; birthday?: string; avatar?: string } = { nickname: name, gender, ...(birthday ? { birthday } : {}) };
      if (avatar) body.avatar = avatar;
      await updateProfile(body);
      notify('保存成功');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-edit-overlay">
      <header className="pe-nav">
        <button className="pe-back" onClick={onClose} aria-label="返回"><ChevronLeft size={20} /></button>
        <b>个人信息</b>
        <span className="pe-nav-holder" />
      </header>
      <div className="pe-body">
        {loading ? (
          <p className="pe-loading">正在读取个人信息…</p>
        ) : (
          <>
            <section className="pe-card pe-avatar-card">
              <div className="pe-avatar">
                {avatar ? <img src={avatar} alt="头像" /> : <img src="/assets/brand-logo.png" alt="默认头像" />}
              </div>
              <button className="pe-change-avatar" disabled={uploading} onClick={pickAvatar}>{uploading ? '上传中…' : '更换头像'}</button>
              <p className="pe-tip">点击选择图片，可更新头像（≤5MB）</p>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
            </section>
            <section className="pe-card pe-form">
              <div className="pe-field">
                <label>昵称</label>
                <input value={nickname} maxLength={20} placeholder="请输入昵称" onChange={(e) => setNickname(e.target.value)} />
                <em>{nickname.length}/20</em>
              </div>
              <div className="pe-field pe-field-row">
                <label>性别</label>
                <div className="pe-genders">
                  {([['1', '男'], ['2', '女'], ['0', '保密']] as Array<[string, string]>).map(([val, label]) => (
                    <button key={val} className={gender === Number(val) ? 'active' : ''} onClick={() => setGender(Number(val))}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="pe-field pe-field-row">
                <label>出生日期</label>
                <input type="date" value={birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} />
                <em className="pe-badge">{birthday ? '已设置' : '未设置'}</em>
              </div>
            </section>
            <p className="pe-hint">{isFarmer ? '资料将同步到农户端与消费端' : '资料将同步到你的账户，用于订单与配送'}</p>
          </>
        )}
      </div>
      <footer className="pe-footer">
        <button disabled={saving || uploading || loading} onClick={save}>{saving ? '保存中…' : '保存'}</button>
      </footer>
    </div>
  );
}

function PaySheet({ amount, busy, onClose, onPay }: { amount: number; busy: string | null; onClose: () => void; onPay: (method: 'wechat' | 'alipay') => void }) {
  return (
    <div className="pay-sheet-mask" onClick={onClose}>
      <section className="pay-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="pay-sheet-head"><b>收银台</b><button onClick={onClose}>×</button></div>
        <div className="pay-amount"><span>应付金额</span><strong>¥{amount}</strong></div>
        <button className="pay-method" disabled={Boolean(busy)} onClick={() => onPay('wechat')}>微信支付</button>
        <button className="pay-method" disabled={Boolean(busy)} onClick={() => onPay('alipay')}>支付宝</button>
        <small className="pay-tip">测试环境模拟支付，不产生真实扣款</small>
      </section>
    </div>
  );
}

function PaySuccessPage({ onOrders, onDetail }: { onOrders: () => void; onDetail: () => void }) {
  return (
    <div className="pay-success-red">
      <PackageSearch />
      <h2>订单状态以服务端记录为准</h2>
      <p>当前页面不会将提交订单显示为已付款或已发货。</p>
      <div><button onClick={onOrders}>查看订单</button><button className="primary" onClick={onDetail}>订单详情</button></div>
    </div>
  );
}

function OrdersPage({ orders, loggedIn, onLogin, onDetail, onPayOrder, notify: _notify }: { orders: OrderRecord[]; loggedIn: boolean; onLogin: () => void; onDetail: (order: OrderRecord) => void; onPayOrder: (order: OrderRecord) => void; notify: (message: string) => void }) {
  const [status, setStatus] = useState<'all' | 'unpaid' | 'unsent' | 'receiving' | 'done'>('all');
  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'unpaid', label: '待付款' },
    { id: 'unsent', label: '待发货' },
    { id: 'receiving', label: '待收货' },
    { id: 'done', label: '已完成' }
  ] as const;
  const orderView = orders.map((order) => {
    const statusMap: Record<OrderRecord['status'], { status: 'unpaid' | 'unsent' | 'receiving' | 'done'; label: string; action: string }> = {
      pending: { status: 'unpaid', label: '待付款', action: '去支付' },
      paid: { status: 'unsent', label: '待发货', action: '等待发货' },
      shipped: { status: 'receiving', label: '待收货', action: '查看物流' },
      completed: { status: 'done', label: '交易成功', action: '再次拼单' },
      cancelled: { status: 'done', label: '已取消', action: '订单详情' },
      refunding: { status: 'done', label: '退款中', action: '订单详情' },
      refunded: { status: 'done', label: '已退款', action: '订单详情' }
    };
    return { order, ...statusMap[order.status], product: order.items[0] };
  });
  const visibleOrders = status === 'all' ? orderView : orderView.filter((item) => item.status === status);

  return (
    <div className="orders-red">
      <div className="order-tabs-red">
        {tabs.map((item) => (
          <button key={item.id} className={status === item.id ? 'active' : ''} onClick={() => setStatus(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {!loggedIn && <section className="empty-state-red"><PackageSearch size={42} /><h3>登录后查看订单</h3><p>登录后跟进配送和订单状态</p><button onClick={onLogin}>登录</button></section>}
      {loggedIn && !visibleOrders.length && <section className="empty-state-red"><PackageSearch size={42} /><h3>还没有相关订单</h3><p>去挑选一份当季新鲜吧</p></section>}
      {visibleOrders.map((item) => (
        <article className="order-card-red" key={item.order.id}>
          <div className="order-head-red"><b>耘露产地店</b><span>{item.label}</span></div>
          <div className="order-body-red"><img src={item.product?.image || ''} alt="" /><div><h3>{item.product?.name || '订单商品'}</h3><p>{item.product ? `数量 x ${item.product.quantity}` : ''}</p><strong>¥{item.order.totalAmount}</strong><small>订单号 {item.order.orderNo}</small></div></div>
          <div className="order-actions-red">
            <button onClick={() => onDetail(item.order)}>订单详情</button>
            {item.order.status === 'pending'
              ? <button className="primary" onClick={() => onPayOrder(item.order)}>去支付</button>
              : <button className="primary" onClick={() => onDetail(item.order)}>查看订单</button>}
          </div>
        </article>
      ))}
    </div>
  );
}

function OrderDetailPage({ order, onPayOrder, onCancelOrder }: { order: OrderRecord | null; onPayOrder: (order: OrderRecord) => void; onCancelOrder: (order: OrderRecord) => Promise<void> }) {
  const product = order?.items[0];
  const statusLabel: Record<string, string> = { pending: '待付款', paid: '待发货', shipped: '待收货', completed: '交易成功', cancelled: '已取消', refunding: '退款中', refunded: '已退款' };
  return (
    <div className="order-detail-red">
      <section className="order-status-red"><h2>{order ? statusLabel[order.status] : '暂无订单详情'}</h2><p>{order ? '当前展示服务端返回的订单状态' : '请从订单列表选择一笔订单。'}</p></section>
      {order?.status === 'shipped' && <section className="logistics-red"><h3>物流信息</h3><p>物流详情服务尚未接入。</p></section>}
      <section className="checkout-shop-red">
        <h3>商品信息</h3>
        {product && <div className="checkout-product-red"><img src={product.image} alt="" /><div><b>{product.name}</b><p>数量 x {product.quantity}</p><span>¥{product.price}</span></div></div>}
      </section>
      {order?.status === 'pending' && (
        <div className="order-actions-red">
          <button onClick={() => onCancelOrder(order)}>取消订单</button>
          <button className="primary" onClick={() => onPayOrder(order)}>去支付</button>
        </div>
      )}
    </div>
  );
}

function AddressPage({ addresses, selectedAddress, onSelect, onChanged, notify }: { addresses: Address[]; selectedAddress: Address | null; onSelect: (address: Address | null) => void; onChanged: () => Promise<void>; notify: (message: string) => void }) {
  const [editing, setEditing] = useState<null | Address>(null);
  const [saving, setSaving] = useState(false);
  const blankAddress: Address = { id: 0, name: '', phone: '', province: '', city: '', district: '', detailAddress: '', isDefault: addresses.length === 0 };
  const save = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      const saved = editing.id ? await updateAddress(editing) : await createAddress({ ...editing, id: undefined } as Omit<Address, 'id'>);
      await onChanged();
      onSelect(saved);
      notify(editing.id ? '地址已保存' : '新地址已保存');
      setEditing(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '地址保存失败');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="address-red">
      {addresses.map((item) => (
        <article className="address-card-red" key={item.id}>
          <h3>{item.name} {item.phone}{item.isDefault && <span>默认</span>}</h3>
          <p>{item.province}{item.city}{item.district}{item.detailAddress}</p>
          <button onClick={() => onSelect(item)}>{selectedAddress?.id === item.id ? '已选中' : '选择'}</button>
          <button onClick={() => setEditing(item)}>编辑</button>
          <button onClick={async () => { try { await deleteAddress(item.id); if (selectedAddress?.id === item.id) onSelect(null); await onChanged(); notify('地址已删除'); } catch (error) { notify(error instanceof Error ? error.message : '地址删除失败'); } }}>删除</button>
        </article>
      ))}
      <button className="add-address-red" onClick={() => setEditing(blankAddress)}>新增收货地址</button>
      {editing && (
        <div className="address-sheet-mask" onClick={() => setEditing(null)}>
          <section className="address-edit-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="trace-section-head"><b>{editing.id ? '编辑收货地址' : '新增收货地址'}</b><button onClick={() => setEditing(null)}>关闭</button></div>
            <label><span>收货人</span><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="请输入收货人" /></label>
            <label><span>手机号</span><input value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} placeholder="请输入手机号" /></label>
            <label><span>省市区</span><input value={`${editing.province}${editing.city}${editing.district}`} onChange={(event) => setEditing({ ...editing, province: event.target.value, city: '', district: '' })} placeholder="省市区" /></label>
            <label><span>详细地址</span><textarea value={editing.detailAddress} onChange={(event) => setEditing({ ...editing, detailAddress: event.target.value })} placeholder="街道、小区楼栋门牌" /></label>
            <label><span>设为默认</span><input type="checkbox" checked={editing.isDefault} onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })} /></label>
            <button className="address-save-btn" disabled={saving} onClick={save}>{saving ? '保存中...' : '保存地址'}</button>
          </section>
        </div>
      )}
    </div>
  );
}

function MessagesPage({ onPage }: { onPage: (page: ConsumerPage) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchConversations().then((r) => { if (alive) { setConversations(r.items); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openChat = async (c: Conversation) => {
    setOpenId(c.id);
    const list = await fetchConversationMessages(c.id);
    setMsgs(list);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !openId || sending) return;
    setDraft('');
    setSending(true);
    try {
      const { user, reply } = await sendConversationMessage(openId, text);
      setMsgs((prev) => [...prev, user, ...(reply ? [reply] : [])]);
    } catch {
      setMsgs((prev) => [...prev, { id: '', sender: 'user', content: text, createdAt: '' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-red mp-unavailable-page">
      <section className="mp-unavailable-intro"><b>消息中心</b><span>订单与农场更新</span></section>
      {!openId ? (
        <>
          {loading && <p className="empty-state-red" style={{ padding: '16px' }}>加载中…</p>}
          {!loading && conversations.length === 0 && <section className="empty-state-red"><MessageCircle size={34}/><h3>暂无消息</h3><p>订单通知和认养更新会在这里展示。</p></section>}
          <section className="mp-shortcut-card">
            {conversations.map((c) => (
              <button key={c.id} onClick={() => openChat(c)}>
                <span>{c.peerName || '客服'}</span>
                <small>{c.lastMessage}</small>
                {c.unreadCount > 0 && <em>{c.unreadCount}</em>}
                <ChevronRight size={17}/>
              </button>
            ))}
            <button onClick={() => onPage('orders')}>查看我的订单 <ChevronRight size={17}/></button>
            <button onClick={() => onPage('adoptDetail')}>查看我的认养 <ChevronRight size={17}/></button>
          </section>
        </>
      ) : (
        <section className="mp-chat-room">
          <div className="mp-chat-head"><button onClick={() => setOpenId(null)}>‹ 返回</button><b>{conversations.find((c) => c.id === openId)?.peerName || '对话'}</b></div>
          <div className="mp-chat-body">
            {msgs.map((m) => <div key={m.id || `${m.sender}-${m.createdAt}`} className={`mp-chat-bubble ${m.sender}`}><span>{m.content}</span></div>)}
          </div>
          <footer className="mp-chat-input">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="输入消息…" />
            <button onClick={send} disabled={sending}>{sending ? '发送中' : '发送'}</button>
          </footer>
        </section>
      )}
    </div>
  );
}

function ServicePage({ onOrders }: { onOrders: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSupportHistory().then((list) => { if (alive) { setMessages(list); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    try {
      const { user, reply } = await sendSupportMessage(text);
      setMessages((prev) => [...prev, user, ...(reply ? [reply] : [])]);
    } catch {
      setMessages((prev) => [...prev, { id: '', role: 'user', content: text, createdAt: '' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="service-red mp-unavailable-page">
      <section className="mp-unavailable-intro"><b>服务与帮助</b><span>在线客服</span></section>
      {loaded && messages.length === 0 && <section className="empty-state-red"><MessageCircle size={34}/><h3>欢迎咨询</h3><p>输入你的问题，客服会尽快回复。</p></section>}
      <section className="mp-chat-room">
        <div className="mp-chat-body">
          {messages.map((m) => <div key={m.id || `${m.role}-${m.createdAt}`} className={`mp-chat-bubble ${m.role === 'user' ? 'user' : 'peer'}`}><span>{m.content}</span></div>)}
        </div>
        <footer className="mp-chat-input">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="输入你的问题…" />
          <button onClick={send} disabled={sending}>{sending ? '发送中' : '发送'}</button>
        </footer>
      </section>
      <section className="mp-shortcut-card"><button onClick={onOrders}>查看我的订单 <ChevronRight size={17}/></button></section>
    </div>
  );
}

function SettingsPage({ loggedIn, onLogout, onIdentity, onLogin, onPrivacy, onOpenGeneral, onEditProfile, onAddress, notify, onProfileChanged }: { loggedIn: boolean; onLogout: () => void; onIdentity: () => void; onLogin: () => void; onPrivacy: () => void; onOpenGeneral?: () => void; onEditProfile?: () => void; onAddress?: () => void; notify?: (message: string) => void; onProfileChanged?: () => void }) {
  const [session] = useState(() => getStoredSession());
  const [city, setCity] = useState(session?.city || '');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [citySheet, setCitySheet] = useState(false);
  const [fontSheet, setFontSheet] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [savingCity, setSavingCity] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'suggest', content: '', contact: '' });
  const [submitting, setSubmitting] = useState(false);
  const displayName = session?.nickname?.trim() || '未登录';
  const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '昆明'];
  const FONT_LABEL: Record<number, string> = { 1: '小', 2: '标准', 3: '大' };

  useEffect(() => {
    let alive = true;
    fetchUserSettings().then((s) => { if (alive) setSettings(s); }).catch(() => { if (alive) setSettings({ orderNotify: true, logisticsNotify: true, promoNotify: true, communityNotify: true, personalizedRecommend: true, footprintVisible: true, voiceEnabled: false, dataSaver: false, fontScale: 2 }); });
    return () => { alive = false; };
  }, []);

  const togglePref = async (key: 'voiceEnabled' | 'dataSaver') => {
    if (!settings) return;
    const next = !settings[key];
    const prev = settings;
    setSettings({ ...settings, [key]: next });
    try { setSettings(await updateUserSettings({ [key]: next })); } catch { setSettings(prev); notify?.('保存失败，请稍后重试'); }
  };
  const chooseFont = async (scale: number) => {
    setFontSheet(false);
    if (!settings || scale === settings.fontScale) return;
    const prev = settings;
    setSettings({ ...settings, fontScale: scale });
    try { setSettings(await updateUserSettings({ fontScale: scale })); notify?.('字体大小已更新'); } catch { setSettings(prev); notify?.('保存失败，请稍后重试'); }
  };
  const chooseCity = async (c: string) => {
    setCitySheet(false);
    if (savingCity || c === city) return;
    setSavingCity(true);
    try {
      await updateProfile({ city: c });
      setCity(c);
      notify?.('城市已更新');
      onProfileChanged?.();
    } catch (error) {
      notify?.(error instanceof Error ? error.message : '城市保存失败');
    } finally {
      setSavingCity(false);
    }
  };
  const openHelp = () => {
    setHelpOpen(true);
    fetchFaqs().then(setFaqs).catch(() => {});
  };
  const submit = async () => {
    const content = feedback.content.trim();
    if (!content) { notify?.('请填写反馈内容'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback(feedback.type, content, feedback.contact.trim());
      setFeedbackOpen(false);
      setFeedback({ type: 'suggest', content: '', contact: '' });
      notify?.('感谢你的反馈');
    } catch (error) {
      notify?.(error instanceof Error ? error.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button className={`st-toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-label="开关"><i /></button>
  );

  return (
    <div className="settings-red mp-settings-page st-page">
      <section className="st-group">
        <div className="st-group-title">个人信息</div>
        <button className="st-row" disabled={!loggedIn} onClick={onEditProfile}>
          <span className="st-icon"><img src="/assets/icons/user.png" alt="" /></span><span className="st-label">昵称</span>
          <em>{loggedIn ? displayName : '未登录'}</em><ChevronRight size={16} />
        </button>
        <button className="st-row" disabled={!loggedIn} onClick={() => setCitySheet(true)}>
          <span className="st-icon"><img src="/assets/icons/pin.png" alt="" /></span><span className="st-label">城市</span>
          <em className={city ? '' : 'st-placeholder'}>{city || '未设置'}</em><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <div className="st-group-title">通用</div>
        <button className="st-row" onClick={() => setFontSheet(true)}>
          <span className="st-icon"><img src="/assets/icons/font.png" alt="" /></span><span className="st-label">字体大小</span>
          <em>{FONT_LABEL[settings?.fontScale ?? 2] || '标准'}</em><ChevronRight size={16} />
        </button>
        <div className="st-row">
          <span className="st-icon"><img src="/assets/icons/voice.png" alt="" /></span><span className="st-label">语音播报</span>
          <Toggle on={Boolean(settings?.voiceEnabled)} onChange={() => togglePref('voiceEnabled')} />
        </div>
        <div className="st-row">
          <span className="st-icon"><img src="/assets/icons/signal.png" alt="" /></span><span className="st-label">图片省流模式</span>
          <Toggle on={Boolean(settings?.dataSaver)} onChange={() => togglePref('dataSaver')} />
        </div>
      </section>

      <section className="st-group">
        <div className="st-group-title">通用设置</div>
        <button className="st-row" onClick={onOpenGeneral}>
          <span className="st-icon"><img src="/assets/icons/general.png" alt="" /></span><span className="st-label">通用设置</span>
          <em className="st-placeholder">修改密码 · 消息通知 · 隐私</em><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <div className="st-group-title">更多</div>
        <button className="st-row" onClick={onAddress}>
          <span className="st-icon"><img src="/assets/icons/truck.png" alt="" /></span><span className="st-label">收货地址</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={onPrivacy}>
          <span className="st-icon"><img src="/assets/icons/shield.png" alt="" /></span><span className="st-label">账户数据与隐私</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={() => setFeedbackOpen(true)}>
          <span className="st-icon"><img src="/assets/icons/chat.png" alt="" /></span><span className="st-label">意见反馈</span><ChevronRight size={16} />
        </button>
        <button className="st-row" onClick={openHelp}>
          <span className="st-icon"><img src="/assets/icons/help.png" alt="" /></span><span className="st-label">帮助中心</span><ChevronRight size={16} />
        </button>
      </section>

      <section className="st-group">
        <button className="st-row" onClick={onIdentity}>
          <span className="st-icon"><img src="/assets/icons/swap.png" alt="" /></span><span className="st-label">切换使用身份</span><ChevronRight size={16} />
        </button>
      </section>

      {loggedIn
        ? <button className="st-logout" onClick={() => { if (window.confirm('本机会话将移除，重新登录后可继续查看订单和地址。')) onLogout(); }}>退出当前账户</button>
        : <button className="mp-login-button" onClick={onLogin}>登录</button>}

      <section className="mp-settings-about">
        <img src="/assets/brand-logo.png" alt="耘露" />
        <b>耘露</b>
        <span>新鲜农货 · 产品溯源 · 云认养</span>
        <small>Version 5.0</small>
      </section>

      {citySheet && createPortal(
        <div className="st-sheet-mask" onClick={() => setCitySheet(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>选择城市</b><button onClick={() => setCitySheet(false)}>×</button></div>
            {CITIES.map((c) => (
              <button key={c} className={`st-sheet-row ${c === city ? 'active' : ''}`} disabled={savingCity} onClick={() => chooseCity(c)}>
                {c}{c === city && <em>当前</em>}
              </button>
            ))}
            <button className="st-sheet-row" disabled={savingCity} onClick={() => chooseCity('其他')}>其他</button>
          </section>
        </div>,
        document.body
      )}

      {fontSheet && createPortal(
        <div className="st-sheet-mask" onClick={() => setFontSheet(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>字体大小</b><button onClick={() => setFontSheet(false)}>×</button></div>
            {([1, 2, 3] as number[]).map((s) => (
              <button key={s} className={`st-sheet-row ${settings?.fontScale === s ? 'active' : ''}`} onClick={() => chooseFont(s)}>
                {FONT_LABEL[s]}{settings?.fontScale === s && <em>当前</em>}
              </button>
            ))}
          </section>
        </div>,
        document.body
      )}

      {feedbackOpen && createPortal(
        <div className="st-sheet-mask" onClick={() => setFeedbackOpen(false)}>
          <section className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>意见反馈</b><button onClick={() => setFeedbackOpen(false)}>×</button></div>
            <div className="st-fb-types">
              {([['suggest', '建议'], ['bug', '问题'], ['other', '其他']] as Array<[string, string]>).map(([val, label]) => (
                <button key={val} className={feedback.type === val ? 'active' : ''} onClick={() => setFeedback({ ...feedback, type: val })}>{label}</button>
              ))}
            </div>
            <textarea className="st-fb-text" rows={4} maxLength={1000} placeholder="请描述你的建议或遇到的问题…" value={feedback.content} onChange={(e) => setFeedback({ ...feedback, content: e.target.value })} />
            <input className="st-fb-contact" placeholder="联系方式（选填）" value={feedback.contact} onChange={(e) => setFeedback({ ...feedback, contact: e.target.value })} />
            <button className="st-fb-submit" disabled={submitting} onClick={submit}>{submitting ? '提交中…' : '提交反馈'}</button>
          </section>
        </div>,
        document.body
      )}

      {helpOpen && createPortal(
        <div className="st-sheet-mask" onClick={() => setHelpOpen(false)}>
          <section className="st-sheet st-help-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head"><b>帮助中心</b><button onClick={() => setHelpOpen(false)}>×</button></div>
            {faqs.length === 0 && <p className="st-help-empty">正在加载常见问题…</p>}
            {faqs.map((f) => (
              <div key={f.q} className="st-faq">
                <b>{f.q}</b>
                <p>{f.a}</p>
              </div>
            ))}
            <p className="st-help-foot">更多帮助可联系在线客服</p>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

function PrivacyPage() {
  return <div className="mp-privacy-page"><section><h3>账户数据说明</h3><p>登录时，账户服务会确认身份并返回账户资料和登录会话。会话保存在本机，用于读取购物车、订单与收货地址。退出登录会移除本机会话。</p><h3>查询记录</h3><p>搜索关键词保存在当前设备。小露的商品查询与操作指引记录按本机当前账户分开保存，可以在对话页清除。本页不收集额外身份资料。</p><h3>服务状态</h3><p>商品购买、认养、溯源、人工客服与 AI 对话的可用情况以页面实际提示为准。商品图册不能作为库存、价格、检测或交付证明。</p><h3>授权与联系</h3><p>使用扫码等功能时会请求相应权限，可在系统设置中管理授权。正式对外服务前，经营主体、联系方式、数据保存期限与完整隐私政策应由运营方提供并发布。</p></section></div>;
}

function MemberPage({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [records, setRecords] = useState<PointsRecord[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([fetchMemberSummary(), fetchPointsRecords(1, 50)]).then(([s, r]) => { if (alive) { setSummary(s); setRecords(r.items); } }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const doCheckin = async () => {
    try {
      const r = await checkinMember();
      notify(r.message || (r.awarded ? `签到成功 +${r.points} 积分` : '今日已签到'));
      const s = await fetchMemberSummary(); if (s) setSummary(s);
    } catch (e) { notify(e instanceof Error ? e.message : '签到失败'); }
  };
  return (
    <div className="mp-member-page">
      <section className="member-hero">
        <div><b>{summary?.levelName || '青芽会员'}</b><p>当前积分</p><strong>{summary?.points ?? 0}</strong></div>
        <button onClick={doCheckin}>{summary?.checkedInToday ? '今日已签到' : '立即签到'}</button>
      </section>
      <section className="member-progress">
        <div className="member-progress-head"><span>升级进度</span><em>{summary ? `${summary.progressPercent}%` : '—'}</em></div>
        <i><span style={{ width: `${summary?.progressPercent ?? 0}%` }} /></i>
        <small>{summary ? `距下一等级还需 ${summary.pointsToNext} 积分` : '加载中…'}</small>
      </section>
      <section className="member-privileges">
        <b>会员权益</b>
        {(summary?.privileges || []).map((p) => <article key={p.code}><div><b>{p.title || p.name}</b><small>{p.desc || p.description}</small></div><em>{p.icon || '🎁'}</em></article>)}
        {(summary?.privileges || []).length === 0 && <p className="member-empty">暂无权益信息</p>}
      </section>
      <section className="member-records">
        <b>积分流水</b>
        {records.length === 0 && <p className="member-empty">暂无积分记录</p>}
        {records.map((r) => <article key={r.id}><div><b>{r.reason}</b><small>{r.createdAt}</small></div><em className={r.delta >= 0 ? 'plus' : 'minus'}>{r.delta >= 0 ? '+' : ''}{r.delta}</em></article>)}
      </section>
    </div>
  );
}

function FavoritesPage({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => { let alive = true; fetchFavorites().then((f) => { if (alive) setItems(f); }).catch(() => {}); return () => { alive = false; }; }, []);
  const remove = async (id: string) => { try { await toggleFavorite(id); setItems((prev) => prev.filter((p) => p.id !== id)); notify('已取消收藏'); } catch (e) { notify(e instanceof Error ? e.message : '操作失败'); } };
  return (
    <div className="mp-list-page">
      {items.length === 0 && <div className="mp-list-empty">还没有收藏的商品，去商城看看吧</div>}
      {items.map((p) => <article className="mp-list-row" key={p.id}><img src={p.image} alt="" /><div><b>{p.name}</b><small>{p.origin}</small><strong>¥{p.priceText || p.price}</strong></div><button onClick={() => remove(p.id)}>取消</button></article>)}
    </div>
  );
}

function FootprintsPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<FootprintItem[]>([]);
  useEffect(() => { let alive = true; fetchFootprints().then((f) => { if (alive) setItems(f); }).catch(() => {}); return () => { alive = false; }; }, []);
  const clearAll = async () => { try { await clearFootprints(); setItems([]); } catch { /* 静默 */ } };
  const removeOne = async (id: string) => { try { await deleteFootprint(id); setItems((prev) => prev.filter((x) => x.id !== id)); } catch { /* 静默 */ } };
  return (
    <div className="mp-list-page">
      {items.length === 0 && <div className="mp-list-empty">暂无浏览足迹</div>}
      {items.length > 0 && <button className="mp-list-clear" onClick={clearAll}>清空足迹</button>}
      {items.map((it) => <article className="mp-list-row" key={it.id}><img src={it.coverImage} alt="" /><div><b>{it.product?.name ? String(it.product.name) : '商品'}</b><small>{it.viewedAt}</small></div><button onClick={() => removeOne(it.id)}>删除</button></article>)}
    </div>
  );
}

type NotifyKey = 'orderNotify' | 'logisticsNotify' | 'promoNotify' | 'communityNotify' | 'personalizedRecommend' | 'footprintVisible';

function GeneralSettingsPage({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [session] = useState(() => getStoredSession());
  const [settings, setSettings] = useState<UserSettings>({ orderNotify: true, logisticsNotify: true, promoNotify: true, communityNotify: true, personalizedRecommend: true, footprintVisible: true, voiceEnabled: false, dataSaver: false, fontScale: 2 });
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  useEffect(() => { let alive = true; fetchUserSettings().then((s) => { if (alive) setSettings(s); }).catch(() => {}); return () => { alive = false; }; }, []);
  const toggleSetting = async (key: NotifyKey) => {
    const prev = settings;
    const next = { ...prev, [key]: !prev[key] };
    setSettings(next);
    try { const saved = await updateUserSettings({ [key]: next[key] }); setSettings(saved); } catch { setSettings(prev); notify('保存失败，请稍后重试'); }
  };
  const rawPhone = session?.phone || (session?.nickname && /^\d{11}$/.test(session.nickname) ? session.nickname : '');
  const phoneMasked = rawPhone ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-4)}` : '未绑定';
  const submitPwd = async () => {
    if (!pwd.newPassword || pwd.newPassword.length < 6) { notify('新密码需至少 6 位'); return; }
    if (pwd.newPassword !== pwd.confirm) { notify('两次输入的新密码不一致'); return; }
    try {
      const r = await changePassword(pwd.oldPassword, pwd.newPassword);
      setPwdOpen(false); setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      notify(r.firstTime ? '密码设置成功' : '密码修改成功');
    } catch (e) { notify(e instanceof Error ? e.message : '修改失败，请稍后重试'); }
  };
  const switchRow = (label: string, key: NotifyKey) => (
    <div className="gen-row" key={key}>
      <span>{label}</span>
      <label className="gen-switch"><input type="checkbox" checked={settings[key]} onChange={() => toggleSetting(key)} /><i /></label>
    </div>
  );
  return (
    <div className="gen-settings-page">
      {session ? (
        <>
          <section className="gen-card">
            <b className="gen-title">账号与安全</b>
            <button className="gen-row" onClick={() => setPwdOpen(true)}><span>修改密码</span><em>›</em></button>
            <div className="gen-row"><span>手机号</span><em>{phoneMasked}</em></div>
          </section>
          <section className="gen-card">
            <b className="gen-title">消息通知</b>
            {switchRow('订单状态通知', 'orderNotify')}
            {switchRow('物流进度通知', 'logisticsNotify')}
            {switchRow('优惠活动通知', 'promoNotify')}
            {switchRow('社区互动通知', 'communityNotify')}
          </section>
          <section className="gen-card">
            <b className="gen-title">隐私</b>
            {switchRow('个性化推荐', 'personalizedRecommend')}
            {switchRow('允许他人查看我的足迹', 'footprintVisible')}
          </section>
        </>
      ) : (
        <div className="mp-list-empty">登录后可管理账号设置</div>
      )}
      {pwdOpen && (
        <div className="farmer-modal-mask" onClick={() => setPwdOpen(false)}>
          <section className="gen-pwd-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head"><b>修改密码</b><button onClick={() => setPwdOpen(false)}>×</button></div>
            <label>原密码（首次设置可留空）<input type="password" value={pwd.oldPassword} onChange={(event) => setPwd({ ...pwd, oldPassword: event.target.value })} /></label>
            <label>新密码（至少 6 位）<input type="password" value={pwd.newPassword} onChange={(event) => setPwd({ ...pwd, newPassword: event.target.value })} /></label>
            <label>确认新密码<input type="password" value={pwd.confirm} onChange={(event) => setPwd({ ...pwd, confirm: event.target.value })} /></label>
            <button onClick={submitPwd}>保存</button>
          </section>
        </div>
      )}
    </div>
  );
}

/** 常用省份快捷选项：APP 无微信原生省市区 picker，用输入框 + 快捷标签代替。 */
const REGION_OPTIONS = ['云南', '四川', '贵州', '广西', '广东', '福建', '浙江', '江苏', '山东', '河南', '湖北', '湖南', '陕西', '北京', '上海', '重庆'];

/** 收货地区选择页：对齐小程序 pages/consumer/region/region.wxml 的独立页面。 */
function RegionPage({ onBack, onManageAddress, notify }: { onBack: () => void; onManageAddress: () => void; notify: (message: string) => void }) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const stored = readStoredRegion(REGION_STORAGE_KEY);
    if (!stored) return;
    setProvince(stored.province || '');
    setCity(stored.city || '');
    setDistrict(stored.district || '');
  }, []);
  const saveRegion = () => {
    const nextProvince = province.trim();
    const nextCity = city.trim();
    const nextDistrict = district.trim();
    if (!nextProvince || !nextCity) { setError('请选择省份和城市'); return; }
    setError('');
    const payload = { province: nextProvince, city: nextCity, district: nextDistrict, label: nextCity + (nextDistrict ? ` · ${nextDistrict}` : '') };
    writeStoredRegion(REGION_STORAGE_KEY, payload);
    notify('收货地区已保存');
    onBack();
  };
  return <div className="region-page">
    <div className="region-heading">
      <b>好物，送到哪里？</b>
      <span>先选收货地区，详细地址在结算时填写</span>
    </div>
    <section className="region-card">
      <div className="region-field">
        <label>省份</label>
        <input value={province} onChange={(event) => { setProvince(event.target.value); setError(''); }} placeholder="请选择省份" />
      </div>
      <div className="region-field">
        <label>城市</label>
        <input value={city} onChange={(event) => { setCity(event.target.value); setError(''); }} placeholder="请选择城市" />
      </div>
      <div className="region-field">
        <label>区县（选填）</label>
        <input value={district} onChange={(event) => { setDistrict(event.target.value); }} placeholder="选填，可留空" />
      </div>
      <div className="region-chips">
        <span>常用省份</span>
        <div>
          {REGION_OPTIONS.map((item) => (
            <button key={item} className={province.trim() === item ? 'active' : ''} onClick={() => { setProvince(item); setError(''); }}>{item}</button>
          ))}
        </div>
      </div>
      {error && <p className="region-error">{error}</p>}
      <button className="region-primary" onClick={saveRegion}>保存收货地区</button>
      <p className="region-note">商品是否可配送、运费与送达时间，以结算页实际核算为准。</p>
      <button className="region-link" onClick={onManageAddress}>管理完整收货地址 ›</button>
    </section>
  </div>;
}

/**
 * 地域内容推荐地区选择页（与「收货地区」互相独立）。
 * 只写入 yunlu.home.contentRegion，用于首页地域特色内容流，不影响收货地址与配送。
 */
function RegionContentPage({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [locatedLabel, setLocatedLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const stored = readStoredRegion(CONTENT_REGION_STORAGE_KEY) || readStoredRegion(REGION_STORAGE_KEY);
    if (!stored) return;
    setProvince(stored.province || '');
    setCity(stored.city || '');
  }, []);
  /** 获取当前位置并反查所属省份/城市；失败或超时只提示，不阻断手动选择。 */
  const locate = () => {
    if (locating) return;
    setLocating(true);
    setError('');
    // 不 await，避免定位期间阻塞 UI；结果回来后只更新状态
    resolveCurrentCoords()
      .then(async (coords) => {
        if (!coords) {
          setLocating(false);
          notify('定位不可用，请手动选择地区');
          return;
        }
        try {
          const resolved = await resolveRegion(coords.latitude, coords.longitude);
          setLocating(false);
          if (!resolved || !resolved.province) { notify('定位不可用，请手动选择地区'); return; }
          setProvince(resolved.province);
          setCity(resolved.city || '');
          setLocatedLabel(resolved.label || resolved.city || resolved.province);
        } catch {
          setLocating(false);
          notify('定位不可用，请手动选择地区');
        }
      })
      .catch(() => {
        setLocating(false);
        notify('定位不可用，请手动选择地区');
      });
  };
  const saveContentRegion = () => {
    const nextProvince = province.trim();
    const nextCity = city.trim();
    if (!nextProvince) { setError('请先选择一个地区'); return; }
    setError('');
    writeStoredRegion(CONTENT_REGION_STORAGE_KEY, { province: nextProvince, city: nextCity || undefined, label: nextCity || nextProvince });
    notify('已切换到' + (nextCity || nextProvince));
    onBack();
  };
  return <div className="region-page region-content-page">
    <div className="region-heading">
      <b>想看哪里的故事？</b>
      <span>选择地区后，为你推荐当地的文旅、农产与乡村故事</span>
    </div>
    <p className="region-note region-content-note">只影响地域特色内容推荐，不影响收货地址</p>
    <section className="region-card">
      <button className="region-locate" onClick={locate} disabled={locating}>
        <span className="region-locate-icon">📍</span>
        {locating ? '定位中…' : '使用当前位置'}
      </button>
      {locatedLabel && <p className="region-located">已定位：{locatedLabel}</p>}
      <div className="region-field">
        <label>城市（选填）</label>
        <input value={city} onChange={(event) => { setCity(event.target.value); setError(''); }} placeholder="选填，可留空" />
      </div>
      <div className="region-chips">
        <span>选择省份</span>
        <div>
          {REGION_OPTIONS.map((item) => (
            <button key={item} className={province.trim() === item ? 'active' : ''} onClick={() => { setProvince(item); setError(''); }}>{item}</button>
          ))}
        </div>
      </div>
      {error && <p className="region-error">{error}</p>}
      <button className="region-primary" onClick={saveContentRegion}>查看该地区推荐</button>
      <p className="region-note">收货地址仍以「选择收货地区」与结算页填写的地址为准。</p>
    </section>
  </div>;
}

function AdoptDetailPage({ notify, onConfirm }: { notify: (message: string) => void; onConfirm: () => void }) {
  const growthLogs = [
    ['认养建档', '第 1 天', '为你生成专属认养编号，农场主完成初始照片上传。'],
    ['稳定生长', '第 28 天', '番茄藤蔓进入快速生长期，每周同步成长照片。'],
    ['开花坐果', '本周', '果实开始成型，预计 18 天后进入采收。'],
    ['采收寄送', '18 天后', '成熟后按认养权益冷链寄送到家。']
  ];
  const farmPhotos = ['/assets/farm/greenhouse.jpg', '/assets/farm/tomato-harvest.jpg', '/assets/farm/field-base.jpg'];

  return (
    <div className="adopt-detail-red adopt-detail-pro">
      <section className="adopt-detail-hero">
        <img src="/assets/farm/greenhouse.jpg" alt="" />
        <div>
          <span>专属认养农场</span>
          <h2>寿光智慧大棚认养</h2>
          <p>开花坐果期 · 采收后寄到家</p>
        </div>
      </section>

      <section className="adopt-progress-panel">
        <div className="trace-section-head"><b>这块农场现在怎么样</b><span>76%</span></div>
        <div className="progress"><span style={{ width: '76%' }} /></div>
        <div className="adopt-progress-meta">
          <span>已陪伴 72 天</span>
          <span>预计 18 天采收</span>
          <span>约 12 斤番茄</span>
        </div>
      </section>

      <section className="adopt-owner-card adopt-rights-card">
        <div className="trace-section-head"><b>认养后你会得到</b><span>一季权益</span></div>
        <div>
          <span>专属认养牌</span>
          <span>每周农场照片</span>
          <span>采收后寄到家</span>
          <span>坏果优先补发</span>
        </div>
      </section>

      <section className="adopt-photo-strip">
        <div className="trace-section-head"><b>农场相册</b><span>今日更新 3 张</span></div>
        <div>
          {farmPhotos.map((src) => <img src={src} alt="" key={src} />)}
        </div>
      </section>

      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>成长记录</b><span>农场主已更新</span></div>
        {growthLogs.map(([stage, time, desc]) => <TimelineItem key={stage} stage={stage} time={time} desc={desc} />)}
      </section>

      <section className="adopt-bottom-action">
        <div><span>一季认养</span><b>¥199</b></div>
        <button onClick={onConfirm}>确认认养</button>
      </section>
    </div>
  );
}

function AdoptConfirmPage({ onPay, notify }: { onPay: () => void; notify: (message: string) => void }) {
  const addresses = [
    { name: '张先生', phone: '138****6688', address: '云南省昆明市呈贡区耘露社区 18 栋 1201' },
    { name: '李女士', phone: '159****1122', address: '重庆市渝北区农业科技园 6 号' }
  ];
  const [selectedAddress, setSelectedAddress] = useState(addresses[0]);
  const [addressOpen, setAddressOpen] = useState(false);
  return (
    <div className="adopt-confirm-page">
      <section className="adopt-confirm-hero">
        <img src="/assets/farm/greenhouse.jpg" alt="" />
        <div>
          <span>寿光智慧大棚</span>
          <h2>番茄一季认养</h2>
          <p>采收后预计寄送约 12 斤番茄</p>
        </div>
      </section>
      <section className="adopt-confirm-card">
        <h3>认养权益</h3>
        {['专属认养牌', '每周成长照片', '采收后包邮到家', '坏果优先补发'].map((item) => (
          <p key={item}><CheckCircle2 size={16} /><span>{item}</span></p>
        ))}
      </section>
      <section className="adopt-confirm-card">
        <h3>收获寄送</h3>
        <button onClick={() => setAddressOpen(true)}><MapPin size={17} /><span>{selectedAddress.name} {selectedAddress.phone}<br />{selectedAddress.address}</span><ChevronRight size={16} /></button>
      </section>
      <section className="adopt-confirm-card adopt-pay-summary">
        <p><span>认养金额</span><b>¥199</b></p>
        <p><span>平台保障</span><b>免费</b></p>
        <p><span>实付</span><strong>¥199</strong></p>
      </section>
      <div className="adopt-confirm-bottom"><span>实付 <b>¥199</b></span><button onClick={onPay}>支付认养</button></div>
      {addressOpen && (
        <div className="address-sheet-mask" onClick={() => setAddressOpen(false)}>
          <section className="address-edit-sheet address-picker-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="trace-section-head"><b>选择收货地址</b><button onClick={() => setAddressOpen(false)}>关闭</button></div>
            {addresses.map((item) => (
              <button key={item.phone} className={`address-picker-row ${selectedAddress.phone === item.phone ? 'active' : ''}`} onClick={() => { setSelectedAddress(item); setAddressOpen(false); notify('收货地址已切换'); }}>
                <span><b>{item.name} {item.phone}</b><small>{item.address}</small></span>
                <CheckCircle2 size={18} />
              </button>
            ))}
            <button className="address-save-btn" onClick={() => notify('可在我的-地址管理新增地址')}>新增地址</button>
          </section>
        </div>
      )}
    </div>
  );
}

function AdoptSuccessPage({ onDetail, onHome }: { onDetail: () => void; onHome: () => void }) {
  return (
    <div className="adopt-success-page">
      <CheckCircle2 size={54} />
      <h2>认养成功</h2>
      <p>你的专属农场已建档，农场主将在每周同步成长照片。</p>
      <section>
        <span>专属编号</span><b>LY-ADOPT-0609</b>
        <span>预计采收</span><b>18 天后</b>
        <span>收获权益</span><b>约 12 斤番茄</b>
      </section>
      <div><button onClick={onHome}>回到首页</button><button className="primary" onClick={onDetail}>查看农场</button></div>
    </div>
  );
}

function TraceResultPage({ product, traceTimeline }: { product: Product; traceTimeline: TraceStep[] }) {
  return <div className="mp-trace-unavailable"><img src="/assets/miniprogram/farmer-icons/shield.png" alt=""/><h2>暂时没有可展示的批次记录</h2><p>“{product.name}”的溯源服务尚未开放。体验样板和本地目录不能证明真实产地、检测或物流情况。</p></div>;
  const tracedProduct = product;
  const traceCode = `LYYN-20260610-${String(product.id).padStart(2, '0')}`;
  const evidence = [
    ['采摘时间', '2026-06-09 08:10'],
    ['基地编号', `LYYN-${String(product.id).padStart(3, '0')}-20260609`],
    ['产地地址', `${product.origin}示范基地`],
    ['检测机构', '耘露质检中心'],
    ['区块链哈希', '0x8f29...A91C']
  ];
  const reports = ['农残检测：合格', '重金属检测：合格', '冷链温控：全程 2-6°C', '质检员：王师傅'];
  const timeline = traceTimeline.map((item, index) => index === 0
    ? { ...item, desc: `${product.origin}示范基地完成清晨采摘，进入初检环节。` }
    : item
  );

  return (
    <div className="trace-result-red trace-result-pro">
      <section className="trace-result-head">
        <CheckCircle2 />
        <h2>已通过官方验真</h2>
        <p>区块链存证 · 农残检测合格 · 批次未召回</p>
      </section>
      <section className="trace-result-product">
        <img src={tracedProduct.image} alt="" />
        <div>
          <h3>{tracedProduct.name} {tracedProduct.unit}</h3>
          <p>{tracedProduct.origin} · {tracedProduct.tag}</p>
          <span>溯源码 {traceCode}</span>
        </div>
      </section>
      <section className="trace-evidence-card">
        {evidence.map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}
      </section>
      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>检测结论</b><span>可放心购买</span></div>
        <div className="trace-report-badges">
          {reports.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>全链路记录</b><span>4 个节点</span></div>
        {timeline.map((item) => <TimelineItem key={item.stage} {...item} />)}
      </section>
    </div>
  );
}

function AiPanel({ onClose, onPage, pageMode = false, onCart }: { onClose: () => void; onPage: (page: ConsumerPage) => void; pageMode?: boolean; onCart?: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; action?: { label: string; page: ConsumerPage } }>>([
    { role: 'ai', text: '你好，我是小露。可以帮你推荐好农货、了解商品溯源，也可以查看订单和认养的入口。' }
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const quickPrompts: string[] = ['推荐几款当季蔬菜', '怎么看商品溯源？', '我的订单在哪里？'];
  const openPage = (page: ConsumerPage) => {
    onPage(page);
    onClose();
  };
  const sendMessage = async (text = draft.trim()) => {
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setIsThinking(true);
    try {
      const answer = await askAi(text, 'consumer');
      setMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '小露暂时无法回复，请稍后再试。你也可以先浏览商品图册或查看订单。' }]);
    } finally {
      setIsThinking(false);
    }
  };

  if (pageMode) return <div className="mp-ai-page">
    <header className="mp-ai-head"><button onClick={() => onPage('tabs')}><img src="/assets/miniprogram/sevenfresh/home.png" alt=""/></button><div><img src="/assets/miniprogram/sevenfresh/assistant.png" alt=""/><b>小露</b></div><button onClick={onCart}><img src="/assets/miniprogram/sevenfresh/cart.png" alt=""/></button></header>
    <main className="mp-ai-scroll"><section className="mp-ai-intro"><b>新鲜好农货</b><span>小露陪你找一份好食材</span><p>问我推荐好物、商品溯源，或直接说「看订单」「去认养」。</p></section><div className="mp-ai-service-note">商品查询与操作指引 · 智能对话已接入</div><div className="mp-ai-shortcuts"><button onClick={() => onPage('mall')}>浏览商品图册 ›</button><button onClick={() => onPage('adoptDetail')}>了解认养样板 ›</button><button onClick={() => onPage('orders')}>查看订单 ›</button></div></main>
    <footer className="mp-ai-compose"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="问我推荐好物、商品溯源…"/><button onClick={() => sendMessage()}>↑</button></footer>
  </div>;

  return (
    <div className="ai-overlay consumer-ai-overlay" onClick={onClose}>
      <section className="ai-panel consumer-ai-panel" onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header className="consumer-ai-head">
          <span className="consumer-ai-orb"><Bot size={18} /></span>
          <div><b>小露</b><small>选购 · 溯源 · 认养 · 售后</small></div>
          <button onClick={onClose}>×</button>
        </header>
        <div className="consumer-ai-body">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`consumer-ai-bubble ${item.role}`}>
              <span>{item.text}</span>
              {item.action && <button className="consumer-ai-action" onClick={() => openPage(item.action!.page)}>{item.action.label}</button>}
            </div>
          ))}
          {isThinking && <div className="consumer-ai-bubble ai thinking"><i /><i /><i /></div>}
        </div>
        <div className="consumer-ai-prompts">
          {quickPrompts.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}
        </div>
        <footer className="consumer-ai-input">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="问我推荐好物、商品溯源…" />
          <button onClick={() => sendMessage()}>发送</button>
        </footer>
      </section>
    </div>
  );
}

function FarmerFloatingAssistant({
  position,
  onMove,
  onOpen
}: {
  position: { x: number; y: number } | null;
  onMove: (position: { x: number; y: number }) => void;
  onOpen: () => void;
}) {
  const [drag, setDrag] = useState<null | { startX: number; startY: number; originX: number; originY: number; moved: boolean }>(null);
  const startDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    const frame = event.currentTarget.closest('.phone-frame') as HTMLElement | null;
    const frameRect = frame?.getBoundingClientRect();
    const rect = event.currentTarget.getBoundingClientRect();
    const originX = position?.x ?? (frameRect ? rect.left - frameRect.left : rect.left);
    const originY = position?.y ?? (frameRect ? rect.top - frameRect.top : rect.top);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ startX: event.clientX, startY: event.clientY, originX, originY, moved: false });
  };
  const moveDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const frame = event.currentTarget.closest('.phone-frame') as HTMLElement | null;
    const frameRect = frame?.getBoundingClientRect();
    const width = frameRect?.width ?? window.innerWidth;
    const height = frameRect?.height ?? window.innerHeight;
    const nextX = Math.min(Math.max(12, drag.originX + event.clientX - drag.startX), width - 78);
    const nextY = Math.min(Math.max(18, drag.originY + event.clientY - drag.startY), height - 98);
    const moved = drag.moved || Math.abs(event.clientX - drag.startX) > 5 || Math.abs(event.clientY - drag.startY) > 5;
    setDrag({ ...drag, moved });
    onMove({ x: nextX, y: nextY });
  };
  const endDrag = (event: import('react').PointerEvent<HTMLButtonElement>) => {
    const wasMoved = drag?.moved;
    setDrag(null);
    if (!wasMoved) onOpen();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  };

  return (
    <button
      className={`farmer-super-ai-float ${drag ? 'dragging' : ''}`}
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => setDrag(null)}
      aria-label="小露农事AI"
    >
      <img className="lulu-avatar" src="/assets/miniprogram/ui-v2/ai-lulu.png" alt="露露" />
    </button>
  );
}

function FarmerAiPanel({ onClose, onPage }: { onClose: () => void; onPage: (page: FarmerPage) => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; action?: { label: string; page: FarmerPage } }>>([
    { role: 'ai', text: '你好，我是小露农事助手。关于种植、病虫害、施肥浇水、天气预报都可以问我，我会给你实用的建议。' }
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isVoice, setIsVoice] = useState(false);
  const openPage = (page: FarmerPage) => {
    onPage(page);
    onClose();
  };
  const quickPrompts = [
    '今天怎么管棚？',
    '叶片异常怎么办？',
    '现在适合浇水吗？'
  ];
  const sendMessage = async (text = draft.trim()) => {
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setIsThinking(true);
    try {
      const answer = await askAi(text, 'farmer');
      setMessages((prev) => [...prev, { role: 'ai', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '农事助手暂时无法回复，请稍后再试。你也可以浏览农事日历、环境监测或联系农技专家。' }]);
    } finally {
      setIsThinking(false);
    }
  };
  return (
    <div className="ai-overlay farmer-ai-overlay" onClick={onClose}>
      <section className="farmer-chat-panel" onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header className="farmer-chat-head">
          <img className="lulu-avatar mini" src="/assets/miniprogram/ui-v2/ai-lulu.png" alt="露露" />
          <div><b>小露</b><small><i /> 农事智能助手在线</small></div>
          <button onClick={onClose}>×</button>
        </header>
        <div className="farmer-chat-body">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`farmer-chat-bubble ${item.role}`}>
              <span>{item.text}</span>
              {item.action && <button className="farmer-chat-action" onClick={() => openPage(item.action!.page)}>{item.action.label}</button>}
            </div>
          ))}
          {isThinking && <div className="farmer-chat-bubble ai thinking"><i /><i /><i /></div>}
        </div>
        <div className="farmer-chat-prompts">
          {quickPrompts.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}
        </div>
        <footer className="farmer-chat-input">
          <button className={isVoice ? 'recording' : ''} onClick={() => setIsVoice((value) => !value)} aria-label="语音输入"><span className="voice-glyph"><i /><i /><i /></span></button>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="问我农事、病虫害、设备、天气..." />
          <button className={`send ${draft.trim() ? 'active' : ''}`} onClick={() => sendMessage()}>发送</button>
        </footer>
        {isVoice && (
          <div className="farmer-voice-hint">
            <div className="super-ai-wave"><i /><i /><i /><i /><i /></div>
            <span>正在听，请说：番茄叶片有斑点怎么办？</span>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h3>{title}</h3>{action && <button onClick={onAction}>{action}</button>}</div>;
}

const productImageFallbacks: Record<CategoryId, string> = {
  all: '/assets/products/market/produce-table.jpg',
  veg: '/assets/catalog/shouguang-greenhouse.jpg',
  fruit: '/assets/products/market/apple-box.jpg',
  grain: '/assets/products/market/rice-white.jpg',
  meat: '/assets/products/market/farm-eggs.jpg',
  local: '/assets/products/market/green-tea-loose.jpg',
  seafood: '/assets/products/market/tomato.jpg',
};

function ProductImage({ item, className }: { item: Product; className?: string }) {
  const fallback = productImageFallbacks[item.category] || productImageFallbacks.all;
  return (
    <img
      className={className}
      src={item.image || fallback}
      alt={item.name}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src.endsWith(fallback)) return;
        image.src = fallback;
      }}
    />
  );
}

function ProductMini({ item, onClick }: { item: Product; onClick?: () => void }) {
  return (
    <article className="product-mini" onClick={onClick}>
      <ProductImage item={item} />
      <b>{item.name}</b>
      <span>¥{item.price}</span>
    </article>
  );
}

function ProductCard({ item, onClick }: { item: Product; onClick?: () => void }) {
  return (
    <article className="product-card" onClick={onClick}>
      <ProductImage item={item} />
      <h3>{item.name} {item.unit}</h3>
      <p>百亿农补 · {item.tag}</p>
      <div className="price-row">
        <strong><em>¥</em>{item.price}</strong>
        <del>¥{item.originalPrice}</del>
      </div>
      <div className="sales-row">
        <span>{item.sales}人已拼</span>
        <button>去拼单</button>
      </div>
      <div className="product-trust-tags"><span>官方溯源</span><span>坏果包赔</span></div>
    </article>
  );
}

function TimelineItem({ stage, time, desc }: { stage: string; time: string; desc: string }) {
  return <div className="timeline-item"><i /><div><b>{stage}</b><time>{time}</time><p>{desc}</p></div></div>;
}

function TaskRow({ name, time, type, done }: { name: string; time: string; type: string; done: boolean }) {
  return <div className={`task-row ${done ? 'done' : ''}`}><CheckCircle2 /><div><b>{name}</b><span>{time} · {type}</span></div></div>;
}
