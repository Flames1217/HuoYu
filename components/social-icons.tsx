"use client";

import type React from "react";
import { memo, Suspense, useEffect, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSocialIconComponent } from "@/lib/getSocialIcon";

interface SocialLinkData {
    name: string;
    url: string;
    icon: string;
    color?: string;
}

interface ProfileApiResponse {
    social_links?: SocialLinkData[];
}

export const SocialIcons = memo(function SocialIcons() {
    const [links, setLinks] = useState<SocialLinkData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSocialLinks = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/profile-public");
                if (!response.ok) {
                    throw new Error("Failed to fetch social links");
                }
                const data: ProfileApiResponse = await response.json();
                setLinks(data.social_links || []);
            } catch (error) {
                console.error("Error fetching social links:", error);
                setLinks([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSocialLinks();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-wrap justify-center gap-3">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="h-10 w-10 rounded-full bg-white/20 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (!links || links.length === 0) {
        return null;
    }

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap justify-center gap-3">
                {links.map((social, index) => {
                    const accentColor = social.color || "#8b5cf6";

                    return (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <motion.a
                                    layout
                                    href={social.url}
                                    className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.08] text-white shadow-sm shadow-black/20 backdrop-blur-md transition-colors duration-200 ease-out hover:bg-white/[0.14]"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                    style={
                                        {
                                            "--social-accent": accentColor,
                                            opacity: 1,
                                        } as React.CSSProperties
                                    }
                                    initial={{ scale: 1, y: 0 }}
                                    animate={{ scale: 1, y: 0 }}
                                    whileHover={{
                                        scale: 1.08,
                                        y: -3,
                                        borderColor: accentColor,
                                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.35), 0 0 22px rgba(125, 92, 255, 0.28)",
                                    }}
                                    whileTap={{ scale: 0.96, y: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 360,
                                        damping: 24,
                                    }}
                                >
                                    <span
                                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                        style={{
                                            background: "radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--social-accent) 32%, transparent), transparent 62%)",
                                        }}
                                    />
                                    <motion.span
                                        className="relative z-10 flex items-center justify-center"
                                        initial={{ scale: 1 }}
                                        whileHover={{ scale: 1.08 }}
                                        transition={{ type: "spring", stiffness: 420, damping: 22 }}
                                    >
                                        <Suspense
                                            fallback={
                                                <AiOutlineLoading3Quarters
                                                    size={20}
                                                    className="animate-spin text-muted-foreground"
                                                />
                                            }
                                        >
                                            {getSocialIconComponent(
                                                social.icon,
                                                20,
                                                social.color,
                                                "text-foreground"
                                            )}
                                        </Suspense>
                                    </motion.span>
                                </motion.a>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{social.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
});
