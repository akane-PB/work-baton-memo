const STORAGE_KEY = "work-baton-memo:v1";
const CLOUD_CONFIG_KEY = "work-baton-memo:cloud-config:v1";

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
  holdCount: document.querySelector("#holdCount"),
  doneCount: document.querySelector("#doneCount"),
  visibleCount: document.querySelector("#visibleCount"),
  statusFilter: document.querySelector("#statusFilter"),
  newItemButton: document.querySelector("#newItemButton"),
  cloudStatus: document.querySelector("#cloudStatus"),
  loadCloudButton: document.querySelector("#loadCloudButton"),
  saveCloudButton: document.querySelector("#saveCloudButton"),
  syncSettings: document.querySelector("#syncSettings"),
  clearSettingsButton: document.querySelector("#clearSettingsButton"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  scriptUrl: document.querySelector("#scriptUrl"),
  sharedSecret: document.querySelector("#sharedSecret"),
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

function loadCloudConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY));
    return {
      scriptUrl: config?.scriptUrl || "",
      sharedSecret: config?.sharedSecret || "",
    };
  } catch {
    return { scriptUrl: "", sharedSecret: "" };
  }
}

function saveCloudConfig(config) {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
}

function clearCloudConfig() {
  localStorage.removeItem(CLOUD_CONFIG_KEY);
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
  els.holdCount.textContent = String(store.items.filter((item) => item.status === "保留").length);
  els.doneCount.textContent = String(store.items.filter((item) => item.status === "完了").length);
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
  renderCloudStatus();
}

function renderCloudStatus(message) {
  const config = loadCloudConfig();
  if (message) {
    els.cloudStatus.textContent = message;
    return;
  }
  els.cloudStatus.textContent = config.scriptUrl ? "共有設定済み" : "端末内保存";
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

function getCloudConfigOrOpenSettings() {
  const config = loadCloudConfig();
  if (config.scriptUrl && config.sharedSecret) return config;
  const inlineConfig = {
    scriptUrl: els.scriptUrl.value.trim(),
    sharedSecret: els.sharedSecret.value.trim(),
  };
  if (inlineConfig.scriptUrl && inlineConfig.sharedSecret) {
    saveCloudConfig(inlineConfig);
    return inlineConfig;
  }

  els.syncSettings.open = true;
  renderCloudStatus("共有設定が必要");
  return null;
}

function makeCloudPayload() {
  return {
    version: 1,
    savedAt: nowIso(),
    store,
  };
}

function applyCloudStore(nextStore) {
  if (!nextStore || !Array.isArray(nextStore.items)) {
    throw new Error("共有データの形式が正しくありません。");
  }

  const items = nextStore.items.map(normalizeItem);
  store = {
    currentItemId: items.some((item) => item.id === nextStore.currentItemId)
      ? nextStore.currentItemId
      : items[0]?.id || "",
    items,
  };
  saveStore();
  render();
}

async function loadFromCloud() {
  const config = getCloudConfigOrOpenSettings();
  if (!config) return;

  try {
    renderCloudStatus("共有読込中");
    const url = new URL(config.scriptUrl);
    url.searchParams.set("action", "load");
    url.searchParams.set("secret", config.sharedSecret);
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "共有読込に失敗しました。");
    }

    if (store.items.length > 0 && !window.confirm("共有データでこの端末の内容を置き換えますか？")) {
      renderCloudStatus();
      return;
    }

    applyCloudStore(result.data?.store || result.store);
    renderCloudStatus("共有読込済み");
  } catch (error) {
    renderCloudStatus("読込失敗");
    window.alert(error.message || "共有読込に失敗しました。");
  }
}

async function saveToCloud() {
  const config = getCloudConfigOrOpenSettings();
  if (!config) return;

  try {
    renderCloudStatus("共有保存中");
    const response = await fetch(config.scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "save",
        secret: config.sharedSecret,
        data: makeCloudPayload(),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "共有保存に失敗しました。");
    }

    renderCloudStatus("共有保存済み");
  } catch (error) {
    renderCloudStatus("保存失敗");
    window.alert(error.message || "共有保存に失敗しました。");
  }
}

function restoreSettingsFields() {
  const config = loadCloudConfig();
  els.scriptUrl.value = config.scriptUrl;
  els.sharedSecret.value = config.sharedSecret;
}

function handleSaveSettings() {
  const config = {
    scriptUrl: els.scriptUrl.value.trim(),
    sharedSecret: els.sharedSecret.value.trim(),
  };

  if (!config.scriptUrl || !config.sharedSecret) {
    renderCloudStatus("設定未入力");
    window.alert("Apps Script URLと共有パスワードを入力してください。");
    return;
  }

  saveCloudConfig(config);
  els.syncSettings.open = false;
  renderCloudStatus("共有設定済み");
}

function handleClearSettings() {
  if (!window.confirm("共有設定をこの端末から削除しますか？")) return;
  clearCloudConfig();
  els.scriptUrl.value = "";
  els.sharedSecret.value = "";
  els.syncSettings.open = false;
  renderCloudStatus();
}

els.newItemButton.addEventListener("click", createNewItem);
els.loadCloudButton.addEventListener("click", loadFromCloud);
els.saveCloudButton.addEventListener("click", saveToCloud);
els.saveSettingsButton.addEventListener("click", handleSaveSettings);
els.clearSettingsButton.addEventListener("click", handleClearSettings);
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
restoreSettingsFields();
saveStore();
render();
