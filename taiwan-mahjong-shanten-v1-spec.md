# 台灣 16 張麻將向聽數分析器 — V1 Implementation Specification

## 1. 文件目的

本文件定義一個「台灣 16 張麻將向聽數分析器」V1 的產品規格與演算法契約。

目標是讓實作者可以在**不自行猜測麻將規則、不自行補產品定義**的前提下，完成：

- 向聽數計算
- 有效牌計算
- 改良牌計算
- 17 張狀態下的最佳捨牌分析
- 公開牌資訊扣除
- 盤面合法性驗證
- 最佳牌型拆解
- Mobile-first Web / PWA
- 分享盤面

本文件以第一性原理出發：先定義「完成手牌的條件」，再由此推導距離、有效牌、改良牌與最佳捨牌，而不是直接套用日麻既有實作。

---

# 2. 核心產品定位

產品名稱暫定：

> 台灣麻將向聽數分析器

核心使用情境：

> 使用者輸入自己的手牌與所有已知公開盤面資訊，取得目前向聽數、有效牌、改良牌，以及 17 張狀態下的最佳捨牌。

V1 是：

> **純牌效率工具**

V1 不做：

- 台數最大化
- 役種／牌型價值最大化
- 防守
- 放槍危險度
- 對手讀牌
- 山牌位置推測
- AI 對局決策
- 特殊地方規則
- 特殊胡牌牌型

---

# 3. 第一性原理：完成手牌的定義

## 3.1 標準台灣 16 張胡牌結構

V1 唯一支援的胡牌結構：

```text
5 個面子 + 1 個眼
```

其中：

### 面子

面子只能是：

```text
順子：ABC
刻子：AAA
槓子：AAAA
```

例如：

```text
123萬
777筒
東東東
```

槓子雖有 4 張實體牌，但在結構上仍然只占：

```text
1 個面子
```

### 眼

眼只能是：

```text
AA
```

即兩張完全相同的牌。

不存在兩張不同牌形成眼的情況。

---

# 4. V1 支援的牌

## 4.1 結構牌

標準 34 種：

```text
萬子：1m ~ 9m
筒子：1p ~ 9p
索子：1s ~ 9s
字牌：1z ~ 7z
```

字牌 canonical mapping：

```text
1z = 東
2z = 南
3z = 西
4z = 北
5z = 白
6z = 發
7z = 中
```

每一種結構牌最多：

```text
4 張
```

---

## 4.2 花牌

V1 支援花牌：

- 輸入
- 顯示
- 分享盤面
- 公開資訊記錄

但花牌：

> **完全不參與向聽數、有效牌、改良牌與胡牌結構計算。**

---

# 5. 手牌狀態

## 5.1 16 張結構狀態

代表：

```text
摸牌前
```

用途：

- 顯示目前向聽數
- 計算有效牌
- 計算改良牌

---

## 5.2 17 張結構狀態

代表：

```text
摸牌後、尚未捨牌
```

用途：

- 分析所有合法候選捨牌
- 找最佳捨牌
- 顯示最佳捨牌後的向聽數
- 顯示最佳捨牌後的有效牌
- 顯示最佳捨牌後的改良牌

---

# 6. 副露與結構張數

副露類型：

- 吃
- 碰
- 明槓
- 暗槓

所有副露在胡牌結構上均計為：

```text
1 個已完成面子
```

設：

```text
openMelds = 副露面子數
```

則剩餘暗手需要完成：

```text
5 - openMelds
```

個面子，再加：

```text
1 個眼
```

---

## 6.1 16 / 17 張合法性判斷

使用「結構張數」而不是純實體張數。

摸牌前：

```text
暗手張數 + 3 × 副露面子數 = 16
```

摸牌後：

```text
暗手張數 + 3 × 副露面子數 = 17
```

槓的第 4 張：

- 不增加結構張數
- 仍算已知實體牌
- 必須從該牌的未知剩餘張數扣除

例如：

```text
暗手 10 張
+ 2 組副露
= 10 + 2×3
= 16
```

合法。

---

# 7. 向聽數定義

## 7.1 語意

向聽數表示：

> 距離完成標準 `5 面子 + 1 眼`，還需要多少次「有效結構改善」。

約定：

```text
-1 = 已完成胡牌
 0 = 聽牌
 1 = 一向聽
 2 = 二向聽
 ...
```

---

## 7.2 拆解狀態

對暗手進行拆解，記：

```text
M = 已完成面子數（包含副露）
T = 搭子數
P = 是否已有眼候選，0 或 1
```

搭子包含能以一張牌補成面子的兩張結構，例如：

```text
AA
AB
AC
```

其中：

- AA 可作搭子
- AA 也可作眼
- 兩種角色必須分開搜尋

---

## 7.3 標準公式

台灣 16 張標準 5 面子結構：

```text
Shanten = 10 - 2M - T - P
```

但搭子不能超過尚未完成的面子槽位：

```text
T <= 5 - M
```

因此實際計算：

```text
T' = min(T, 5-M)

Shanten = 10 - 2M - T' - P
```

對所有合法拆解求最小值：

```text
handShanten = min(all decomposition shanten)
```

---

# 8. 多重拆解

一手牌可能存在多種合法拆解。

例如：

```text
112233m
```

可能有：

```text
123 + 123
```

也可能有：

```text
11 + 22 + 33
```

因此：

> 不允許 greedy 拆牌。

實作必須：

- DFS
- DP
- 查表
- 或其他能保證全域最佳的算法

V1 UI：

- 預設顯示 1 個代表性最佳拆解
- 若存在其他同向聽、同效率最佳拆解，允許展開查看

---

# 9. 有效牌定義

## 9.1 一般情況：目前 Shanten > 0

假設目前為 16 張狀態，向聽數：

```text
S
```

對某候選摸入牌 `x`：

1. 摸入 `x`
2. 手牌進入 17 張狀態
3. 嘗試所有合法捨牌 `d`
4. 得到：

```text
S'(x) = min Shanten(after draw x, discard d)
```

若：

```text
S'(x) < S
```

則：

> `x` 是有效牌。

正式定義：

```text
Effective(x) :=
    min_d Shanten(hand + x - d)
    < Shanten(hand)
```

---

## 9.2 聽牌狀態：目前 Shanten = 0

若目前已聽牌：

> 摸入後能直接完成 `5 面子 + 1 眼` 的牌，即為有效牌。

此時不要求再捨牌。

也就是：

```text
Shanten(hand + x) = -1
```

則 `x` 是胡牌牌／有效牌。

---

# 10. 有效牌剩餘張數

所有結果必須以：

> **實際未知剩餘張數**

為主要顯示值。

不是理論最大 4 張。

對每種結構牌 `x`：

```text
remaining(x)
= 4
- 自己手牌中 x 的張數
- 所有已知副露中的 x
- 所有有效公開牌紀錄中的 x
```

注意：

> 同一張實體牌只能扣一次。

---

# 11. 被吃／碰／槓走的捨牌

若一張捨牌後來被其他玩家吃、碰、槓：

UI 可以保留其原本出現在牌河的歷史。

但在剩餘牌數計算中：

> 不得在「捨牌」與「副露」各扣一次。

資料模型應能表示：

```text
discard.called = true
```

或等價結構。

核心原則：

> 剩餘牌數以「已知實體牌集合」計算，而非各 UI 區塊獨立相加。

---

# 12. 理論有效牌為 0 張

若某牌在結構上是有效牌，但：

```text
remaining(x) = 0
```

則：

- 不放在主要有效牌列表
- 可放在「理論有效但已無剩餘」區塊
- 不計入實際受入總張數

---

# 13. 受入

定義：

```text
Ukeire(hand)
= Σ remaining(x)
```

其中 `x` 為所有實際剩餘 > 0 的有效牌。

同時保留：

```text
有效牌種類數
有效牌剩餘總張數
```

兩者是不同指標。

---

# 14. 改良牌定義

改良牌只針對 16 張狀態。

假設目前：

```text
Shanten(hand) = S
Ukeire(hand) = U
```

候選摸入牌為 `x`。

先摸入 `x`。

此時：

> `x` 必須先從未知牌池扣除 1 張。

接著嘗試所有合法捨牌。

找到最佳捨牌結果 `d*`。

若：

```text
Shanten(hand + x - d*) = S
```

即向聽數不下降也不惡化，

且：

```text
Ukeire(hand + x - d*) > U
```

則：

> `x` 是改良牌。

正式定義：

```text
Improvement(x) :=
    BestShantenAfterDrawDiscard(x) == CurrentShanten
    &&
    BestUkeireAfterDrawDiscard(x) > CurrentUkeire
```

---

## 14.1 V1 不計入的「改良」

以下情況單獨發生時，不算 V1 改良：

- 只有有效牌種類增加
- 只有牌型視覺上變良形
- 嵌張變兩面但受入總張數未增加
- 台數潛力提高
- 防守能力提高

V1 唯一客觀標準：

```text
實際有效牌剩餘總張數增加
```

---

# 15. 17 張最佳捨牌排序

對每一張合法候選捨牌 `d`，計算：

```text
Shanten(d)
Ukeire(d)
EffectiveTileKinds(d)
```

排序優先級：

```text
1. 向聽數較低
2. 有效牌實際剩餘總張數較高
3. 有效牌種類較多
4. 仍相同則並列最佳
```

明確禁止在 V1 排序中加入：

- 台數
- 門清
- 字牌價值
- 危險度
- 對手資訊
- 牌河資訊
- 牌型美觀
- 個人偏好

---

# 16. 17 張結果呈現

Mobile-first 預設：

1. 顯示最佳捨牌
2. 顯示最佳捨牌後：
   - 向聽數
   - 有效牌
   - 實際受入
   - 改良牌
3. 其他候選捨牌收合顯示
4. 使用者可展開比較

---

# 17. 公開資訊

V1 支援所有公開資訊輸入：

- 自己暗手
- 自己副露
- 其他三家副露
- 四家牌河
- 明槓
- 暗槓
- 花牌
- 被叫走的捨牌狀態

牌河順序：

- 必須保存
- 必須可顯示
- 必須可分享
- V1 不參與牌效率排序

原因：

> 為未來防守／危險度分析保留資料。

---

# 18. 暗槓

若使用者輸入某牌暗槓：

```text
AAAA
```

則：

- 結構上 = 1 個面子
- 已知牌數 = 4
- `remaining(A) = 0`

V1 視暗槓牌種為已知公開資訊。

---

# 19. 花牌

花牌：

- 顯示
- 記錄
- 分享
- 可依玩家歸屬保存

但：

```text
不進 Shanten()
不進 EffectiveTiles()
不進 Improvements()
不進 Ukeire()
```

---

# 20. 盤面合法性驗證

V1 必須在分析前驗證盤面。

非法盤面不得輸出正常分析結果。

至少檢查：

## 20.1 單牌數量

任何 34 種結構牌：

```text
knownPhysicalCount(tile) <= 4
```

---

## 20.2 16 / 17 張結構合法性

```text
concealedCount + 3*meldCount
```

必須為：

```text
16 或 17
```

---

## 20.3 吃

必須：

- 同一花色
- 連續三張
- 不允許字牌順子

例如合法：

```text
345m
```

非法：

```text
357m
111z as chi
```

---

## 20.4 碰

必須：

```text
AAA
```

---

## 20.5 槓

必須：

```text
AAAA
```

---

## 20.6 重複扣牌

被叫走捨牌不可重複算進剩餘牌扣除。

---

## 20.7 錯誤訊息

錯誤必須具體。

不要：

```text
Invalid board
```

應顯示：

```text
5萬目前共輸入 5 張：
手牌 2 張、對家碰 3 張，
超過實際存在的 4 張。
```

---

# 21. 牌型拆解輸出

分析器應能返回最佳拆解，例如：

```text
123m / 456m / 77p / 34s / 568s
```

並標示：

- Meld
- Pair
- Taatsu
- Isolated

資料層應保留：

```text
best decompositions[]
```

而不是只返回 Shanten integer。

---

# 22. 建議演算法架構

V1 Runtime 應避免每次完整 DFS。

建議：

> 預先建立單花色查表 + Runtime 小型 DP 合併。

---

# 23. 34 張索引

建議固定：

```text
0  ~ 8   = 1m ~ 9m
9  ~ 17  = 1p ~ 9p
18 ~ 26  = 1s ~ 9s
27 ~ 33  = 東南西北白發中
```

核心 representation：

```ts
type TileCounts = Uint8Array // length = 34
```

或等價型別。

---

# 24. 單花色 Base-5 編碼

每一種牌：

```text
0 ~ 4 張
```

萬／筒／索單門 9 種：

```text
5^9 = 1,953,125 states
```

字牌 7 種：

```text
5^7 = 78,125 states
```

萬筒索可共用同一張 Suit Table。

---

# 25. Lookup Entry

不可只保存單一最佳拆解。

原因：

> 區域最佳不一定等於全域最佳。

建議保存：

```text
[meld][pair] => max taatsu
```

例如：

```ts
interface Entry {
  taatsu: Int8Array
}
```

概念索引：

```text
meld = 0..5
pair = 0..1
```

無效值：

```text
-1
```

---

# 26. Runtime DP

初始：

```text
dp[openMelds][0] = 0
```

依序 merge：

```text
Man
Pin
Sou
Honors
```

DP state：

```text
[meld][pair] = maxTaatsu
```

最後：

```text
T = min(maxTaatsu, 5-meld)

S = 10 - 2*meld - T - pair
```

取最小。

由於狀態空間固定：

> Runtime 可視為 O(1)。

---

# 27. 有效牌演算法

對 34 種牌逐一測試。

若：

```text
knownPhysicalCount(tile) >= 4
```

則不能摸入。

否則：

```text
draw(tile)
```

### Current Shanten > 0

測試所有合法 discard：

```text
bestNextShanten
```

若：

```text
bestNextShanten < currentShanten
```

則為有效牌。

### Current Shanten == 0

若 draw 後：

```text
Shanten == -1
```

則為胡牌牌。

---

# 28. 改良牌演算法

對每一種可摸牌 `x`：

1. 摸入 `x`
2. 扣除該張未知剩餘
3. 測試所有合法 discard
4. 使用最佳排序：
   - shanten
   - ukeire
   - effective kinds
5. 若最佳結果：
   ```text
   shanten == currentShanten
   ```
6. 且：
   ```text
   newUkeire > currentUkeire
   ```
7. 則 `x` 為改良牌

輸出至少：

```text
drawTile
remainingBeforeDraw
bestDiscard[]
oldUkeire
newUkeire
deltaUkeire
```

---

# 29. 避免遞迴爆炸

`Improvement()` 內部會呼叫：

```text
Ukeire(after discard)
```

而 `Ukeire()` 又需要找有效牌。

因此 API 設計必須避免：

```text
Improvement
 -> Ukeire
   -> Improvement
     -> ...
```

建議切成純函式：

```text
calcShanten()
calcEffectiveTiles()
calcUkeire()
calcDiscardOptions()
calcImprovementTiles()
```

依賴方向只能單向。

---

# 30. Canonical API 建議

```ts
interface AnalysisInput {
  concealed: TileCounts
  melds: Meld[]
  publicState: PublicState
}

interface AnalysisResult {
  mode: "draw" | "discard"
  shanten: number
  effectiveTiles: TileAnalysis[]
  improvementTiles: ImprovementAnalysis[]
  bestDecompositions: Decomposition[]
  discardOptions?: DiscardOption[]
  validation: ValidationResult
}
```

---

# 31. Meld Model

```ts
type MeldType =
  | "chi"
  | "pon"
  | "open-kan"
  | "closed-kan"

interface Meld {
  type: MeldType
  tiles: TileId[]
  owner: PlayerId
  calledFrom?: PlayerId
  calledDiscardId?: string
}
```

---

# 32. Discard Model

```ts
interface Discard {
  id: string
  tile: TileId
  player: PlayerId
  order: number
  called: boolean
  tsumogiri?: boolean
}
```

`tsumogiri`：

- V1 保存
- V1 不參與牌效率算法

---

# 33. 剛摸牌

可保存：

```ts
drawnTile?: TileId
```

用途：

- UI 標示
- 分享盤面
- 未來手切／摸切分析

V1 不參與牌效率排序。

---

# 34. 文字輸入

V1 同時支援：

## 34.1 日麻式 notation

```text
123m456p789s12344z
```

## 34.2 中文

例如：

```text
一二三萬 456筒 789索 東東
```

內部必須統一轉 canonical tile representation。

---

# 35. UI 原則

V1：

> Mobile-first

核心輸入：

- 下方固定麻將牌鍵盤
- 點牌快速加入
- 明確模式切換：
  - 手牌
  - 副露
  - 牌河
  - 花牌
- 桌機可使用文字輸入

分析：

> 即時計算

不要求使用者按「送出」。

---

# 36. 結果頁一級資訊

16 張狀態應優先顯示：

```text
目前：2 向聽

有效牌
3萬 ×3
6萬 ×2
8筒 ×4
合計 9 張

改良牌
5萬 ×3
→ 最佳打 9筒
→ 受入 9 → 15
```

剩餘張數是核心視覺資訊。

---

# 37. 17 張結果頁

優先顯示：

```text
最佳捨牌
```

並顯示：

```text
打牌
向聽數
有效牌種類
有效牌剩餘總張數
```

並列最佳全部顯示。

其他候選折疊。

---

# 38. PWA

V1 支援：

- Add to Home Screen
- 核心頁面離線
- 牌圖離線
- Shanten 離線
- Effective Tiles 離線
- Improvement Tiles 離線

核心分析不得依賴 server。

---

# 39. Client-side First

V1 核心架構：

```text
Browser
  ↓
Local Analysis Engine
```

後端不是分析必要條件。

優點：

- 即時
- 無網路可算
- 隱私
- 低成本
- 易部署

---

# 40. 分享盤面

V1 不依賴資料庫。

使用：

```text
Client-side state encoding
+ compressed URL
```

分享 URL 必須能完整重建：

- 手牌
- 副露
- 牌河
- 花牌
- 摸牌狀態
- 被叫牌資訊

URL format 必須 versioned，例如：

```text
?v=1&s=<encoded_state>
```

避免未來 schema 改版無法讀舊連結。

---

# 41. 本機歷史

V1：

- 不做帳號
- 不做 cloud history

可以：

- localStorage 保存最近盤面
- browser history 支援返回
- URL state 支援分享

---

# 42. V1 不做教學模式

但內部必須支援比較任意候選捨牌。

未來可以加入：

```text
你選 7筒
2 向聽 / 12 張

最佳 3萬
2 向聽 / 18 張
```

---

# 43. 名詞

主要 UI：

```text
向聽數
```

可在 SEO / 首次教學兼容：

```text
尚聽數
Shanten
```

建議首次顯示：

```text
向聽數（尚聽數 / Shanten）
```

---

# 44. 核心不變量

實作任何地方都必須符合以下 invariant。

## Invariant 1

任何 TileId：

```text
0 <= knownPhysicalCount(tile) <= 4
```

## Invariant 2

胡牌：

```text
5 melds + 1 pair
```

## Invariant 3

槓：

```text
structural meld count = 1
physical tile count = 4
```

## Invariant 4

花牌：

```text
never affects shanten
```

## Invariant 5

同一實體牌：

```text
remaining count 扣除一次且僅一次
```

## Invariant 6

有效牌：

```text
must improve shanten
```

除 `0 向聽 -> 直接胡牌` 特例。

## Invariant 7

改良牌：

```text
shanten unchanged
AND
actual remaining ukeire increases
```

## Invariant 8

最佳捨牌不得使用：

```text
score / defense / yaku / opponent read
```

---

# 45. 測試策略

核心演算法必須與 UI 分離，並有 deterministic unit tests。

至少測以下類別。

---

## 45.1 已胡牌

輸入完整：

```text
5 melds + 1 pair
```

期望：

```text
shanten = -1
```

---

## 45.2 聽牌

缺 1 張即可胡。

期望：

```text
shanten = 0
```

有效牌必須等於胡牌張。

---

## 45.3 一向聽

測：

```text
shanten = 1
```

且每一有效牌摸入、最佳捨牌後：

```text
shanten = 0
```

---

## 45.4 多重拆解

例如：

```text
112233m
```

不得依賴 greedy 拆解。

---

## 45.5 Pair ambiguity

例如：

```text
1122m
```

必須同時考慮：

```text
pair + taatsu
taatsu + pair
two taatsu
```

---

## 45.6 副露

測：

- 1 組吃
- 1 組碰
- 明槓
- 暗槓
- 多組副露

---

## 45.7 剩餘張數

已知 3 張某牌：

```text
remaining = 1
```

已知 4 張：

```text
remaining = 0
```

---

## 45.8 被叫走捨牌

一張牌：

- 出現在 discard history
- 同時成為 opponent meld

仍只能扣：

```text
1 張實體牌
```

而不是 2 張。

---

## 45.9 改良牌

建立 fixture：

```text
current shanten = N
current ukeire = U
```

摸牌後：

```text
same shanten
new ukeire > U
```

必須被標記 Improvement。

---

## 45.10 非改良

若：

```text
same shanten
new ukeire == U
```

即使有效牌種類增加：

```text
not improvement
```

---

## 45.11 17 張並列最佳

兩種 discard：

```text
same shanten
same ukeire
same effective kinds
```

必須：

```text
both best
```

---

# 46. Property-based Tests

建議加入 property testing。

例如隨機產生合法牌型。

必須成立：

```text
Shanten(complete winning hand) == -1
```

以及對任何有效牌：

```text
BestShantenAfterDraw(tile) < CurrentShanten
```

對任何改良牌：

```text
BestShantenAfterDraw(tile) == CurrentShanten
BestUkeireAfterDraw(tile) > CurrentUkeire
```

---

# 47. Golden Tests

建立固定 JSON fixture：

```text
testdata/
  shanten/
  effective/
  improvement/
  discard/
  validation/
```

格式示例：

```json
{
  "name": "basic one-shanten",
  "input": {},
  "expected": {
    "shanten": 1,
    "effectiveTiles": []
  }
}
```

目標：

> 未來重構 lookup table、WASM、TypeScript engine 時，可驗證行為完全一致。

---

# 48. 效能目標

在一般手機瀏覽器：

单次 16 張完整分析，包括：

- Shanten
- Effective tiles
- Improvement tiles
- Best discard simulations

應保持：

```text
interactive / effectively instant
```

核心 loop：

```text
34 candidate draws
× <= 17 candidate discards
× O(1) shanten lookup
```

因牌種與手牌大小固定，因此整體可視為固定上界。

優先：

- correctness
- deterministic behavior
- zero unnecessary allocation

再做微優化。

---

# 49. 技術架構建議

建議：

```text
packages/
  mahjong-core/
    tile
    parser
    validation
    shanten
    ukeire
    improvement
    discard
    decomposition
    codec

app/
  UI
  PWA
  state
  sharing
```

核心不得依賴：

- React
- DOM
- network
- localStorage

UI 只呼叫 pure engine。

---

# 50. Codex 實作順序

推薦依序完成：

## Phase 1 — Domain

1. TileId / TileCounts
2. Meld
3. Discard
4. PublicState
5. Input validation
6. m/p/s/z parser

## Phase 2 — Core Math

7. Standard shanten reference DFS
8. Reference tests
9. Suit lookup generation
10. Lookup shanten engine
11. Cross-check DFS vs lookup

## Phase 3 — Analysis

12. Effective tiles
13. Actual remaining count
14. Ukeire
15. 17-tile discard analysis
16. Improvement tiles
17. Decomposition output

## Phase 4 — Product

18. Mobile tile input
19. Public board editor
20. Analysis result UI
21. URL codec
22. PWA
23. Local recent boards

---

# 51. 最重要的實作原則

不要從 UI 開始。

先完成並驗證：

```text
validate()
shanten()
effectiveTiles()
ukeire()
discardOptions()
improvementTiles()
```

並建立足夠的 golden tests。

只有核心 engine 被證明正確後，再接 UI。

---

# 52. Definition of Done — V1

V1 完成條件：

- [ ] 支援標準台灣 16 張 5 面子 + 1 眼
- [ ] 正確處理 16 / 17 張狀態
- [ ] 支援吃碰明槓暗槓
- [ ] 花牌可輸入但不參與結構分析
- [ ] 所有公開牌正確扣除
- [ ] 無重複扣牌
- [ ] 正確計算向聽數
- [ ] 正確計算有效牌
- [ ] 正確計算實際受入
- [ ] 正確計算改良牌
- [ ] 正確分析最佳捨牌
- [ ] 支援並列最佳
- [ ] 支援最佳拆解
- [ ] 完整盤面合法性驗證
- [ ] 點牌輸入
- [ ] m/p/s/z 文字輸入
- [ ] 中文輸入
- [ ] Mobile-first
- [ ] 即時計算
- [ ] PWA
- [ ] 離線核心分析
- [ ] URL 分享盤面
- [ ] 核心 engine 有 unit / golden tests
- [ ] lookup engine 與 reference engine 結果一致

---

# 53. V1 邊界聲明

若使用者使用：

- 特殊胡牌
- 特殊地方規則
- 非標準牌組
- 其他台灣麻將變體

V1 必須明確告知：

> 本工具目前僅計算標準台灣 16 張「5 面子 + 1 眼」牌型。

不得默默給出可能錯誤的向聽結果。

---

# 54. 最終演算法語意摘要

```text
完成：
5 面子 + 1 眼

向聽：
距離完成標準結構的最小值

有效牌：
摸入後，經最佳捨牌可降低向聽數
（0 向聽時則為直接胡牌牌）

受入：
所有有效牌的實際未知剩餘張數總和

改良牌：
摸入後向聽數不變，
但經最佳捨牌後，
實際受入總張數增加

最佳捨牌：
向聽數最低
→ 受入最高
→ 有效牌種類最多
→ 完全相同則並列
```

這些定義是 V1 的核心契約。

任何後續功能、最佳化或 UI 呈現都不得改變上述語意。
