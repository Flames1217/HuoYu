"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface FooterItemBase {
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

export function Footer() {
  const { t, ready } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [footerItems, setFooterItems] = useState<FooterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFooterSettings() {
      try {
        const response = await fetch("/api/footer");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch footer settings: ${response.statusText}`);
        }
        const data: FooterSettings = await response.json();
        if (!cancelled) setFooterItems(data.items || []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "An unknown error occurred");
          setFooterItems([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchFooterSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  const formatCopyrightYears = (startYear?: number) => {
    const start = startYear || currentYear;
    return start < currentYear ? `${start}-${currentYear}` : String(currentYear);
  };

  const renderFooterItem = (item: FooterItem, index: number) => {
    switch (item.type) {
      case "beian": {
        const hasIcp = Boolean(item.icpBeian?.trim());
        const hasMengIcp = Boolean(item.mengIcpBeian?.trim());
        if (!hasIcp && !hasMengIcp) return null;

        return (
          <div key={index} className="mt-1 flex flex-wrap items-center justify-center px-4 text-xs">
            {hasIcp && (
              <a
                href={item.icpBeianUrl || "https://beian.miit.gov.cn/"}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 inline-flex items-center whitespace-nowrap transition-colors hover:text-primary"
              >
                <span dangerouslySetInnerHTML={{ __html: item.icpBeian || "" }} />
              </a>
            )}
            {hasIcp && hasMengIcp && <span className="mx-2 shrink-0">|</span>}
            {hasMengIcp && (
              <a
                href={item.mengIcpBeianUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 inline-flex items-center whitespace-nowrap transition-colors hover:text-primary"
              >
                <span dangerouslySetInnerHTML={{ __html: item.mengIcpBeian || "" }} />
              </a>
            )}
          </div>
        );
      }

      case "customText":
        return (
          <div
            key={index}
            className="mt-1 w-full px-4 text-center"
            dangerouslySetInnerHTML={{ __html: item.text }}
          />
        );

      case "customLinks":
        if (!item.links?.length) return null;
        return (
          <div key={index} className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
            {item.links.map((link, linkIndex) => (
              <a
                key={linkIndex}
                href={link.url}
                className="whitespace-nowrap text-xs transition-colors hover:text-primary sm:text-sm"
                target="_blank"
                rel="noopener noreferrer"
                title={link.title || link.text}
              >
                {link.text}
              </a>
            ))}
          </div>
        );

      case "copyright":
        return (
          <div key={index} className="mt-1 px-4">
            Copyright &copy; {formatCopyrightYears(item.startYear)} @{" "}
            <a
              href="https://viper3.top"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {item.authorName || "Viper373"}
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <motion.footer className="w-full py-6 text-center text-sm text-gray-600 dark:text-gray-400">Loading...</motion.footer>;
  }

  if (error) {
    return (
      <motion.footer className="w-full py-6 text-center text-sm text-red-600 dark:text-red-400">
        {t("footer.error", "Error loading footer")}: {error}
      </motion.footer>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="site-footer mt-auto flex w-full flex-col items-center py-6 text-center text-sm text-black dark:text-gray-300"
    >
      {footerItems.map((item, index) => renderFooterItem(item, index))}
    </motion.footer>
  );
}
