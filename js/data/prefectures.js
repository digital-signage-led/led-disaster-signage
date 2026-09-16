/**
 * 47都道府県マスター。名称・地方・地図中心はここだけを正とする。
 * region は管理画面の内部判定用。選択UIには出さない。
 */

export const PREFECTURES = [
  { id: "01", slug: "hokkaido", name: "北海道", region: "hokkaido", regionName: "北海道", centerLatitude: 43.45, centerLongitude: 142.85, defaultZoom: 6.5, dataId: "016000", bounds: { north: 45.55, south: 41.35, east: 145.82, west: 139.40 } },
  { id: "02", slug: "aomori", name: "青森県", region: "tohoku", regionName: "東北", centerLatitude: 40.82, centerLongitude: 140.74, defaultZoom: 8.2, dataId: "020000", bounds: { north: 41.56, south: 40.22, east: 141.68, west: 139.50 } },
  { id: "03", slug: "iwate", name: "岩手県", region: "tohoku", regionName: "東北", centerLatitude: 39.70, centerLongitude: 141.15, defaultZoom: 8.0, dataId: "030000", bounds: { north: 40.45, south: 38.75, east: 142.07, west: 140.65 } },
  { id: "04", slug: "miyagi", name: "宮城県", region: "tohoku", regionName: "東北", centerLatitude: 38.27, centerLongitude: 140.87, defaultZoom: 8.4, dataId: "040000", bounds: { north: 39.00, south: 37.77, east: 141.68, west: 140.27 } },
  { id: "05", slug: "akita", name: "秋田県", region: "tohoku", regionName: "東北", centerLatitude: 39.72, centerLongitude: 140.10, defaultZoom: 8.1, dataId: "050000", bounds: { north: 40.51, south: 38.87, east: 140.98, west: 139.68 } },
  { id: "06", slug: "yamagata", name: "山形県", region: "tohoku", regionName: "東北", centerLatitude: 38.24, centerLongitude: 140.36, defaultZoom: 8.3, dataId: "060000", bounds: { north: 39.21, south: 37.73, east: 140.65, west: 139.54 } },
  { id: "07", slug: "fukushima", name: "福島県", region: "tohoku", regionName: "東北", centerLatitude: 37.45, centerLongitude: 140.20, defaultZoom: 8.0, dataId: "070000", bounds: { north: 37.98, south: 36.79, east: 141.05, west: 139.16 } },
  { id: "08", slug: "ibaraki", name: "茨城県", region: "kanto", regionName: "関東", centerLatitude: 36.34, centerLongitude: 140.45, defaultZoom: 8.5, dataId: "080000", bounds: { north: 36.95, south: 35.73, east: 140.85, west: 139.69 } },
  { id: "09", slug: "tochigi", name: "栃木県", region: "kanto", regionName: "関東", centerLatitude: 36.57, centerLongitude: 139.88, defaultZoom: 9.3, zoomBoost: 0.9, dataId: "090000", bounds: { north: 37.02, south: 36.32, east: 140.16, west: 139.45 } },
  { id: "10", slug: "gunma", name: "群馬県", region: "kanto", regionName: "関東", centerLatitude: 36.39, centerLongitude: 139.06, defaultZoom: 8.5, dataId: "100000", bounds: { north: 37.05, south: 36.04, east: 139.62, west: 138.40 } },
  { id: "11", slug: "saitama", name: "埼玉県", region: "kanto", regionName: "関東", centerLatitude: 35.98, centerLongitude: 139.42, defaultZoom: 8.8, dataId: "110000", bounds: { north: 36.28, south: 35.75, east: 139.90, west: 138.71 } },
  { id: "12", slug: "chiba", name: "千葉県", region: "kanto", regionName: "関東", centerLatitude: 35.50, centerLongitude: 140.12, defaultZoom: 8.6, dataId: "120000", bounds: { north: 36.10, south: 34.90, east: 140.88, west: 139.74 } },
  { id: "13", slug: "tokyo", name: "東京都", region: "kanto", regionName: "関東", centerLatitude: 35.69, centerLongitude: 139.69, defaultZoom: 10.0, dataId: "130000", bounds: { north: 35.90, south: 35.50, east: 139.92, west: 139.00 } },
  { id: "14", slug: "kanagawa", name: "神奈川県", region: "kanto", regionName: "関東", centerLatitude: 35.45, centerLongitude: 139.34, defaultZoom: 9.4, dataId: "140000", bounds: { north: 35.67, south: 35.13, east: 139.84, west: 138.92 } },
  { id: "15", slug: "niigata", name: "新潟県", region: "hokuriku", regionName: "北陸", centerLatitude: 37.50, centerLongitude: 138.85, defaultZoom: 7.6, dataId: "150000", bounds: { north: 38.55, south: 36.74, east: 139.89, west: 137.64 } },
  { id: "16", slug: "toyama", name: "富山県", region: "hokuriku", regionName: "北陸", centerLatitude: 36.65, centerLongitude: 137.21, defaultZoom: 9.4, zoomBoost: 0.9, dataId: "160000", bounds: { north: 36.92, south: 36.35, east: 137.62, west: 136.85 } },
  { id: "17", slug: "ishikawa", name: "石川県", region: "hokuriku", regionName: "北陸", centerLatitude: 36.80, centerLongitude: 136.80, defaultZoom: 8.0, dataId: "170000", bounds: { north: 37.85, south: 36.07, east: 137.36, west: 136.24 } },
  { id: "18", slug: "fukui", name: "福井県", region: "hokuriku", regionName: "北陸", centerLatitude: 35.85, centerLongitude: 136.22, defaultZoom: 8.4, dataId: "180000", bounds: { north: 36.30, south: 35.35, east: 136.83, west: 135.45 } },
  { id: "19", slug: "yamanashi", name: "山梨県", region: "koshin", regionName: "甲信", centerLatitude: 35.66, centerLongitude: 138.57, defaultZoom: 9.0, dataId: "190000", bounds: { north: 35.97, south: 35.17, east: 139.14, west: 138.18 } },
  { id: "20", slug: "nagano", name: "長野県", region: "koshin", regionName: "甲信", centerLatitude: 36.15, centerLongitude: 138.10, defaultZoom: 7.8, dataId: "200000", bounds: { north: 37.02, south: 35.20, east: 138.73, west: 137.32 } },
  { id: "21", slug: "gifu", name: "岐阜県", region: "tokai", regionName: "東海", centerLatitude: 35.80, centerLongitude: 137.03, defaultZoom: 8.0, dataId: "210000", bounds: { north: 36.46, south: 35.13, east: 137.66, west: 136.28 } },
  { id: "22", slug: "shizuoka", name: "静岡県", region: "tokai", regionName: "東海", centerLatitude: 35.05, centerLongitude: 138.38, defaultZoom: 8.2, dataId: "220000", bounds: { north: 35.64, south: 34.57, east: 139.18, west: 137.47 } },
  { id: "23", slug: "aichi", name: "愛知県", region: "tokai", regionName: "東海", centerLatitude: 35.05, centerLongitude: 137.15, defaultZoom: 8.6, dataId: "230000", bounds: { north: 35.42, south: 34.57, east: 137.83, west: 136.67 } },
  { id: "24", slug: "mie", name: "三重県", region: "tokai", regionName: "東海", centerLatitude: 34.50, centerLongitude: 136.40, defaultZoom: 8.0, dataId: "240000", bounds: { north: 35.26, south: 33.72, east: 136.98, west: 135.85 } },
  { id: "25", slug: "shiga", name: "滋賀県", region: "kinki", regionName: "近畿", centerLatitude: 35.20, centerLongitude: 136.10, defaultZoom: 9.0, dataId: "250000", bounds: { north: 35.70, south: 34.79, east: 136.46, west: 135.77 } },
  { id: "26", slug: "kyoto", name: "京都府", region: "kinki", regionName: "近畿", centerLatitude: 35.25, centerLongitude: 135.50, defaultZoom: 8.4, dataId: "260000", bounds: { north: 35.78, south: 34.71, east: 135.87, west: 134.85 } },
  { id: "27", slug: "osaka", name: "大阪府", region: "kinki", regionName: "近畿", centerLatitude: 34.69, centerLongitude: 135.50, defaultZoom: 10.0, dataId: "270000", bounds: { north: 35.05, south: 34.27, east: 135.75, west: 135.09 } },
  { id: "28", slug: "hyogo", name: "兵庫県", region: "kinki", regionName: "近畿", centerLatitude: 35.00, centerLongitude: 134.85, defaultZoom: 8.2, dataId: "280000", bounds: { north: 35.67, south: 34.16, east: 135.47, west: 134.25 } },
  { id: "29", slug: "nara", name: "奈良県", region: "kinki", regionName: "近畿", centerLatitude: 34.30, centerLongitude: 135.85, defaultZoom: 8.8, dataId: "290000", bounds: { north: 34.78, south: 33.86, east: 136.12, west: 135.54 } },
  { id: "30", slug: "wakayama", name: "和歌山県", region: "kinki", regionName: "近畿", centerLatitude: 33.95, centerLongitude: 135.45, defaultZoom: 8.4, dataId: "300000", bounds: { north: 34.38, south: 33.45, east: 136.00, west: 135.01 } },
  { id: "31", slug: "tottori", name: "鳥取県", region: "chugoku", regionName: "中国", centerLatitude: 35.35, centerLongitude: 134.00, defaultZoom: 8.6, dataId: "310000", bounds: { north: 35.62, south: 35.05, east: 134.90, west: 133.14 } },
  { id: "32", slug: "shimane", name: "島根県", region: "chugoku", regionName: "中国", centerLatitude: 35.10, centerLongitude: 132.55, defaultZoom: 7.8, dataId: "320000", bounds: { north: 36.37, south: 34.31, east: 133.43, west: 131.67 } },
  { id: "33", slug: "okayama", name: "岡山県", region: "chugoku", regionName: "中国", centerLatitude: 34.85, centerLongitude: 133.85, defaultZoom: 8.5, dataId: "330000", bounds: { north: 35.35, south: 34.29, east: 134.42, west: 133.27 } },
  { id: "34", slug: "hiroshima", name: "広島県", region: "chugoku", regionName: "中国", centerLatitude: 34.55, centerLongitude: 132.65, defaultZoom: 8.3, dataId: "340000", bounds: { north: 35.10, south: 34.08, east: 133.28, west: 132.03 } },
  { id: "35", slug: "yamaguchi", name: "山口県", region: "chugoku", regionName: "中国", centerLatitude: 34.25, centerLongitude: 131.50, defaultZoom: 8.4, dataId: "350000", bounds: { north: 34.80, south: 33.72, east: 132.24, west: 130.77 } },
  { id: "36", slug: "tokushima", name: "徳島県", region: "shikoku", regionName: "四国", centerLatitude: 33.92, centerLongitude: 134.25, defaultZoom: 8.8, dataId: "360000", bounds: { north: 34.25, south: 33.54, east: 134.82, west: 133.66 } },
  { id: "37", slug: "kagawa", name: "香川県", region: "shikoku", regionName: "四国", centerLatitude: 34.30, centerLongitude: 133.95, defaultZoom: 9.4, dataId: "370000", bounds: { north: 34.56, south: 34.04, east: 134.45, west: 133.45 } },
  { id: "38", slug: "ehime", name: "愛媛県", region: "shikoku", regionName: "四国", centerLatitude: 33.65, centerLongitude: 132.85, defaultZoom: 8.2, dataId: "380000", bounds: { north: 34.30, south: 32.91, east: 133.69, west: 132.04 } },
  { id: "39", slug: "kochi", name: "高知県", region: "shikoku", regionName: "四国", centerLatitude: 33.45, centerLongitude: 133.40, defaultZoom: 8.2, dataId: "390000", bounds: { north: 33.88, south: 32.70, east: 134.32, west: 132.48 } },
  { id: "40", slug: "fukuoka", name: "福岡県", region: "kyushu", regionName: "九州", centerLatitude: 33.50, centerLongitude: 130.60, defaultZoom: 8.6, dataId: "400000", bounds: { north: 33.88, south: 33.06, east: 131.19, west: 130.03 } },
  { id: "41", slug: "saga", name: "佐賀県", region: "kyushu", regionName: "九州", centerLatitude: 33.25, centerLongitude: 130.20, defaultZoom: 9.2, dataId: "410000", bounds: { north: 33.62, south: 32.95, east: 130.54, west: 129.86 } },
  { id: "42", slug: "nagasaki", name: "長崎県", region: "kyushu", regionName: "九州", centerLatitude: 33.10, centerLongitude: 129.70, defaultZoom: 8.0, dataId: "420000", bounds: { north: 34.70, south: 32.00, east: 130.40, west: 128.10 } },
  { id: "43", slug: "kumamoto", name: "熊本県", region: "kyushu", regionName: "九州", centerLatitude: 32.70, centerLongitude: 130.70, defaultZoom: 8.4, dataId: "430000", bounds: { north: 33.20, south: 32.09, east: 131.13, west: 130.14 } },
  { id: "44", slug: "oita", name: "大分県", region: "kyushu", regionName: "九州", centerLatitude: 33.20, centerLongitude: 131.50, defaultZoom: 8.5, dataId: "440000", bounds: { north: 33.74, south: 32.72, east: 132.00, west: 130.83 } },
  { id: "45", slug: "miyazaki", name: "宮崎県", region: "kyushu", regionName: "九州", centerLatitude: 32.10, centerLongitude: 131.30, defaultZoom: 8.2, dataId: "450000", bounds: { north: 32.83, south: 31.36, east: 131.88, west: 130.70 } },
  { id: "46", slug: "kagoshima", name: "鹿児島県", region: "kyushu", regionName: "九州", centerLatitude: 31.56, centerLongitude: 130.56, defaultZoom: 8.0, dataId: "460100", bounds: { north: 32.30, south: 31.00, east: 131.08, west: 129.80 } },
  { id: "47", slug: "okinawa", name: "沖縄県", region: "okinawa", regionName: "沖縄", centerLatitude: 26.33, centerLongitude: 127.80, defaultZoom: 8.8, dataId: "471000", bounds: { north: 26.90, south: 26.05, east: 128.35, west: 127.55 } }
];

const SLUG_ALIASES = {
  hokkaido: "hokkaido",
  aomori: "aomori",
  iwate: "iwate",
  miyagi: "miyagi",
  akita: "akita",
  yamagata: "yamagata",
  fukushima: "fukushima",
  ibaraki: "ibaraki",
  tochigi: "tochigi",
  gunma: "gunma",
  saitama: "saitama",
  chiba: "chiba",
  tokyo: "tokyo",
  "tokyo-to": "tokyo",
  kanagawa: "kanagawa",
  niigata: "niigata",
  toyama: "toyama",
  ishikawa: "ishikawa",
  fukui: "fukui",
  yamanashi: "yamanashi",
  nagano: "nagano",
  gifu: "gifu",
  shizuoka: "shizuoka",
  aichi: "aichi",
  mie: "mie",
  shiga: "shiga",
  kyoto: "kyoto",
  osaka: "osaka",
  hyogo: "hyogo",
  nara: "nara",
  wakayama: "wakayama",
  tottori: "tottori",
  shimane: "shimane",
  okayama: "okayama",
  hiroshima: "hiroshima",
  yamaguchi: "yamaguchi",
  tokushima: "tokushima",
  kagawa: "kagawa",
  ehime: "ehime",
  kochi: "kochi",
  fukuoka: "fukuoka",
  saga: "saga",
  nagasaki: "nagasaki",
  kumamoto: "kumamoto",
  oita: "oita",
  miyazaki: "miyazaki",
  kagoshima: "kagoshima",
  okinawa: "okinawa"
};

export function getPrefecture(slugOrId) {
  const raw = String(slugOrId || "").toLowerCase();
  const slug = SLUG_ALIASES[raw] || raw;
  return PREFECTURES.find((item) => item.slug === slug || item.id === String(slugOrId)) || PREFECTURES[12];
}

export function canonicalPrefecture(slugOrId) {
  return getPrefecture(slugOrId).slug;
}

export function regionOf(slugOrId) {
  const pref = getPrefecture(slugOrId);
  return { id: pref.region, name: pref.regionName };
}
