"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FiLock } from "react-icons/fi";
import { GiFlame } from "react-icons/gi";
import { PageHeaderControls } from "@/components/page-header-controls";

export function AdminPasswordLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("密码不正确");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-controls">
        <PageHeaderControls />
      </div>
      <section className="admin-login-shell">
        <div className="admin-login-copy">
          <div className="admin-login-mark">
            <GiFlame className="h-7 w-7" />
          </div>
          <p className="admin-login-kicker">HuoYu Admin</p>
          <h1>管理中心</h1>
          <p>站点内容、项目展示和页脚信息都在这里维护。输入管理员密码即可进入后台。</p>
          <div className="admin-login-meta">
            <span>只保留必要入口</span>
            <span>本地会话有效 30 天</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div>
            <h2>进入后台</h2>
            <p>使用环境变量 PASSWORD 配置的管理员密码登录。</p>
          </div>
          <label htmlFor="admin-password">管理员密码</label>
          <div className="admin-login-input">
            <FiLock className="h-4 w-4" />
            <input
              id="admin-password"
              type="password"
              placeholder="请输入管理员密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </div>

          {error && <div className="admin-login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading && <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />}
            {loading ? "正在进入" : "进入后台"}
          </button>
        </form>
      </section>
    </main>
  );
}
