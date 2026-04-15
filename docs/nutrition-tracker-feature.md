# Nutrition Tracker Feature（營養追蹤）

## Overview

在現有 supplement tracking app (recallth) 加入飲食營養追蹤功能，同藥箱 (Cabinet) 互相配合，形成「食唔夠乜 → supplement補返」嘅閉環。

---

## 核心定位

- **唔係**做完整飲食app（唔係MyFitnessPal）
- **係**「supplement app 嘅營養 companion」
- Feature 名稱：「營養追蹤」(Nutrition Tracker)
- 重點 track Calories + 3 Macros（蛋白質 / 碳水 / 脂肪），按 category 可加其他 nutrients

---

## Category 方案

用預設 template cater 唔同用戶群，用戶揀 category 後自動 set 好要 track 嘅 nutrients：

| Category | 重點 Track | 目標用戶 |
|---|---|---|
| 增肌/健身 | Calories, Protein, Carbs, Fat | 做 gym 嘅人 |
| 減重 | Calories, Fat, Sugar, Fiber | 想瘦嘅人 |
| 糖尿管理 | Sugar, Carbs, GI Index, Calories | 糖尿病 / 血糖控制 |
| 腎病管理 | 鈉, 鉀, 磷, Protein (限制) | 腎病患者 |
| 孕期營養 | 葉酸, 鐵, 鈣, Calories | 孕婦 |
| 自訂 | 用戶自己揀 | 進階用戶 |

> ⚠️ 醫療相關 category（糖尿、腎病、孕期）必須加 disclaimer，講清楚唔係醫療建議。

---

## 殺手鐧：Supplement + Nutrition 閉環

```
營養追蹤 (輸入食咗乜)
    ↓
AI 分析 (有乜唔夠？)
    ↓
藥箱推薦 (supplement 補返)
    ↓
追蹤成效 (下次分析睇到改善)
```

### 實際例子

**增肌用戶：**
- 營養追蹤顯示：今日蛋白質得 80g / 目標 150g
- AI 提示：「你今日蛋白質仲差 70g，你藥箱入面嘅 Whey Protein 一 scoop 有 25g，建議飲 2 杯」

**腎病用戶：**
- 營養追蹤顯示：今日鈉攝取已經 1800mg / 上限 2000mg
- AI 提示：「鈉接近上限，你藥箱入面嘅電解質 supplement 今日可以 skip」

### 點解呢個係我哋嘅 Moat

- MyFitnessPal → 食物 tracking ✅ 但冇 supplement
- Pillbox apps → Supplement tracking ✅ 但冇 nutrition
- **淨係我哋做到：「你食唔夠乜 → 食粒乜補返」**

---

## AI 輸入（最重要嘅 Feature）

### 痛點
傳統飲食 tracking 要逐格填 form，大量用戶用幾日就放棄。最大敵人係 **friction**，唔係技術。

### 解決方案
用戶只需要講一句：
> 「今日 lunch 食咗叉燒飯同凍檸茶」

AI 自動：
1. 識別食物：叉燒飯、凍檸茶
2. 估算份量（一碟、一杯）
3. 返 calories + 用戶 category relevant 嘅 nutrients
4. 用戶 confirm 就 save

**由填 10 個 field 變成講一句嘢。**

### 同現有藥箱 AI 搜尋 UX 一致
藥箱已經有 AI 搜尋 supplement，用戶熟悉呢個 pattern，零學習成本。

### Product Story
> 「其他 app 要你做 data entry，我哋幫你傾偈就搞掂。」

### 未來擴展
- 影相輸入 — 影張相 AI 就識到食緊乜
- 語音輸入 — 食緊飯唔方便打字
- 常餐記憶 — 「同尋日 lunch 一樣」→ 一 click 搞掂

---

## Phased Rollout

| Phase | 內容 | 價值 |
|---|---|---|
| Phase 1 | 每日 summary — 邊樣 nutrients 唔夠 + 藥箱有乜可以補 | 基本閉環 |
| Phase 2 | 主動提醒 — 根據連續幾日 pattern 推 notification | 養成習慣 |
| Phase 3 | 智能調整 — 根據長期數據建議加減 supplement | 個人化 |

---

## TODO

### Setup
- [ ] 開 `recallth-docs` repo 作為 cross-repo 嘅 knowledge base
- [ ] 將呢個 file 搬入去 `recallth-docs/product/`

### Implementation
- [ ] 設計 Nutrition Tracker UI（參考現有 Cabinet 嘅 pattern）
- [ ] 加 nutrition category 選擇入 onboarding flow
- [ ] 建 AI 飲食輸入功能（文字 → 自動識別食物 + nutrients）
- [ ] 建 每日 nutrition summary 頁面
- [ ] 實現 supplement 推薦邏輯（nutrition gap → cabinet 推薦）
- [ ] 加醫療 category disclaimer

---

*討論日期：2026-04-15*
