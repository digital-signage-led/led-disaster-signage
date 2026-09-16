/** 防災情報カテゴリのコンテンツ定義。URL の content= と一致させる。 */

export const CONTENTS = [
  {
    id: "weather_warning",
    name: "気象警報・注意報",
    shortName: "警報",
    family: "disaster",
    locationScope: "prefecture",
    refreshMs: 3 * 60 * 1000,
    description: "選択した地域に現在発表されている特別警報・警報・注意報を表示します。"
  },
  {
    id: "early_warning",
    name: "早期注意情報（警報級の可能性）",
    shortName: "早期注意",
    family: "disaster",
    locationScope: "prefecture",
    refreshMs: 20 * 60 * 1000,
    description: "今後、警報級の現象となる可能性を気象庁の区分のまま表示します。"
  },
  {
    id: "typhoon",
    name: "台風情報",
    shortName: "台風",
    family: "disaster",
    locationScope: "national",
    refreshMs: 5 * 60 * 1000,
    description: "気象庁が発表中の台風・熱帯低気圧の位置と予報を表示します。"
  },
  {
    id: "lightning_nowcast",
    name: "雷ナウキャスト",
    shortName: "雷",
    family: "disaster",
    locationScope: "prefecture",
    refreshMs: 5 * 60 * 1000,
    description: "気象庁の雷ナウキャストで、雷活動の分布を地図表示します。"
  },
  {
    id: "tornado_nowcast",
    name: "竜巻発生確度ナウキャスト",
    shortName: "竜巻",
    family: "disaster",
    locationScope: "prefecture",
    refreshMs: 5 * 60 * 1000,
    description: "気象庁の竜巻発生確度ナウキャストで、激しい突風の可能性を表示します。"
  }
];

const ALIASES = {
  warning: "weather_warning",
  warnings: "weather_warning",
  keihou: "weather_warning",
  alert: "weather_warning",
  early: "early_warning",
  "early-warning": "early_warning",
  possibility: "early_warning",
  typhoon: "typhoon",
  taifu: "typhoon",
  thunder: "lightning_nowcast",
  lightning: "lightning_nowcast",
  liden: "lightning_nowcast",
  tornado: "tornado_nowcast",
  trns: "tornado_nowcast"
};

export function getContent(id) {
  const key = ALIASES[String(id || "").toLowerCase()] || String(id || "");
  return CONTENTS.find((item) => item.id === key) || CONTENTS[0];
}

export function canonicalContent(id) {
  return getContent(id).id;
}
