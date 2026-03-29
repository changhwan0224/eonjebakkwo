"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import { categories, consumables } from "@/lib/consumables";
import { diffDays, todayInSeoulDateString } from "@/lib/date";
import type { AlertItem, Consumable, ReminderRecord } from "@/lib/types";

interface HomeAppProps {
  initialToday: string;
}

interface ApiMessageResponse {
  success: boolean;
  message: string;
}

interface ReminderMutationResponse extends ApiMessageResponse {
  reminder: ReminderRecord;
}

function normalizeSearchValue(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function findFirstMatch(items: Consumable[], keyword: string) {
  const normalizedKeyword = normalizeSearchValue(keyword);

  if (!normalizedKeyword) {
    return null;
  }

  for (const item of items) {
    if (normalizeSearchValue(item.name).includes(normalizedKeyword)) {
      return item;
    }
  }

  return null;
}

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || "요청에 실패했어요.");
  }

  return payload;
}

function getDdayState(dueDate: string, today: string) {
  const daysUntilDue = diffDays(dueDate, today);

  if (daysUntilDue === 0) {
    return {
      label: "D-Day",
      className: "dday-badge dday-today",
    };
  }

  if (daysUntilDue > 0) {
    return {
      label: `D-${daysUntilDue}`,
      className: daysUntilDue <= 7 ? "dday-badge dday-soon" : "dday-badge dday-upcoming",
    };
  }

  return {
    label: `D+${Math.abs(daysUntilDue)}`,
    className: "dday-badge dday-overdue",
  };
}

export function HomeApp({ initialToday }: HomeAppProps) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentItem, setCurrentItem] = useState<Consumable | null>(null);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [checkDate, setCheckDate] = useState(initialToday);
  const [todayReference, setTodayReference] = useState(initialToday);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [emptyMessageVisible, setEmptyMessageVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [modalAlerts, setModalAlerts] = useState<AlertItem[]>([]);
  const [modalCheckDate, setModalCheckDate] = useState(initialToday);
  const [saving, setSaving] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);

  const deferredSearch = useDeferredValue(searchInput);

  const filteredByCategory = selectedCategory
    ? consumables.filter((item) => item.category === selectedCategory)
    : consumables;

  const autocompleteItems = deferredSearch.trim()
    ? filteredByCategory
        .filter((item) =>
          normalizeSearchValue(item.name).includes(normalizeSearchValue(deferredSearch)),
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const today = todayInSeoulDateString();
    setTodayReference(today);
    setCheckDate((current) => (current === initialToday ? today : current));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadReminders() {
      try {
        const payload = await readJson<{ reminders: ReminderRecord[] }>(
          await fetch("/api/reminders", {
            cache: "no-store",
          }),
        );

        if (!ignore) {
          startTransition(() => {
            setReminders(payload.reminders ?? []);
          });
        }
      } catch (error) {
        if (!ignore) {
          setInfoMessage(
            error instanceof Error
              ? error.message
              : "등록된 알림을 불러오는 중 오류가 발생했어요.",
          );
        }
      }
    }

    loadReminders();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setAutocompleteOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  function clearMessages() {
    setSuccessMessage("");
    setInfoMessage("");
    setEmptyMessageVisible(false);
  }

  async function refreshReminders() {
    const payload = await readJson<{ reminders: ReminderRecord[] }>(
      await fetch("/api/reminders", {
        cache: "no-store",
      }),
    );

    startTransition(() => {
      setReminders(payload.reminders ?? []);
    });
  }

  function selectItem(item: Consumable) {
    clearMessages();
    setCurrentItem(item);
    setSearchInput(item.name);
    setAutocompleteOpen(false);
  }

  function searchItem() {
    clearMessages();

    if (!searchInput.trim()) {
      setCurrentItem(null);
      return;
    }

    const foundItem = findFirstMatch(filteredByCategory, searchInput);

    if (foundItem) {
      setCurrentItem(foundItem);
      setSearchInput(foundItem.name);
      setAutocompleteOpen(false);
      return;
    }

    setCurrentItem(null);
    setEmptyMessageVisible(true);
    setAutocompleteOpen(false);
  }

  async function registerReminder() {
    clearMessages();

    if (!currentItem) {
      window.alert("먼저 소모품을 선택해 주세요.");
      return;
    }

    if (!purchaseDate) {
      window.alert("구매일 또는 사용 시작일을 입력해 주세요.");
      return;
    }

    setSaving(true);

    try {
      const payload = await readJson<ApiMessageResponse>(
        await fetch("/api/reminders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemName: currentItem.name,
            purchaseDate,
          }),
        }),
      );

      setSuccessMessage(payload.message);
      await refreshReminders();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "알림 저장 중 오류가 발생했어요.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(itemName: string) {
    if (!window.confirm(`${itemName} 알림을 삭제할까요?`)) {
      return;
    }

    clearMessages();

    try {
      const payload = await readJson<ApiMessageResponse>(
        await fetch(`/api/reminders?itemName=${encodeURIComponent(itemName)}`, {
          method: "DELETE",
        }),
      );

      setSuccessMessage(payload.message);
      await refreshReminders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "삭제 중 오류가 발생했어요.");
    }
  }

  async function completeReminder(itemName: string) {
    if (!window.confirm(`${itemName}을(를) 오늘 기준으로 교체 완료 처리할까요?`)) {
      return;
    }

    clearMessages();

    try {
      const payload = await readJson<ReminderMutationResponse>(
        await fetch("/api/reminders/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemName }),
        }),
      );

      setSuccessMessage(payload.message);
      setTodayReference(payload.reminder.purchaseDate);

      if (currentItem?.name === payload.reminder.itemName) {
        setPurchaseDate(payload.reminder.purchaseDate);
      }

      await refreshReminders();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "교체 완료 처리 중 오류가 발생했어요.",
      );
    }
  }

  function editReminder(reminder: ReminderRecord) {
    const matchingItem = consumables.find((item) => item.name === reminder.itemName);

    if (!matchingItem) {
      return;
    }

    clearMessages();
    setCurrentItem(matchingItem);
    setSearchInput(reminder.itemName);
    setPurchaseDate(reminder.purchaseDate);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setInfoMessage(
      `${reminder.itemName} 알림을 수정할 수 있게 불러왔어요. 날짜를 바꾸고 다시 알림 등록을 눌러주세요.`,
    );
  }

  async function runAlertCheck(targetDate: string) {
    clearMessages();
    setCheckingAlerts(true);

    try {
      const payload = await readJson<{ alerts: AlertItem[]; checkDate: string }>(
        await fetch("/api/alerts/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ checkDate: targetDate }),
        }),
      );

      if (payload.alerts.length) {
        setModalCheckDate(payload.checkDate);
        setModalAlerts(payload.alerts);
      } else {
        setInfoMessage(`${payload.checkDate} 기준으로 표시할 알림이 없어요.`);
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "알림 확인 중 오류가 발생했어요.",
      );
    } finally {
      setCheckingAlerts(false);
    }
  }

  async function checkAlerts() {
    if (!checkDate) {
      window.alert("테스트할 날짜를 입력해 주세요.");
      return;
    }

    await runAlertCheck(checkDate);
  }

  async function setTodayAndCheck() {
    setCheckDate(todayReference);
    await runAlertCheck(todayReference);
  }

  return (
    <div className="container">
      <div className="hero">
        <h1>언제바꿔</h1>
        <p className="subtitle">
          생활 소모품의 권장 교체주기, 교체 신호, 관리 팁, 버리는 방법까지 한 번에 확인할
          수 있어요.
        </p>

        <div className="hero-actions">
          <a
            className="mini-link-button"
            href="https://script.google.com/macros/s/AKfycbyCdo2GXmi0k8exPpBkVJ72Kbe-uAO-GEfjds2ed2Qb92zBkwYA53MrQawqy-TfroIo/exec"
            target="_blank"
            rel="noreferrer"
          >
            추천 제품
          </a>
        </div>

        <div className="search-row">
          <select
            value={selectedCategory}
            onChange={(event) => {
              startTransition(() => {
                setSelectedCategory(event.target.value);
              });
            }}
          >
            <option value="">전체 카테고리</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <div className="search-wrap" ref={searchWrapRef}>
            <input
              type="text"
              placeholder="예: 칫솔, 수세미, 베개"
              value={searchInput}
              autoComplete="off"
              onChange={(event) => {
                setSearchInput(event.target.value);
                setAutocompleteOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchItem();
                }
              }}
            />

            {autocompleteOpen && autocompleteItems.length > 0 ? (
              <div className="autocomplete-box">
                {autocompleteItems.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className="autocomplete-item"
                    onClick={() => selectItem(item)}
                  >
                    <div className="autocomplete-main">{item.name}</div>
                    <div className="autocomplete-sub">
                      {item.category} · {item.cycle}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" onClick={searchItem}>
            검색
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">추천 소모품</div>
        <div className="chip-list">
          {filteredByCategory.slice(0, 20).map((item) => (
            <button
              key={item.name}
              type="button"
              className="chip"
              onClick={() => selectItem(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {currentItem ? (
        <div className="card">
          <div className="badge">{currentItem.category}</div>
          <div className="item-name">{currentItem.name}</div>
          <div className="cycle">권장 교체주기: {currentItem.cycle}</div>

          <div className="label">왜 바꿔야 하나요?</div>
          <div className="desc">{currentItem.reason}</div>

          <div className="label">이럴 때 더 빨리 교체하세요</div>
          <ul>
            {currentItem.replaceSigns.map((sign) => (
              <li key={sign}>{sign}</li>
            ))}
          </ul>

          <div className="label">관리 팁</div>
          <ul>
            {currentItem.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>

          <div className="label">버리는 방법</div>
          <div className="desc" style={{ fontWeight: "bold" }}>
            배출 유형: {currentItem.disposalType}
          </div>
          <div className="desc" style={{ marginTop: 8 }}>
            {currentItem.disposalGuide}
          </div>

          <div className="reminder-row">
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
            <button
              type="button"
              className="dark-btn"
              onClick={registerReminder}
              disabled={saving}
            >
              {saving ? "저장 중..." : "알림 등록"}
            </button>
          </div>
          <div className="reminder-help">
            구매일 또는 사용 시작일을 입력하면 저장됩니다.
          </div>
        </div>
      ) : null}

      {emptyMessageVisible ? (
        <div className="empty">검색 결과가 없어요. 다른 소모품 이름으로 검색해보세요.</div>
      ) : null}

      {successMessage ? <div className="success-box">{successMessage}</div> : null}
      {infoMessage ? <div className="info-box">{infoMessage}</div> : null}

      <div className="section">
        <div className="section-title">알림 테스트</div>
        <div className="list-box">
          <div className="row">
            <input
              type="date"
              value={checkDate}
              onChange={(event) => setCheckDate(event.target.value)}
            />
            <button
              type="button"
              className="green-btn"
              onClick={checkAlerts}
              disabled={checkingAlerts}
            >
              {checkingAlerts ? "확인 중..." : "선택한 날짜로 알림 확인"}
            </button>
            <button
              type="button"
              className="gray-btn"
              onClick={setTodayAndCheck}
              disabled={checkingAlerts}
            >
              오늘 날짜로 확인
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">등록된 알림 목록</div>
        <div className="list-box">
          {reminders.length ? (
            reminders.map((reminder) => {
              const dday = getDdayState(reminder.dueDate, todayReference);

              return (
                <div key={reminder.id} className="reminder-item">
                  <div className="reminder-head">
                    <div className="reminder-title">{reminder.itemName}</div>
                    <span className={dday.className}>{dday.label}</span>
                  </div>
                  <div className="small">사용 시작일: {reminder.purchaseDate}</div>
                  <div className="small">
                    예상 교체일: <span className="danger">{reminder.dueDate}</span>
                  </div>
                  <div className="small">권장 교체주기: {reminder.cycle}</div>
                  <div className="action-row" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="green-btn"
                      onClick={() => completeReminder(reminder.itemName)}
                    >
                      교체 완료
                    </button>
                    <button
                      type="button"
                      className="gray-btn"
                      onClick={() => editReminder(reminder)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="red-btn"
                      onClick={() => deleteReminder(reminder.itemName)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="small">등록된 알림이 없어요.</div>
          )}
        </div>
      </div>

      <div className="note">
        버리는 방법은 일반적인 기준이에요. 지역 규정에 따라 달라질 수 있으니 최종 배출 전
        지역 기준도 확인해 주세요.
      </div>

      {modalAlerts.length ? (
        <div className="modal-overlay">
          <div className="modal">
            <h2>교체 알림</h2>
            <div className="modal-sub">{modalCheckDate} 기준으로 확인된 교체 알림입니다.</div>
            <div>
              {modalAlerts.map((alert) => (
                <div
                  key={`${alert.itemName}-${alert.alertType}-${alert.dueDate}`}
                  className="alert-item"
                >
                  <div className="alert-type">{alert.alertType}</div>
                  <div className="reminder-title">{alert.itemName}</div>
                  <div className="small">사용 시작일: {alert.purchaseDate}</div>
                  <div className="small">예상 교체일: {alert.dueDate}</div>
                  <div className="small">{alert.message}</div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setModalAlerts([])}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
