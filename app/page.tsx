"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { trips, tripItems as initialItems } from "@/lib/demo-data";
import type { PlanStatus, TripItem, TripTab } from "@/lib/types";

const tabs: Array<{ id: TripTab; label: string }> = [
  { id: "transport", label: "Как добраться" },
  { id: "stays", label: "Жильё" },
  { id: "events", label: "События" },
  { id: "places", label: "Места" },
  { id: "next", label: "Продолжить путешествие" },
];

const statuses: Array<{ id: PlanStatus | "all"; label: string }> = [
  { id: "all", label: "Все" },
  { id: "wishlist", label: "Вишлист" },
  { id: "approved", label: "Согласовано" },
  { id: "booked", label: "Забронировано" },
  { id: "recheck", label: "Нужно перепроверить" },
];

const statusLabels: Record<PlanStatus, string> = { wishlist: "Вишлист", approved: "Согласовано", booked: "Забронировано", recheck: "Нужно перепроверить" };
const rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function mapPlanItem(item: { id: string; category: TripTab; title: string; subtitle: string | null; details: string | null; source_name: string | null; price_amount: number | null; status: PlanStatus }): TripItem {
  const visualByCategory: Record<TripTab, { icon: string; tint: string }> = {
    transport: { icon: "✈", tint: "blue" },
    stays: { icon: "⌂", tint: "violet" },
    events: { icon: "✦", tint: "orange" },
    places: { icon: "⌖", tint: "green" },
    next: { icon: "→", tint: "blue" },
  };
  return { ...item, subtitle: item.subtitle ?? "", details: item.details ?? "", source: item.source_name ?? "Вручную", price: item.price_amount ?? 0, ...visualByCategory[item.category] };
}

export default function Home() {
  const [tripList, setTripList] = useState(trips);
  const [activeTripId, setActiveTripId] = useState(trips[0].id);
  const [activeTab, setActiveTab] = useState<TripTab>("transport");
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
  const [items, setItems] = useState(initialItems);
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", origin: "", destinationCountry: "", destination: "", startDate: "", endDate: "" });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchForm, setSearchForm] = useState({ origin: "Москва", destination: "Бангкок", startDate: "2026-12-03", endDate: "2026-12-15", guests: "4" });

  useEffect(() => {
    let active = true;
    fetch("/api/trips")
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { trips?: Array<{ trips?: { id: string; title: string; origin: string; destination: string; start_date: string; end_date: string } | null }> };
        return payload.trips?.flatMap((entry) => entry.trips ? [{ id: entry.trips.id, title: entry.trips.title, origin: entry.trips.origin, destination: entry.trips.destination, dates: `${entry.trips.start_date} — ${entry.trips.end_date}`, members: 1, cover: "✦" }] : []) ?? [];
      })
      .then((remoteTrips) => {
        if (active && remoteTrips?.length) {
          setTripList(remoteTrips);
          setActiveTripId(remoteTrips[0].id);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (activeTripId === "thailand" || activeTripId === "istanbul") return;
    fetch(`/api/trips/${activeTripId}/plan-items`)
      .then(async (response) => response.ok ? await response.json() as { items?: Array<{ id: string; category: TripTab; title: string; subtitle: string | null; details: string | null; source_name: string | null; price_amount: number | null; status: PlanStatus }> } : null)
      .then((payload) => { if (payload?.items) setItems(payload.items.map(mapPlanItem)); })
      .catch(() => undefined);
  }, [activeTripId]);

  const trip = tripList.find((item) => item.id === activeTripId) ?? tripList[0];
  const filteredItems = useMemo(() => items.filter((item) => item.category === activeTab && (statusFilter === "all" || item.status === statusFilter)), [activeTab, items, statusFilter]);
  const total = items.filter((item) => item.status === "approved" || item.status === "booked").reduce((sum, item) => sum + item.price, 0);

  function toggleStatus(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    const nextStatus = item.status === "wishlist" ? "approved" : item.status === "approved" ? "booked" : "wishlist";
    setItems((current) => current.map((candidate) => candidate.id === id ? { ...candidate, status: nextStatus } : candidate));
    if (activeTripId !== "thailand" && activeTripId !== "istanbul") {
      fetch(`/api/trips/${activeTripId}/plan-items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }).catch(() => undefined);
    }
  }

  async function searchOptions() {
    setSearchError("");
    setIsSearching(true);
    try {
      const query = new URLSearchParams({ category: activeTab, ...searchForm });
      const response = await fetch(`/api/search?${query.toString()}`);
      const payload = await response.json() as { results?: Array<{ id: string; category: TripTab; title: string; subtitle: string; details: string; source: string; price: number; icon: string; tint: string }>; error?: string };
      if (!response.ok) {
        setSearchError(payload.error ?? "Не удалось выполнить поиск.");
        return;
      }
      setItems((payload.results ?? []).map((item) => ({ ...item, status: "wishlist" as PlanStatus })));
      setStatusFilter("all");
    } catch {
      setSearchError("Не удалось связаться с сервисом поиска.");
    } finally {
      setIsSearching(false);
    }
  }

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);
    try {
      const response = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createForm) });
      const payload = await response.json() as { trip?: { id: string; title: string; origin: string; destination: string; start_date: string; end_date: string }; error?: string };
      if (!response.ok || !payload.trip) {
        setCreateError(payload.error ?? "Не удалось создать поездку.");
        return;
      }
      const createdTrip = { id: payload.trip.id, title: payload.trip.title, origin: payload.trip.origin, destination: payload.trip.destination, dates: `${payload.trip.start_date} — ${payload.trip.end_date}`, members: 1, cover: "✦" };
      setTripList((current) => [createdTrip, ...current]);
      setActiveTripId(createdTrip.id);
      setItems([]);
      setShowCreate(false);
      setCreateForm({ title: "", origin: "", destinationCountry: "", destination: "", startDate: "", endDate: "" });
    } catch {
      setCreateError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span>travel agent</div>
        <button className="profile-card" onClick={() => setShowProfile((value) => !value)}><span className="avatar">АК</span><span><strong>Алексей Кузнецов</strong><small>Мой профиль</small></span><i>•••</i></button>
        {showProfile && <div className="profile-note">Telegram-вход будет подключён на серверном этапе.<br /><small>ФИО видно только участникам поездки.</small></div>}
        <div className="sidebar-heading"><span>Мои поездки</span><button onClick={() => setShowCreate(true)} aria-label="Создать поездку">＋</button></div>
        <div className="trip-list">{tripList.map((item) => <button className={`trip-preview ${item.id === activeTripId ? "selected" : ""}`} key={item.id} onClick={() => setActiveTripId(item.id)}><span className="trip-emoji">{item.cover}</span><span><strong>{item.title}</strong><small>{item.dates}</small></span></button>)}</div>
        <button className="new-trip" onClick={() => setShowCreate(true)}>＋ Создать новую поездку</button>
        <div className="sidebar-footer"><span className="status-dot" /> Демо-режим<br /><small>Внешние источники ещё не подключены</small></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumbs">Мои поездки <span>/</span> {trip.title}</div><button className="settings" aria-label="Настройки поездки">⚙</button></header>
        <div className="hero-row"><div><div className="eyebrow">Совместная поездка</div><h1>{trip.title}</h1><p>{trip.origin} → {trip.destination} <span>·</span> {trip.dates} <span>·</span> {trip.members} участника</p></div><button className="invite-button">↗ Пригласить участников</button></div>
        <div className="workspace-grid">
          <div className="workspace-main">
            <nav className="tabs" aria-label="Разделы поездки">{tabs.map((tab) => <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>
            <div className="section-toolbar"><div><h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2><p>{activeTab === "transport" ? "Варианты пути с актуальными ценами" : "Собирайте идеи и добавляйте лучшее в план"}</p></div><button className="secondary-button">＋ Добавить ссылку</button></div>
            <div className="search-panel"><div className="search-panel-heading"><div><strong>Найти варианты</strong><span>Единый поиск по поставщикам</span></div><span className="search-provider">{isSearching ? "Ищем…" : "Демо-провайдеры"}</span></div><div className="search-fields"><label>Откуда<input value={searchForm.origin} onChange={(event) => setSearchForm({ ...searchForm, origin: event.target.value })} /></label><label>Куда<input value={searchForm.destination} onChange={(event) => setSearchForm({ ...searchForm, destination: event.target.value })} /></label><label>Начало<input type="date" value={searchForm.startDate} onChange={(event) => setSearchForm({ ...searchForm, startDate: event.target.value })} /></label><label>Конец<input type="date" value={searchForm.endDate} onChange={(event) => setSearchForm({ ...searchForm, endDate: event.target.value })} /></label><label>Людей<input type="number" min="1" max="20" value={searchForm.guests} onChange={(event) => setSearchForm({ ...searchForm, guests: event.target.value })} /></label><button className="primary-button search-button" onClick={searchOptions} disabled={isSearching}>{isSearching ? "Ищем…" : "Найти варианты"}</button></div>{searchError && <p className="search-error" role="alert">{searchError}</p>}</div>
            <div className="filters">{statuses.map((status) => <button className={statusFilter === status.id ? "filter-active" : ""} key={status.id} onClick={() => setStatusFilter(status.id)}>{status.label}</button>)}<span /><button>↕ Сортировка</button></div>
            <div className="cards">{filteredItems.length ? filteredItems.map((item) => <article className="item-card" key={item.id}><div className={`item-icon ${item.tint}`}>{item.icon}</div><div className="item-content"><div className="item-heading"><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><button className={`status ${item.status}`} onClick={() => toggleStatus(item.id)} title="Изменить статус">{statusLabels[item.status]}</button></div><div className="item-meta"><span>{item.details}</span><span className="source">Источник: {item.source}</span></div></div><div className="item-price">{item.price ? rubles.format(item.price) : "Бесплатно"}<small>{item.price ? "за всех участников" : ""}</small></div><button className="card-more" aria-label="Действия">•••</button></article>) : <div className="empty-state"><span>⌁</span><h3>Варианты не найдены</h3><p>Попробуйте изменить фильтр или добавьте вариант по ссылке.</p></div>}</div>
          </div>
          <aside className="trip-summary"><div className="map-placeholder"><span className="map-label">Карта маршрута</span><div className="route-line" /><b className="map-pin pin-one">●</b><b className="map-pin pin-two">●</b><span className="map-city city-one">Москва</span><span className="map-city city-two">Бангкок</span><button>Открыть карту ↗</button></div><div className="summary-card"><div className="summary-title"><span>Бюджет поездки</span><button>Настроить</button></div><strong>{rubles.format(total)}</strong><p>согласованные и забронированные</p><div className="budget-bar"><span /></div><div className="budget-breakdown"><span>✈ Дорога <b>{rubles.format(58400)}</b></span><span>⌂ Жильё <b>{rubles.format(0)}</b></span><span>✦ Остальное <b>{rubles.format(19500)}</b></span></div><button className="full-width-button">Открыть бюджет</button></div><div className="chat-card"><div><span className="chat-icon">☏</span><strong>Общий чат</strong></div><p>Обсудите варианты с участниками поездки</p><button className="secondary-button">Перейти в чат ↗</button></div></aside>
        </div>
      </section>
      {showCreate && <div className="modal-backdrop" role="presentation" onClick={() => setShowCreate(false)}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="create-trip-title" onClick={(event) => event.stopPropagation()} onSubmit={createTrip}><button type="button" className="modal-close" onClick={() => setShowCreate(false)} aria-label="Закрыть">×</button><div className="eyebrow">Новая поездка</div><h2 id="create-trip-title">Соберём поездку вместе</h2><p>После входа через Telegram поездка сохранится в общем пространстве.</p><label>Название поездки<input required value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Например, Таиланд с друзьями" /></label><div className="form-grid"><label>Откуда<input required value={createForm.origin} onChange={(event) => setCreateForm({ ...createForm, origin: event.target.value })} placeholder="Москва" /></label><label>Страна назначения<input required value={createForm.destinationCountry} onChange={(event) => setCreateForm({ ...createForm, destinationCountry: event.target.value })} placeholder="Таиланд" /></label></div><div className="form-grid"><label>Город / аэропорт<input required value={createForm.destination} onChange={(event) => setCreateForm({ ...createForm, destination: event.target.value })} placeholder="Бангкок" /></label><label>Дата начала<input required type="date" value={createForm.startDate} onChange={(event) => setCreateForm({ ...createForm, startDate: event.target.value })} /></label></div><label>Дата окончания<input required type="date" value={createForm.endDate} onChange={(event) => setCreateForm({ ...createForm, endDate: event.target.value })} /></label>{createError && <p className="form-error" role="alert">{createError}</p>}<button className="primary-button" disabled={isCreating}>{isCreating ? "Создаём…" : "Создать поездку"}</button></form></div>}
    </main>
  );
}
