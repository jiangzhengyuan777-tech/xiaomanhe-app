export type Role = 'consumer' | 'farmer';
export type ConsumerTab = 'home' | 'mall' | 'trace' | 'adopt' | 'assistant' | 'cart' | 'my';
export type FarmerTab = 'farmHome' | 'shop' | 'environment' | 'farming' | 'farmerMy';

const seedProducts = [
  ['烟台红富士苹果', '山东烟台', 'fruit', '5斤装', '/assets/products/market/apple-box.jpg', '脆甜多汁', '当季', 29.9, 49.9, '2.3万'],
  ['五常稻花香大米', '黑龙江五常', 'grain', '5kg', '/assets/products/market/rice-white.jpg', '新米现碾', '新米', 59.9, 89.9, '1.8万'],
  ['新疆沙瓤番茄', '新疆昌吉', 'veg', '500g', '/assets/products/market/tomato.jpg', '基地鲜采', '鲜采', 12.8, 19.9, '9800'],
  ['云南谷物散养土鸡蛋', '云南保山', 'meat', '30枚', '/assets/products/market/eggs.jpg', '谷物散养', '每日鲜配', 36.9, 52.9, '3.1万'],
  ['奉节脐橙', '重庆奉节', 'fruit', '3斤装', '/assets/products/orange.jpg', '酸甜多汁', '当季', 24.8, 39.9, '1.2万'],
  ['西湖龙井春茶', '浙江杭州', 'local', '250g', '/assets/products/market/green-tea-loose.jpg', '清香型', '春茶', 88, 129, '4200'],
  ['寿光水果黄瓜', '山东寿光', 'veg', '2斤装', '/assets/products/market/cucumber.jpg', '清脆爽口', '鲜采', 9.9, 15.9, '1.1万'],
  ['高原胡萝卜', '云南曲靖', 'veg', '3斤装', '/assets/products/market/carrot.jpg', '清甜脆嫩', '鲜采', 15.9, 25.9, '8400'],
  ['恩施高山包菜', '湖北恩施', 'veg', '4斤装', '/assets/products/market/cabbage-green.jpg', '清甜紧实', '当季', 13.9, 22.9, '6900'],
  ['临安甜玉米', '浙江临安', 'grain', '6根装', '/assets/products/market/corn-field.jpg', '软糯香甜', '鲜采', 19.9, 32.9, '1.4万'],
  ['丹东红颜草莓', '辽宁丹东', 'fruit', '500g', '/assets/products/market/strawberry.jpg', '香甜爆汁', '当季', 39.9, 59.9, '9800'],
  ['寿光蔬菜组合', '山东寿光', 'veg', '5斤装', '/assets/products/market/produce-table.jpg', '一箱配齐', '鲜采', 26.9, 39.9, '9300'],
  ['沁州黄小米', '山西沁州', 'grain', '1kg', '/assets/products/market/millet-golden.jpg', '米香浓郁', '新米', 19.9, 29.9, '6400'],
  ['东北黑木耳', '黑龙江伊春', 'local', '250g', '/assets/products/market/black-fungus-dry.jpg', '肉厚爽脆', '干货', 26.8, 39.9, '7200'],
  ['农家初生蛋', '云南保山', 'meat', '20枚', '/assets/products/market/farm-eggs.jpg', '小枚鲜香', '每日鲜配', 29.9, 45.9, '1.6万'],
  ['武夷岩茶', '福建武夷山', 'local', '250g', '/assets/products/market/green-tea-loose.jpg', '岩骨花香', '岩茶', 98, 168, '3100']
] as const;

export const products = Array.from({ length: 64 }, (_, index) => {
  const item = seedProducts[index % seedProducts.length];
  const round = Math.floor(index / seedProducts.length);
  return {
    id: index + 1,
    name: round ? `${item[0]} ${round + 1}` : item[0],
    origin: item[1],
    category: item[2],
    unit: item[3],
    image: item[4],
    tag: item[5],
    season: item[6],
    price: Number(item[7]),
    originalPrice: Number(item[8]),
    sales: item[9]
  };
});

export type Product = (typeof products)[number];

export const categories = [
  { id: 'all', name: '全部' },
  { id: 'veg', name: '蔬菜' },
  { id: 'fruit', name: '水果' },
  { id: 'grain', name: '粮油' },
  { id: 'meat', name: '肉蛋' },
  { id: 'local', name: '特产' }
];

export const banners = [
  { title: '产地直发，新鲜到家', sub: '严选全国优质农产品基地', image: '/assets/banners/banner1.jpg' },
  { title: '云认养农场', sub: '看得见的生长过程', image: '/assets/banners/banner2.jpg' }
];

export const adopts = [
  { id: 1, name: '阳光番茄认养', image: '/assets/adopt/farm1.jpg', period: '90天', output: '约12斤', progress: 76, left: 18, stage: '开花坐果' },
  { id: 2, name: '稻田守护计划', image: '/assets/adopt/farm2.jpg', period: '120天', output: '约20斤', progress: 58, left: 25, stage: '拔节生长' },
  { id: 3, name: '山地果园认养', image: '/assets/adopt/farm3.jpg', period: '180天', output: '约30斤', progress: 41, left: 12, stage: '幼果期' }
];

export const traceTimeline = [
  { stage: '基地采收', time: '今天 08:10', desc: '示范基地完成清晨采摘，进入初检环节。' },
  { stage: '品质检测', time: '今天 10:35', desc: '农残检测合格，批次数据完成上链存证。' },
  { stage: '冷链出库', time: '今天 14:20', desc: '恒温包装完成，预计 18 小时内送达。' }
];

export const tasks = [
  { id: 1, name: '番茄棚补水', time: '08:30', type: '浇水', done: true },
  { id: 2, name: '查看土壤湿度', time: '10:00', type: '巡检', done: false },
  { id: 3, name: '记录病虫害观察', time: '16:30', type: '记录', done: false }
];

export const posts = [
  { id: 1, author: '老周农场', title: '今天的番茄坐果很好，棚内温湿度保持稳定。', tag: '种植日记' },
  { id: 2, author: '青禾基地', title: '水稻进入关键管理期，建议关注夜间温差。', tag: '农技交流' }
];
