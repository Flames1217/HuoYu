"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCode, FiPlusCircle, FiSave, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocaleText } from "@/lib/use-locale-text";

interface FooterItemBase {
  id?: string;
  type: string;
}

interface BeianItem extends FooterItemBase {
  type: "beian";
  icpBeian?: string;
  mengIcpBeian?: string;
  icpBeianUrl?: string;
  mengIcpBeianUrl?: string;
}

interface CopyrightItem extends FooterItemBase {
  type: "copyright";
  authorName: string;
  startYear?: number;
}

interface CustomTextItem extends FooterItemBase {
  type: "customText";
  text: string;
}

interface Link {
  text: string;
  url: string;
  title?: string;
}

interface CustomLinksItem extends FooterItemBase {
  type: "customLinks";
  links: Link[];
}

type FooterItem = BeianItem | CopyrightItem | CustomTextItem | CustomLinksItem;

interface FooterSettings {
  items: FooterItem[];
}

const fallbackItems: FooterItem[] = [
  {
    type: "beian",
    icpBeian:
      '<span style="display: inline-flex; align-items: center; white-space: nowrap;">   <img src="https://img.viper3.top/user/ICP.ico" alt="ICP" style="height: 1em; margin-right: 0.25em;">   京ICP备2023015801号 </span>',
    mengIcpBeian:
      '<span style="display: inline-flex; align-items: center; white-space: nowrap;">   <img src="https://img.viper3.top/user/cuteICP.ico" alt="萌ICP" style="height: 1em; margin-right: 0.25em;">   萌ICP备20251217号 </span>',
    icpBeianUrl: "https://beian.miit.gov.cn/",
    mengIcpBeianUrl: "https://icp.gov.moe/?keyword=20251217",
  },
  { type: "copyright", authorName: "Viper373", startYear: 2025 },
  {
    type: "customText",
    text: '<div style="font-size:15px;font-weight:bold;background:linear-gradient(90deg,#ff0000 0%,#ff8000 6.25%,#ffff00 12.5%,#80ff00 18.75%,#00ff00 25%,#00ff80 31.25%,#00ffff 37.5%,#0080ff 43.75%,#0000ff 50%,#8000ff 56.25%,#ff00ff 62.5%,#ff0080 68.75%,#ff0000 75%,#ff8000 81.25%,#ffff00 87.5%,#80ff00 93.75%,#00ff00 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rainbow 6s linear infinite;text-align:center;font-family:sans-serif;padding:0.5em">平平无奇的爬虫开发者</div> <style> @keyframes rainbow{ 0%{background-position:0% 50%} 100%{background-position:200% 50%} } </style>',
  },
];

function withIds(items: FooterItem[]) {
  return items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }));
}

function formatCss(css: string) {
  return css
    .replace(/\s+/g, " ")
    .replace(/\s*{\s*/g, " {\n  ")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n  ")
    .replace(/\n\s*\n/g, "\n")
    .replace(/\n\s+}/g, "\n}")
    .trim();
}

function formatInlineStyle(style: string) {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .join("; ");
}

function formatHtmlCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withFormattedStyles = trimmed.replace(/style=(["'])([\s\S]*?)\1/g, (_, quote, style) => {
    return `style=${quote}${formatInlineStyle(style)}${quote}`;
  });

  const withFormattedStyleBlocks = withFormattedStyles.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => {
    return `<style${attrs}>\n${formatCss(css)}\n</style>`;
  });

  return withFormattedStyleBlocks
    .replace(/>\s+</g, ">\n<")
    .replace(/\s{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function formatFooterItem(item: FooterItem): FooterItem {
  if (item.type === "beian") {
    return {
      ...item,
      icpBeian: formatHtmlCode(item.icpBeian || ""),
      mengIcpBeian: formatHtmlCode(item.mengIcpBeian || ""),
    };
  }

  if (item.type === "customText") {
    return { ...item, text: formatHtmlCode(item.text || "") };
  }

  return item;
}

function CodeInput({
  id,
  label,
  description,
  value,
  minHeight = "min-h-40",
  onChange,
  onFormat,
}: {
  id?: string;
  label: string;
  description?: string;
  value: string;
  minHeight?: string;
  onChange: (value: string) => void;
  onFormat: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label htmlFor={id} className="text-sm font-bold">{label}</label>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="admin-secondary-button shrink-0" onClick={onFormat}>
          <FiCode className="mr-2 h-4 w-4" />
          格式化
        </Button>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className={`${minHeight} resize-y whitespace-pre font-mono text-sm leading-6`}
      />
    </div>
  );
}

export default function FooterAdminPage() {
  const { t } = useLocaleText();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2000 + 1 }, (_, index) => currentYear - index);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({ items: withIds(fallbackItems) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const copyrightItem = useMemo(
    () => footerSettings.items.find((item): item is CopyrightItem => item.type === "copyright"),
    [footerSettings.items],
  );

  useEffect(() => {
    async function loadFooter() {
      setLoading(true);
      try {
        const response = await fetch("/api/footer");
        if (!response.ok) throw new Error(t("adminFooter.toastFetchError", "读取页脚配置失败"));
        const data = await response.json();
        const items = Array.isArray(data.items) && data.items.length ? data.items : fallbackItems;
        setFooterSettings({ items: withIds(items) });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("adminFooter.toastFetchError", "读取页脚配置失败"));
      } finally {
        setLoading(false);
      }
    }

    loadFooter();
  }, [t]);

  function updateItem(index: number, patch: Partial<FooterItem>) {
    setFooterSettings((current) => ({
      items: current.items.map((item, itemIndex) => (itemIndex === index ? ({ ...item, ...patch } as FooterItem) : item)),
    }));
  }

  function updateCopyrightAuthor(authorName: string) {
    setFooterSettings((current) => {
      const hasCopyright = current.items.some((item) => item.type === "copyright");
      const items = hasCopyright
        ? current.items.map((item) =>
            item.type === "copyright" ? { ...item, authorName } : item,
          )
        : [...current.items, { id: crypto.randomUUID(), type: "copyright" as const, authorName, startYear: currentYear }];
      return { items };
    });
  }

  function updateCopyrightYear(startYear: number) {
    setFooterSettings((current) => {
      const hasCopyright = current.items.some((item) => item.type === "copyright");
      const items = hasCopyright
        ? current.items.map((item) =>
            item.type === "copyright" ? { ...item, startYear } : item,
          )
        : [...current.items, { id: crypto.randomUUID(), type: "copyright" as const, authorName: "", startYear }];
      return { items };
    });
  }

  function formatCopyrightYears(startYear?: number) {
    const start = startYear || currentYear;
    return start < currentYear ? `${start}-${currentYear}` : String(currentYear);
  }

  function updateCustomLink(itemIndex: number, linkIndex: number, patch: Partial<Link>) {
    setFooterSettings((current) => ({
      items: current.items.map((item, index) => {
        if (index !== itemIndex || item.type !== "customLinks") return item;
        return {
          ...item,
          links: item.links.map((link, currentLinkIndex) =>
            currentLinkIndex === linkIndex ? { ...link, ...patch } : link,
          ),
        };
      }),
    }));
  }

  function addItem(type: "beian" | "customText" | "customLinks") {
    const nextItem: FooterItem =
      type === "beian"
        ? { id: crypto.randomUUID(), type, icpBeian: "", icpBeianUrl: "https://beian.miit.gov.cn/", mengIcpBeian: "", mengIcpBeianUrl: "" }
        : type === "customText"
          ? { id: crypto.randomUUID(), type, text: t("adminFooter.newCustomText", "新的自定义文本") }
          : { id: crypto.randomUUID(), type, links: [{ text: t("adminFooter.newLinkText", "新链接"), url: "#", title: "" }] };

    setFooterSettings((current) => ({ items: [...current.items, nextItem] }));
  }

  function removeItem(index: number) {
    setFooterSettings((current) => ({ items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function formatAllCodeFields() {
    setFooterSettings((current) => ({ items: current.items.map(formatFooterItem) }));
    toast.success(t("adminFooter.formatSuccess", "代码已格式化"));
  }

  async function saveFooter() {
    setSaving(true);
    try {
      const formattedSettings = { items: footerSettings.items.map(formatFooterItem) };
      setFooterSettings(formattedSettings);
      const items = formattedSettings.items.map(({ id, ...item }) =>
        item.type === "copyright" ? { ...item, startYear: item.startYear || currentYear } : item,
      );
      const response = await fetch("/api/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) throw new Error(t("adminFooter.toastSaveError", "保存页脚配置失败"));
      toast.success(t("adminFooter.toastSuccess", "页脚配置已保存"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminFooter.toastSaveError", "保存页脚配置失败"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[360px] items-center justify-center text-lg font-bold">{t("adminFooter.loadingInitial", "正在加载页脚配置...")}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="admin-kicker">{t("adminFooter.kicker", "Footer")}</div>
          <h1 className="mt-2 text-3xl font-black">{t("adminFooter.titleMain", "页脚管理")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("adminFooter.descriptionMain", "维护备案、自定义文本、链接组；备案和自定义文本支持 HTML/CSS。")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={formatAllCodeFields} type="button" variant="outline" className="admin-secondary-button">
            <FiCode className="mr-2 h-4 w-4" />
            {t("adminFooter.formatAllButton", "格式化全部代码")}
          </Button>
          <Button onClick={saveFooter} disabled={saving} className="bg-cyan-500 text-white hover:bg-cyan-400">
            <FiSave className="mr-2 h-4 w-4" />
            {saving ? t("adminFooter.savingButton", "保存中...") : t("adminFooter.saveButton", "保存页脚")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" className="admin-secondary-button" onClick={() => addItem("beian")}>
          <FiPlusCircle className="mr-2 h-4 w-4" /> {t("adminFooter.addItemButtonBeian", "添加备案信息行")}
        </Button>
        <Button type="button" variant="outline" className="admin-secondary-button" onClick={() => addItem("customText")}>
          <FiPlusCircle className="mr-2 h-4 w-4" /> {t("adminFooter.addItemButtonCustomText", "添加自定义文本行")}
        </Button>
        <Button type="button" variant="outline" className="admin-secondary-button" onClick={() => addItem("customLinks")}>
          <FiPlusCircle className="mr-2 h-4 w-4" /> {t("adminFooter.addItemButtonCustomLinks", "添加自定义链接组")}
        </Button>
      </div>

      <Card className="zero-admin-surface">
        <CardHeader>
          <CardTitle>{t("adminFooter.copyrightTitle", "版权作者")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-2">
              <label htmlFor="footer-author" className="text-sm font-bold">{t("adminFooter.copyrightLabelAuthor", "作者名")}</label>
              <Input
                id="footer-author"
                value={copyrightItem?.authorName ?? ""}
                onChange={(event) => updateCopyrightAuthor(event.target.value)}
                placeholder={t("adminFooter.copyrightPlaceholderAuthor", "例如：Viper373")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="footer-year" className="text-sm font-bold">{t("adminFooter.copyrightLabelStartYear", "起始年份")}</label>
              <select
                id="footer-year"
                value={copyrightItem?.startYear ?? currentYear}
                onChange={(event) => updateCopyrightYear(Number(event.target.value) || currentYear)}
                className="h-10 w-full rounded-md border px-3 py-2 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-300/20 p-4 text-sm text-slate-300">
            {t("adminFooter.previewLabel", "预览")}：Copyright &copy; {formatCopyrightYears(copyrightItem?.startYear)} @ {copyrightItem?.authorName || "Viper373"}
          </div>
        </CardContent>
      </Card>

      {footerSettings.items.map((item, index) => {
        if (item.type === "copyright") return null;

        return (
          <Card key={item.id || index} className="zero-admin-surface">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>
                {item.type === "beian"
                  ? t("adminFooter.itemTypeBeian", "备案信息")
                  : item.type === "customText"
                    ? t("adminFooter.itemTypeCustomText", "自定义文本")
                    : t("adminFooter.itemTypeCustomLinks", "链接组")}
              </CardTitle>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label={t("adminFooter.ariaLabelRemoveItem", "删除")}>
                <FiTrash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {item.type === "beian" && (
                <div className="space-y-5">
                  <p className="rounded-xl border border-cyan-300/20 bg-cyan-400/8 p-3 text-xs leading-5 text-slate-300">
                    {t("adminFooter.beianHtmlHelp", "备案信息支持自定义 HTML 和内联 CSS，可放入图标、span、style 等代码；保存时会自动格式化。")}
                  </p>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <CodeInput
                      label={t("adminFooter.beianLabelIcpBeian", "ICP备案号")}
                      description={t("adminFooter.codeInputHelp", "支持 HTML/CSS，文本框可拖拽拉大。")}
                      value={item.icpBeian || ""}
                      onChange={(value) => updateItem(index, { icpBeian: value } as Partial<FooterItem>)}
                      onFormat={() => updateItem(index, { icpBeian: formatHtmlCode(item.icpBeian || "") } as Partial<FooterItem>)}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-bold">{t("adminFooter.beianLabelIcpBeianUrl", "ICP备案链接")}</label>
                      <Input
                        value={item.icpBeianUrl || ""}
                        onChange={(event) => updateItem(index, { icpBeianUrl: event.target.value } as Partial<FooterItem>)}
                        placeholder={t("adminFooter.beianPlaceholderIcpBeianUrl", "例如：https://beian.miit.gov.cn/")}
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <CodeInput
                      label={t("adminFooter.beianLabelMengIcpBeian", "萌ICP备案号")}
                      description={t("adminFooter.codeInputHelp", "支持 HTML/CSS，文本框可拖拽拉大。")}
                      value={item.mengIcpBeian || ""}
                      onChange={(value) => updateItem(index, { mengIcpBeian: value } as Partial<FooterItem>)}
                      onFormat={() => updateItem(index, { mengIcpBeian: formatHtmlCode(item.mengIcpBeian || "") } as Partial<FooterItem>)}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-bold">{t("adminFooter.beianLabelMengIcpBeianUrl", "萌ICP备案链接")}</label>
                      <Input
                        value={item.mengIcpBeianUrl || ""}
                        onChange={(event) => updateItem(index, { mengIcpBeianUrl: event.target.value } as Partial<FooterItem>)}
                        placeholder={t("adminFooter.beianPlaceholderMengIcpBeianUrl", "例如：https://icp.gov.moe/")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {item.type === "customText" && (
                <CodeInput
                  label={t("adminFooter.customTextLabel", "自定义文本（支持 HTML/CSS）")}
                  description={t("adminFooter.customTextCodeHelp", "支持 HTML、CSS、style 标签，文本框可拖拽拉大；保存时会自动格式化。")}
                  value={item.text || ""}
                  minHeight="min-h-64"
                  onChange={(value) => updateItem(index, { text: value } as Partial<FooterItem>)}
                  onFormat={() => updateItem(index, { text: formatHtmlCode(item.text || "") } as Partial<FooterItem>)}
                />
              )}

              {item.type === "customLinks" && (
                <div className="space-y-4">
                  {item.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="grid gap-3 rounded-xl border border-slate-500/20 p-3 md:grid-cols-3">
                      <Input
                        value={link.text}
                        onChange={(event) => updateCustomLink(index, linkIndex, { text: event.target.value })}
                        placeholder={t("adminFooter.customLinksPlaceholderLinkText", "链接文字")}
                      />
                      <Input
                        value={link.url}
                        onChange={(event) => updateCustomLink(index, linkIndex, { url: event.target.value })}
                        placeholder={t("adminFooter.customLinksPlaceholderLinkUrl", "链接 URL")}
                      />
                      <Input
                        value={link.title || ""}
                        onChange={(event) => updateCustomLink(index, linkIndex, { title: event.target.value })}
                        placeholder={t("adminFooter.customLinksPlaceholderLinkTitle", "悬停提示")}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateItem(index, {
                        links: [...item.links, { text: t("adminFooter.newLinkText", "新链接"), url: "#", title: "" }],
                      } as Partial<FooterItem>)
                    }
                  >
                    <FiPlusCircle className="mr-2 h-4 w-4" /> {t("adminFooter.customLinksButtonAddLink", "添加链接")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
