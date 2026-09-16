/**
 * 気象庁の気象警報・注意報コード。
 * 名称は公式の種類名に合わせ、独自の言い換えはしない。
 * https://www.jma.go.jp/jma/kishou/know/bosai/warning_kind.html
 */

export const KIND_CATALOG = {
  "02": { name: "暴風雪警報", className: "warning", label: "警報" },
  "03": { name: "大雨警報", className: "warning", label: "警報" },
  "04": { name: "洪水警報", className: "warning", label: "警報" },
  "05": { name: "暴風警報", className: "warning", label: "警報" },
  "06": { name: "大雪警報", className: "warning", label: "警報" },
  "07": { name: "波浪警報", className: "warning", label: "警報" },
  "08": { name: "高潮警報", className: "warning", label: "警報" },
  "10": { name: "大雨注意報", className: "advisory", label: "注意報" },
  "12": { name: "大雨注意報", className: "advisory", label: "注意報" },
  "13": { name: "洪水注意報", className: "advisory", label: "注意報" },
  "14": { name: "雷注意報", className: "advisory", label: "注意報" },
  "15": { name: "強風注意報", className: "advisory", label: "注意報" },
  "16": { name: "波浪注意報", className: "advisory", label: "注意報" },
  "17": { name: "風雪注意報", className: "advisory", label: "注意報" },
  "18": { name: "大雪注意報", className: "advisory", label: "注意報" },
  "19": { name: "融雪注意報", className: "advisory", label: "注意報" },
  "20": { name: "濃霧注意報", className: "advisory", label: "注意報" },
  "21": { name: "乾燥注意報", className: "advisory", label: "注意報" },
  "22": { name: "なだれ注意報", className: "advisory", label: "注意報" },
  "23": { name: "低温注意報", className: "advisory", label: "注意報" },
  "24": { name: "霜注意報", className: "advisory", label: "注意報" },
  "25": { name: "着氷注意報", className: "advisory", label: "注意報" },
  "26": { name: "着雪注意報", className: "advisory", label: "注意報" },
  "27": { name: "注意報", className: "advisory", label: "注意報" },
  "32": { name: "暴風特別警報", className: "special", label: "特別警報" },
  "33": { name: "大雨特別警報", className: "special", label: "特別警報" },
  "35": { name: "暴風雪特別警報", className: "special", label: "特別警報" },
  "36": { name: "大雪特別警報", className: "special", label: "特別警報" },
  "37": { name: "波浪特別警報", className: "special", label: "特別警報" },
  "38": { name: "高潮特別警報", className: "special", label: "特別警報" }
};

export const CLASS_ORDER = { special: 0, warning: 1, advisory: 2 };

export const ACTIVE_STATUSES = new Set([
  "発表",
  "継続",
  "警報から注意報",
  "注意報から警報"
]);

export const INACTIVE_STATUSES = new Set([
  "解除",
  "失効",
  "発表警報・注意報はなし"
]);

export function kindInfo(code) {
  const key = String(code || "").padStart(2, "0");
  if (KIND_CATALOG[key]) return { code: key, ...KIND_CATALOG[key] };
  if (key.startsWith("3")) return { code: key, name: `特別警報(${key})`, className: "special", label: "特別警報" };
  if (key.startsWith("0")) return { code: key, name: `警報(${key})`, className: "warning", label: "警報" };
  return { code: key, name: `注意報(${key})`, className: "advisory", label: "注意報" };
}

export function isActiveStatus(status) {
  const text = String(status || "").trim();
  if (!text) return false;
  if (INACTIVE_STATUSES.has(text) || text.includes("なし")) return false;
  if (ACTIVE_STATUSES.has(text)) return true;
  return !text.includes("解除") && !text.includes("失効");
}

export function classFromStatus(status, className) {
  if (status === "警報から注意報") return "advisory";
  if (status === "注意報から警報") return "warning";
  return className;
}
