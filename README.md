# 防災情報サイネージ

天気予報サイネージから独立した、デジタルサイネージ向け「防災情報」カテゴリです。

既存の天気URL（`led-weather-signage`）は変更していません。

## コンテンツ

- 気象警報・注意報 `weather_warning`
- 早期注意情報（警報級の可能性） `early_warning`
- 台風情報 `typhoon`
- 雷ナウキャスト `lightning_nowcast`
- 竜巻発生確度ナウキャスト `tornado_nowcast`

## 公開URL

共通テンプレートは `index.html` のみです。地域とコンテンツはURLパラメータで切り替えます。同じURLのまま、管理画面の公開設定で表示を更新します。

```
index.html?prefecture=tokyo&content=weather_warning
index.html?prefecture=osaka&content=early_warning
index.html?prefecture=tokyo&content=typhoon
index.html?prefecture=osaka&content=lightning_nowcast
index.html?prefecture=osaka&content=tornado_nowcast
```

235通り（47 × 5）を同じ画面で表示します。

## 管理画面

`admin.html`

コンテンツ選択、地域選択、プレビュー、公開URL、表示ON/OFF、表示順、タイトル、表示設定、保存ができます。プレビューは本番と同じ描画コンポーネントです。

## 解像度

1920×1080 固定デザイン（天気予報サイネージと同じ `fitFixedScreen`）。

## データ

- 気象警報・注意報：気象庁 `bosai/warning/data/r8/{office}.json`
- 早期注意情報：気象庁防災情報XML（VPFD60 / VPFD61 / VPFW60）
- 台風情報：気象庁 `bosai/typhoon/data`
- 雷ナウキャスト：気象庁 `jmatile` `thns`
- 竜巻発生確度ナウキャスト：気象庁 `jmatile` `trns`
- 地図：国土地理院 淡色地図タイル
- 地域マスター：雨・レーダーサイネージと同じ47都道府県定義

## 本番

リポジトリ: https://github.com/digital-signage-led/led-disaster-signage

GitHub Pages（天気予報・雨レーダーと同じ main / 公開）:

- 管理画面 https://digital-signage-led.github.io/led-disaster-signage/admin.html
- 気象警報・注意報 https://digital-signage-led.github.io/led-disaster-signage/?prefecture=tokyo&content=weather_warning
- 早期注意情報 https://digital-signage-led.github.io/led-disaster-signage/?prefecture=tokyo&content=early_warning
- 台風情報 https://digital-signage-led.github.io/led-disaster-signage/?prefecture=tokyo&content=typhoon
- 雷ナウキャスト https://digital-signage-led.github.io/led-disaster-signage/?prefecture=osaka&content=lightning_nowcast
- 竜巻発生確度ナウキャスト https://digital-signage-led.github.io/led-disaster-signage/?prefecture=osaka&content=tornado_nowcast

Pages 設定: Settings → Pages → Deploy from a branch → `main` / `/`

## ローカル

```
npm start
```

- サイネージ http://127.0.0.1:5175/
- 管理画面 http://127.0.0.1:5175/admin.html
