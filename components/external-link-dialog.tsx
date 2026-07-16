"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocaleText } from "@/lib/use-locale-text";

type PendingLink = { href: string; label: string; host: string };

export function ExternalLinkDialog() {
  const [pending, setPending] = useState<PendingLink | null>(null);
  const [copied, setCopied] = useState(false);
  const { locale } = useLocaleText();
  const copy =
    locale === "cn"
      ? {
          title: "即将离开火域",
          description: "外部世界已在门外，确认后将在新标签页打开。",
          cancel: "暂不前往",
          continue: "继续访问",
          copy: "复制链接",
          copied: "已复制",
        }
      : {
          title: "Leaving HuoYu",
          description:
            "This external page will open in a new tab after confirmation.",
          cancel: "Stay here",
          continue: "Continue",
          copy: "Copy link",
          copied: "Copied",
        };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !link ||
        link.closest("[data-external-link-skip]") ||
        link.hasAttribute("download")
      )
        return;

      try {
        const url = new URL(link.href, window.location.href);
        if (
          !/^https?:$/.test(url.protocol) ||
          url.origin === window.location.origin
        )
          return;
        event.preventDefault();
        setCopied(false);
        setPending({
          href: url.href,
          host: url.hostname.replace(/^www\./, ""),
          label:
            link.getAttribute("aria-label") ||
            link.textContent?.trim() ||
            url.hostname,
        });
      } catch {
        // 无效链接交给浏览器原生行为处理。
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const isImage = pending
    ? /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(pending.href)
    : false;
  const copyLink = async () => {
    if (!pending) return;
    await navigator.clipboard.writeText(pending.href);
    setCopied(true);
  };
  const openLink = () => {
    if (!pending) return;
    window.open(pending.href, "_blank", "noopener,noreferrer");
    setPending(null);
  };

  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => !open && setPending(null)}
    >
      <DialogContent className="external-link-dialog overflow-hidden border-emerald-900/15 bg-white/95 p-0 text-emerald-950 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-cyan-950/40 sm:max-w-md">
        <div className="external-link-dialog-glow" aria-hidden="true" />
        <div className="relative space-y-5 p-6">
          <DialogHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-700/20 bg-emerald-500/10 text-emerald-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200">
              <FiExternalLink className="h-5 w-5" />
            </div>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription className="text-emerald-900/65 dark:text-slate-400">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          {isImage && (
            <img
              src={pending?.href}
              alt={pending?.label}
              className="mx-auto max-h-64 rounded-2xl border border-white/10 object-contain"
            />
          )}

          <div className="rounded-2xl border border-emerald-900/10 bg-emerald-950/[0.04] p-4 dark:border-white/10 dark:bg-white/[0.05]">
            <p className="truncate font-black text-emerald-950 dark:text-white">
              {pending?.label}
            </p>
            <div className="mt-2 flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all text-sm text-emerald-700 dark:text-cyan-200/80">
                {pending?.href}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLink}
                aria-label={copied ? copy.copied : copy.copy}
                className="h-8 w-8 shrink-0 text-emerald-700 hover:bg-emerald-900/10 dark:text-cyan-200 dark:hover:bg-white/10"
              >
                {copied ? <FiCheck /> : <FiCopy />}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              className="text-emerald-800 hover:bg-emerald-900/10 hover:text-emerald-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {copy.cancel}
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-cyan-950/30 hover:opacity-90"
            >
              <a
                href={pending?.href}
                target="_blank"
                rel="noopener noreferrer"
                data-external-link-skip
                onClick={(event) => {
                  event.preventDefault();
                  openLink();
                }}
              >
                {copy.continue}
              </a>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
