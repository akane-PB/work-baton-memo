const STORAGE_KEY = "work-baton-memo:v1";

const defaultItem = {
  projectName: "ワークルームPB2 TVCM",
  latestDevice: "iMac",
  status: "作業中",
  syncState: "未同期",
  nextAction: "外出前にGitHub PushとDrive保存の状態を確認する",
  workMemo: "この案件の最新版がどの端末にあるかを記録します。",
};

let store = {
  currentItemId: "",
  items: [],
};

const els = {
  totalCount: document.querySelector("#totalCount"),
  activeCount: document.querySelector("#activeCount"),
  reviewCount: document.querySelector("#reviewCount"),
  readyCount: document.querySelector("#readyCount"),
  visibleCount: document.querySelector("#visibleCount"),
  statusFilter: document.querySelector("#statusFilter"),
  newItemButton: document.querySelector("#newItemButton"),
  copyAllButton: document.querySelector("#copyAllButton"),
  itemList: document.querySelector("#itemList"),
  emptyList: document.querySelector("#emptyList"),
  editorEmpty: document.querySelector("#editorEmpty"),
  editorForm: document.querySelector("#editorForm"),
  deleteItemButton: document.querySelector("#deleteItemButton"),
  projectName: document.querySelector("#projectName"),
  latestDevice: document.querySelector("#latestDevice"),
  status: document.querySelector("#status"),
  syncState: document.querySelector("#syncState"),
  updatedAt: document.querySelector("#updatedAt"),
  nextAction: document.querySelector("#nextAction"),
  workMemo: document.querySelector("#workMemo"),
};

function createItemId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeItem(item) {
  return {
    id: item.id || createItemId(),
    projectName: item.projectName || "名称未設定の案件",
    latestDevice: item.latestDevice || "iMac",
    status: item.status || "作業中",
    syncState: item.syncState || "未同期",
    nextAction: item.nextAction || "",
    workMemo: item.workMemo || "",
    updatedAt: item.updatedAt || nowIso(),
  };
}

function makeDefaultStore() {
  const item = normalizeItem({
    id: "default",
    ...defaultItem,
  });

  return {
    currentItemId: item.id,
    items: [item],
  };
}

function loadStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.items)) {
      const items = stored.items.map(normalizeItem);
      const currentItemId = items.some((item) => item.id === stored.currentItemId)
        ? stored.currentItemId
        : items[0]?.id || "";
      return { currentItemId, items };
    }
  } catch {
    return makeDefaultStore();
  }

  return makeDefaultStore();
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getCurrentItem() {
  return store.items.find((item) => item.id === store.currentItemId);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function getFilteredItems() {
  const filter = els.statusFilter.value;
  if (filter === "all") return store.items;
  return store.items.filter((item) => item.status === filter);
}

function renderSummary() {
  els.totalCount.textContent = String(store.items.length);
  els.activeCount.textContent = String(store.items.filter((item) => item.status === "作業中").length);
  els.reviewCount.textContent = String(store.items.filter((item) => item.status === "要確認").length);
  els.readyCount.textContent = String(store.items.filter((item) => item.status === "引き継ぎOK").length);
}

function renderList() {
  const items = getFilteredItems();
  els.itemList.innerHTML = "";
  els.visibleCount.textContent = `${items.length}件`;
  els.emptyList.hidden = items.length > 0;

  items.forEach((item) => {
    const button = document.createElement("button");
    button.className = `item-card${item.id === store.currentItemId ? " is-selected" : ""}`;
    button.type = "button";
    button.dataset.itemId = item.id;
    button.innerHTML = `
      <div class="item-title-row">
        <span class="item-title">${escapeHtml(item.projectName)}</span>
        <span class="badge status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <span class="item-next">${escapeHtml(item.nextAction || "次にやること未入力")}</span>
      <div class="item-meta-row">
        <span class="device-pill">${escapeHtml(item.latestDevice)}</span>
        <span class="item-updated">${escapeHtml(formatDateTime(item.updatedAt))}</span>
      </div>
    `;
    els.itemList.appendChild(button);
  });
}

function renderEditor() {
  const item = getCurrentItem();
  const hasItem = Boolean(item);
  els.editorEmpty.hidden = hasItem;
  els.editorForm.hidden = !hasItem;

  if (!item) return;

  els.projectName.value = item.projectName;
  els.latestDevice.value = item.latestDevice;
  els.status.value = item.status;
  els.syncState.value = item.syncState;
  els.updatedAt.value = formatDateTime(item.updatedAt);
  els.nextAction.value = item.nextAction;
  els.workMemo.value = item.workMemo;
}

function render() {
  renderSummary();
  renderList();
  renderEditor();
}

function createNewItem() {
  const itemNumber = store.items.length + 1;
  const item = normalizeItem({
    id: createItemId(),
    projectName: `新規案件 ${itemNumber}`,
    latestDevice: "MacBook Air",
    status: "作業中",
    syncState: "未同期",
    nextAction: "",
    workMemo: "",
  });

  store.items.unshift(item);
  store.currentItemId = item.id;
  saveStore();
  render();
  els.projectName.focus();
  els.projectName.select();
}

function updateCurrentItemFromForm() {
  const item = getCurrentItem();
  if (!item) return;

  Object.assign(item, {
    projectName: els.projectName.value || "名称未設定の案件",
    latestDevice: els.latestDevice.value,
    status: els.status.value,
    syncState: els.syncState.value,
    nextAction: els.nextAction.value,
    workMemo: els.workMemo.value,
    updatedAt: nowIso(),
  });

  saveStore();
  renderSummary();
  renderList();
  els.updatedAt.value = formatDateTime(item.updatedAt);
}

function deleteCurrentItem() {
  const item = getCurrentItem();
  if (!item) return;

  if (!window.confirm(`${item.projectName || "この案件"} を削除しますか？`)) return;

  const itemIndex = store.items.findIndex((candidate) => candidate.id === item.id);
  store.items.splice(itemIndex, 1);
  store.currentItemId = store.items[Math.max(0, itemIndex - 1)]?.id || store.items[0]?.id || "";
  saveStore();
  render();
}

function selectItem(itemId) {
  if (!store.items.some((item) => item.id === itemId)) return;
  store.currentItemId = itemId;
  saveStore();
  render();
}

function makeHandoffText() {
  const lines = [
    "作業バトンメモ",
    `作成日時\t${formatDateTime(nowIso())}`,
    "",
    "案件名\tステータス\t最新版端末\t同期状態\t最終更新\t次にやること\t作業メモ",
    ...store.items.map((item) => [
      item.projectName,
      item.status,
      item.latestDevice,
      item.syncState,
      formatDateTime(item.updatedAt),
      item.nextAction,
      item.workMemo,
    ].map((value) => String(value || "").replace(/\s+/g, " ").trim()).join("\t")),
  ];

  return lines.join("\n");
}

async function copyHandoffText() {
  const text = makeHandoffText();

  try {
    await navigator.clipboard.writeText(text);
    els.copyAllButton.textContent = "コピーしました";
  } catch {
    window.prompt("下記をコピーしてください", text);
  }

  window.setTimeout(() => {
    els.copyAllButton.textContent = "引き継ぎメモをコピー";
  }, 1400);
}

els.newItemButton.addEventListener("click", createNewItem);
els.copyAllButton.addEventListener("click", copyHandoffText);
els.deleteItemButton.addEventListener("click", deleteCurrentItem);
els.statusFilter.addEventListener("change", render);

els.itemList.addEventListener("click", (event) => {
  const card = event.target.closest(".item-card");
  if (!(card instanceof HTMLButtonElement)) return;
  selectItem(card.dataset.itemId);
});

els.editorForm.addEventListener("input", updateCurrentItemFromForm);
els.editorForm.addEventListener("change", updateCurrentItemFromForm);

store = loadStore();
saveStore();
render();
