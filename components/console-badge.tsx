"use client";
import { useEffect } from "react";

export function ConsoleBadge() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log(
        "%c Viper373 %c HuoYu ",
        "font-family:'JetBrains Mono','Inter','Microsoft YaHei UI',monospace;font-weight:700;font-size:12px;line-height:24px;color:#e0f2fe;background:#111827;border:1px solid #334155;border-right:0;border-radius:7px 0 0 7px;padding:5px 10px;",
        "font-family:'JetBrains Mono','Inter','Microsoft YaHei UI',monospace;font-weight:800;font-size:12px;line-height:24px;color:#06211f;background:linear-gradient(135deg,#67e8f9,#34d399);border:1px solid #67e8f9;border-left:0;border-radius:0 7px 7px 0;padding:5px 10px;"
      );
    }
  }, []);
  return null;
}
