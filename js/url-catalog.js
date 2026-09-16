import { CONTENTS } from "./data/contents.js";
import { PREFECTURES } from "./data/prefectures.js";
import { signageUrl } from "./store.js";

const $ = (id) => document.getElementById(id);

function publicHref(pref, content) {
  return signageUrl(pref, content, `${location.origin}${location.pathname.replace(/urls\.html.*$/, "index.html")}`);
}

function rows() {
  const qPref = $("q-pref").value.trim();
  const qContent = $("q-content").value;
  return PREFECTURES.flatMap((pref) => (
    CONTENTS
      .filter((content) => !qContent || content.id === qContent)
      .filter(() => !qPref || `${pref.name}${pref.slug}`.includes(qPref))
      .map((content) => ({
        pref,
        content,
        url: publicHref(pref.slug, content.id)
      }))
  ));
}

function tsv(list) {
  const header = "地域\tコンテンツ\t公開URL";
  const body = list.map((row) => `${row.pref.name}\t${row.content.name}\t${row.url}`);
  return [header, ...body].join("\n");
}

function copyText(text) {
  const box = $("bulk-text");
  box.value = text;
  box.focus();
  box.select();
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  } catch {
    /* fallback */
  }
  document.execCommand("copy");
  return Promise.resolve();
}

function render() {
  const list = rows();
  $("bulk-text").value = tsv(list);
  $("bulk-count").textContent = `${list.length}件を下の枠にまとめています。一括コピー、または枠内を全選択して貼り付けできます。`;
  const groups = new Map();
  for (const row of list) {
    if (!groups.has(row.pref.slug)) groups.set(row.pref.slug, { pref: row.pref, items: [] });
    groups.get(row.pref.slug).items.push(row);
  }
  $("catalog").innerHTML = [...groups.values()].map((group) => `
    <section>
      <h2>${group.pref.name}（${group.pref.slug}）</h2>
      <table>
        <thead><tr><th>コンテンツ</th><th>公開URL</th><th></th></tr></thead>
        <tbody>
          ${group.items.map((item) => `
            <tr>
              <td>${item.content.name}</td>
              <td><a href="${item.url}" target="_blank" rel="noreferrer">${item.url}</a></td>
              <td><button type="button" class="copy" data-copy="${item.url}">コピー</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `).join("") || `<p class="meta">該当するURLはありません</p>`;
}

$("q-content").innerHTML = [`<option value="">すべてのコンテンツ</option>`]
  .concat(CONTENTS.map((content) => `<option value="${content.id}">${content.name}</option>`))
  .join("");
$("q-pref").addEventListener("input", render);
$("q-content").addEventListener("change", render);
$("btn-copy-all").addEventListener("click", async () => {
  const text = tsv(rows());
  try {
    await copyText(text);
    $("btn-copy-all").textContent = "コピーしました";
  } catch {
    $("btn-copy-all").textContent = "枠を全選択してコピーしてください";
  }
  window.setTimeout(() => { $("btn-copy-all").textContent = "一括コピー"; }, 1600);
});
$("btn-select-all").addEventListener("click", () => {
  const box = $("bulk-text");
  box.focus();
  box.select();
});
document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.textContent = "済";
    window.setTimeout(() => { btn.textContent = "コピー"; }, 1200);
  } catch {
    btn.textContent = "失敗";
  }
});
render();
