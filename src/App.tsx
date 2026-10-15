import { Component, useEffect, useMemo, useRef, useState } from 'react';
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
  Star,
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
  createAddress,
  createOrder,
  deleteAddress,
  fetchAddresses,
  fetchCart,
  fetchCurrentUser,
  fetchOrders,
  getStoredSession,
  loginWithSms,
  isMockLoginEnabled,
  removeCartItem as removeCartItemApi,
  sendLoginCode,
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
} from './api';

type Screen = 'splash' | 'identity' | 'login' | 'consumer' | 'farmer';
type ConsumerPage = 'tabs' | 'mall' | 'trace' | 'productDetail' | 'cart' | 'checkout' | 'paySuccess' | 'orders' | 'orderDetail' | 'address' | 'messages' | 'service' | 'settings' | 'privacy' | 'adoptDetail' | 'adoptConfirm' | 'adoptSuccess' | 'traceResult';
type FarmerPage = 'tabs' | 'myCrops' | 'cropDetail' | 'warningCenter' | 'adoptionCenter' | 'myDevice' | 'techSupport' | 'weatherDetail' | 'voiceAssistant' | 'locationMap' | 'community' | 'farmerSettings' | 'farmerOrders' | 'farmerOrderDetail';
type CartItem = { cartId?: number; product: Product; quantity: number; spec: string };

const consumerTabs: Array<{ id: ConsumerTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'adopt', label: '云认养', icon: Sprout },
  { id: 'assistant', label: 'AI 小满', icon: Bot },
  { id: 'cart', label: '购物车', icon: ShoppingCart },
  { id: 'my', label: '我的', icon: UserRound }
];

const farmerTabs: Array<{ id: FarmerTab; label: string; icon: typeof Home }> = [
  { id: 'environment', label: '环境', icon: CloudSun },
  { id: 'shop', label: '店铺', icon: Store },
  { id: 'farmHome', label: '首页', icon: Home },
  { id: 'farming', label: '农事', icon: CalendarDays },
  { id: 'farmerMy', label: '我的', icon: UserRound }
];

const consumerHomeStyle: 'current' | 'hema' = 'current';
const appName = '小满合';
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
  id: 0, name: '加载中...', origin: '', category: 'local' as CategoryId, category_id: 6,
  category_name: '', unit: '', image: '', tag: '', price: 0, originalPrice: 0,
  sales: '0', description: '',
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
  const [category, setCategory] = useState<CategoryId>('all');
  const [showAi, setShowAi] = useState(false);

  // ---- API 数据 ----
  const [products, setProducts] = useState<Product[]>([]);
  const [appCategories, setAppCategories] = useState<AppCategory[]>(APP_CATEGORIES);
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
        const [productResult, categoryResult, b, adoptionResult, po, ta] = await Promise.all([
          fetchProductData().catch((error) => {
            console.error('[PRODUCT API ERROR]', error);
            setProductError(String(error));
            return { value: [], source: 'unavailable' as ApiDataSource, fallbackReason: '商品数据加载失败' };
          }), fetchMobileCategories(), fetchBanners(), fetchAdoptionPackageData(),
          fetchPosts(), fetchTasks(),
        ]);
        setProducts(productResult.value);
        setProductSource(productResult.source);
        setProductError(productResult.fallbackReason || '');
        setAppCategories(categoryResult.value);
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
  const checkout = () => {
    if (!selectedAddress) {
      notify('请先新增并选择收货地址');
      setConsumerPage('address');
      return;
    }
    setConsumerPage('checkout');
  };

  const filteredProducts = useMemo(
    () => (category === 'all' ? products : products.filter((item) => item.category === category)),
    [category, products]
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

  const updateCartQuantity = async (productId: number, spec: string, nextQuantity: number) => {
    const item = cartItems.find((row) => row.product.id === productId && row.spec === spec);
    if (!item?.cartId) return notify('购物车数据尚未同步');
    try {
      await updateCartItem(item.cartId, Math.max(0, nextQuantity));
      await loadTradeData();
    } catch (error) {
      notify(error instanceof Error ? error.message : '购物车更新失败');
    }
  };

  const removeCartItem = async (productId: number, spec: string) => {
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
            {consumerPage === 'tabs' && consumerTab === 'home' && <ConsumerHome onTab={navigateConsumerTab} notify={notify} onProduct={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }} products={products} source={productSource} loading={dataLoading} error={productError} />}
            {consumerPage === 'tabs' && consumerTab === 'mall' && <Mall category={category} setCategory={setCategory} categories={appCategories} products={filteredProducts} productError={productError} source={productSource} categorySource={categorySource} canPurchase={productSource === 'real'} notify={notify} onAddCart={async (item) => { try { await addCartItem(item.id); await loadTradeData(); notify('已加入购物车'); } catch (error) { notify(error instanceof Error ? error.message : '加入购物车失败'); } }} onProduct={(item) => { setSelectedProduct(item); setConsumerPage('productDetail'); }} />}
            {consumerPage === 'tabs' && consumerTab === 'trace' && <Trace onResult={() => setConsumerPage('traceResult')} notify={notify} traceTimeline={traceTimeline} safeProduct={safeProduct} onTraceResult={(result) => { setTraceTimeline(result.events); }} />}
            {consumerPage === 'tabs' && consumerTab === 'adopt' && <AdoptV2 onDetail={() => setConsumerPage('adoptDetail')} notify={notify} projects={adopts} source={adoptionSource} />}
            {consumerPage === 'tabs' && consumerTab === 'assistant' && <AiPanel pageMode onClose={() => setConsumerTab('home')} onCart={openConsumerCart} onPage={setConsumerPage} />}
            {consumerPage === 'tabs' && consumerTab === 'cart' && <div className="consumer-cart-tab"><div className="consumer-tab-title">购物车</div><CartPage cartItems={cartItems} onCheckout={checkout} onShop={() => setConsumerTab('home')} onUpdateQuantity={updateCartQuantity} onRemove={removeCartItem} /></div>}
            {consumerPage === 'tabs' && consumerTab === 'my' && <Profile role="consumer" onSwitch={openRoleSwitchConfirm} onOpenConsumerPage={setConsumerPage} onLogin={() => setScreen('login')} loggedIn={Boolean(session)} safeProduct={safeProduct} />}
            {consumerPage !== 'tabs' && (
              <ConsumerSubPage
                page={consumerPage}
                product={selectedProduct}
                cartItems={cartItems}
                safeProduct={safeProduct}
                traceTimeline={traceTimeline}
                products={filteredProducts}
                categories={appCategories}
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
                    const order = nextOrders.find((item) => item.id === created.orderId) || null;
                    setActiveOrder(order);
                    setConsumerPage(order ? 'orderDetail' : 'orders');
                    notify('订单已提交，付款与配送状态以实际服务信息为准');
                  } catch (error) {
                    notify(error instanceof Error ? error.message : '订单提交失败');
                  }
                }}
                notify={notify}
                onLogout={logoutConsumer}
                onIdentity={openRoleSwitchConfirm}
                onLogin={() => setScreen('login')}
                loggedIn={Boolean(session)}
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
            {farmerPage === 'tabs' && farmerTab === 'environment' && <EnvironmentMP onPage={setFarmerPage} />}
            {farmerPage === 'tabs' && farmerTab === 'farmerMy' && <Profile role="farmer" onSwitch={openRoleSwitchConfirm} onOpenFarmerPage={setFarmerPage} safeProduct={safeProduct} />}
            {farmerPage !== 'tabs' && <FarmerSubPageMP page={farmerPage} onBack={() => setFarmerPage('tabs')} onPage={setFarmerPage} />}
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
        <div className="role-switch-icon">{targetRole === 'farmer' ? '🌾' : '🛒'}</div>
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
        <img className="brand-logo" src="/assets/logo.png" alt={appName} />
        <h1>{appName}</h1>
        <p>让农业更智慧，让生活更美好</p>
        <div className="loading-track"><span style={{ width: `${progress}%` }} /></div>
        <small>{progress < 100 ? '正在准备小满合...' : '准备进入'}</small>
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
      <img className="brand-logo sm" src="/assets/logo.png" alt="" />
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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [loginHint, setLoginHint] = useState('');

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      setLoginHint('请输入正确的 11 位手机号');
      return;
    }
    try {
      const result = await sendLoginCode(phone);
      setCountdown(60);
      setLoginHint(result.debugCode ? `验证码已发送，开发测试码：${result.debugCode}` : '验证码已发送，请查收短信');
    } catch (error) {
      setLoginHint(error instanceof Error ? error.message : '验证码发送失败');
    }
  };

  const submit = async (method: 'code' | 'wechat' | 'alipay' = 'code') => {
    if (submitting) return;
    if (!agreed) {
      setLoginHint('请先阅读并同意服务协议');
      return;
    }
    if (method === 'code' && !isMockLoginEnabled && (!/^1\d{10}$/.test(phone) || code.trim().length < 4)) {
      setLoginHint('请输入手机号和验证码');
      return;
    }
    setSubmitting(true);
    if (method !== 'code') {
      setSubmitting(false);
      setLoginHint('当前交易链路仅开放短信登录');
      return;
    }
    setLoginHint('正在校验验证码...');
    try {
      await loginWithSms(phone || '13800000000', code.trim() || '0000', role);
      onDone();
    } catch (error) {
      setLoginHint(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="login page-full">
      <button className="ghost-back" onClick={onBack}><ChevronLeft size={18} />返回</button>
      <h2>{role === 'consumer' ? '欢迎回来，消费者' : '欢迎回来，农户朋友'}</h2>
      <p className="muted">登录{appName}，开启智慧农业新体验</p>
      <div className="form-card">
        <label>手机号<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="请输入手机号" inputMode="numeric" /></label>
        <label className="code-row">验证码<span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入验证码" inputMode="numeric" /><button onClick={sendCode}>{countdown ? `${countdown}s` : '获取验证码'}</button></span></label>
        <button className={`primary-btn wide ${submitting ? 'loading' : ''}`} onClick={() => submit()}>{submitting ? '正在进入...' : '一键登录'}</button>
        <button className={`agreement ${agreed ? 'checked' : ''}`} onClick={() => setAgreed((value) => !value)}><i />已阅读并同意《隐私服务协议》《用户服务协议》</button>
        {loginHint && <p className="login-hint">{loginHint}</p>}
        <p className="login-hint">{isMockLoginEnabled ? '本地测试包：同意协议后可直接进入，无需真实验证码' : '当前仅开通短信验证码登录'}</p>
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

function ConsumerHome({ onTab, onProduct, notify, products, source, loading, error }: { onTab: (tab: ConsumerTab) => void; onProduct: (item: Product) => void; notify: (message: string) => void; products: Product[]; source: ApiDataSource; loading: boolean; error: string }) {
  const [keyword, setKeyword] = useState('');
  const catalogOnly = source !== 'real';
  const displayed = products.slice(0, 8);
  const categories = [
    { label: '时令鲜蔬', icon: 'leaf.png' }, { label: '当季水果', icon: 'sun.png' },
    { label: '粮油主食', icon: 'bag.png' }, { label: '地方农货', icon: 'pin.png' },
    { label: '走进农场', icon: 'home.png' }, { label: '生长日记', icon: 'camera.png' },
    { label: '商品图册', icon: 'mall.png' }, { label: '我的关注', icon: 'heart.png' }
  ];
  return <div className="mp-consumer-home">
    <header className="mp-home-head">
      <div className="mp-home-nav"><button onClick={() => notify('地区服务暂未接入')}><img src="/assets/miniprogram/farmer-icons/pin.png" alt=""/>选择收货地区⌄</button><button onClick={() => notify('消息服务暂未接入')}><img src="/assets/miniprogram/farmer-icons/chat.png" alt=""/>消息</button></div>
      <form className="mp-home-search" onSubmit={(event) => { event.preventDefault(); onTab('mall'); }}><Search size={17}/><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索商品、产地"/><button>搜索</button></form>
    </header>
    <div className="mp-home-body">
      <button className="mp-seasonal-hero" onClick={() => onTab('mall')}><img src="/assets/miniprogram/hero-farm.jpg" alt=""/><span className="mp-hero-shade"/><span className="mp-hero-copy"><small>小满合</small><b>把新鲜带回家</b><i>发现土地里的好味道</i><em>逛逛当季农货 ›</em></span></button>
      <section className="mp-category-grid">{categories.map((item, index) => <button key={item.label} onClick={() => index === 4 || index === 5 || index === 7 ? onTab('adopt') : onTab('mall')}><span><img src={`/assets/miniprogram/farmer-icons/${item.icon}`} alt=""/></span><b>{item.label}</b></button>)}</section>
      {error && <div className="mp-catalogue-note">商品加载失败：{error} <button onClick={() => window.location.reload()}>重试</button></div>}
      {products.length > 0 && <section className="mp-home-zones"><div className="mp-section-heading"><b>当季农货</b><button onClick={() => onTab('mall')}>查看分类 ›</button></div><div className="mp-zone-products">{products.slice(0, 3).map((item) => <button key={item.id} onClick={() => onProduct(item)}><img src={item.image} alt=""/><b>{item.name}</b><small>{item.origin || '产地信息待补充'}</small>{!catalogOnly && item.price > 0 ? <strong>¥{item.price}</strong> : <em>待上架</em>}</button>)}</div></section>}
      {catalogOnly && <p className="mp-catalogue-note">商品资料预览 · 交易服务尚未接入</p>}
      <section className="mp-products-section"><div className="mp-section-heading"><b>发现好农货</b><span>{catalogOnly ? '图册预览' : '商品'}</span></div>{loading ? <div className="mp-loading">正在加载商品…</div> : displayed.length ? <div className="mp-goods-grid">{displayed.map((item) => <button className="mp-goods-card" key={item.id} onClick={() => onProduct(item)}><span className="mp-goods-photo"><img src={item.image} alt=""/>{catalogOnly && <i>待上架</i>}</span><b>{item.name}</b><small>{item.origin || '产地待确认'}{item.unit ? ` · ${item.unit}` : ''}</small><div>{catalogOnly || !item.price ? <em>待上架</em> : <strong>¥{item.price}</strong>}<span>›</span></div></button>)}</div> : <div className="mp-empty"><img src="/assets/miniprogram/farmer-icons/bag.png" alt=""/><b>还没有在售商品</b><span>商品上架后，会在这里展示</span></div>}</section>
      <button className="mp-home-end" onClick={() => onTab('mall')}>去分类发现更多农货 ›</button>
    </div>
  </div>;
}

function DataSourceBadge({ source, compact = false }: { source: ApiDataSource; compact?: boolean }) {
  const copy = source === 'real' ? '后台实时数据' : source === 'fallback' ? '兼容数据' : '暂未接入';
  return <span className={`data-source-badge ${source} ${compact ? 'compact' : ''}`} title={source === 'real' ? '来自后台 4.0 移动端接口' : '当前不是后台 4.0 实时数据'}>{copy}</span>;
}

function Mall({ category, setCategory, categories, products: list, productError, source, categorySource, canPurchase = source === 'real', onProduct, onAddCart, notify }: { category: CategoryId; setCategory: (v: CategoryId) => void; categories: AppCategory[]; products: Product[]; productError: string; source: ApiDataSource; categorySource: ApiDataSource; canPurchase?: boolean; onProduct: (item: Product) => void; onAddCart: (item: Product) => Promise<void> | void; notify: (message: string) => void }) {
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'default' | 'sales' | 'price'>('default');
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceBand, setPriceBand] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [onlyTrace, setOnlyTrace] = useState(false);
  const categoryTone: Record<string, { title: string; sub: string; image: string; color: string }> = {
    all: { title: '发现当季农货', sub: '商品资料与上架状态以服务端为准', image: '/assets/products/market/produce-table.jpg', color: '#5e8f3d' },
    veg: { title: '时令蔬菜', sub: '浏览商品资料', image: '/assets/catalog/shouguang-greenhouse.jpg', color: '#4f9b45' },
    fruit: { title: '果园直发甜鲜', sub: '当季水果 精选大果', image: '/assets/products/market/strawberry-basket.jpg', color: '#75933e' },
    grain: { title: '好米好油主粮', sub: '新米粮油 产区严选', image: '/assets/farm/rice-field.jpg', color: '#a88736' },
    meat: { title: '肉蛋鲜配专区', sub: '散养鲜蛋 冷链到家', image: '/assets/products/market/farm-eggs.jpg', color: '#8f7446' },
    local: { title: '地方特产优选', sub: '山珍茶礼 原产地发货', image: '/assets/products/market/green-tea-loose.jpg', color: '#668a4a' },
    seafood: { title: '水产海鲜鲜配', sub: '江河湖海 鲜活到家', image: '/assets/products/market/tomato.jpg', color: '#4a7a8a' },
  };
  const activeTone = categoryTone[category] || categoryTone.all;
  const saleScore = (sales: string) => {
    const value = Number.parseFloat(sales);
    return sales.includes('万') ? value * 10000 : value;
  };
  const visibleList = useMemo(() => {
    let result = list.filter((item) => `${item.name}${item.origin}${item.tag}`.includes(keyword.trim()));
    if (canPurchase && priceBand === 'low') result = result.filter((item) => item.price < 30);
    if (canPurchase && priceBand === 'mid') result = result.filter((item) => item.price >= 30 && item.price < 70);
    if (canPurchase && priceBand === 'high') result = result.filter((item) => item.price >= 70);
    if (canPurchase && onlyTrace) result = result.filter((item) => item.tag || item.origin);
    if (canPurchase && sort === 'sales') result = [...result].sort((a, b) => saleScore(b.sales) - saleScore(a.sales));
    if (canPurchase && sort === 'price') result = [...result].sort((a, b) => a.price - b.price);
    return result;
  }, [canPurchase, keyword, list, onlyTrace, priceBand, sort]);
  const clearFilter = () => {
    setKeyword('');
    setSort('default');
    setPriceBand('all');
    setOnlyTrace(false);
  };

  return (
    <div className="mall-market-page">
      <section className="market-search-head">
        <div className="market-search-box">
          <Search size={17} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索番茄、鸡蛋、五常大米" />
        </div>
        <button className="market-filter-btn" onClick={() => setFilterOpen(true)}>筛选</button>
      </section>

      <section className="market-category-strip">
        {categories.map((item) => (
          <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>
            <span style={{ backgroundImage: `url(${categoryTone[item.id]?.image || categoryTone.all.image})` }} />
            <b>{item.name}</b>
          </button>
        ))}
      </section>

      <section className="market-promo-band" style={{ backgroundImage: `linear-gradient(90deg, ${activeTone.color}, rgba(17, 38, 32, 0.82)), url(${activeTone.image})` }}>
        <div>
          <span>基地严选</span>
          <b>{activeTone.title}</b>
          <p>{activeTone.sub}</p>
        </div>
        <button onClick={() => notify(canPurchase ? '分类已更新' : '商品资料预览，交易服务尚未接入')}>{canPurchase ? '查看商品' : '商品图册'}</button>
      </section>

      <div className="market-body">
        <aside className="market-side-rail">
          {categories.map((item) => (
            <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>
              {item.name}
            </button>
          ))}
        </aside>

        <section className="market-shelf">
          <div className="market-sort-row">
            <button className={sort === 'default' ? 'active' : ''} onClick={() => setSort('default')}>综合</button>
            <button className={sort === 'sales' ? 'active' : ''} disabled={!canPurchase} onClick={() => setSort('sales')}>销量</button>
            <button className={sort === 'price' ? 'active' : ''} disabled={!canPurchase} onClick={() => setSort('price')}>价格</button>
            <button className={filterOpen ? 'active' : ''} onClick={() => setFilterOpen(true)}>更多</button>
          </div>
          <div className="mall-filter-tags">
            {keyword && <span>搜索：{keyword}</span>}
            {priceBand !== 'all' && <span>{priceBand === 'low' ? '30元以下' : priceBand === 'mid' ? '30-70元' : '70元以上'}</span>}
            {onlyTrace && <span>官方溯源</span>}
            {(keyword || priceBand !== 'all' || onlyTrace || sort !== 'default') && <button onClick={clearFilter}>清除</button>}
          </div>
          <div className="market-shelf-head">
            <div>
              <b>{activeTone.title}</b>
              <span>共 {visibleList.length} 种农产品</span>
            </div>
            <div className="market-data-status"><DataSourceBadge source={source} compact /><small>{canPurchase ? '上架商品' : '仅图册预览'}</small></div>
          </div>
          {categorySource !== 'real' && <p className="data-source-hint">分类为{categorySource === 'fallback' ? '兼容' : '本地'}展示，后台分类恢复后将自动同步。</p>}
          {productError ? (
            <section className="market-empty">
              <PackageSearch size={34} />
              <b>商品接口异常</b>
              <span>{productError}</span>
              <button onClick={clearFilter}>清除筛选</button>
            </section>
          ) : visibleList.length ? (
            <div className="market-product-list">
              {visibleList.map((item) => (
                <article key={item.id} className="market-product-row" onClick={() => onProduct(item)}>
                  <div className="market-product-img">
                    <ProductImage item={item} />
                    <span>{item.tag}</span>
                  </div>
                  <div className="market-product-info">
                    <b>{item.name} {item.unit}</b>
                    <p>{item.origin} · {item.tag}</p>
                    <div className="market-tags">{canPurchase ? <span>可购买</span> : <span>待上架 · 商品资料预览</span>}</div>
                    <div className="market-price-line">
                      <div>
                        {canPurchase && item.price > 0 ? <strong>¥{item.price}</strong> : <strong>待上架</strong>}
                      </div>
                      {canPurchase && <button onClick={(event) => { event.stopPropagation(); void onAddCart(item); }} aria-label={`加入购物车：${item.name}`}>+</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="market-empty">
              <PackageSearch size={34} />
              <b>没找到合适商品</b>
              <span>换个关键词或清除筛选试试</span>
              <button onClick={clearFilter}>清除筛选</button>
            </section>
          )}
        </section>
      </div>
      {filterOpen && (
        <div className="mall-filter-overlay" onClick={() => setFilterOpen(false)}>
          <section className="mall-filter-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="trace-section-head"><b>筛选商品</b><button onClick={() => setFilterOpen(false)}>完成</button></div>
            <h3>价格区间</h3>
            <div className="filter-chip-grid">
              {[
                ['all', '不限'],
                ['low', '30元以下'],
                ['mid', '30-70元'],
                ['high', '70元以上']
              ].map(([id, label]) => <button key={id} className={priceBand === id ? 'active' : ''} onClick={() => setPriceBand(id as typeof priceBand)}>{label}</button>)}
            </div>
            <h3>品质服务</h3>
            <button className={`filter-check-row ${onlyTrace ? 'active' : ''}`} onClick={() => setOnlyTrace((value) => !value)}>
              <span>只看支持官方溯源</span>
              <CheckCircle2 size={18} />
            </button>
            <div className="filter-sheet-actions"><button onClick={clearFilter}>重置</button><button className="primary" onClick={() => setFilterOpen(false)}>查看结果</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function Trace({ onResult, notify, traceTimeline, safeProduct, onTraceResult }: { onResult: () => void; notify: (message: string) => void; traceTimeline: TraceStep[]; safeProduct: (idx: number) => Product; onTraceResult: (result: { events: TraceStep[] }) => void }) {
  return <div className="mp-trace-unavailable"><img src="/assets/miniprogram/farmer-icons/shield.png" alt=""/><h2>产品溯源</h2><p>溯源服务尚未开放。当前商品资料和页面样板不代表真实批次、检测或交易记录。</p><span>服务开通后，可在商品详情查看对应批次信息。</span></div>;
  const [traceCode, setTraceCode] = useState('XMHT-0003-0609');
  const [querying, setQuerying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [querySource, setQuerySource] = useState<ApiDataSource>('unavailable');
  const [queryError, setQueryError] = useState('请输入批次号后查询后台 4.0 溯源记录');
  const [queriedEvents, setQueriedEvents] = useState<TraceStep[]>([]);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const traceProducts = [safeProduct(2), safeProduct(0), safeProduct(1), safeProduct(3), safeProduct(4)].filter(Boolean);
  const [selectedTraceId, setSelectedTraceId] = useState(traceProducts[0].id);
  const traceProduct = traceProducts.find((item) => item.id === selectedTraceId) || traceProducts[0];
  const traceCodeForProduct = `XMHT-${String(traceProduct.id).padStart(4, '0')}-0609`;
  const traceProductProfiles: Record<string, { subtitle: string; method: string; harvestDate: string; base: string; heroImage: string; flowImages: string[] }> = {
    veg: {
      subtitle: '基地鲜采 · 当日分拣 · 安心到家',
      method: '绿色种植',
      harvestDate: '2026.06.09',
      base: `${traceProduct.origin}小满合蔬菜基地`,
      heroImage: traceProduct.image,
      flowImages: ['/assets/farm/tomato-harvest.jpg', traceProduct.image, '/assets/products/market/vegetable-mix.jpg', '/assets/products/market/produce-table.jpg']
    },
    fruit: {
      subtitle: '自然成熟 · 分级精选 · 鲜甜多汁',
      method: '生态果园',
      harvestDate: '2026.06.09',
      base: `${traceProduct.origin}小满合果园基地`,
      heroImage: traceProduct.image,
      flowImages: ['/assets/products/market/apple-red.jpg', '/assets/products/market/apple-green.jpg', '/assets/products/market/apple-box.jpg', '/assets/products/market/produce-table.jpg']
    },
    grain: {
      subtitle: '源头直供 · 新米现碾 · 批次可查',
      method: '标准化种植',
      harvestDate: '2026.06.02',
      base: `${traceProduct.origin}小满合粮食基地`,
      heroImage: traceProduct.image,
      flowImages: ['/assets/farm/rice-field.jpg', traceProduct.image, '/assets/products/market/rice-scoop.jpg', '/assets/products/market/rice-white.jpg']
    },
    meat: {
      subtitle: '谷物散养 · 新鲜分拣 · 冷链到家',
      method: '谷物散养',
      harvestDate: '2026.06.09',
      base: `${traceProduct.origin}小满合养殖基地`,
      heroImage: traceProduct.image,
      flowImages: [traceProduct.image, '/assets/products/market/eggs.jpg', '/assets/products/market/farm-eggs.jpg', '/assets/products/market/produce-table.jpg']
    },
    local: {
      subtitle: '产区精选 · 匠心加工 · 品质可验',
      method: '产区精选',
      harvestDate: '2026.06.06',
      base: `${traceProduct.origin}小满合优选基地`,
      heroImage: traceProduct.image,
      flowImages: [traceProduct.image, '/assets/products/market/green-tea-loose.jpg', '/assets/products/market/puer-tea-cake.jpg', '/assets/products/market/produce-table.jpg']
    }
  };
  const traceProfile = traceProductProfiles[traceProduct.category] || traceProductProfiles.veg;
  const traceEvidence = [
    { title: '产地实拍', desc: `${traceProduct.origin}示范基地清晨采收`, image: '/assets/farm/greenhouse.jpg', action: '基地采收记录' },
    { title: '快检报告', desc: '农残、重金属检测均合格', image: traceProduct.image, action: '农残快检报告' },
    { title: '冷链温控', desc: '运输全程稳定 2-6°C', image: '/assets/banners/banner1.jpg', action: '冷链温控曲线' }
  ];
  const traceMetrics = [
    ['农残检测', '合格', '0.00mg/kg'],
    ['冷链温度', '4.2°C', '全程达标'],
    ['区块链存证', '7节点', '不可篡改'],
    ['质检评分', '98.6', '优选批次']
  ];
  const traceReports = ['农残快检报告', '基地采收记录', '冷链温控曲线'];
  const traceTimelineForProduct = (queriedEvents.length ? queriedEvents : traceTimeline).map((item, index) => index === 0
    ? { ...item, desc: `${traceProduct.origin}示范基地完成清晨采摘，进入初检环节。` }
    : item
  );
  const reportDetails: Record<string, { title: string; subtitle: string; conclusion: string; rows: Array<[string, string]>; chips: string[]; visual: 'test' | 'harvest' | 'cold' }> = {
    '农残快检报告': {
      title: '农残快检报告',
      subtitle: '小满合质检中心 · 报告编号 LY-QC-0609',
      conclusion: '未检出高风险农残，符合平台优选标准。',
      rows: [
        ['检测时间', '2026-06-09 10:35'],
        ['检测项目', '有机磷 / 菊酯类 / 多菌灵'],
        ['检测结果', '合格'],
        ['质检员', '王师傅']
      ],
      chips: ['农残合格', '批次未召回', '支持复核'],
      visual: 'test'
    },
    '基地采收记录': {
      title: '基地采收记录',
      subtitle: '山东烟台示范基地 · 批次 LYYN-20260609',
      conclusion: '本批次为清晨采收，采后 2 小时内完成分级装箱。',
      rows: [
        ['采收时间', '2026-06-09 08:10'],
        ['采收基地', '山东烟台优选果园'],
        ['成熟度', '自然成熟'],
        ['装箱方式', '产地分级装箱']
      ],
      chips: ['产地真实', '清晨采收', '源头直发'],
      visual: 'harvest'
    },
    '冷链温控曲线': {
      title: '冷链温控曲线',
      subtitle: '运输温控记录 · 全程 2-6°C',
      conclusion: '运输温度稳定，无长时间异常升温记录。',
      rows: [
        ['出库温度', '4.2°C'],
        ['运输均温', '4.8°C'],
        ['异常记录', '0 次'],
        ['预计送达', '48 小时内']
      ],
      chips: ['温控正常', '冷链记录完整', '即将派送'],
      visual: 'cold'
    }
  };

  const submitTrace = async () => {
    if (!traceCode.trim()) {
      notify('请输入溯源码或扫描商品二维码');
      return;
    }
    setVerified(false);
    setQuerying(true);
    setQueryError('正在核验产地、检测与冷链记录');
    try {
      const result = await queryTrace(traceCode.trim());
      setQuerySource(result.source);
      setQueriedEvents(result.events);
      onTraceResult(result);
      if (result.source !== 'real' || !result.record) {
        setQueryError(result.fallbackReason || '未找到该批次的后台验真记录');
        notify(result.fallbackReason || '未找到可验证的批次记录');
        return;
      }
      setVerified(true);
      setQueryError('该批次已通过后台 4.0 官方验真');
      notify('验真通过，已加载本批次真实记录');
    } catch (error) {
      setQuerySource('unavailable');
      setQueryError(error instanceof Error ? error.message : '溯源查询失败，请稍后重试');
      notify('溯源查询失败，请稍后重试');
    } finally {
      setQuerying(false);
    }
  };

  const referenceTraceFlow = [
    { title: '基地采收', desc: '人工采摘 · 自然成熟', time: '2026.06.09 06:30', image: traceProfile.flowImages[0], tag: '农残合格', sub: '检测合格' },
    { title: '品质检测', desc: '多项检测 · 严控品质', time: '2026.06.09 09:15', image: traceProfile.flowImages[1], tag: '农残合格', sub: '检测报告' },
    { title: '冷链配送', desc: '全程冷链 · 新鲜直达', time: '2026.06.09 14:40', image: traceProfile.flowImages[2], tag: '冷链达标', sub: '温度记录' },
    { title: '到达门店/用户', desc: '新鲜送达 · 请尽快享用', time: '2026.06.09 18:10', image: traceProfile.flowImages[3], tag: '区块链存证', sub: '查看凭证' }
  ];
  const activeReportDetail = activeReport ? reportDetails[activeReport as string] : null;

  return (
    <div className="trace-clone-page">
      <section className="trace-product-picker">
        <div><b>选择溯源商品</b><span>切换商品查看对应批次信息</span></div>
        <div className="trace-product-scroll">
          {traceProducts.map((item) => (
            <button key={item.id} className={item.id === selectedTraceId ? 'active' : ''} onClick={() => { setSelectedTraceId(item.id); setTraceCode(`XMHT-${String(item.id).padStart(4, '0')}-0609`); notify(`已切换到${item.name}`); }}>
              <img src={item.image} alt="" />
              <span>{item.name}</span>
              <small>{item.origin}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="trace-clone-hero">
        <div className="trace-clone-copy">
          <span><ShieldCheck size={14} />{verified ? '已完成官方验真' : '待验证批次'}</span>
          <h2>{traceProduct.name}</h2>
          <p>{traceProfile.subtitle}</p>
          <div className="trace-clone-meta">
            <p><MapPin size={16} />产地 <b>{traceProduct.origin}</b></p>
            <p><Leaf size={16} />种植方式 <b>{traceProfile.method}</b></p>
            <p><Clock3 size={16} />采收日期 <b>{traceProfile.harvestDate}</b></p>
          </div>
          <button onClick={() => { void submitTrace(); }} disabled={querying}><ScanLine size={17} />{querying ? '查询中…' : '一键溯源'}</button>
        </div>
        <img src={traceProfile.heroImage} alt="" />
      </section>

      <section className="trace-clone-origin">
        <div>
          <b>产地信息</b>
          <p><MapPin size={14} />{traceProfile.base}</p>
          <small>溯源码 {traceCode || traceCodeForProduct} · {queryError}</small>
        </div>
        <div className="trace-clone-map"><DataSourceBadge source={querySource} compact /><MapPin size={24} /></div>
      </section>

      <section className="trace-clone-flow">
        <div className="trace-clone-title"><b>溯源流程</b><span>{verified ? '本批次真实记录' : '查询后展示'}</span></div>
        {!traceTimelineForProduct.length && <p className="data-source-hint">尚未查询到该批次记录，不能据此判断商品已验真。</p>}
        {traceTimelineForProduct.map((item, index) => (
          <article key={`${item.stage}-${index}`}>
            <i />
            <img src={referenceTraceFlow[index % referenceTraceFlow.length].image} alt="" />
            <div>
              <b>{item.stage}</b>
              <p>{item.desc}</p>
              <small>{item.time || '时间待补充'}</small>
            </div>
            <button onClick={() => notify(verified ? '该记录详情待后台补充' : '请先完成批次验真')}><span>{verified ? '已核验' : '待验真'}</span><em>查看</em></button>
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
    </div>
  );

  return (
    <div className={`trace-page-red trace-pro-page trace-top-page trace-assurance-page ${querying ? 'trace-querying' : ''}`}>
      <section className="trace-assurance-hero">
        <div className="trace-assurance-copy">
          <span>TRUST CENTER</span>
          <h2>这批货，可以放心买</h2>
          <p>产地、采收、检测、温控全链路已核验，证据直接给消费者看。</p>
          <div className="trace-assurance-tags">
            <i>官方验真</i>
            <i>农残合格</i>
            <i>坏果包赔</i>
          </div>
        </div>
        <article className="trace-assurance-product">
          <img src={traceProduct.image} alt="" />
          <i>已验真商品</i>
          <b>{traceProduct.name}</b>
          <span>{traceProduct.origin} · {traceProduct.tag}</span>
          <small>溯源码 {traceCode}</small>
        </article>
      </section>

      <section className="trace-search-panel trace-assurance-search">
        <div className="trace-input-box">
          <Search size={16} />
          <input value={traceCode} onChange={(event) => setTraceCode(event.target.value)} placeholder="输入溯源码 / 批次号" />
        </div>
        <button onClick={submitTrace}>{querying ? '查询中' : verified ? '重新查询' : '立即查询'}</button>
      </section>

      <section className={`trace-verdict-card ${verified ? 'verified' : ''}`}>
        <div>
          <CheckCircle2 size={26} />
          <span>{verified ? '验真通过' : '正在核验'}</span>
          <b>{verified ? '可放心购买' : '正在核对批次记录'}</b>
          <small>{verified ? `${traceProduct.name} 已完成官方验真，未发现异常记录。` : '正在核对产地、检测与冷链记录。'}</small>
        </div>
        <button onClick={onResult}>查看完整报告</button>
      </section>

      <section className="trace-proof-board">
        {traceEvidence.map((item) => (
          <button key={item.title} onClick={() => setActiveReport(item.action)}>
            <img src={item.image} alt="" />
            <span>{item.title}</span>
            <b>{item.desc}</b>
            <small>查看证据</small>
          </button>
        ))}
      </section>

      <section className="trace-verify-steps">
        {['产地档案', '农残检测', '冷链温控', '区块链存证'].map((item, index) => (
          <span key={item} className={`${verified ? 'passed' : ''} ${querying && index === 1 ? 'checking' : ''}`}><CheckCircle2 size={14} />{item}</span>
        ))}
      </section>

      <div className="trace-action-grid trace-action-premium">
        <button onClick={onResult}><ScanLine size={18} /><span>扫码验真</span></button>
        <button onClick={onResult}><PackageSearch size={18} /><span>批次查询</span></button>
        <button onClick={() => setActiveReport('农残快检报告')}><CheckCircle2 size={18} /><span>检测报告</span></button>
      </div>

      <section className="trace-consumer-summary trace-assurance-summary">
        <div>
          <b>消费者最关心的 4 件事</b>
          <span>不用看复杂参数，先看结论。</span>
        </div>
        {[
          ['安全', '农残合格'],
          ['产地', traceProduct.origin],
          ['新鲜', '采后直发'],
          ['售后', '坏果包赔']
        ].map(([label, value]) => (
          <p key={label}><span>{label}</span><b>{value}</b></p>
        ))}
      </section>

      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>核心检测</b><span>小满合质检中心 · 今日 10:35</span></div>
        <div className="trace-metric-grid trace-metric-premium">
          {traceMetrics.map(([label, value, desc]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
              <small>{desc}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>产地实时环境</b><span>基地传感器</span></div>
        <div className="trace-env-red trace-env-pro">
          {['温度 24°C', '湿度 68%', '光照 良好', '土壤 pH 6.8'].map((item) => <div key={item}>{item}</div>)}
        </div>
      </section>

      <section className="trace-card-red trace-panel-pro">
        <div className="trace-section-head"><b>全链路记录</b><span>已完成 3/4 节点</span></div>
        {traceTimelineForProduct.map((item) => <TimelineItem key={item.stage} {...item} />)}
      </section>

      <section className="trace-report-list">
        {traceReports.map((item) => (
          <button key={item} onClick={() => setActiveReport(item)}>
            <CheckCircle2 size={18} />
            <span>{item}</span>
            <ChevronRight size={16} />
          </button>
        ))}
      </section>
      {activeReportDetail && (
        <div className="trace-report-overlay" onClick={() => setActiveReport(null)}>
          <section className="trace-report-sheet" onClick={(event) => event.stopPropagation()}>
            <button className="sheet-close" onClick={() => setActiveReport(null)}>关闭</button>
            <CheckCircle2 className="sheet-badge" size={34} />
            <span>官方报告</span>
            <h3>{activeReportDetail!.title}</h3>
            <p>{activeReportDetail!.subtitle}</p>
            <div className="sheet-conclusion">{activeReportDetail!.conclusion}</div>
            <div className="sheet-row-list">
              {(activeReportDetail!.rows as Array<[string, string]>).map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}
            </div>
            {activeReportDetail!.visual === 'harvest' && (
              <div className="harvest-flow-card">
                {[
                  ['08:10', '清晨采摘'],
                  ['09:20', '人工分级'],
                  ['10:05', '产地装箱']
                ].map(([time, label]) => <p key={label}><b>{time}</b><span>{label}</span></p>)}
              </div>
            )}
            {activeReportDetail!.visual === 'cold' && (
              <div className="cold-chain-card">
                <div className="cold-chart">
                  {[42, 52, 46, 58, 49, 54, 47].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
                </div>
                <div className="cold-chart-meta"><span>2°C</span><b>全程稳定 2-6°C</b><span>6°C</span></div>
              </div>
            )}
            <div className="sheet-chip-row">
            {(activeReportDetail!.chips as string[]).map((chip: string) => <i key={chip}>{chip}</i>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AdoptV2({ onDetail, notify, projects, source }: { onDetail: () => void; notify: (message: string) => void; projects: AdoptItem[]; source: ApiDataSource }) {
  const [view, setView] = useState<'available' | 'mine'>('available');
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('xm-adopt-saved') || '[]') as string[]; } catch { return []; } });
  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem('xm-adopt-saved', JSON.stringify(next));
    notify(current.includes(id) ? '已取消关注' : '已在本机关注该样板');
    return next;
  });
  const projectCards = [
    { id: 'tomato', title: '一季番茄', tagline: '认识土地和种植过程', cycle: '约 90 天', delivery: '了解收获方式', image: '/assets/miniprogram/hero-farm.jpg' },
    { id: 'vegetable', title: '时令蔬菜', tagline: '看看蔬菜从田间到餐桌', cycle: '按季节变化', delivery: '交付信息待开通', image: '/assets/products/market/green-vegetable.jpg' }
  ].filter((item) => view === 'available' || saved.includes(item.id));
  return <div className="mp-adopt-page">
    <header className="mp-adopt-head"><b>云认养</b><span>从田间到餐桌</span></header>
    <div className="mp-adopt-switch"><button className={view === 'available' ? 'active' : ''} onClick={() => setView('available')}>发现农场</button><button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>我的认养</button></div>
    {view === 'available' && <><button className="mp-adopt-hero" onClick={onDetail}><img src="/assets/miniprogram/hero-farm.jpg" alt=""/><span><small>小满合 · 田园生活</small><b>和一季新鲜，慢慢相遇</b><i>看见生长的每一步，读懂餐桌上的好食材</i><em>走进农场 ›</em></span><label>场景示意</label></button><div className="mp-adopt-quick"><button onClick={onDetail}><img src="/assets/miniprogram/farmer-icons/home.png" alt=""/><span><b>走进农场</b><small>认识土地和种植</small></span>›</button><button onClick={onDetail}><img src="/assets/miniprogram/farmer-icons/camera.png" alt=""/><span><b>生长日记</b><small>图文记录这一季</small></span>›</button></div></>}
    <section className="mp-adopt-section"><div><b>{view === 'available' ? '认养一份期待' : '我关注的项目'}</b><small>{view === 'available' ? '先了解周期与交付，再选择你的那一季' : '关注项目保存在当前设备'}</small></div><em>体验样板</em></section>
    {projectCards.map((item) => <article className="mp-adopt-project" key={item.id}><button className="mp-adopt-photo" onClick={onDetail}><img src={item.image} alt=""/><span>蔬菜认养 · 样板</span></button><div className="mp-adopt-info"><b>{item.title}</b><small>{item.tagline}</small><div><span>生长周期 <strong>{item.cycle}</strong></span><span>收获方式 <strong>{item.delivery}</strong></span></div><footer><i>图文方案 · 非交易项目</i><button onClick={onDetail}>了解这一季 ›</button><button className={saved.includes(item.id) ? 'saved' : ''} onClick={() => toggleSaved(item.id)}>{saved.includes(item.id) ? '♥' : '♡'}</button></footer></div></article>)}
    {!projectCards.length && <div className="mp-adopt-empty"><img src="/assets/miniprogram/farmer-icons/heart.png" alt=""/><b>还没有关注的项目</b><span>点一下项目上的爱心，把喜欢的这一季留下。</span></div>}
    <section className="mp-adopt-growth"><b>每一步，都值得看见</b><small>一季番茄的图文故事 · 示例记录 / 示意配图</small><div>播种育苗　›　移栽定植　›　开花结果　›　成熟采收</div><img src="/assets/miniprogram/hero-farm.jpg" alt=""/><button onClick={onDetail}>阅读示意日记 ›</button></section>
    <section className="mp-adopt-notice"><img src="/assets/miniprogram/farmer-icons/shield.png" alt=""/><span><b>先看清楚，再认养</b><small>当前为图文体验样板，关注保存在本机。真实农场、认养下单、配送与远程设备尚未接入。</small></span></section>
  </div>;
  const [energy, setEnergy] = useState(156);
  const [growth, setGrowth] = useState(64);
  const [watered, setWatered] = useState(false);
  const [collecting, setCollecting] = useState<number | null>(null);
  const [collected, setCollected] = useState<number[]>([]);
  const [liveOpen, setLiveOpen] = useState(false);
  const [activeCrop, setActiveCrop] = useState<'tomato' | 'rice' | 'orange'>('tomato');
  const [checkins, setCheckins] = useState(7);

  const cropMap = {
    tomato: {
      name: '寿光番茄农场',
      title: '阳光番茄认养',
      location: '山东寿光 · A-1 智能温室',
      stage: '开花坐果期',
      harvest: '16 天后采收',
      harvestDate: '2026.06.25',
      output: '预计到家 12 斤番茄',
      progress: 64,
      color: '#ff4d3f',
      image: '/assets/catalog/shouguang-greenhouse.jpg',
      productImage: '/assets/products/market/tomato.jpg',
      owner: '张师傅',
      message: '今天棚内光照充足，番茄坐果稳定，已完成滴灌和叶面巡检。',
      diary: [
        ['播种育苗', '04.05', '/assets/farm/field-base.jpg'],
        ['移栽定植', '04.15', '/assets/catalog/shouguang-greenhouse.jpg'],
        ['开花坐果', '05.05', '/assets/farm/greenhouse.jpg'],
        ['果实膨大', '05.15', '/assets/products/market/tomato.jpg'],
        ['成熟采收', '05.25', '/assets/farm/tomato-harvest.jpg']
      ]
    },
    rice: {
      name: '五常稻田守护',
      title: '五常稻田认养',
      location: '黑龙江五常 · 龙凤山稻田',
      stage: '拔节生长期',
      harvest: '42 天后收割',
      harvestDate: '2026.08.06',
      output: '预计到家 10 斤新米',
      progress: 58,
      color: '#e7b13b',
      image: '/assets/farm/rice-field.jpg',
      productImage: '/assets/products/market/rice-white.jpg',
      owner: '周师傅',
      message: '稻田水位稳定，今天已完成田埂巡查，夜间温差适合分蘖生长。',
      diary: [
        ['浸种催芽', '04.12', '/assets/products/market/rice.jpg'],
        ['插秧返青', '05.01', '/assets/farm/rice-field.jpg'],
        ['分蘖生长', '05.26', '/assets/farm/rice-field.jpg'],
        ['抽穗扬花', '07.08', '/assets/products/market/rice-scoop.jpg'],
        ['秋收现碾', '08.06', '/assets/products/market/rice-white.jpg']
      ]
    },
    orange: {
      name: '奉节脐橙果园',
      title: '奉节脐橙认养',
      location: '重庆奉节 · 三峡库区果园',
      stage: '挂果转甜期',
      harvest: '23 天后采摘',
      harvestDate: '2026.07.10',
      output: '预计到家 8 斤脐橙',
      progress: 72,
      color: '#ff8a2a',
      image: '/assets/products/orange.jpg',
      productImage: '/assets/catalog/fengjie-orange.jpg',
      owner: '李师傅',
      message: '果园今天完成疏果和糖度抽检，果面干净，预计成熟期稳定。',
      diary: [
        ['春梢萌发', '03.18', '/assets/catalog/fengjie-orange.jpg'],
        ['花期授粉', '04.08', '/assets/products/orange.jpg'],
        ['幼果养护', '05.02', '/assets/catalog/fengjie-orange.jpg'],
        ['转色增甜', '06.18', '/assets/products/orange.jpg'],
        ['成熟采摘', '07.10', '/assets/products/market/produce-table.jpg']
      ]
    }
  };
  const crop = cropMap[activeCrop];
  const displayedGrowth = activeCrop === 'tomato' ? growth : crop.progress;
  const energyDrops = [
    { id: 1, amount: 18, left: '15%', top: '38%' },
    { id: 2, amount: 26, left: '72%', top: '33%' },
    { id: 3, amount: 12, left: '79%', top: '59%' }
  ];
  const tasks = [
    { title: '浇水一次', desc: '让作物继续生长', reward: '+20' },
    { title: '查看实况', desc: '确认今天农场状态', reward: '+18' },
    { title: '领取周报', desc: '保存本周成长记录', reward: '+16' }
  ];

  const collectEnergy = (id: number, amount: number) => {
    if (collected.includes(id)) {
      notify('这份能量今天已经收取过了');
      return;
    }
    setCollecting(id);
    window.setTimeout(() => {
      setCollected((value) => [...value, id]);
      setEnergy((value) => value + amount);
      setCollecting(null);
      notify(`已收取 ${amount}g 农场能量`);
    }, 520);
  };

  const waterCrop = () => {
    if (energy < 20) {
      notify('能量不足，先完成今日任务补充能量');
      return;
    }
    setWatered(true);
    setEnergy((value) => Math.max(0, value - 20));
    setGrowth((value) => Math.min(100, value + 4));
    setCheckins((value) => value + 1);
    window.setTimeout(() => setWatered(false), 1300);
    notify('浇水完成，成长值 +4%');
  };

  const finishTask = (reward: string) => {
    const amount = Number(reward.replace(/\D/g, ''));
    setEnergy((value) => value + amount);
    notify(`任务完成，能量 ${reward}`);
  };

  return (
    <div className="adopt-clone-page">
      <section className="adopt-clone-head">
        <div>
          <h1>云端认养</h1>
          <p>认养一份希望，收获一份安心</p>
        </div>
        <div className="adopt-clone-tools">
          <button onClick={onDetail}><Sprout size={21} /><span>我的认养</span></button>
          <button onClick={() => notify('分享卡片已生成')}><MessageCircle size={21} /><span>分享</span></button>
        </div>
      </section>

      <section className="adopt-project-switch">
        {([
          ['tomato', '番茄温室', '实时看棚'],
          ['rice', '五常稻田', '秋收新米'],
          ['orange', '脐橙果园', '糖度跟踪']
        ] as const).map(([id, title, desc]) => (
          <button key={id} className={activeCrop === id ? 'active' : ''} onClick={() => setActiveCrop(id)}>
            <img src={cropMap[id].productImage} alt="" />
            <span><b>{title}</b><small>{desc}</small></span>
          </button>
        ))}
      </section>

      <section className="adopt-api-projects">
        <div className="adopt-api-projects-head">
          <div><b>可认养方案</b><span>{source === 'real' ? '后台实时库存与价格' : source === 'fallback' ? '兼容数据，价格以确认页为准' : '认养服务暂未接入'}</span></div>
          <DataSourceBadge source={source} compact />
        </div>
        {projects.length ? projects.slice(0, 3).map((item) => (
          <button key={item.id} className="adopt-api-project" onClick={onDetail}>
            <img src={item.image} alt="" />
            <span><b>{item.name}</b><small>{item.period} · {item.output} · {item.stage}</small></span>
            <em>{item.left > 0 ? `余 ${item.left} 份` : '暂时售罄'}</em>
            <strong>¥{item.price || '待定'}</strong>
          </button>
        )) : <p className="data-source-hint">暂无可展示的认养方案，请稍后刷新。</p>}
      </section>

      <section className="adopt-clone-hero">
        <img src={crop.image} alt="" />
        <div className="adopt-clone-badges">
          <span>{activeCrop === 'tomato' ? '热门认养' : activeCrop === 'rice' ? '基地直播' : '当季认养'}</span>
          <em><i />直播中</em>
        </div>
        <div className="adopt-clone-copy">
          <h2>{crop.title}</h2>
          <p><MapPin size={16} />{crop.location}</p>
        </div>
      </section>

      <section className="adopt-clone-progress">
        <article><span>当前生长阶段</span><b><Sprout size={18} />{crop.stage}</b></article>
        <article><span>生长进度</span><b>{displayedGrowth}%</b><i><em style={{ width: `${displayedGrowth}%` }} /></i></article>
        <article><span>预计收获</span><b><CalendarDays size={18} />{crop.harvestDate}</b></article>
      </section>

      <section className="adopt-clone-owner">
        <img src={crop.productImage} alt="" />
        <div>
          <b>来自农场主{crop.owner}的更新</b>
          <p>{crop.message}</p>
        </div>
        <button onClick={() => setLiveOpen(true)}>28"</button>
      </section>

      <section className="adopt-clone-diary">
        <div className="adopt-clone-section-title"><b>成长日记</b><button onClick={onDetail}>查看全部</button></div>
        <div className="adopt-clone-diary-row">
          {crop.diary.map(([title, date, image], index) => (
            <button key={title} className={index === 2 ? 'active' : ''} onClick={() => notify(`${title}记录已打开`)}>
              <img src={image} alt="" />
              <b>{title}</b>
              <span>{date}</span>
              <i />
            </button>
          ))}
        </div>
      </section>

      <section className="adopt-clone-feature-grid">
        <button onClick={() => setLiveOpen(true)}><b>远程互动</b><span>视频看田间，随时陪伴成长</span><img src={crop.image} alt="" /></button>
        <button onClick={onDetail}><b>成长记录</b><span>记录每一刻美好瞬间</span><img src={crop.productImage} alt="" /></button>
        <button onClick={onDetail}><b>订单售后</b><span>订单管理与售后服务</span><img src="/assets/products/market/produce-table.jpg" alt="" /></button>
      </section>

      <section className="adopt-clone-cta" onClick={onDetail}>
        <div><b>查看我的认养</b><span>{crop.output} · 远程互动 · 管理订单</span></div>
        <img src={crop.productImage} alt="" />
        <ChevronRight size={26} />
      </section>

      {liveOpen && (
        <div className="adopt-v2-live-mask" onClick={() => setLiveOpen(false)}>
          <section className="adopt-v2-live-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="adopt-v2-live-head">
              <div>
                <span>今日农场实况</span>
                <b>{crop.name}</b>
              </div>
              <button onClick={() => setLiveOpen(false)}>关闭</button>
            </div>
            <img src={crop.image} alt={crop.name} />
            <div className="adopt-v2-live-proof">
              <span>阶段<b>{crop.stage}</b></span>
              <span>采收<b>{crop.harvest}</b></span>
              <span>更新<b>3 张照片</b></span>
            </div>
            <p>今天农场主完成晨检和现场拍照，作物长势稳定。成熟后将按认养权益优先采收、打包并寄送到家。</p>
            <button className="primary" onClick={waterCrop}>{watered ? '已完成今日照料' : '顺手浇水一次'}</button>
          </section>
        </div>
      )}
    </div>
  );

  return (
    <div className="adopt-v2-page">
      <section className={`adopt-v2-hero ${watered ? 'is-watering' : ''}`} style={{ ['--crop-color' as string]: crop.color }}>
        <div className="adopt-v2-topbar">
          <div>
            <span>MY CLOUD FARM</span>
            <b>{crop.name}</b>
          </div>
          <button onClick={() => setLiveOpen(true)}><CloudSun size={15} />今日实况</button>
        </div>

        <div className="adopt-v2-score">
          <span>陪伴值</span>
          <b>{energy}g</b>
        </div>

        <div className="adopt-v2-world">
          <div className="adopt-v2-sun" />
          <div className="adopt-v2-cloud c1" />
          <div className="adopt-v2-cloud c2" />
          <div className="adopt-v2-field-line l1" />
          <div className="adopt-v2-field-line l2" />
          <div className="adopt-v2-field-line l3" />
          <div className={`adopt-v2-plant ${activeCrop}`}>
            <i className="stem" />
            <i className="leaf a" />
            <i className="leaf b" />
            <i className="leaf c" />
            <i className="leaf d" />
            <i className="fruit a" />
            <i className="fruit b" />
            <i className="fruit c" />
            <i className="fruit d" />
          </div>
          <div className="adopt-v2-soil"><i /><i /><i /></div>
          {energyDrops.map((drop) => (
            <button
              key={drop.id}
              className={`adopt-v2-energy ${collected.includes(drop.id) ? 'done' : ''} ${collecting === drop.id ? 'fly' : ''}`}
              style={{ left: drop.left, top: drop.top }}
              onClick={() => collectEnergy(drop.id, drop.amount)}
            >
              +{drop.amount}
            </button>
          ))}
          {watered && <div className="adopt-v2-rain">{Array.from({ length: 12 }).map((_, index) => <i key={index} />)}</div>}
          {watered && <div className="adopt-v2-pulse">成长 +4%</div>}
        </div>

        <div className="adopt-v2-stage-card">
          <div>
            <span>{crop.stage}</span>
            <b>{growth}%</b>
          </div>
          <div className="adopt-v2-progress"><i style={{ width: `${growth}%` }} /></div>
          <p>{crop.harvest} · {crop.output}</p>
        </div>

        <div className="adopt-v2-actions">
          <button onClick={waterCrop}>浇水</button>
          <button onClick={() => setLiveOpen(true)}>看实况</button>
          <button onClick={onDetail}>成长档案</button>
        </div>
      </section>

      <section className="adopt-v2-checkin">
        <div>
          <span>连续照料</span>
          <b>{checkins} 天</b>
          <p>今天再照料一次，可解锁采收提醒和优先发货权益。</p>
        </div>
        <div className="adopt-v2-days">
          {Array.from({ length: 7 }).map((_, index) => <i className={index < Math.min(7, checkins) ? 'on' : ''} key={index}>{index + 1}</i>)}
        </div>
      </section>

      <section className="adopt-v2-crops">
        {([
          ['tomato', '番茄', '坐果中'],
          ['rice', '稻田', '拔节中'],
          ['orange', '果园', '转甜中']
        ] as const).map(([id, name, tag]) => (
          <button className={activeCrop === id ? 'active' : ''} key={id} onClick={() => setActiveCrop(id)}>
            <span>{name}</span>
            <b>{tag}</b>
          </button>
        ))}
      </section>

      <section className="adopt-v2-live-card">
        <div>
          <span>农场主今日更新</span>
          <b>08:42 完成晨检，作物状态稳定</b>
          <p>已上传现场照片、巡检说明和采收预计时间。用户不用看复杂数据，也能知道农场今天发生了什么。</p>
        </div>
        <img src={crop.image} alt={crop.name} />
      </section>

      <section className="adopt-v2-task-card">
        <div className="adopt-v2-section-head"><b>今日轻互动</b><span>完成后补充能量</span></div>
        {tasks.map((task) => (
          <button key={task.title} onClick={() => finishTask(task.reward)}>
            <Sprout size={17} />
            <span><b>{task.title}</b><small>{task.desc}</small></span>
            <em>{task.reward}</em>
          </button>
        ))}
      </section>

      <section className="adopt-v2-projects">
        <div className="adopt-v2-section-head"><b>可认养农场</b><span>真实产出，到季寄送</span></div>
        {[
          ['寿光番茄农场', '90 天周期 · 到季约 12 斤', '剩余 18 份', '¥199/季', '/assets/farm/greenhouse.jpg'],
          ['五常稻田守护', '120 天周期 · 到季约 10 斤', '剩余 25 份', '¥269/季', '/assets/farm/rice-field.jpg']
        ].map(([name, desc, left, price, image]) => (
          <article key={name} onClick={onDetail}>
            <img src={image} alt={name} />
            <div>
              <b>{name}</b>
              <p>{desc}</p>
              <span>{left}</span>
            </div>
            <strong>{price}</strong>
          </article>
        ))}
      </section>

      {liveOpen && (
        <div className="adopt-v2-live-mask" onClick={() => setLiveOpen(false)}>
          <section className="adopt-v2-live-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="adopt-v2-live-head">
              <div>
                <span>今日农场实况</span>
                <b>{crop.name}</b>
              </div>
              <button onClick={() => setLiveOpen(false)}>关闭</button>
            </div>
            <img src={crop.image} alt={crop.name} />
            <div className="adopt-v2-live-proof">
              <span>阶段<b>{crop.stage}</b></span>
              <span>采收<b>{crop.harvest}</b></span>
              <span>更新<b>3 张照片</b></span>
            </div>
            <p>今天农场主完成晨检和现场拍照，作物长势稳定。成熟后将按认养权益优先采收、打包并寄送到家。</p>
            <button className="primary" onClick={waterCrop}>{watered ? '已完成今日照料' : '顺手浇水一次'}</button>
          </section>
        </div>
      )}
    </div>
  );
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
  { id: 1, name: '高原番茄', icon: '🍅', area: '3.5亩', plantDays: 65, status: '生长期', yield: '约2800斤', photo: '/assets/products/market/tomato.jpg', note: '使用有机肥，长势良好。注意预防晚疫病。' },
  { id: 2, name: '线椒', icon: '🌶️', area: '2.0亩', plantDays: 42, status: '结果期', yield: '约1500斤', photo: '/assets/products/market/green-vegetable.jpg', note: '已进入采收期，注意及时采摘避免老化。' },
  { id: 3, name: '紫皮土豆', icon: '🥔', area: '5.0亩', plantDays: 15, status: '幼苗期', yield: '约6000斤', photo: '/assets/farm/field-base.jpg', note: '刚出苗，注意保温和浇水管理。' }
];

const farmerHistory = [
  { id: 1, crop: '番茄叶片', date: '今天 09:30', status: '已处理', icon: '🍅', desc: '叶片健康，无病害迹象，光合作用状态良好。' },
  { id: 2, crop: '辣椒蚜虫', date: '昨天 14:20', status: '待观察', icon: '🌶️', desc: '少量蚜虫聚集，建议 3 天后复查虫口密度。' },
  { id: 3, crop: '黄瓜白粉病', date: '03-26 08:45', status: '待观察', icon: '🥒', desc: '检测到白粉病早期症状，建议加强通风。' }
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
    content: '用了小满AI识别功能，提前发现了玉米叶斑病。及时处理后保住了大部分产量，科技确实能改变农业。',
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
  const reminders = [
    { name: '番茄第二茬追肥', tag: '进行中', time: '今天 09:00', status: 'doing' },
    { name: '辣椒地除草作业', tag: '待处理', time: '明天 08:00', status: 'todo' },
    { name: '检查大棚通风设备', tag: '紧急', time: '今天 15:00前', status: 'urgent' }
  ];
  return (
    <div className="farmer-mp home-mp home-replica">
      <section className="home-top-card">
        <div className="home-nav-row">
          <button onClick={() => onPage('locationMap')}>📍 昆明</button>
          <button onClick={() => onPage('weatherDetail')}>☀️ 晴 26°C</button>
          <button className={noticeRead ? 'read' : ''} onClick={() => setNoticeRead(true)}>🔔</button>
        </div>
        <h2>下午好，农友</h2>
        <p>今日 {todayMonthDay} · 5项农事待处理</p>
        <small className="farmer-sample-note">体验样板 · 天气、任务与农场数据为示例</small>
      </section>

      <section className="assistant-card">
        <div className="assistant-head">
          <div className="assistant-title-row">
            <span>🌾</span>
            <div><b>农事助手</b><small>今日 {todayMonthDay} · 午后作业提醒</small></div>
          </div>
          <em>5项待办</em>
        </div>
        <div className="assistant-progress-row">
          <div className="mp-progress"><i style={{ width: '20%' }} /></div>
          <div><span>✓ 已完成1</span><span>5项</span></div>
        </div>
        <div className="assistant-grid">
          <button onClick={() => onTab('farming')}><span>📅</span><b>农事日历</b><small>5项今日</small></button>
          <button onClick={() => onPage('myCrops')}><span>🌾</span><b>种植档案</b><small>3种在管</small></button>
          <button onClick={() => onPage('myCrops')}><span>💰</span><b>收益统计</b><small>查看明细</small></button>
          <button onClick={() => onTab('environment')}><span>🌡️</span><b>环境监测</b><small>实时监控</small></button>
        </div>
        <div className="weather-strip"><b>☀️ 26°C</b><span>晴朗</span><i /> <span>💧58%</span><i /><span>🌬️2级风</span></div>
        <div className="ai-tip"><span>🤖</span><p>农事建议体验样板。实时天气、传感器数据与 AI 决策服务尚未接入。</p></div>
      </section>

      <section className="mp-grid-six">
        <button onClick={() => onPage('voiceAssistant')}><span>📷</span><b>拍照识别</b></button>
        <button onClick={() => onPage('myCrops')}><span>🌱</span><b>我的作物</b></button>
        <button onClick={() => onPage('voiceAssistant')}><span>🎤</span><b>语音助手</b></button>
        <button onClick={() => onPage('warningCenter')}><span>⚠️</span><b>最新预警</b></button>
        <button onClick={() => onPage('techSupport')}><span>🛠️</span><b>技术支持</b></button>
        <button onClick={() => onPage('weatherDetail')}><span>🌤️</span><b>天气详情</b></button>
      </section>

      <section className="decision-card">
        <div className="mp-section-title"><b>✨ AI智能决策</b><em>最新</em></div>
        <p>当前展示农事建议体验样板，不连接实时气象、传感器或作物数据。</p>
        <footer><span>示例内容</span><span>服务尚未接入</span><button onClick={() => onPage('voiceAssistant')}>查看服务状态 ›</button></footer>
      </section>

      <section className="home-reminder-card">
        <div className="mp-section-title"><b>📋 农事提醒</b><button onClick={() => onTab('farming')}>查看全部 ›</button></div>
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
  const [draft, setDraft] = useState({ name: '', price: '', desc: '' });
  const [productList, setProductList] = useState([
    { id: 1, name: '高原有机番茄', price: '38.00', unit: '5斤装', sales: 128, status: 'selling', statusText: '在售', image: '/assets/products/market/tomato.jpg' },
    { id: 2, name: '农家自种辣椒', price: '12.50', unit: '1斤', sales: 86, status: 'selling', statusText: '在售', image: '/assets/products/market/green-vegetable.jpg' },
    { id: 3, name: '云南紫皮土豆', price: '45.00', unit: '10斤', sales: 234, status: 'review', statusText: '审核中', image: '/assets/farm/field-base.jpg' }
  ]);
  const visible = filter === 'all' ? productList : productList.filter((item) => item.status === filter);
  const submit = () => {
    if (!draft.name.trim() || !draft.price.trim()) {
      notify('请填写商品名称和价格');
      return;
    }
    setProductList((prev) => [{ id: Date.now(), name: draft.name, price: Number(draft.price).toFixed(2), unit: '自定义规格', sales: 0, status: 'review', statusText: '审核中', image: '/assets/products/market/produce-table.jpg' }, ...prev]);
    setDraft({ name: '', price: '', desc: '' });
    setSheet(null);
    notify('商品已提交审核');
  };
  return (
    <div className="farmer-mp shop-mp shop-replica">
      <section className="shop-page-header"><h2>🏪 我的店铺</h2><small className="farmer-sample-note">体验样板 · 商品与经营数据为示例</small></section>
      <section className="shop-mode-switch replica">
        <button className={`mode-btn ${mode === 'platform' ? 'active platform-mode' : ''}`} onClick={() => setMode('platform')}>
          <span className="mode-icon">🏢</span><b className="mode-text">平台托管</b><small className="mode-desc">省心卖货</small>
        </button>
        <button className={`mode-btn self-mode ${mode === 'self' ? 'active' : ''}`} onClick={() => setMode('self')}>
          <span className="mode-icon">🛒</span><b className="mode-text">自主售卖</b><small className="mode-desc">自己管理</small>
        </button>
      </section>
      <section className="shop-quick-entry">
        <button onClick={() => setSheet('upload')}><span>📸</span><b>商品拍照上传</b></button>
        <button onClick={() => setSheet('filter')}><span>🔍</span><b>品种筛选</b></button>
      </section>
      <section className="shop-func-grid">
        <button onClick={() => setSheet('chat')}><span>💬</span><b>客户聊天</b><em>3</em></button>
        <button onClick={() => setSheet('wallet')}><span>💰</span><b>收益钱包</b></button>
        <button onClick={() => setSheet('logistics')}><span>🚚</span><b>物流管理</b></button>
        <button onClick={() => setSheet('afterSale')}><span>🎧</span><b>售后客服</b></button>
        <button onClick={() => onPage('farmerOrders')}><span>📦</span><b>订单管理</b></button>
      </section>
      <section className="shop-cloud-card" onClick={() => onPage('adoptionCenter')}>
        <div>
          <b>☁️ 云店铺</b>
          <span>认养订单管理中心</span>
          <small>6 个进行中认养</small>
        </div>
        <em>›</em>
      </section>
      <section className="shop-product-section">
        <div className="shop-section-header">
          <b>📦 我的商品</b>
          <div>
            {([['all', '全部'], ['selling', '在售'], ['review', '审核中']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
        </div>
        <div className="shop-product-list">
          {visible.map((item) => (
            <article className="shop-product-card" key={item.id}>
              <div className="shop-product-img" style={{ backgroundImage: `url(${item.image})` }}><em className={item.status}>{item.statusText}</em></div>
              <div className="shop-product-info">
                <b>{item.name}</b>
                <p><strong>¥{item.price}</strong><span>/{item.unit}</span></p>
                <small>已售 {item.sales}件</small>
              </div>
            </article>
          ))}
        </div>
      </section>
      {sheet && (
        <div className="farmer-modal-mask" onClick={() => setSheet(null)}>
          <section className="mp-sheet shop-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head"><b>{sheet === 'upload' ? '📸 商品拍照上传' : sheet === 'filter' ? '🔍 品种筛选' : sheet === 'chat' ? '客户聊天' : sheet === 'wallet' ? '收益钱包' : sheet === 'logistics' ? '物流管理' : '售后客服'}</b><button onClick={() => setSheet(null)}>×</button></div>
            {sheet === 'upload' ? (
              <div className="mp-form">
                <button className="photo-upload">📷 上传商品照片</button>
                <label>商品名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="如：高原有机番茄" /></label>
                <label>销售价格<input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="如：38" inputMode="decimal" /></label>
                <label>商品说明<textarea value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} placeholder="产地、规格、采摘时间、配送说明" /></label>
                <button className="mp-primary" onClick={submit}>提交审核</button>
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
  const [done, setDone] = useState(['番茄棚补水']);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', time: '08:30', type: '巡检' });
  const [extraTasks, setExtraTasks] = useState<Array<{ title: string; time: string; type: string; plot: string; owner: string; priority: string; source: string }>>([]);
  const toggle = (name: string) => setDone((prev) => prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]);
  const monthDays = 30;
  const leadingBlank = 1;
  const cells = [
    ...Array.from({ length: leadingBlank }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => index + 1),
    ...Array.from({ length: 35 - leadingBlank - monthDays }, () => null)
  ];
  const taskDays = [3, 8, 13, 17, 22, 26];
  const baseTasks = [
    { title: '番茄棚补水', time: '08:30-09:00', type: '水肥管理', plot: '1号番茄棚 · A区', owner: '张大叔', priority: 'urgent', source: '环境湿度触发' },
    { title: '复核土壤湿度传感器', time: '09:10-09:25', type: '环境巡检', plot: '1号番茄棚 · 传感器03', owner: '李师傅', priority: 'normal', source: '设备巡检计划' },
    { title: '记录花期病虫害观察', time: '15:00-15:20', type: '植保记录', plot: '番茄花果期样本行', owner: '张大叔', priority: 'important', source: '作物阶段提醒' },
    { title: '检查大棚通风设备', time: '17:20-17:40', type: '设备维护', plot: '卷膜机/通风扇', owner: '王工', priority: 'normal', source: '晚间闭棚前检查' }
  ];
  const tasks = [...baseTasks, ...extraTasks];
  const priorityLabel: Record<string, string> = { urgent: '紧急', important: '重点', normal: '常规' };
  const submitTask = () => {
    if (!newTask.title.trim()) return;
    setExtraTasks((prev) => [...prev, { ...newTask, title: newTask.title.trim(), plot: '临时农事安排', owner: '张大叔', priority: 'normal', source: '手动新增' }]);
    setNewTask({ title: '', time: '08:30', type: '巡检' });
    setShowAdd(false);
  };
  return (
    <div className="farmer-mp farming-mp farming-replica">
      <section className="farming-page-header">
        <div>
          <span>FARMING CALENDAR</span>
          <h2>📅 农事日历</h2>
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
        <span>🌤️ 晴 26°C</span>
        <span>💧 湿度 68%</span>
        <span>🌱 花果期</span>
      </section>

      <section className="farming-progress-section">
        <div className="farming-section-title"><b>今日任务进度</b><em>{done.length}/{tasks.length}</em></div>
        <div className="farming-progress"><i style={{ width: `${Math.min(100, (done.length / tasks.length) * 100)}%` }} /></div>
        <small>已完成 {done.length} 项，剩余 {Math.max(0, tasks.length - done.length)} 项</small>
      </section>

      <section className="farming-ai-section">
        <div className="farming-section-title"><b>🤖 AI 农事建议</b><em>根据环境生成</em></div>
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
            <button className="task-check" onClick={() => toggle(task.title)}>{done.includes(task.title) ? '✓' : ''}</button>
            <div className="task-main">
              <div className="task-row-top">
                <b>{task.title}</b>
                <em className={`priority-${task.priority}`}>{priorityLabel[task.priority] ?? task.priority}</em>
              </div>
              <p>{task.plot}</p>
              <div className="task-meta-row">
                <span>⏰ {task.time}</span>
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

function EnvironmentMP({ onPage }: { onPage: (page: FarmerPage) => void }) {
  const [playing, setPlaying] = useState(false);
  const [chartTab, setChartTab] = useState<'temp' | 'humidity' | 'light'>('temp');
  const [devices, setDevices] = useState([
    { id: 1, icon: '💧', name: '滴灌阀', on: true, state: '运行中', auto: true },
    { id: 2, icon: '🌀', name: '通风机', on: true, state: '自动', auto: true },
    { id: 3, icon: '💡', name: '补光灯', on: false, state: '已关闭', auto: false },
    { id: 4, icon: '📹', name: '摄像头', on: true, state: '在线', auto: false },
    { id: 5, icon: '🌫️', name: '雾化器', on: false, state: '已关闭', auto: true },
    { id: 6, icon: '🪟', name: '卷膜机', on: true, state: '通风中', auto: true }
  ]);
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
          <h2>🌡️ 环境监测</h2>
          <p>视频、传感器、滴灌和自动化设备实时联动</p>
          <small className="farmer-sample-note">体验样板 · 读数与设备状态为示例</small>
        </div>
        <button onClick={() => onPage('warningCenter')}>⚠️ 3</button>
      </section>

      <section className="env-station-bar">
        <button className="env-station-info">
          <span className="env-station-icon">🏡</span>
          <b>1号番茄智能棚</b>
          <em><i />在线</em>
          <small>▼</small>
        </button>
        <button className="env-device-entry" onClick={() => onPage('myDevice')}><span>📱</span><b>我的设备</b></button>
      </section>

      <section className="env-video-card" onClick={() => setPlaying(!playing)}>
        <img src="/assets/catalog/shouguang-greenhouse.jpg" alt="" />
        <div className="env-live-tag"><i />LIVE</div>
        <div className="env-video-overlay">
          <button>{playing ? 'Ⅱ' : '▶'}</button>
          <span>{playing ? '实时画面播放中' : '点击播放实时画面'}</span>
        </div>
        <footer><span>{playing ? '摄像头在线' : '摄像头待连接'}</span><b>📹 北棚主摄像头</b><em>⛶</em></footer>
      </section>

      <section className="env-overview-section">
        <div className="env-section-title"><b>🌡️ 环境总览</b><button>🔄 更新 10:32</button></div>
        <div className="env-overview-grid">
          {[
            { cls: 'temp', icon: '🌡️', value: '26°C', label: '棚内温度', trend: '↑ 1.2°C 较昨日', status: '正常' },
            { cls: 'ph', icon: '🧪', value: '6.8', label: '土壤酸碱度', trend: '稳定 · 适宜作物生长', status: '✓ 适宜' },
            { cls: 'humi', icon: '💧', value: '71%', label: '空气湿度', trend: '↓ 3% 较昨日', status: '良好' },
            { cls: 'light', icon: '☀️', value: '18.2k', label: '光照强度', trend: '↑ 光照充足', status: '✓ 充足' }
          ].map((item) => (
            <article className={`env-overview-card ${item.cls}`} key={item.label}>
              <div>{item.icon}</div><strong>{item.value}</strong><span>{item.label}</span><p>{item.trend}</p><em>{item.status}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="env-drip-card" onClick={() => onPage('myDevice')}>
        <div><span>💧</span><p><b>智能滴灌系统</b><small>● 运行中 · 今日用水 12.5L · A区补水 20 分钟</small></p></div><em>›</em>
      </section>

      <section className="env-chart-section">
        <div className="env-chart-head">
          <b>📈 数据趋势</b>
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
        <div className="env-section-title"><b>⚙️ 设备控制中心</b><button onClick={() => onPage('myDevice')}>全部设置 ›</button></div>
        <div className="env-device-grid">
          {devices.map((device) => (
            <button key={device.id} className={device.on ? 'on' : ''} onClick={() => setDevices((prev) => prev.map((row) => row.id === device.id ? { ...row, on: !row.on } : row))}>
              {device.auto && <small>自动</small>}
              <span>{device.icon}</span>
              <b>{device.name}</b>
              <em>{device.on ? device.state : '已关闭'}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="env-alert-section">
        <div className="env-section-title"><b>⚠️ 异常信息</b><button onClick={() => onPage('warningCenter')}>3 条 ›</button></div>
        <div className="env-alert-scroll">
          {[
            { level: 'red', icon: '🔥', title: '棚内温度过高', desc: '当前 26°C，超过安全阈值', time: '10分钟前 · 温度传感器' },
            { level: 'orange', icon: '💧', title: '土壤湿度偏低', desc: 'A区湿度 15.5%，建议补水', time: '18分钟前 · 土壤传感器' },
            { level: 'yellow', icon: '📹', title: '摄像头离线', desc: '南区摄像头 2 小时未回传', time: '2小时前 · 监控设备' }
          ].map((item) => <article className={item.level} key={item.title}><div><span>{item.icon}</span><b>{item.title}</b><em>{item.level === 'red' ? '紧急' : item.level === 'orange' ? '重要' : '提醒'}</em></div><p>{item.desc}</p><small>{item.time}</small></article>)}
        </div>
      </section>

      <section className="env-sensor-section">
        <div className="env-section-title"><b>🔬 传感器详细数据</b></div>
        <div className="env-sensor-grid">
          {[
            ['sc-temp', '土壤温度', '22.4°C', '✓ 正常'],
            ['sc-humi-low', '土壤湿度', '15.5💧', '↓ 偏低'],
            ['sc-air-temp', '环境温度', '26.0°C', '✓ 正常'],
            ['sc-air-humi', '环境湿度', '71%', '✓ 正常'],
            ['sc-co2', '二氧化碳浓度', '468ppm', '✓ 正常'],
            ['sc-light', '光照强度', '18.2kLux', '✓ 正常'],
            ['sc-nh3', '氨气浓度', '0.02ppm', '😊 正常'],
            ['sc-pm25', 'PM2.5', '18ug/m³', '😐 良好'],
            ['sc-ec', '土壤电导率', '1.2mS/cm', '✓ 正常'],
            ['sc-ph', '酸碱值pH', '6.8', '✓ 适宜']
          ].map(([cls, label, value, hint]) => <article className={cls} key={label}><span>{label}</span><b>{value}</b><em>{hint}</em></article>)}
        </div>
      </section>

      <section className="env-auto-section">
        <div className="env-section-title"><b>🤖 自动化任务</b></div>
        {[
          ['高温自动通风', '当棚内温度超过 28°C 自动开启通风机', true],
          ['低湿度自动滴灌', '土壤湿度低于 18% 自动补水 20 分钟', true],
          ['夜间补光策略', '18:30 后光照不足时自动开启补光灯', false]
        ].map(([name, desc, on]) => <article key={String(name)}><div><b>{name}</b><p>{desc}</p></div><span className={on ? 'on' : ''}><i /></span></article>)}
      </section>
    </div>
  );
}

function CommunityMP() {
  const [activeTab, setActiveTab] = useState<'hot' | 'latest'>('hot');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [list, setList] = useState(farmerCommunityPosts);
  const publish = () => {
    if (!content.trim()) return;
    setList((prev) => [{ id: Date.now(), userName: '我', levelText: '🥇黄金', location: '云南·昆明', time: '刚刚', content, hasVoice: false, voiceDuration: '', likes: 0, comments: 0, views: 0, liked: false, showComments: false, commentList: [] }, ...prev]);
    setContent('');
  };
  return (
    <div className="farmer-mp community-mp">
      <header className="community-nav"><b>农友社区</b></header>
      <div className="community-tabs"><button className={activeTab === 'hot' ? 'active' : ''} onClick={() => setActiveTab('hot')}>🔥 热门</button><button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')}>🕐 最新</button></div>
      <section className="post-input-area">
        <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="分享你的种植经验..." />
        <button className={isRecording ? 'recording' : ''} onMouseDown={() => setIsRecording(true)} onMouseUp={() => { setIsRecording(false); setContent('今天天气不错，番茄长势很好！'); }}>🎙️</button>
        <button onClick={publish}>发送</button>
      </section>
      {isRecording && <div className="recording-toast">🔴 正在录音，松开发送...</div>}
      <section className="post-list">
        {list.map((post) => <article className="post-card" key={post.id}><div className="post-user-row"><div>{post.userName.slice(0, 1)}</div><p><b>{post.userName}<em>{post.levelText}</em></b><span>{post.location} · {post.time}</span></p></div><p>{post.content}</p>{post.hasVoice && <button className="voice-strip">▶ ▬▬▬▬▬ {post.voiceDuration}"</button>}<footer><button>🤍 {post.likes}</button><button>💬 {post.comments}</button><span>👁️ {post.views}</span></footer></article>)}
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
          <button onClick={() => onPage('locationMap')}>📍昆明</button>
          <button onClick={() => onPage('weatherDetail')}>☀️晴 26°C</button>
        </div>
        <div className="fh-greeting-row">
          <h2>下午好，农友</h2>
          <button className={noticeRead ? 'read' : ''} onClick={() => setNoticeRead(true)}>
            🔔{noticeRead ? '已读' : ''}
          </button>
        </div>
      </section>

      <section className="fh-assistant-card">
        <div className="fh-assistant-head">
          <div className="fh-assistant-title">
            <span>🌾</span>
            <div>
              <b>农事助手</b>
              <small>今日 {todayMonthDay} · 下午好</small>
            </div>
          </div>
          <em>5项待办</em>
        </div>
        <div className="fh-progress-row">
          <div className="fh-progress"><i style={{ width: '20%' }} /></div>
          <div><span>✓ 已完成1</span><span>5项</span></div>
        </div>
        <div className="fh-fa-grid">
          <button onClick={() => onTab('farming')}><span>📅</span><b>农事日历</b><small>5项今日</small></button>
          <button onClick={() => onPage('myCrops')}><span>🌾</span><b>种植档案</b><small className="ok">4种在管</small></button>
          <button onClick={() => onPage('adoptionCenter')}><span>💰</span><b>认养订单</b><small>6单在管</small></button>
          <button onClick={() => onTab('environment')}><span>🌡️</span><b>环境监测</b><small>实时监控</small></button>
        </div>
        <div className="fh-weather-strip">
          <span>☀️</span><b>26°C</b><small>晴朗 · 适宜户外作业</small><i /> <small>💧58%</small><i /><small>🌬️3级风</small>
        </div>
        <div className="fh-ai-tip"><span>🤖</span><p>今日有小雨，建议室内整理农具，雨停后检查大棚排水</p></div>
      </section>

      <section className="fh-func-grid">
        <button onClick={() => onPage('voiceAssistant')}><span>📷</span><b>拍照识别</b></button>
        <button onClick={() => onPage('myCrops')}><span>🌱</span><b>我的作物</b></button>
        <button onClick={() => onPage('voiceAssistant')}><span>🎤</span><b>语音助手</b></button>
        <button onClick={() => onPage('warningCenter')}><span>⚠️</span><b>最新预警</b></button>
        <button onClick={() => onPage('techSupport')}><span>🔧</span><b>技术支持</b></button>
        <button onClick={() => onPage('weatherDetail')}><span>🌤️</span><b>天气详情</b></button>
      </section>

      <section className="fh-ai-card">
        <div><b>✨ AI智能决策</b><em>最新</em></div>
        <p>根据近期气象数据，建议您在3天内对番茄进行一次叶面施肥，注意保持土壤湿度在65%左右。预计本周后期有阵雨，请提前做好排水准备。</p>
        <footer><span>智能分析</span><span>数据驱动</span><button onClick={() => onPage('voiceAssistant')}>AI对话 💬</button></footer>
      </section>

      <section className="fh-reminders">
        <div className="fh-section-head"><b>📋 农事提醒</b><button onClick={() => onTab('farming')}>查看全部 ›</button></div>
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
                <button className="fsp-photo">📷 上传商品照片</button>
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
        <button className={activeTab === 'hot' ? 'active' : ''} onClick={() => setActiveTab('hot')}>🔥 热门</button>
        <button className={activeTab === 'latest' ? 'active' : ''} onClick={() => setActiveTab('latest')}>🕐 最新</button>
      </div>
      <section className="fc-post-input-area">
        <div className="fc-post-input-box">
          <input value={content} onChange={(event) => setContent(event.target.value)} placeholder="分享你的种植经验..." />
          <button className={isRecording ? 'recording' : ''} onMouseDown={() => setIsRecording(true)} onMouseUp={stopRecord} onClick={() => !isRecording && setContent((prev) => `${prev}请教大家一下，大棚湿度太高怎么办？`)}>
            {isRecording ? '🔴' : '🎙️'}
          </button>
        </div>
        <button className="fc-send-btn" onClick={publish}>发送</button>
      </section>
      {isRecording && <div className="fc-recording-toast">🔴 正在录音，松开发送...</div>}
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
              <button className={post.liked ? 'liked' : ''} onClick={() => setCommunityList((prev) => prev.map((row) => row.id === post.id ? { ...row, liked: !row.liked, likes: row.liked ? row.likes - 1 : row.likes + 1 } : row))}>{post.liked ? '❤️' : '🤍'} {post.likes}</button>
              <button onClick={() => setCommunityList((prev) => prev.map((row) => row.id === post.id ? { ...row, showComments: !row.showComments } : row))}>💬 {post.comments}</button>
              <span>👁️ {post.views}</span>
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
  safeProduct
}: {
  role: Role;
  onSwitch: () => void;
  onOpenConsumerPage?: (page: ConsumerPage) => void;
  onOpenFarmerPage?: (page: FarmerPage) => void;
  onLogin?: () => void;
  loggedIn?: boolean;
  safeProduct: (idx: number) => Product;
}) {
  if (role === 'consumer') {
    const open = (page: ConsumerPage) => onOpenConsumerPage?.(page);
    return (
      <div className="mp-profile-page">
        <header className="mp-profile-header">
          <button className="mp-profile-avatar" onClick={() => open('settings')}><img src="/assets/logo.png" alt=""/></button>
          <div><b>小满合用户</b><span>{loggedIn ? '账户已登录' : '登录后管理订单与个人资料'}</span></div>
          {loggedIn ? <button className="mp-profile-login" onClick={() => open('settings')}>设置</button> : <button className="mp-profile-login" onClick={onLogin}>登录 / 注册</button>}
        </header>
        <section className="mp-profile-panel">
          <div className="mp-profile-title"><b>我的订单</b><button onClick={() => open('orders')}>全部订单 ›</button></div>
          <div className="mp-profile-order-links">
            {[[ClipboardCheck,'待付款'],[PackageSearch,'待发货'],[Truck,'待收货'],[MessageCircle,'评价/售后']].map(([Icon,label]) => {
              const ItemIcon = Icon as typeof ClipboardCheck;
              return <button key={label as string} onClick={() => open('orders')}><ItemIcon size={23}/><span>{label as string}</span></button>;
            })}
          </div>
          <p className="mp-profile-hint">订单信息将在登录并接入服务后显示</p>
        </section>
        <section className="mp-profile-panel">
          <div className="mp-profile-title"><b>常用功能</b></div>
          {[
            ['购物车','cart'],['我的认养','adoptDetail'],['地址管理','address'],['消息通知','messages'],['服务与帮助','service'],['设置','settings']
          ].map(([label,page])=><button className="mp-profile-row" key={page} onClick={()=>open(page as ConsumerPage)}><span>{label}</span><ChevronRight size={17}/></button>)}
        </section>
        <button className="mp-profile-switch" onClick={onSwitch}>切换身份 <ChevronRight size={17}/></button>
      </div>
    );
  }

  const [quickDevices, setQuickDevices] = useState([
    { id: 1, icon: '🌀', name: '通风扇', on: true },
    { id: 2, icon: '🪟', name: '卷帘', on: true },
    { id: 3, icon: '💧', name: '滴灌系统', on: true },
    { id: 4, icon: '💡', name: '补光灯', on: false }
  ]);
  const [mineModal, setMineModal] = useState<'addCrop' | 'cropDetail' | 'historyDetail' | 'allCrops' | 'allHistory' | null>(null);
  const [selectedCrop, setSelectedCrop] = useState(farmerArchives[0]);
  const [selectedHistory, setSelectedHistory] = useState(farmerHistory[0]);
  const [cropDraft, setCropDraft] = useState({ name: '', area: '', date: '' });
  const [extraCrops, setExtraCrops] = useState<typeof farmerArchives>([]);
  const cropList = [...farmerArchives, ...extraCrops];
  const addCrop = () => {
    if (!cropDraft.name.trim() || !cropDraft.area.trim()) return;
    setExtraCrops((prev) => [...prev, {
      id: Date.now(),
      name: cropDraft.name.trim(),
      icon: '🌱',
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
      <div className="farmer-sub-sample-note">体验样板 · 账号、认证和统计数据为示例</div>
      <section className="fmy-profile-header">
        <div className="fmy-avatar-area">
          <div className="fmy-avatar">👨‍🌾</div>
          <span>💎 钻石农户</span>
        </div>
        <div className="fmy-user-info">
          <h2>张大叔</h2>
          <p>ID: FM20240088</p>
          <em>📍 云南省·昆明市</em>
        </div>
        <button className="fmy-settings">⚙️ 设置</button>
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
          <b>🌾 作物档案</b>
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
          <b>📋 历史识别记录</b>
          <button onClick={() => setMineModal('allHistory')}>更多 ›</button>
        </div>
        <div className="fmy-history-list">
          {farmerHistory.map((item) => (
            <article key={item.id} onClick={() => { setSelectedHistory(item); setMineModal('historyDetail'); }}>
              <span>{item.icon}</span>
              <div><b>{item.crop}</b><p>{item.date} · {item.desc}</p></div>
              <em>{item.status}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="fmy-community-entry" onClick={() => onOpenFarmerPage?.('community')}>
        <div><span>🏘️</span><p><b>农友社区</b><small>与全国农友交流种植经验</small></p></div>
        <em>›</em>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head"><b>📌 今日速览</b><span>{todayMonthDay} · {weekdayText}</span></div>
        <div className="fmy-today-grid">
          <button onClick={() => onOpenFarmerPage?.('weatherDetail')}><span>🌤️</span><b>天气</b><em>晴 26°C</em><small>适宜作业</small></button>
          <button><span>📋</span><b>待办</b><em>5项</em><small>2已完成</small></button>
          <button onClick={() => onOpenFarmerPage?.('myDevice')}><span>📡</span><b>设备</b><em>6/6</em><small>全部在线</small></button>
          <button onClick={() => onOpenFarmerPage?.('warningCenter')}><span>🔔</span><b>提醒</b><em>4条</em><small>1条紧急</small></button>
        </div>
      </section>

      <section className="fmy-section">
        <div className="fmy-section-head"><b>⚙️ 设备快捷</b><button onClick={() => onOpenFarmerPage?.('myDevice')}>管理 ›</button></div>
        <div className="fmy-quick-device">
          {quickDevices.map((device) => (
            <button key={device.id} className={device.on ? 'on' : ''} onClick={() => setQuickDevices((prev) => prev.map((row) => row.id === device.id ? { ...row, on: !row.on } : row))}>
              <span>{device.icon} {device.name}</span>
              <em>{device.on ? '运行中' : '已关闭'}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="fmy-alert-card">
        <div><span>⛅</span><b>明日天气预报</b><em>{tomorrowMonthDay}</em></div>
        <p>多云转晴 · 18~27°C。东南风3级，湿度62%，无降水，适合追肥和病虫害防治。</p>
        <footer><span>☀️ 适宜户外作业</span><span>💧 注意午间补水</span></footer>
      </section>

      <section className="fmy-alert-list">
        {[
          { icon: '🍅', title: '番茄追肥提醒', badge: '紧急', desc: '高原番茄进入花期，建议今日下午追加磷钾肥。', time: '今天 15:00 前' },
          { icon: '🌶️', title: '辣椒蚜虫复查', badge: '待处理', desc: '线椒蚜虫喷药已过3天，请检查虫口密度是否下降。', time: '明天 上午' }
        ].map((item) => (
          <article key={item.title}><div><span>{item.icon}</span><b>{item.title}</b><em>{item.badge}</em></div><p>{item.desc}</p><small>🕐 {item.time}</small></article>
        ))}
      </section>
      <button className="secondary-btn wide" onClick={onSwitch}>切换身份</button>
      {mineModal && (
        <div className="farmer-modal-mask" onClick={() => setMineModal(null)}>
          <section className={`farmer-modal-card ${mineModal === 'addCrop' || mineModal === 'allCrops' || mineModal === 'allHistory' ? 'large' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="farmer-modal-head">
              <b>
                {mineModal === 'addCrop' && '📋 添加作物档案'}
                {mineModal === 'cropDetail' && '🌾 作物详情'}
                {mineModal === 'historyDetail' && '📋 识别记录详情'}
                {mineModal === 'allCrops' && `🌾 我的作物档案（共${cropList.length}个）`}
                {mineModal === 'allHistory' && `📋 历史识别记录（共${farmerHistory.length}条）`}
              </b>
              <button onClick={() => setMineModal(null)}>×</button>
            </div>
            {mineModal === 'addCrop' && (
              <div className="farmer-add-crop-form">
                <label>作物名称<input value={cropDraft.name} onChange={(event) => setCropDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="例如：冰糖橙" /></label>
                <label>种植面积（亩）<input value={cropDraft.area} onChange={(event) => setCropDraft((prev) => ({ ...prev, area: event.target.value }))} placeholder="例如：10" inputMode="decimal" /></label>
                <label>定植日期<input value={cropDraft.date} onChange={(event) => setCropDraft((prev) => ({ ...prev, date: event.target.value }))} type="date" /></label>
                <div className="farmer-upload-placeholder"><span>📷</span><b>＋ 上传照片</b><small>支持相册/相机上传</small></div>
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
                <p><b>📝 备注</b>{selectedCrop.note}</p>
              </div>
            )}
            {mineModal === 'historyDetail' && (
              <div className="farmer-history-detail-modal">
                <div><span>{selectedHistory.icon}</span><h3>{selectedHistory.crop}</h3></div>
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
                {farmerHistory.map((item) => <button key={item.id} onClick={() => { setSelectedHistory(item); setMineModal('historyDetail'); }}><span>{item.icon}</span><div><b>{item.crop}</b><small>{item.date}</small></div><em>{item.status}</em></button>)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function FarmerSubPageMP({ page, onBack, onPage }: { page: FarmerPage; onBack: () => void; onPage: (page: FarmerPage) => void }) {
  const titles: Record<Exclude<FarmerPage, 'tabs'>, string> = {
    myCrops: '🌱 我的作物',
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
    farmerOrders: '订单管理',
    farmerOrderDetail: '订单详情'
  };
  return (
    <div className="farmer-mp sub-mp">
      <header className="mp-sub-nav">
        <button onClick={onBack}>← 返回</button>
        <b>{titles[page as Exclude<FarmerPage, 'tabs'>]}</b>
        <span />
      </header>
      <div className="farmer-sub-sample-note">体验样板 · 本页显示的数据与状态为示例内容</div>
      {page === 'myCrops' && <FarmerCropsPageMP onDetail={() => onPage('cropDetail')} />}
      {page === 'cropDetail' && <FarmerCropDetailPageMP />}
      {page === 'warningCenter' && <FarmerWarningPageMP />}
      {page === 'adoptionCenter' && <FarmerAdoptionOrdersMP />}
      {page === 'myDevice' && <FarmerDevicePageMP />}
      {page === 'techSupport' && <FarmerTechSupportMP />}
          {page === 'weatherDetail' && <FarmerWeatherPageMP />}
          {page === 'voiceAssistant' && <FarmerVoiceAssistantMP />}
          {page === 'locationMap' && <FarmerLocationMapMP />}
          {page === 'community' && <CommunityMP />}
          {page === 'farmerSettings' && <FarmerSettingsMP />}
      {(page === 'farmerOrders' || page === 'farmerOrderDetail') && <div className="farmer-orders-empty"><b>农户订单服务尚未接入</b><p>当前没有可查询的真实订单记录。</p></div>}
    </div>
  );
}

function FarmerSettingsMP() {
  return (
    <div className="farmer-settings-mp">
      <section className="farmer-settings-card">
        <div className="farmer-settings-user">
          <img src="/assets/logo.png" alt="" />
          <div>
            <b>小满合农户</b>
            <span>云南昆明 · 智慧种植示范基地</span>
          </div>
          <em>已认证</em>
        </div>
      </section>
      <section className="farmer-settings-card">
        {[
          ['账号与安全', '手机号、实名认证、登录设备'],
          ['基地资料', '种植主体、基地地址、经营资质'],
          ['消息通知', '预警、订单、设备离线提醒'],
          ['隐私与权限', '相机、麦克风、定位授权'],
          ['数据同步', '本地缓存、云端备份、离线记录']
        ].map(([title, desc]) => (
          <button className="farmer-settings-row" key={title}>
            <span><b>{title}</b><small>{desc}</small></span>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>
      <section className="farmer-settings-card">
        <button className="farmer-settings-row">
          <span><b>关于小满合</b><small>版本 1.0.0 · 服务协议与隐私政策</small></span>
          <ChevronRight size={17} />
        </button>
      </section>
    </div>
  );
}

function FarmerCropsPageMP({ onDetail }: { onDetail: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="crop-page-mp">
      <section className="crop-stats-card">
        <span><b>{mpCrops.length}</b>种植总数</span><i /><span><b>2</b>生长中</span><i /><span><b>1</b>待采收</span>
      </section>
      <section className="crop-list-mp">
        {mpCrops.map((crop) => <article className="crop-card-mp" key={crop.id} onClick={onDetail}><i style={{ background: crop.color }} /><div><div className="crop-top-row"><b><span>{crop.icon}</span>{crop.name}</b><em className={crop.status}>{crop.statusText}</em></div><div className="progress-header"><span>生长进度</span><b>{crop.progress}%</b></div><div className="mp-progress"><i style={{ width: `${crop.progress}%`, background: crop.color }} /></div><div className="info-grid"><span>种植时间<b>{crop.plantDate}</b></span><span>预计采收<b>{crop.expectHarvest}</b></span><span>种植面积<b>{crop.area}</b></span><span>健康状态<b>{crop.healthStatus}</b></span></div><footer>📍 {crop.greenhouse}<small>距采收 {crop.daysToHarvest}天</small></footer></div><strong>›</strong></article>)}
      </section>
      <button className="floating-add" onClick={() => setShowAdd(true)}>＋ 添加作物</button>
      {showAdd && <div className="farmer-modal-mask" onClick={() => setShowAdd(false)}><section className="mp-sheet" onClick={(event) => event.stopPropagation()}><div className="farmer-modal-head"><b>🌱 添加新作物</b><button onClick={() => setShowAdd(false)}>×</button></div><div className="mp-form"><label>作物名称<input placeholder="如：番茄、辣椒、黄瓜" /></label><label>种植日期<input type="date" /></label><label>预计采收<input type="date" /></label><label>种植位置<input placeholder="如：A区1号棚" /></label><button className="mp-primary" onClick={() => setShowAdd(false)}>确认添加</button></div></section></div>}
    </div>
  );
}

function FarmerCropDetailPageMP() {
  const crop = mpCrops[0];
  return (
    <div className="crop-detail-mp">
      <section className="detail-header-mp" style={{ background: `linear-gradient(160deg, ${crop.color}, ${crop.color}99 55%, #F5F7FA)` }}>
        <div className="hero-card"><div className="hero-icon-wrap">{crop.icon}</div><h2>{crop.name}</h2><p>樱桃番茄 · 开花坐果期</p><div><em>{crop.statusText}</em><em>{crop.healthStatus}</em></div><div className="progress-ring"><b>{crop.progress}</b><span>%</span><small>生长进度</small></div></div>
      </section>
      <section className="section-card"><div className="mp-section-title"><b>📋 基本信息</b></div><div className="info-grid-detail">{['品种|阳光小番茄', '位置|A区1号棚', '面积|3.2亩', '已生长|72天'].map((row) => { const [label, value] = row.split('|'); return <article key={label}><span>{label}</span><b>{value}</b></article>; })}</div></section>
      <section className="section-card"><div className="mp-section-title"><b>🌿 生长阶段</b></div><div className="timeline-mp">{['播种建档', '移栽定植', '开花坐果', '采收入库'].map((item, index) => <p key={item} className={index <= 2 ? 'active' : ''}><i />{item}<span>{index < 2 ? '已完成' : index === 2 ? '进行中' : '待开始'}</span></p>)}</div></section>
      <section className="section-card"><div className="mp-section-title"><b>📝 最近农事记录</b><button>查看全部 ›</button></div>{['6-12 追肥：追加磷钾肥', '6-10 巡检：叶片健康', '6-08 浇水：滴灌20分钟'].map((item) => <article className="record-item" key={item}>{item}</article>)}</section>
      <section className="section-card env-grid-detail">{['棚内温度 26°C', '空气湿度 71%', '土壤pH 6.8', '光照 18200lux'].map((item) => <span key={item}>{item}</span>)}</section>
    </div>
  );
}

function FarmerWarningPageMP() {
  const [tab, setTab] = useState<'all' | 'weather' | 'device' | 'crop'>('all');
  const [status, setStatus] = useState<'open' | 'processing' | 'done'>('open');
  const [warnings, setWarnings] = useState([
    { id: 1, cat: 'weather', icon: '🌧️', title: '强降雨风险预警', target: '昆明基地 · 全园区', desc: '未来6小时可能出现短时强降雨，低洼地块有积水风险。', advice: '立即检查排水沟、关闭低位配电箱，并暂停露天施肥作业。', level: 'red', levelText: '紧急', time: '10分钟前', read: false, state: 'open', metric: '降雨量', value: '38mm', threshold: '25mm' },
    { id: 2, cat: 'device', icon: '📡', title: '1号棚温度过高', target: '温湿度传感器 TH-01', desc: '棚内温度持续 20 分钟高于安全阈值，影响番茄坐果。', advice: '建议开启通风扇和卷膜机，10分钟后复查温度曲线。', level: 'orange', levelText: '重要', time: '20分钟前', read: false, state: 'processing', metric: '当前温度', value: '31.6°C', threshold: '28°C' },
    { id: 3, cat: 'crop', icon: '🌱', title: '小番茄灰霉病风险', target: '阳光番茄 · A区1号棚', desc: '叶面湿度偏高且夜间温差变大，灰霉病风险升高。', advice: '加强通风，摘除病残叶，必要时使用低毒保护性药剂。', level: 'yellow', levelText: '提醒', time: '1小时前', read: true, state: 'open', metric: '风险指数', value: '72', threshold: '60' },
    { id: 4, cat: 'device', icon: '📹', title: '北门摄像头离线', target: '摄像头 CAM-04', desc: '设备已离线 3 小时，无法上传画面。', advice: '检查供电和网络，必要时重启网关。', level: 'blue', levelText: '一般', time: '3小时前', read: true, state: 'done', metric: '离线时长', value: '3h', threshold: '30min' }
  ]);
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
            <span>⚠️</span>
            {unread > 0 && <em>{unread}</em>}
          </div>
          <div>
            <b>预警中心</b>
            <small>{unread > 0 ? `您有 ${unread} 条未读预警需要关注` : '当前预警均已读取，继续保持监测'}</small>
          </div>
        </div>
        <div className="summary-stats">
          <button className={tab === 'weather' ? 'active' : ''} onClick={() => setTab('weather')}>🌧️<b>{counts.weather}</b><span>天气</span></button>
          <i />
          <button className={tab === 'device' ? 'active' : ''} onClick={() => setTab('device')}>📡<b>{counts.device}</b><span>设备</span></button>
          <i />
          <button className={tab === 'crop' ? 'active' : ''} onClick={() => setTab('crop')}>🌱<b>{counts.crop}</b><span>作物</span></button>
        </div>
      </section>

      <section className="warn-control-card">
        <div className="warn-tabs">{(['all', 'weather', 'device', 'crop'] as const).map((id) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{id === 'all' ? '全部' : id === 'weather' ? '天气预警' : id === 'device' ? '设备预警' : '作物提示'}</button>)}</div>
        <div className="warn-status-tabs">{(['open', 'processing', 'done'] as const).map((id) => <button key={id} className={status === id ? 'active' : ''} onClick={() => setStatus(id)}>{id === 'open' ? '待处理' : id === 'processing' ? '处理中' : '已处理'}</button>)}</div>
        <button className="warn-read-all" onClick={markAllRead}>📋 全部标记已读</button>
      </section>

      <section className="warn-list">
        {list.length === 0 && <div className="warn-empty"><span>✓</span><b>该分类下暂无预警</b><p>系统将持续监测天气、设备和作物风险。</p></div>}
        {list.map((item) => (
          <article className={`warn-card warn-${item.level} ${item.cat}`} key={item.id}>
            <i />
            <div className="warn-card-body">
              <div className="warn-card-top">
                <em>{item.levelText}</em>
                <span>{item.read ? '已读' : '未读'} · {item.time}</span>
              </div>
              <div className="warn-card-title">
                <span>{item.icon}</span>
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
  const [orders, setOrders] = useState([
    { id: 1, icon: '🍊', bg: '#FFF3E0', productName: '冰糖橙树 #001', packageName: '橙子树认养 · 年度方案', customerName: '李女士', phone: '138****5678', quantity: '1棵', amount: '199.00', start: '2026-01-15', harvest: '2026年11月', address: '云南省昆明市五华区xx路xx小区3栋201室', remark: '希望收获季多拍一些果树照片发给我', status: '生长中', key: 'growing', progress: 65, stage: '果实膨大期，预计11月中旬成熟', canShip: false },
    { id: 2, icon: '🥬', bg: '#E8F5E9', productName: '有机蔬菜地 #A07', packageName: '蔬菜地认养 · 季度方案', customerName: '赵女士', phone: '135****2345', quantity: '1块', amount: '99.00', start: '2026-03-15', harvest: '2026年6月', address: '云南省曲靖市麒麟区xx街xx花园5栋102', remark: '', status: '待发货', key: 'ready', progress: 82, stage: '第一季蔬菜已采收，待安排配送', canShip: true },
    { id: 3, icon: '🍓', bg: '#FCE4EC', productName: '草莓大棚 #B02', packageName: '草莓大棚认养 · 季度方案', customerName: '张阿姨', phone: '137****9876', quantity: '1个区域', amount: '299.00', start: '2026-03-10', harvest: '2026年6月底', address: '云南省丽江市古城区xx路xx号', remark: '第一次认养草莓，很期待', status: '生长中', key: 'growing', progress: 25, stage: '苗期生长阶段，开花中', canShip: false }
  ]);
  const totalIncome = orders.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(0);
  return (
    <div className="ac-page-mp">
      <section className="ac-header-section-mp">
        <span className="ac-bg one">🌾</span><span className="ac-bg two">🍃</span><span className="ac-bg three">☁️</span>
        <div className="ac-header-content-mp">
          <h2>☁️ 云认养管理中心</h2>
          <p>实时查看消费者认养您的农产品情况</p>
        </div>
        <div className="ac-stats-card-mp">
          <span><b>{orders.length}</b><em>认养订单</em></span>
          <span><b>¥{totalIncome}</b><em>认养收入</em></span>
          <span><b>6</b><em>认养粉丝</em></span>
        </div>
      </section>
      <section className="ac-category-row-mp">
        {['🍊 橙子树认养 1单', '🥬 蔬菜地认养 1单', '🍓 草莓大棚 1单', '🍵 茶园认养 0单'].map((item) => <button key={item}>{item}</button>)}
      </section>
      <div className="ac-list-header-mp"><b>📋 认养订单详情</b><span>共 {orders.length} 条记录</span></div>
      <section className="ac-order-list-mp">
        {orders.map((item) => (
          <article className="ac-order-card-mp" key={item.id}>
            <div className="aoc-top-mp">
              <div className="aoc-product-mp"><span style={{ background: item.bg }}>{item.icon}</span><div><b>{item.productName}</b><small>方案：{item.packageName}</small></div></div>
              <em className={item.key}>{item.status}</em>
            </div>
            <div className="aoc-customer-row-mp">👤 <b>{item.customerName}</b><span>{item.phone}</span></div>
            <div className="aoc-detail-grid-mp">
              <span>认养数量<b>{item.quantity}</b></span>
              <span>认养金额<b>¥{item.amount}</b></span>
              <span>开始日期<b>{item.start}</b></span>
              <span>预计收获<b>{item.harvest}</b></span>
            </div>
            <p className="aoc-shipping-mp">📍 收货地址：{item.address}</p>
            {item.remark && <p className="aoc-remark-mp">📝 备注：{item.remark}</p>}
            <div className="aoc-growth-section-mp"><div><b>🌱 生长进度</b><span>{item.progress}%</span></div><i><em style={{ width: `${item.progress}%` }} /></i><p>{item.stage}</p></div>
            <footer>
              <button>📱 联系认养人</button>
              <button>🌿 查看生长</button>
              {item.canShip && <button onClick={() => setOrders((prev) => prev.map((row) => row.id === item.id ? { ...row, status: '已发货', key: 'shipped', canShip: false, progress: 100, stage: '已安排冷链配送，等待消费者确认收货' } : row))}>🚚 安排发货</button>}
            </footer>
          </article>
        ))}
      </section>
    </div>
  );
}

function FarmerDevicePageMP() {
  const [devices, setDevices] = useState([...stationDevicesMock, ...cameraDevicesMock].map((item, index) => ({ ...item, isEnabled: index < 5 })));
  const [addOpen, setAddOpen] = useState(false);
  const stationRows = devices.filter((item) => item.id < 100);
  const cameraRows = devices.filter((item) => item.id >= 100);
  const toggleDevice = (id: number) => setDevices((prev) => prev.map((row) => row.id === id ? { ...row, isEnabled: !row.isEnabled } : row));
  const groups = [
    { icon: '🌡️', title: '监测站设备', rows: stationRows, cam: false },
    { icon: '📹', title: '摄像头设备', rows: cameraRows, cam: true }
  ];
  return (
    <div className="device-mp device-replica">
      <section className="device-summary-card">
        <div>
          <span>📡</span>
          <p><b>{devices.filter((item) => item.isOnline).length}/{devices.length}</b><small>设备在线</small></p>
        </div>
        <div>
          <span>⚙️</span>
          <p><b>{devices.filter((item) => item.isEnabled).length}</b><small>已启用</small></p>
        </div>
        <button onClick={() => setAddOpen(true)}>＋ 添加</button>
      </section>

      {groups.map((group) => (
        <section className="md-section" key={group.title}>
          <div className="md-section-title">
            <span>{group.icon}</span>
            <b>{group.title}</b>
            <em>({group.rows.length})</em>
          </div>
          <div className="md-device-list">
            {group.rows.map((device) => (
              <article className={`md-device-card ${device.isOnline ? 'card-online' : 'card-offline'}`} key={device.id}>
                <div className={`md-dev-icon-wrap ${group.cam ? 'cam-icon' : ''} ${device.isOnline ? 'icon-online' : 'icon-offline'}`}>
                  <span>{group.icon}</span>
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
            <button onClick={() => setAddOpen(false)}>🌡️ 添加监测站传感器</button>
            <button onClick={() => setAddOpen(false)}>📹 添加摄像头设备</button>
            <button onClick={() => setAddOpen(false)}>▣ 扫码添加</button>
          </section>
        </div>
      )}
    </div>
  );
}

function FarmerTechSupportMP() {
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
  const experts = [
    { name: '李明远', role: '高级农艺师', org: '云南省农科院蔬菜所', avatar: '李', online: true, rating: '4.9', consult: 326, response: '15分钟内响应', fields: ['番茄', '辣椒', '病虫害'], goodAt: '设施蔬菜花果期管理、灰霉病/蚜虫综合防治。' },
    { name: '王秀兰', role: '植保专家', org: '昆明植保服务站', avatar: '王', online: true, rating: '4.8', consult: 241, response: '30分钟内响应', fields: ['植保', '用药', '诊断'], goodAt: '病斑识别、绿色防控、农药安全间隔期方案。' },
    { name: '周建国', role: '农机工程师', org: '云耕农机合作社', avatar: '周', online: false, rating: '4.7', consult: 188, response: '明日 09:00 可约', fields: ['农机', '滴灌', '网关'], goodAt: '滴灌阀、卷膜机、网关联网和农机作业排期。' }
  ];
  const orders = [
    { title: '1号棚温湿度传感器校准', status: '处理中', time: '今天 10:20', owner: '王工', progress: 60 },
    { title: '无人机飞防 · 番茄A区 12亩', status: '已预约', time: '明天 08:30', owner: '云耕飞防队', progress: 35 },
    { title: '土壤采样检测报告', status: '已完成', time: '昨天 17:40', owner: '平台实验室', progress: 100 }
  ];
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
            <article className="tech-expert-card" key={expert.name}>
              <div className="expert-avatar-pro"><span>{expert.avatar}</span><i className={expert.online ? 'online' : ''} /></div>
              <div className="expert-main">
                <div className="expert-name-row"><b>{expert.name}</b><em>{expert.role}</em></div>
                <p>{expert.org}</p>
                <div className="expert-fields-pro">{expert.fields.map((field) => <span key={field}>{field}</span>)}</div>
                <small>{expert.goodAt}</small>
                <footer><span>⭐ {expert.rating}</span><span>咨询{expert.consult}次</span><span>{expert.response}</span></footer>
              </div>
              <button onClick={() => setSheet({ title: `${expert.name} · ${expert.role}`, action: '发起咨询' })}>咨询</button>
            </article>
          ))}
        </section>
      )}

      {tab === 'orders' && (
        <section className="tech-order-list">
          {orders.map((order) => (
            <article key={order.title}>
              <div><b>{order.title}</b><em>{order.status}</em></div>
              <p>{order.time} · 负责人：{order.owner}</p>
              <i><span style={{ width: `${order.progress}%` }} /></i>
              <button>查看工单</button>
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

function FarmerWeatherPageMP() {
  const hours = [
    ['现在', '☀️', '26°', '58%'],
    ['12:00', '☀️', '28°', '54%'],
    ['15:00', '🌤️', '29°', '52%'],
    ['18:00', '🌦️', '25°', '66%'],
    ['21:00', '🌙', '22°', '72%'],
    ['00:00', '🌙', '19°', '76%']
  ];
  const days = [
    ['今天', '周三', '☀️', '晴', '29°', '18°', '适宜通风'],
    ['明天', '周四', '🌦️', '阵雨', '27°', '19°', '暂停打药'],
    ['6/19', '周五', '⛅', '多云', '28°', '18°', '适宜追肥'],
    ['6/20', '周六', '🌧️', '小雨', '24°', '17°', '防积水'],
    ['6/21', '周日', '☀️', '晴', '30°', '20°', '加强补水']
  ];
  const fieldRisks = [
    { name: '1号番茄棚', risk: '中', desc: '午后棚温偏高，建议 13:00 后通风。', color: '#ff9800' },
    { name: '露天A区玉米', risk: '低', desc: '风力较小，适合追肥和巡田。', color: '#43a047' },
    { name: '2号辣椒棚', risk: '中', desc: '夜间湿度上升，注意灰霉病预防。', color: '#ff9800' }
  ];
  return (
    <div className="weather-mp weather-replica">
      <section className="current-weather">
        <div className="weather-city-row"><div><b>昆明 · 智慧农业示范基地</b><span>更新于 10:30 · 自动站 TH-01</span></div><button>切换基地</button></div>
        <div className="weather-main"><span>☀️</span><strong>26°</strong><div><b>晴</b><small>能见度 12km</small></div></div>
        <p>今日适宜户外作业，午后棚内温度升高，注意通风和补水。</p>
      </section>

      <section className="weather-detail-grid">
        {[
          ['🌡️', '体感温度', '27°C'],
          ['💧', '空气湿度', '58%'],
          ['🌬️', '风力风向', '东南风3级'],
          ['🌧️', '降水概率', '12%'],
          ['📈', '气压', '1012hPa'],
          ['☀️', '紫外线', '中等']
        ].map(([icon, label, value]) => <article key={label}><span>{icon}</span><small>{label}</small><b>{value}</b></article>)}
      </section>

      <section className="weather-aqi-card">
        <div><b>空气质量</b><em>优</em></div>
        <div className="aqi-main-pro"><strong>38</strong><p>AQI 指数 · PM2.5 18 · PM10 34<br />适宜开窗通风和户外农事作业。</p></div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>24小时农业气象</b><span>温度 / 湿度</span></div>
        <div className="weather-hour-scroll">{hours.map(([time, icon, temp, hum]) => <article key={time}><span>{time}</span><b>{icon}</b><strong>{temp}</strong><small>{hum}</small></article>)}</div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>未来5天趋势</b><span>作业建议</span></div>
        <div className="weather-day-list">
          {days.map(([date, week, icon, desc, high, low, tip]) => <article key={date}><div><b>{date}</b><span>{week}</span></div><em>{icon}</em><p>{desc}</p><strong>{high}/{low}</strong><small>{tip}</small></article>)}
        </div>
      </section>

      <section className="weather-section">
        <div className="weather-section-title"><b>地块气象风险</b><span>实时评估</span></div>
        <div className="field-risk-list">
          {fieldRisks.map((item) => <article key={item.name}><i style={{ background: item.color }} /><div><b>{item.name}</b><p>{item.desc}</p></div><em style={{ color: item.color }}>风险{item.risk}</em></article>)}
        </div>
      </section>

      <section className="weather-farm-index">
        <div className="weather-section-title"><b>🌾 农事指数</b><span>今日建议</span></div>
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
  return (
    <div className="farmer-ai-diagnosis-page farmer-ai-unavailable">
      <section className="farmer-ai-hero">
        <div><span>农事服务</span><h2>智能农事助手</h2><p>拍照识别、语音问诊和自动处置建议暂未开通。</p></div>
        <Bot size={38} />
      </section>
      <section className="farmer-ai-unavailable-card"><b>服务尚未接入</b><p>当前页面不读取相机、麦克风或实时农场数据，也不会生成病害诊断。需要农事建议时，请联系当地农技人员核实。</p></section>
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
    farmerOrders: '订单管理',
    farmerOrderDetail: '订单详情'
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
        <div className="farmer-v2-crop-icon big">🍅</div>
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
  onTraceResult
}: {
  page: ConsumerPage;
  product: Product;
  cartItems: CartItem[];
  onBack: () => void;
  onPage: (page: ConsumerPage) => void;
  onAddCart: (product: Product, spec: string) => void;
  onUpdateCartQuantity: (productId: number, spec: string, nextQuantity: number) => void;
  onRemoveCartItem: (productId: number, spec: string) => void;
  addresses: Address[];
  selectedAddress: Address | null;
  onSelectAddress: (address: Address | null) => void;
  onAddressesChanged: () => Promise<void>;
  orders: OrderRecord[];
  activeOrder: OrderRecord | null;
  onSelectOrder: (order: OrderRecord | null) => void;
  onCheckout: () => void;
  onPay: () => Promise<void>;
  notify: (message: string) => void;
  onLogout: () => void;
  onIdentity: () => void;
  onLogin: () => void;
  loggedIn: boolean;
  safeProduct: (idx: number) => Product;
  traceTimeline: TraceStep[];
  products: Product[];
  categories: AppCategory[];
  productError: string;
  productSource: ApiDataSource;
  categorySource: ApiDataSource;
  canPurchase: boolean;
  onCartTab: () => void;
  category: CategoryId;
  setCategory: (category: CategoryId) => void;
  onProductSelected: (product: Product) => void;
  onTraceResult: (result: { events: TraceStep[] }) => void;
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
    adoptDetail: '认养详情',
    adoptConfirm: '确认认养',
    adoptSuccess: '认养成功',
    traceResult: '溯源结果'
  };

  return (
    <div className="sub-page-red">
      <header className="sub-nav-red">
        <button className="sub-back-visible" onClick={onBack} aria-label="返回"><ChevronLeft size={18} />返回</button>
        <strong>{titles[page as Exclude<ConsumerPage, 'tabs'>]}</strong>
        <span />
      </header>
      <div className="sub-content-red">
        {page === 'mall' && <Mall category={category} setCategory={setCategory} categories={categories} products={products} productError={productError} source={productSource} categorySource={categorySource} canPurchase={canPurchase} notify={notify} onAddCart={(item) => onAddCart(item, item.unit)} onProduct={onProductSelected} />}
        {page === 'trace' && <Trace onResult={() => onPage('traceResult')} notify={notify} traceTimeline={traceTimeline} safeProduct={safeProduct} onTraceResult={onTraceResult} />}
        {page === 'productDetail' && <ProductDetail product={product} canPurchase={canPurchase} notify={notify} onCart={onCartTab} onTrace={() => onPage('trace')} onAddCart={onAddCart} onBuy={() => onCartTab()} />}
        {page === 'cart' && <CartPage cartItems={cartItems} onCheckout={onCheckout} onShop={() => onPage('tabs')} onUpdateQuantity={onUpdateCartQuantity} onRemove={onRemoveCartItem} />}
        {page === 'checkout' && <CheckoutPage cartItems={cartItems} address={selectedAddress} onPay={onPay} onAddress={() => onPage('address')} />}
        {page === 'paySuccess' && <PaySuccessPage onOrders={() => onPage('orders')} onDetail={() => onPage('orderDetail')} />}
        {page === 'orders' && <OrdersPage orders={orders} loggedIn={loggedIn} onLogin={onLogin} notify={notify} onDetail={(order) => { onSelectOrder(order); onPage('orderDetail'); }} />}
        {page === 'orderDetail' && <OrderDetailPage order={activeOrder} />}
        {page === 'address' && <AddressPage addresses={addresses} selectedAddress={selectedAddress} onSelect={onSelectAddress} onChanged={onAddressesChanged} notify={notify} />}
        {page === 'messages' && <MessagesPage onPage={onPage} />}
        {page === 'service' && <ServicePage onOrders={() => onPage('orders')} />}
        {page === 'settings' && <SettingsPage loggedIn={loggedIn} onLogout={onLogout} onIdentity={onIdentity} onLogin={onLogin} onPrivacy={() => onPage('privacy')} />}
        {page === 'privacy' && <PrivacyPage />}
        {page === 'adoptDetail' && <div className="mp-adopt-detail"><img src="/assets/miniprogram/hero-farm.jpg" alt=""/><span>体验样板 · 场景示意</span><h2>和一季新鲜，慢慢相遇</h2><p>当前展示的是图文体验样板，没有真实农场、认养交易、作物实时状态或配送服务。</p><button onClick={() => onPage('adoptConfirm')}>查看服务状态</button></div>}
        {page === 'adoptConfirm' && <div className="mp-trace-unavailable"><img src="/assets/miniprogram/farmer-icons/plant.png" alt=""/><h2>认养服务尚未开通</h2><p>当前仅支持浏览与本机关注体验项目，不会创建认养订单或收取费用。</p></div>}
        {page === 'adoptSuccess' && <div className="mp-trace-unavailable"><h2>没有认养订单</h2><p>认养服务尚未开通，页面样板不会生成成功订单。</p></div>}
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
  onAddCart: (product: Product, spec: string) => void;
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
  return <div className="mp-product-detail"><img className="mp-product-image" src={product.image} alt=""/><section><h1>{product.name}</h1><p>{product.origin || '产地信息待补充'}{product.unit ? ` · ${product.unit}` : ''}</p>{canPurchase && product.price > 0 ? <strong>¥{product.price}</strong> : <em>待上架 · 商品资料预览</em>}</section><section className="mp-product-note"><b>商品信息</b><p>{product.description || '当前展示商品基础资料。供货、检测、溯源及配送信息以服务端实际接入内容为准。'}</p><small>批次追溯服务尚未开放</small></section><section className="mp-product-actions"><button onClick={onCart}>购物车</button><button disabled={!canPurchase} onClick={() => { if (canPurchase) { onAddCart(product, spec); setAdded(true); window.setTimeout(() => setAdded(false), 1200); } }}>{canPurchase ? added ? '已加入' : '加入购物车' : '暂不可购买'}</button></section></div>;
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

  const buyNow = () => {
    if (!canPurchase) { notify('商品资料预览，交易服务尚未接入'); return; }
    onAddCart(product, spec);
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
          <span>12分钟前 赵** 拼单成功</span>
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
        <div className="trace-section-head"><b>买家真实评价</b><span>好评率 98.6%</span></div>
        <div className="review-score-row">
          <strong>4.9</strong>
          <span><Star size={14} fill="currentColor" /> 新鲜度高 · 发货快 · 可溯源</span>
        </div>
        <p>“包装很扎实，口感比超市买的新鲜，扫码能看到采摘和检测记录，给家里老人买也放心。”</p>
        <div><span>复购 3 次</span><span>物流很快</span><span>新鲜度高</span></div>
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
  onUpdateQuantity: (productId: number, spec: string, nextQuantity: number) => void;
  onRemove: (productId: number, spec: string) => void;
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
        <h3>小满合产地店</h3>
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

function OrdersPage({ orders, loggedIn, onLogin, onDetail, notify: _notify }: { orders: OrderRecord[]; loggedIn: boolean; onLogin: () => void; onDetail: (order: OrderRecord) => void; notify: (message: string) => void }) {
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
          <div className="order-head-red"><b>小满合产地店</b><span>{item.label}</span></div>
          <div className="order-body-red"><img src={item.product?.image || ''} alt="" /><div><h3>{item.product?.name || '订单商品'}</h3><p>{item.product ? `数量 x ${item.product.quantity}` : ''}</p><strong>¥{item.order.totalAmount}</strong><small>订单号 {item.order.orderNo}</small></div></div>
          <div className="order-actions-red">
            <button onClick={() => onDetail(item.order)}>订单详情</button>
            <button className="primary" onClick={() => onDetail(item.order)}>查看订单</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function OrderDetailPage({ order }: { order: OrderRecord | null }) {
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
  return (
    <div className="messages-red mp-unavailable-page">
      <section className="mp-unavailable-intro"><b>消息中心</b><span>订单与农场更新</span></section>
      <section className="empty-state-red"><MessageCircle size={34}/><h3>通知服务暂未开通</h3><p>开通后，订单通知和认养更新将在这里展示。</p></section>
      <section className="mp-shortcut-card"><button onClick={() => onPage('orders')}>查看我的订单 <ChevronRight size={17}/></button><button onClick={() => onPage('adoptDetail')}>查看我的认养 <ChevronRight size={17}/></button></section>
    </div>
  );
}

function ServicePage({ onOrders }: { onOrders: () => void }) {
  return (
    <div className="service-red mp-unavailable-page">
      <section className="mp-unavailable-intro"><b>服务与帮助</b><span>人工客服服务暂未开通</span></section>
      <section className="empty-state-red"><MessageCircle size={34}/><h3>客服服务暂未开通</h3><p>当前无法创建咨询或售后工单。订单相关信息可在订单页面查看。</p><button onClick={onOrders}>查看我的订单</button></section>
    </div>
  );
}

function SettingsPage({ loggedIn, onLogout, onIdentity, onLogin, onPrivacy }: { loggedIn: boolean; onLogout: () => void; onIdentity: () => void; onLogin: () => void; onPrivacy: () => void }) {
  return (
    <div className="settings-red mp-settings-page">
      <section className="mp-shortcut-card">
        <button onClick={onPrivacy}><span>账户数据与隐私说明</span><ChevronRight size={17}/></button>
        <button onClick={onIdentity}><span>切换使用身份</span><ChevronRight size={17}/></button>
      </section>
      {loggedIn ? <button className="logout-red" onClick={() => { if (window.confirm('本机会话将移除，重新登录后可继续查看订单和地址。')) onLogout(); }}>退出当前账户</button> : <button className="mp-login-button" onClick={onLogin}>登录</button>}
      <section className="mp-settings-about"><b>小满合</b><span>新鲜农货 · 产品溯源 · 云认养</span></section>
    </div>
  );
}

function PrivacyPage() {
  return <div className="mp-privacy-page"><section><h3>账户数据说明</h3><p>登录时，账户服务会确认身份并返回账户资料和登录会话。会话保存在本机，用于读取购物车、订单与收货地址。退出登录会移除本机会话。</p><h3>查询记录</h3><p>搜索关键词保存在当前设备。小满的商品查询与操作指引记录按本机当前账户分开保存，可以在对话页清除。本页不收集额外身份资料。</p><h3>服务状态</h3><p>商品购买、认养、溯源、人工客服与 AI 对话的可用情况以页面实际提示为准。商品图册不能作为库存、价格、检测或交付证明。</p><h3>授权与联系</h3><p>使用扫码等功能时会请求相应权限，可在系统设置中管理授权。正式对外服务前，经营主体、联系方式、数据保存期限与完整隐私政策应由运营方提供并发布。</p></section></div>;
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
    { name: '张先生', phone: '138****6688', address: '云南省昆明市呈贡区小满合社区 18 栋 1201' },
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
    ['检测机构', '小满合质检中心'],
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
    { role: 'ai', text: 'AI 对话服务尚未开通。你可以浏览商品资料或查看现有功能入口。' }
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const quickPrompts: string[] = [];
  const openPage = (page: ConsumerPage) => {
    onPage(page);
    onClose();
  };
  const localAnswer = (question: string): { text: string; action?: { label: string; page: ConsumerPage } } => {
    return {
      text: 'AI 对话服务尚未开通，当前无法生成选购、溯源、认养或售后建议。'
    };
  };
  const sendMessage = async (text = draft.trim()) => {
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setIsThinking(true);
    try {
      const answer = await askAi(text, 'consumer');
      const fallback = localAnswer(text);
      setMessages((prev) => [...prev, { role: 'ai', text: answer || fallback.text, action: answer ? undefined : fallback.action }]);
    } catch {
      window.setTimeout(() => {
        const answer = localAnswer(text);
        setMessages((prev) => [...prev, { role: 'ai', text: answer.text, action: answer.action }]);
      }, 360);
    } finally {
      window.setTimeout(() => setIsThinking(false), 420);
    }
  };

  if (pageMode) return <div className="mp-ai-page">
    <header className="mp-ai-head"><button onClick={() => onPage('tabs')}><img src="/assets/miniprogram/sevenfresh/home.png" alt=""/></button><div><img src="/assets/miniprogram/sevenfresh/assistant.png" alt=""/><b>AI 小满</b></div><button onClick={onCart}><img src="/assets/miniprogram/sevenfresh/cart.png" alt=""/></button></header>
    <main className="mp-ai-scroll"><section className="mp-ai-intro"><b>新鲜好农货</b><span>小满陪你找一份好食材</span><p>可以浏览已有商品资料，也可以了解订单与认养的操作入口。</p></section><div className="mp-ai-service-note">商品查询与操作指引 · AI 对话服务尚未开通</div><div className="mp-ai-shortcuts"><button onClick={() => onPage('mall')}>浏览商品图册 ›</button><button onClick={() => onPage('adoptDetail')}>了解认养样板 ›</button><button onClick={() => onPage('orders')}>查看订单 ›</button></div></main>
    <footer className="mp-ai-compose"><input disabled placeholder="AI 对话服务尚未开通"/><button disabled>↑</button></footer>
  </div>;

  return (
    <div className="ai-overlay consumer-ai-overlay" onClick={onClose}>
      <section className="ai-panel consumer-ai-panel" onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header className="consumer-ai-head">
          <span className="consumer-ai-orb"><Bot size={18} /></span>
          <div><b>小满 AI</b><small>选购 · 溯源 · 认养 · 售后</small></div>
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
          <input disabled value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="AI 对话服务尚未开通" />
          <button disabled>暂未开通</button>
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
      aria-label="小满农事AI"
    >
      <span className="super-ai-mark"><i /><i /><i /><em /></span>
    </button>
  );
}

function FarmerAiPanel({ onClose, onPage }: { onClose: () => void; onPage: (page: FarmerPage) => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; action?: { label: string; page: FarmerPage } }>>([
    { role: 'ai', text: '农事 AI 服务尚未开通。我不会读取农场设备或作物状态，也不能提供实时诊断。你可以先浏览农事日历、环境监测和技术支持入口。' }
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
  const sendMessage = (text = draft.trim()) => {
    if (!text || isThinking) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setIsThinking(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: '农事 AI 服务尚未开通。我无法根据当前农场实时数据诊断或生成农事建议。请查看已接入的服务状态，或联系本地农技人员。' }]);
      setIsThinking(false);
    }, 180);
  };
  return (
    <div className="ai-overlay farmer-ai-overlay" onClick={onClose}>
      <section className="farmer-chat-panel" onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header className="farmer-chat-head">
          <span className="super-ai-mark mini"><i /><i /><i /><em /></span>
          <div><b>小满 AI</b><small><i /> 农事 AI 服务尚未开通</small></div>
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
