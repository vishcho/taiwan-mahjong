import { expect, test } from "@playwright/test";
test("sample analysis, hand input, text correction, details and share restore", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await expect(page.getByRole("heading", { name: "有效牌" })).toBeVisible();
  await page.getByRole("button", { name: "移除九萬（剛摸牌）" }).click();
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await expect(page.getByText("目前向聽數", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "最佳拆解與改良牌 查看詳情 →" })
    .click();
  await expect(
    page.getByText("目前無改良牌：沒有同向聽且增加實際受入的換牌。"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "文字輸入", exact: true }).click();
  await page.getByRole("textbox", { name: "中文或 m/p/s/z" }).fill("123m8z");
  await page.getByRole("button", { name: "套用手牌" }).click();
  await expect(page.getByRole("alert")).toContainText("第 5 字");
  await page
    .getByRole("textbox", { name: "中文或 m/p/s/z" })
    .fill("一二三四五六萬 789筒 123456索 中中");
  await page.getByRole("button", { name: "套用手牌" }).click();
  await expect(page.getByText("已完成胡牌", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "分享盤面", exact: true }).click();
  const url = await page
    .getByRole("textbox", { name: "完整盤面連結" })
    .inputValue();
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByText("已完成胡牌", { exact: true })).toBeVisible();
});
test("public discard called into pon is counted once and can be repaired", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await page.getByRole("button", { name: "公開牌 ＋" }).click();
  await page.getByRole("button", { name: "對家", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "字", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "輸入東", exact: true })
    .click();
  await page.getByRole("button", { name: "上家", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "副露", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "類型", exact: true })
    .selectOption("pon");
  await page.getByLabel("副露文字").fill("東東東");
  await page
    .getByRole("combobox", { name: "連結被叫走捨牌" })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "加入副露" }).click();
  await page.getByRole("button", { name: "關閉抽屜" }).click();
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await page.getByRole("button", { name: "公開牌 ＋" }).click();
  await page.getByRole("button", { name: "對家", exact: true }).click();
  await expect(page.getByText("已叫走", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "刪除牌河第1張東" }).click();
  await page.getByRole("button", { name: "關閉抽屜" }).click();
  await expect(page.getByTestId("ukeire")).toHaveText("07");
});
test("mobile widths have no horizontal overflow and base hand is visible", async ({
  page,
}) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("ukeire")).toHaveText("07");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      const hand = await page
        .getByRole("region", { name: "目前手牌" })
        .boundingBox();
      const keyboard = await page
        .getByRole("region", { name: "麻將牌鍵盤" })
        .boundingBox();
      expect(hand!.y + hand!.height).toBeLessThanOrEqual(keyboard!.y);
      await page.screenshot({
        path: "output/first-version-mobile.png",
        fullPage: false,
      });
    }
  }
});
test("completed cache can reload and analyze while offline", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "WebKit offline service-worker lifecycle requires separate verification",
  );
  await page.goto("/");
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await expect(page.getByText("● 可離線使用", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.reload();
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("ukeire")).toHaveText("07");
  await page.getByRole("button", { name: "移除九萬（剛摸牌）" }).click();
  await expect(page.getByText("目前向聽數", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "最佳拆解與改良牌 查看詳情 →" })
    .click();
  await expect(
    page.getByText("目前無改良牌：沒有同向聽且增加實際受入的換牌。"),
  ).toBeVisible();
});
