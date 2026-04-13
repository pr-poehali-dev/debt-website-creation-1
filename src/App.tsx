import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/9e6cb3c9-2167-4397-b320-c59491f09fb2";
const DEBTS_URL = "https://functions.poehali.dev/2738b4a4-1b2c-4a5c-8b4e-3b9f327e7707";

type Page = "home" | "history" | "stats" | "profile" | "add";
type AuthPage = "login" | "register";

interface User {
  id: number;
  name: string;
  email: string;
  telegram_chat_id?: number | null;
}

interface Debt {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
  type: "owe" | "lend";
  category: string;
  note: string;
  paid: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

const daysLeft = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const api = async (url: string, params: string, method = "GET", body?: object, token?: string) => {
  const res = await fetch(`${url}?${params}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
};

// ── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<AuthPage>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    const action = mode === "login" ? "login" : "register";
    const body = mode === "login" ? { email: form.email, password: form.password } : form;
    const res = await api(AUTH_URL, `action=${action}`, "POST", body);
    setLoading(false);
    if (res.ok && res.data?.token) {
      localStorage.setItem("token", res.data.token);
      onLogin(res.data.token, res.data.user);
    } else {
      setError(res.data?.error || "Ошибка. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-golos"
      style={{ background: "linear-gradient(135deg, #060810 0%, #0a0e1a 50%, #080610 100%)" }}>
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
            <Icon name="CreditCard" size={28} className="text-black" />
          </div>
          <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">ДолгТрекер</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Управляй долгами легко</p>
        </div>

        <div className="rounded-2xl p-6 glass-strong space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["login", "register"] as AuthPage[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: mode === m ? "#00FF87" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.5)" }}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div>
              <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>Имя</label>
              <input type="text" placeholder="Как вас зовут?" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }} />
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
            <input type="email" placeholder="your@email.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>Пароль</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }} />
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button onClick={submit} disabled={loading}
            className="w-full rounded-xl p-3.5 font-oswald text-lg font-bold text-black transition-all hover-lift"
            style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", amount: "", dueDate: "", type: "owe", category: "Личное", note: "" });
  const [tgInput, setTgInput] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [notifShown, setNotifShown] = useState(true);

  const loadDebts = useCallback(async (tok: string) => {
    const res = await api(DEBTS_URL, "action=list", "GET", undefined, tok);
    if (res.ok && res.data?.debts) setDebts(res.data.debts);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      const res = await api(AUTH_URL, "action=me", "GET", undefined, token);
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        await loadDebts(token);
      } else {
        localStorage.removeItem("token");
        setToken(null);
      }
      setLoading(false);
    })();
  }, [token, loadDebts]);

  const handleLogin = (tok: string, u: User) => { setToken(tok); setUser(u); loadDebts(tok); };

  const handleLogout = async () => {
    if (token) await api(AUTH_URL, "action=logout", "POST", undefined, token);
    localStorage.removeItem("token");
    setToken(null); setUser(null); setDebts([]);
  };

  const handleAddDebt = async () => {
    if (!form.name || !form.amount || !form.dueDate || !token) return;
    const res = await api(DEBTS_URL, "action=create", "POST", {
      name: form.name, amount: Number(form.amount), dueDate: form.dueDate,
      type: form.type, category: form.category, note: form.note,
    }, token);
    if (res.ok) {
      await loadDebts(token);
      setForm({ name: "", amount: "", dueDate: "", type: "owe", category: "Личное", note: "" });
      setPage("home");
    }
  };

  const togglePaid = async (id: number) => {
    if (!token) return;
    setDebts(prev => prev.map(d => d.id === id ? { ...d, paid: !d.paid } : d));
    await api(DEBTS_URL, `action=toggle&id=${id}`, "POST", undefined, token);
  };

  const connectTelegram = async () => {
    if (!token || !tgInput) return;
    setTgSaving(true);
    const res = await api(AUTH_URL, "action=connect-telegram", "POST", { chat_id: Number(tgInput) }, token);
    if (res.ok) {
      setUser(u => u ? { ...u, telegram_chat_id: Number(tgInput) } : u);
      setTgInput("");
    }
    setTgSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060810" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#00FF87", borderTopColor: "transparent" }}></div>
    </div>
  );

  if (!token || !user) return <AuthScreen onLogin={handleLogin} />;

  const totalOwe = debts.filter(d => d.type === "owe" && !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalLend = debts.filter(d => d.type === "lend" && !d.paid).reduce((s, d) => s + d.amount, 0);
  const overdue = debts.filter(d => !d.paid && daysLeft(d.dueDate) < 0);
  const upcoming = debts.filter(d => !d.paid && daysLeft(d.dueDate) >= 0 && daysLeft(d.dueDate) <= 7);
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen font-golos" style={{ background: "linear-gradient(135deg, #060810 0%, #0a0e1a 50%, #080610 100%)" }}>

      {/* Notification Banner */}
      {notifShown && (overdue.length > 0 || upcoming.length > 0) && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-fade-in"
          style={{ background: "linear-gradient(90deg, rgba(255,45,120,0.92), rgba(255,100,50,0.92))", backdropFilter: "blur(10px)" }}>
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Bell" size={15} className="text-white" />
              <span className="text-white text-sm font-medium">
                {overdue.length > 0 ? `${overdue.length} просроченных долга` : `${upcoming.length} долгов истекают через 7 дней`}
              </span>
            </div>
            <button onClick={() => setNotifShown(false)} className="text-white/70 hover:text-white transition-colors">
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pb-28"
        style={{ paddingTop: notifShown && (overdue.length > 0 || upcoming.length > 0) ? "56px" : "24px" }}>

        {/* HOME */}
        {page === "home" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pt-2 animate-fade-in">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Привет, {user.name.split(" ")[0]}</p>
                <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">ДолгТрекер</h1>
              </div>
              <button onClick={() => setPage("profile")} className="w-10 h-10 rounded-full flex items-center justify-center hover-lift"
                style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
                <span className="font-oswald font-bold text-sm text-black">{initials}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 animate-fade-in animate-delay-100">
              <div className="rounded-2xl p-4 hover-lift neon-border-pink" style={{ background: "linear-gradient(135deg, rgba(255,45,120,0.15), rgba(255,45,120,0.05))" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Я должен</p>
                <p className="font-oswald text-2xl font-bold" style={{ color: "#FF2D78", textShadow: "0 0 20px rgba(255,45,120,0.5)" }}>{fmt(totalOwe)}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{debts.filter(d => d.type === "owe" && !d.paid).length} долгов</p>
              </div>
              <div className="rounded-2xl p-4 hover-lift neon-border-green" style={{ background: "linear-gradient(135deg, rgba(0,255,135,0.15), rgba(0,255,135,0.05))" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Должны мне</p>
                <p className="font-oswald text-2xl font-bold" style={{ color: "#00FF87", textShadow: "0 0 20px rgba(0,255,135,0.5)" }}>{fmt(totalLend)}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{debts.filter(d => d.type === "lend" && !d.paid).length} долгов</p>
              </div>
            </div>

            <div className="rounded-2xl p-4 glass-strong animate-fade-in animate-delay-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Чистый баланс</p>
                  <p className={`font-oswald text-3xl font-bold ${totalLend - totalOwe >= 0 ? "neon-text-green" : "neon-text-pink"}`}>
                    {totalLend - totalOwe >= 0 ? "+" : ""}{fmt(totalLend - totalOwe)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {overdue.length > 0 && <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs text-red-400">{overdue.length} просроч.</span></div>}
                  {upcoming.length > 0 && <div className="flex items-center gap-1 justify-end"><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div><span className="text-xs text-yellow-400">{upcoming.length} скоро</span></div>}
                </div>
              </div>
            </div>

            <button onClick={() => setPage("add")}
              className="w-full rounded-2xl p-4 flex items-center justify-center gap-3 font-semibold text-black hover-lift glow-green animate-fade-in animate-delay-200 transition-all"
              style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
              <Icon name="Plus" size={20} />
              <span className="font-oswald text-lg tracking-wide">Добавить долг</span>
            </button>

            <div className="space-y-3 animate-fade-in animate-delay-300">
              <h2 className="font-oswald text-lg font-bold text-white tracking-wide">Активные долги</h2>
              {debts.filter(d => !d.paid).length === 0 && (
                <div className="rounded-2xl p-8 glass text-center">
                  <Icon name="CheckCircle" size={36} className="mx-auto mb-3" style={{ color: "#00FF87" }} />
                  <p className="text-white font-medium">Нет активных долгов</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Добавьте первый долг</p>
                </div>
              )}
              {debts.filter(d => !d.paid).map((d, i) => {
                const days = daysLeft(d.dueDate);
                const isOverdue = days < 0;
                const isSoon = days >= 0 && days <= 7;
                return (
                  <div key={d.id} className="rounded-2xl p-4 hover-lift glass transition-all animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms`, borderLeft: `3px solid ${d.type === "owe" ? "#FF2D78" : "#00FF87"}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                          style={{ background: d.type === "owe" ? "rgba(255,45,120,0.2)" : "rgba(0,255,135,0.2)", color: d.type === "owe" ? "#FF2D78" : "#00FF87" }}>
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{d.name}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{d.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-oswald font-bold text-base" style={{ color: d.type === "owe" ? "#FF2D78" : "#00FF87" }}>
                          {d.type === "owe" ? "-" : "+"}{fmt(d.amount)}
                        </p>
                        <p className="text-xs" style={{ color: isOverdue ? "#f87171" : isSoon ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
                          {isOverdue ? `просроч. ${Math.abs(days)}д` : days === 0 ? "сегодня" : `${days} дней`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => togglePaid(d.id)} className="mt-3 w-full text-xs py-2 rounded-xl transition-all font-medium"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                      Отметить закрытым
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {page === "history" && (
          <div className="space-y-5 animate-fade-in">
            <div className="pt-2">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Все записи</p>
              <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">История</h1>
            </div>
            {debts.length === 0 && (
              <div className="rounded-2xl p-8 glass text-center">
                <Icon name="Clock" size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                <p className="text-white/50">История пуста</p>
              </div>
            )}
            <div className="space-y-2">
              {[...debts].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((d, i) => {
                const isOverdue = !d.paid && daysLeft(d.dueDate) < 0;
                return (
                  <div key={d.id} className="rounded-xl p-4 glass hover-lift animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms`, opacity: d.paid ? 0.5 : 1 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: d.paid ? "rgba(255,255,255,0.08)" : d.type === "owe" ? "rgba(255,45,120,0.2)" : "rgba(0,255,135,0.2)", color: d.paid ? "rgba(255,255,255,0.4)" : d.type === "owe" ? "#FF2D78" : "#00FF87" }}>
                          {d.paid ? <Icon name="Check" size={14} /> : d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-white">{d.name}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{d.note || d.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-oswald font-bold text-sm" style={{ color: d.paid ? "rgba(255,255,255,0.4)" : d.type === "owe" ? "#FF2D78" : "#00FF87" }}>
                          {d.type === "owe" ? "-" : "+"}{fmt(d.amount)}
                        </p>
                        <p className="text-xs" style={{ color: isOverdue ? "#f87171" : "rgba(255,255,255,0.35)" }}>
                          {d.paid ? "Закрыт" : isOverdue ? "Просрочен" : new Date(d.dueDate).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATS */}
        {page === "stats" && (
          <div className="space-y-5 animate-fade-in">
            <div className="pt-2">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Аналитика</p>
              <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">Статистика</h1>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Всего долгов", value: debts.filter(d => !d.paid).length, icon: "Layers", color: "#00C6FF" },
                { label: "Закрыто", value: debts.filter(d => d.paid).length, icon: "CheckCircle", color: "#00FF87" },
                { label: "Просрочено", value: overdue.length, icon: "AlertTriangle", color: "#FF2D78" },
                { label: "Скоро", value: upcoming.length, icon: "Clock", color: "#FFD600" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-4 glass hover-lift animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <Icon name={item.icon} size={20} style={{ color: item.color }} />
                  <p className="font-oswald text-3xl font-bold mt-2" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-5 glass-strong animate-fade-in animate-delay-200">
              <h3 className="font-oswald text-lg font-bold text-white mb-4">По категориям</h3>
              {["Кредит", "Бизнес", "Займ", "Личное"].map(cat => {
                const catTotal = debts.filter(d => d.category === cat && !d.paid).reduce((s, d) => s + d.amount, 0);
                const maxTotal = Math.max(1, ...["Кредит", "Бизнес", "Займ", "Личное"].map(c =>
                  debts.filter(d => d.category === c && !d.paid).reduce((s, d) => s + d.amount, 0)
                ));
                return catTotal > 0 ? (
                  <div key={cat} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{cat}</span>
                      <span className="text-sm font-oswald font-bold" style={{ color: "#00FF87" }}>{fmt(catTotal)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-2 rounded-full" style={{ width: `${(catTotal / maxTotal) * 100}%`, background: "linear-gradient(90deg, #00FF87, #00C6FF)" }}></div>
                    </div>
                  </div>
                ) : null;
              })}
              {debts.filter(d => !d.paid).length === 0 && <p className="text-white/40 text-sm text-center py-2">Нет данных</p>}
            </div>
            {(totalOwe + totalLend) > 0 && (
              <div className="rounded-2xl p-5 glass animate-fade-in animate-delay-300">
                <h3 className="font-oswald text-lg font-bold text-white mb-4">Распределение</h3>
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div style={{ width: `${totalOwe / (totalOwe + totalLend) * 100}%`, background: "#FF2D78" }}></div>
                  <div style={{ width: `${totalLend / (totalOwe + totalLend) * 100}%`, background: "#00FF87" }}></div>
                </div>
                <div className="flex justify-between mt-3">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: "#FF2D78" }}></div><span className="text-xs text-white/60">Должен я — {fmt(totalOwe)}</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: "#00FF87" }}></div><span className="text-xs text-white/60">Должны мне — {fmt(totalLend)}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {page === "profile" && (
          <div className="space-y-5 animate-fade-in">
            <div className="pt-2">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Настройки</p>
              <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">Профиль</h1>
            </div>
            <div className="flex flex-col items-center py-5 animate-scale-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 glow-green"
                style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
                <span className="font-oswald font-bold text-2xl text-black">{initials}</span>
              </div>
              <h2 className="font-oswald text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 animate-fade-in animate-delay-100">
              {[
                { label: "Активных", value: debts.filter(d => !d.paid).length },
                { label: "Закрытых", value: debts.filter(d => d.paid).length },
                { label: "Просроч.", value: overdue.length },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-3 glass text-center">
                  <p className="font-oswald text-2xl font-bold neon-text-green">{s.value}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Telegram connect */}
            <div className="rounded-2xl p-5 glass-strong animate-fade-in animate-delay-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,198,255,0.15)" }}>
                  <Icon name="Send" size={18} style={{ color: "#00C6FF" }} />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Telegram-уведомления</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {user.telegram_chat_id ? `✅ Подключён (ID: ${user.telegram_chat_id})` : "Не подключён"}
                  </p>
                </div>
              </div>
              {!user.telegram_chat_id ? (
                <>
                  <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Напишите боту <b style={{ color: "#00C6FF" }}>@dolgtreker_bot</b> команду /start, получите ваш ID и вставьте ниже:
                  </p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Ваш Telegram ID" value={tgInput}
                      onChange={e => setTgInput(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }} />
                    <button onClick={connectTelegram} disabled={tgSaving || !tgInput}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-black transition-all"
                      style={{ background: "#00C6FF", opacity: tgSaving ? 0.6 : 1 }}>
                      {tgSaving ? "..." : "OK"}
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => setUser(u => u ? { ...u, telegram_chat_id: null } : u)}
                  className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Отвязать
                </button>
              )}
            </div>

            <button onClick={handleLogout}
              className="w-full rounded-xl p-4 glass hover-lift flex items-center justify-center gap-2 animate-fade-in animate-delay-300">
              <Icon name="LogOut" size={18} style={{ color: "#FF2D78" }} />
              <span className="font-medium" style={{ color: "#FF2D78" }}>Выйти из аккаунта</span>
            </button>
          </div>
        )}

        {/* ADD DEBT */}
        {page === "add" && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setPage("home")} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover-lift">
                <Icon name="ArrowLeft" size={18} className="text-white" />
              </button>
              <div>
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Новая запись</p>
                <h1 className="font-oswald text-2xl font-bold text-white tracking-tight">Добавить долг</h1>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 animate-fade-in animate-delay-100">
              {[
                { val: "owe", label: "Я должен", icon: "TrendingDown", color: "#FF2D78" },
                { val: "lend", label: "Должны мне", icon: "TrendingUp", color: "#00FF87" },
              ].map(t => (
                <button key={t.val} onClick={() => setForm(f => ({ ...f, type: t.val }))}
                  className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover-lift"
                  style={{
                    background: form.type === t.val ? (t.val === "owe" ? "rgba(255,45,120,0.2)" : "rgba(0,255,135,0.2)") : "rgba(255,255,255,0.04)",
                    border: `2px solid ${form.type === t.val ? t.color : "rgba(255,255,255,0.08)"}`,
                    boxShadow: form.type === t.val ? `0 0 20px ${t.color}33` : "none"
                  }}>
                  <Icon name={t.icon} size={24} style={{ color: form.type === t.val ? t.color : "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-medium" style={{ color: form.type === t.val ? t.color : "rgba(255,255,255,0.6)" }}>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3 animate-fade-in animate-delay-200">
              {[
                { label: "Имя / Компания", key: "name", type: "text", placeholder: "Кому / От кого" },
                { label: "Сумма (₽)", key: "amount", type: "number", placeholder: "0" },
                { label: "Срок погашения", key: "dueDate", type: "date", placeholder: "" },
                { label: "Заметка", key: "note", type: "text", placeholder: "Причина долга..." },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs uppercase tracking-widest mb-1.5 block font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
                    onFocus={e => { e.target.style.borderColor = "#00FF87"; e.target.style.boxShadow = "0 0 12px rgba(0,255,135,0.2)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs uppercase tracking-widest mb-1.5 block font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Категория</label>
                <div className="flex flex-wrap gap-2">
                  {["Личное", "Бизнес", "Кредит", "Займ"].map(cat => (
                    <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: form.category === cat ? "rgba(0,198,255,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${form.category === cat ? "#00C6FF" : "rgba(255,255,255,0.08)"}`,
                        color: form.category === cat ? "#00C6FF" : "rgba(255,255,255,0.5)"
                      }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleAddDebt}
              className="w-full rounded-2xl p-4 flex items-center justify-center gap-3 font-semibold text-black hover-lift glow-green transition-all animate-fade-in animate-delay-300"
              style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
              <Icon name="Plus" size={20} />
              <span className="font-oswald text-lg tracking-wide">Сохранить долг</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-4 pb-6">
          <div className="rounded-2xl glass-strong px-2 py-3 flex items-center justify-around" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            {[
              { id: "home", icon: "Home", label: "Главная" },
              { id: "history", icon: "Clock", label: "История" },
              { id: "stats", icon: "BarChart2", label: "Статистика" },
              { id: "profile", icon: "User", label: "Профиль" },
            ].map(item => (
              <button key={item.id} onClick={() => setPage(item.id as Page)}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative"
                style={{ color: page === item.id ? "#00FF87" : "rgba(255,255,255,0.4)" }}>
                {page === item.id && <div className="absolute -top-1 left-1/2 -translate-x-1/2 nav-dot"></div>}
                <Icon name={item.icon} size={22} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
