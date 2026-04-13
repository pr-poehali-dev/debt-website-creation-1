import { useState } from "react";
import Icon from "@/components/ui/icon";

type Page = "home" | "history" | "stats" | "profile" | "add";

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

const MOCK_DEBTS: Debt[] = [
  { id: 1, name: "Алексей Петров", amount: 45000, dueDate: "2026-04-20", type: "owe", category: "Займ", note: "На ремонт машины", paid: false },
  { id: 2, name: "Мария Сидорова", amount: 12500, dueDate: "2026-05-01", type: "lend", category: "Личное", note: "До зарплаты", paid: false },
  { id: 3, name: "ООО Старт", amount: 230000, dueDate: "2026-06-15", type: "owe", category: "Бизнес", note: "Аванс за проект", paid: false },
  { id: 4, name: "Дмитрий Козлов", amount: 8000, dueDate: "2026-03-01", type: "lend", category: "Личное", note: "На подарок", paid: true },
  { id: 5, name: "Банк Открытие", amount: 180000, dueDate: "2026-07-10", type: "owe", category: "Кредит", note: "Потребительский кредит", paid: false },
  { id: 6, name: "Светлана Воронова", amount: 5500, dueDate: "2026-04-25", type: "lend", category: "Личное", note: "Обед + такси", paid: false },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

const daysLeft = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [debts, setDebts] = useState<Debt[]>(MOCK_DEBTS);
  const [form, setForm] = useState({ name: "", amount: "", dueDate: "", type: "owe", category: "Личное", note: "" });
  const [notifShown, setNotifShown] = useState(true);

  const totalOwe = debts.filter(d => d.type === "owe" && !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalLend = debts.filter(d => d.type === "lend" && !d.paid).reduce((s, d) => s + d.amount, 0);
  const overdue = debts.filter(d => !d.paid && daysLeft(d.dueDate) < 0);
  const upcoming = debts.filter(d => !d.paid && daysLeft(d.dueDate) >= 0 && daysLeft(d.dueDate) <= 7);

  const handleAddDebt = () => {
    if (!form.name || !form.amount || !form.dueDate) return;
    const newDebt: Debt = {
      id: Date.now(),
      name: form.name,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      type: form.type as "owe" | "lend",
      category: form.category,
      note: form.note,
      paid: false,
    };
    setDebts(prev => [newDebt, ...prev]);
    setForm({ name: "", amount: "", dueDate: "", type: "owe", category: "Личное", note: "" });
    setPage("home");
  };

  const togglePaid = (id: number) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, paid: !d.paid } : d));
  };

  return (
    <div className="min-h-screen font-golos" style={{ background: "linear-gradient(135deg, #060810 0%, #0a0e1a 50%, #080610 100%)" }}>
      {/* Notification Banner */}
      {notifShown && (overdue.length > 0 || upcoming.length > 0) && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-fade-in"
          style={{ background: "linear-gradient(90deg, rgba(255,45,120,0.9), rgba(255,100,50,0.9))", backdropFilter: "blur(10px)" }}>
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Bell" size={16} className="text-white" />
              <span className="text-white text-sm font-medium">
                {overdue.length > 0 ? `${overdue.length} просроченных долга` : `${upcoming.length} долгов истекают через 7 дней`}
              </span>
            </div>
            <button onClick={() => setNotifShown(false)} className="text-white/70 hover:text-white transition-colors">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pb-28" style={{ paddingTop: notifShown && (overdue.length > 0 || upcoming.length > 0) ? "56px" : "24px" }}>

        {/* HOME PAGE */}
        {page === "home" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pt-2 animate-fade-in">
              <div>
                <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Добро пожаловать</p>
                <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">ДолгТрекер</h1>
              </div>
              <button onClick={() => setPage("profile")} className="w-10 h-10 rounded-full flex items-center justify-center hover-lift" style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
                <span className="font-oswald font-bold text-sm text-black">АД</span>
              </button>
            </div>

            {/* Balance Cards */}
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

            {/* Баланс */}
            <div className="rounded-2xl p-4 glass-strong animate-fade-in animate-delay-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Чистый баланс</p>
                  <p className={`font-oswald text-3xl font-bold ${totalLend - totalOwe >= 0 ? "neon-text-green" : "neon-text-pink"}`}>
                    {totalLend - totalOwe >= 0 ? "+" : ""}{fmt(totalLend - totalOwe)}
                  </p>
                </div>
                <div className="text-right">
                  {overdue.length > 0 && (
                    <div className="flex items-center gap-1 justify-end">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-xs text-red-400">{overdue.length} просроч.</span>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                      <span className="text-xs text-yellow-400">{upcoming.length} скоро</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action */}
            <button onClick={() => setPage("add")} className="w-full rounded-2xl p-4 flex items-center justify-center gap-3 font-semibold text-black hover-lift glow-green animate-fade-in animate-delay-200 transition-all"
              style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
              <Icon name="Plus" size={20} />
              <span className="font-oswald text-lg tracking-wide">Добавить долг</span>
            </button>

            {/* Debt List */}
            <div className="space-y-3 animate-fade-in animate-delay-300">
              <h2 className="font-oswald text-lg font-bold text-white tracking-wide">Активные долги</h2>
              {debts.filter(d => !d.paid).map((d, i) => {
                const days = daysLeft(d.dueDate);
                const isOverdue = days < 0;
                const isSoon = days >= 0 && days <= 7;
                return (
                  <div key={d.id} className="rounded-2xl p-4 hover-lift glass transition-all"
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
                        <p className="text-xs"
                          style={{ color: isOverdue ? "#f87171" : isSoon ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>
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

        {/* HISTORY PAGE */}
        {page === "history" && (
          <div className="space-y-6 animate-fade-in">
            <div className="pt-2">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Все записи</p>
              <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">История</h1>
            </div>

            <div className="space-y-2">
              {[...debts].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map((d, i) => {
                const days = daysLeft(d.dueDate);
                const isOverdue = !d.paid && days < 0;
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

        {/* STATS PAGE */}
        {page === "stats" && (
          <div className="space-y-6 animate-fade-in">
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
                const maxTotal = Math.max(...["Кредит", "Бизнес", "Займ", "Личное"].map(c =>
                  debts.filter(d => d.category === c && !d.paid).reduce((s, d) => s + d.amount, 0)
                ));
                const pct = maxTotal > 0 ? (catTotal / maxTotal) * 100 : 0;
                return catTotal > 0 ? (
                  <div key={cat} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-white">{cat}</span>
                      <span className="text-sm font-oswald font-bold" style={{ color: "#00FF87" }}>{fmt(catTotal)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00FF87, #00C6FF)" }}></div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>

            <div className="rounded-2xl p-5 glass animate-fade-in animate-delay-300">
              <h3 className="font-oswald text-lg font-bold text-white mb-4">Распределение</h3>
              <div className="h-4 rounded-full overflow-hidden flex">
                <div style={{ width: `${totalOwe / (totalOwe + totalLend) * 100}%`, background: "#FF2D78" }}></div>
                <div style={{ width: `${totalLend / (totalOwe + totalLend) * 100}%`, background: "#00FF87" }}></div>
              </div>
              <div className="flex justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#FF2D78" }}></div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Должен я — {fmt(totalOwe)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#00FF87" }}></div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Должны мне</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE PAGE */}
        {page === "profile" && (
          <div className="space-y-6 animate-fade-in">
            <div className="pt-2">
              <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Настройки</p>
              <h1 className="font-oswald text-3xl font-bold text-white tracking-tight">Профиль</h1>
            </div>

            <div className="flex flex-col items-center py-6 animate-scale-in">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 glow-green"
                style={{ background: "linear-gradient(135deg, #00FF87, #00C6FF)" }}>
                <span className="font-oswald font-bold text-3xl text-black">АД</span>
              </div>
              <h2 className="font-oswald text-2xl font-bold text-white">Алексей Дмитриев</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>alexey@example.com</p>
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

            <div className="space-y-2 animate-fade-in animate-delay-200">
              {[
                { icon: "Bell", label: "Уведомления", desc: "Push и email напоминания", active: true },
                { icon: "Calendar", label: "Напомнить за", desc: "3 дня до срока", active: true },
                { icon: "Shield", label: "Face ID / PIN", desc: "Защита приложения", active: false },
                { icon: "Download", label: "Экспорт данных", desc: "Скачать в CSV / Excel", active: false },
              ].map((item, i) => (
                <div key={i} className="rounded-xl p-4 glass hover-lift flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,135,0.1)" }}>
                      <Icon name={item.icon} size={18} style={{ color: "#00FF87" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{item.desc}</p>
                    </div>
                  </div>
                  <div className="w-10 h-6 rounded-full relative transition-all cursor-pointer"
                    style={{ background: item.active ? "#00FF87" : "rgba(255,255,255,0.1)", boxShadow: item.active ? "0 0 10px rgba(0,255,135,0.4)" : "none" }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: item.active ? "calc(100% - 20px)" : "4px" }}></div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full rounded-xl p-4 glass hover-lift flex items-center justify-center gap-2 animate-fade-in animate-delay-300">
              <Icon name="LogOut" size={18} style={{ color: "#FF2D78" }} />
              <span className="font-medium" style={{ color: "#FF2D78" }}>Выйти из аккаунта</span>
            </button>
          </div>
        )}

        {/* ADD DEBT PAGE */}
        {page === "add" && (
          <div className="space-y-6 animate-fade-in">
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
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      colorScheme: "dark",
                    }}
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

      {/* Bottom Navigation */}
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
                {page === item.id && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 nav-dot"></div>
                )}
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