const app = document.querySelector(".app-shell");
const stockGrid = document.querySelector("#stockGrid");
const tradeSymbol = document.querySelector("#tradeSymbol");
const tradeForm = document.querySelector("#tradeForm");
const holdingList = document.querySelector("#holdingList");
const alertList = document.querySelector("#alertList");
const priceChart = document.querySelector("#priceChart");
const strategyChart = document.querySelector("#strategyChart");
const floatChart = document.querySelector("#floatChart");
const floatWidget = document.querySelector("#floatWidget");
const topbarTitle = document.querySelector(".topbar h1");
const topbarEyebrow = document.querySelector(".topbar .eyebrow");

const initialTopbar = {
  title: topbarTitle?.textContent || "",
  eyebrow: topbarEyebrow?.textContent || "",
};

const TICKER_COLORS = {
  "A 股": { rise: "#ff5f86", fall: "#44d294" },
  "美股": { rise: "#44d294", fall: "#ff5f86" },
  ETF: { rise: "#ff5f86", fall: "#44d294" },
};

const marketData = {
  "A 股": [
    stock("贵州茅台", "600519.SH", "¥", 1722.3, 2.18, "8.42 万手", 1760, 1688, 17, 1.2),
    stock("宁德时代", "300750.SZ", "¥", 286.62, -0.86, "24.8 万手", 292, 289.5, 42, -0.4),
    stock("中芯国际", "688981.SH", "¥", 67.48, 3.42, "61.3 万手", 69.2, 65.3, 25, 1.8),
    stock("沪深300ETF", "510300.SH", "¥", 4.11, 0.32, "318 万手", 4.18, 4.08, 13, 0.2),
  ],
  "美股": [
    stock("Apple", "AAPL", "$", 226.8, 0.78, "4,620 万股", 232, 224.1, 19, 0.6),
    stock("NVIDIA", "NVDA", "$", 141.44, 3.06, "28,940 万股", 146, 138.8, 63, 1.9),
    stock("Tesla", "TSLA", "$", 248.2, -2.32, "8,730 万股", 255, 252.4, 37, -1.1),
  ],
  ETF: [
    stock("纳指100ETF", "513100.SH", "¥", 1.42, 1.16, "6,420 万手", 1.46, 1.39, 21, 0.6),
    stock("红利低波ETF", "512890.SH", "¥", 1.09, 0.42, "912 万手", 1.12, 1.08, 49, 0.1),
    stock("黄金ETF", "518880.SH", "¥", 5.88, -0.36, "1,284 万手", 5.95, 5.9, 34, -0.2),
  ],
};

const holdings = [
  { name: "沪深300ETF", code: "510300.SH", market: "ETF", shares: 18000, cost: 4.02, value: 73980, pnl: 1620 },
  { name: "中芯国际", code: "688981.SH", market: "A 股", shares: 1200, cost: 63.2, value: 80976, pnl: 5136 },
];

const alerts = [
  { name: "贵州茅台", rule: "价格触达 ¥ 1,760", active: true, tone: "red" },
  { name: "宁德时代", rule: "跌破止损 ¥ 280", active: true, tone: "blue" },
  { name: "沪深300ETF", rule: "成交量放大 2 倍", active: false, tone: "blue" },
];

const strategyMap = {
  ma: {
    line: series(20, 100, 18, 1.2).map((v, index) => v + index * 0.88),
    annual: "18.6%",
    drawdown: "-6.4%",
    signals: "14 次",
    color: "#315f8f",
  },
  breakout: {
    line: series(45, 96, 28, 1.7).map((v, index) => v + index * 1.2),
    annual: "24.2%",
    drawdown: "-10.8%",
    signals: "21 次",
    color: "#ff5f86",
  },
  etf: {
    line: series(72, 106, 10, 0.55).map((v, index) => v + index * 0.38),
    annual: "9.8%",
    drawdown: "-3.2%",
    signals: "32 次",
    color: "#4d97ff",
  },
};

let selectedMarket = "A 股";
let selectedStock = marketData[selectedMarket][0];
let chartMode = "minute";
let cash = 182460;

function stock(name, code, currency, price, change, volume, alert, open, seed, drift) {
  const base = price / (1 + change / 100);
  return {
    name,
    code,
    currency,
    price,
    change,
    volume,
    alert,
    open,
    series: series(seed, base, Math.max(price * 0.026, 0.2), drift),
    volumeSeries: volumeSeries(seed + 8),
  };
}

function series(seed, base, amplitude, drift) {
  return Array.from({ length: 42 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.47) * amplitude;
    const pulse = Math.cos((index + seed) * 0.19) * amplitude * 0.44;
    return base + wave + pulse + index * drift;
  });
}

function volumeSeries(seed) {
  return Array.from({ length: 42 }, (_, index) => {
    const value = 40 + Math.abs(Math.sin((index + seed) * 0.33)) * 70;
    return value + (index % 9 === 0 ? 36 : 0);
  });
}

function money(value, currency = "¥") {
  const digits = value >= 100 ? 2 : 3;
  return `${currency} ${Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function signedPercent(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tickerColor(value, market = selectedMarket) {
  const colors = TICKER_COLORS[market] || TICKER_COLORS["美股"];
  return value >= 0 ? colors.rise : colors.fall;
}

function applyTickerTone(element, value, market = selectedMarket) {
  if (!element) return;
  element.className = value >= 0 ? "rise" : "fall";
  element.style.color = tickerColor(value, market);
}

function renderStocks() {
  stockGrid.innerHTML = "";
  tradeSymbol.innerHTML = "";

  marketData[selectedMarket].forEach((item) => {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = `${item.name} ${item.code}`;
    tradeSymbol.append(option);

    const button = document.createElement("button");
    button.className = `stock-card${item.code === selectedStock.code ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.code = item.code;
    button.innerHTML = `
      <span>
        <strong>${item.name}</strong>
        <small>${item.code}</small>
      </span>
      <span class="price">
        ${money(item.price, item.currency)}
        <small class="${item.change >= 0 ? "rise" : "fall"}" style="color: ${tickerColor(item.change)}">${signedPercent(item.change)}</small>
      </span>
      <canvas class="sparkline" width="360" height="64" aria-hidden="true"></canvas>
    `;
    button.addEventListener("click", () => selectStock(item));
    stockGrid.append(button);
    drawSpark(button.querySelector("canvas"), item.series, tickerColor(item.change));
  });

  tradeSymbol.value = selectedStock.code;
}

function selectStock(item) {
  selectedStock = item;
  tradeSymbol.value = item.code;
  document.querySelectorAll(".stock-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.code === item.code);
  });
  syncSelectedStock();
  drawMainChart();
  drawFloatChart();
}

function syncSelectedStock() {
  const dayPnl = document.querySelector("#dayPnl");
  const quoteMarketName = document.querySelector("#quoteMarketName");
  if (quoteMarketName) quoteMarketName.textContent = selectedMarket;
  applyTickerTone(dayPnl, 1280, selectedMarket);
  document.querySelector("#selectedCode").textContent = selectedStock.code;
  document.querySelector("#selectedName").textContent = selectedStock.name;
  document.querySelector("#selectedPrice").textContent = money(selectedStock.price, selectedStock.currency);
  document.querySelector("#selectedChange").textContent = signedPercent(selectedStock.change);
  applyTickerTone(document.querySelector("#selectedChange"), selectedStock.change);
  document.querySelector("#openPrice").textContent = money(selectedStock.open, selectedStock.currency);
  document.querySelector("#volumeValue").textContent = selectedStock.volume;
  document.querySelector("#alertValue").textContent = money(selectedStock.alert, selectedStock.currency);
  document.querySelector("#entryPrice").value = selectedStock.price.toFixed(2);
  document.querySelector("#stopLoss").value = (selectedStock.price * 0.968).toFixed(2);
  document.querySelector("#takeProfit").value = (selectedStock.price * 1.056).toFixed(2);
  document.querySelector("#floatTitle").textContent = selectedStock.name;
  document.querySelector("#floatPrice").textContent = money(selectedStock.price, selectedStock.currency);
  document.querySelector("#floatChange").textContent = signedPercent(selectedStock.change);
  applyTickerTone(document.querySelector("#floatChange"), selectedStock.change);
  document.querySelector("#floatVolume").textContent = selectedStock.volume;
  document.querySelector("#floatAlert").textContent = money(selectedStock.alert, selectedStock.currency);
  const phoneName = document.querySelector("#phoneName");
  const phonePrice = document.querySelector("#phonePrice");
  const phoneChange = document.querySelector("#phoneChange");
  const phonePlan = document.querySelector("#phonePlan");
  if (phoneName) phoneName.textContent = selectedStock.name;
  if (phonePrice) phonePrice.textContent = money(selectedStock.price, selectedStock.currency);
  if (phoneChange) {
    phoneChange.textContent = signedPercent(selectedStock.change);
    applyTickerTone(phoneChange, selectedStock.change);
  }
  if (phonePlan) {
    phonePlan.textContent =
      `止损 ${money(selectedStock.price * 0.968, selectedStock.currency)} / 止盈 ${money(selectedStock.price * 1.056, selectedStock.currency)}`;
  }
}

function renderHoldings() {
  holdingList.innerHTML = "";
  holdings.forEach((item) => {
    const row = document.createElement("article");
    row.className = "holding-row";
    row.innerHTML = `
      <span>
        <strong>${item.name}</strong>
        <small>${item.code} · ${item.shares.toLocaleString("zh-CN")} 股 · 成本 ${item.cost}</small>
      </span>
      <span class="holding-pnl ${item.pnl >= 0 ? "rise" : "fall"}" style="color: ${tickerColor(item.pnl, item.market || "A 股")}">
        ${item.pnl >= 0 ? "+" : ""}¥ ${Math.abs(item.pnl).toLocaleString("zh-CN")}
      </span>
    `;
    holdingList.append(row);
  });
}

function renderAlerts() {
  alertList.innerHTML = "";
  alerts.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "alert-item";
    row.innerHTML = `
      <i style="background: ${alertColor(item.tone)}"></i>
      <span>
        <strong>${item.name}</strong>
        <small>${item.rule}</small>
      </span>
      <button type="button">${item.active ? "开启" : "暂停"}</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      item.active = !item.active;
      renderAlerts();
    });
    alertList.append(row);
  });
  document.querySelector("#alertCount").textContent = `${alerts.filter((item) => item.active).length} 条`;
}

function alertColor(tone) {
  if (tone === "red") return "#ff5f86";
  if (tone === "blue") return "#4d97ff";
  return "#d7cf88";
}

function drawSpark(canvas, values, color) {
  setupCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  drawLine(ctx, values, 8, 8, width - 16, height - 16, color, 2.3, false);
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function chartValues() {
  if (chartMode === "day") {
    return selectedStock.series.map((value, index) => value + Math.sin(index * 0.7) * selectedStock.price * 0.018);
  }
  return selectedStock.series;
}

function drawMainChart() {
  setupCanvas(priceChart);
  const ctx = priceChart.getContext("2d");
  const { width, height } = priceChart;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);

  if (chartMode === "volume") {
    drawVolume(ctx, selectedStock.volumeSeries, 28, 28, width - 56, height - 56, "#315f8f");
  } else {
    const color = tickerColor(selectedStock.change);
    drawAreaLine(ctx, chartValues(), 28, 28, width - 56, height - 56, color);
    drawVolume(ctx, selectedStock.volumeSeries, 28, height * 0.68, width - 56, height * 0.24, "rgba(49, 95, 143, 0.26)");
  }
}

function drawFloatChart() {
  setupCanvas(floatChart);
  const ctx = floatChart.getContext("2d");
  const { width, height } = floatChart;
  ctx.clearRect(0, 0, width, height);
  const color = tickerColor(selectedStock.change);
  drawAreaLine(ctx, selectedStock.series.slice(-24), 10, 10, width - 20, height - 20, color);
}

function drawStrategy() {
  const active = document.querySelector(".strategy-card.is-active").dataset.strategy;
  const item = strategyMap[active];
  setupCanvas(strategyChart);
  const ctx = strategyChart.getContext("2d");
  const { width, height } = strategyChart;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);
  drawAreaLine(ctx, item.line, 24, 24, width - 48, height - 48, item.color);
  document.querySelector("#annualReturn").textContent = item.annual;
  document.querySelector("#drawdown").textContent = item.drawdown;
  document.querySelector("#signalCount").textContent = item.signals;
}

function drawGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(105, 117, 110, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i += 1) {
    const x = (width / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAreaLine(ctx, values, x, y, width, height, color) {
  const points = normalize(values, x, y, width, height);
  ctx.save();
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, withAlpha(color, 0.24));
  gradient.addColorStop(1, withAlpha(color, 0.02));
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  drawLine(ctx, values, x, y, width, height, color, 3, true);
  ctx.restore();
}

function drawLine(ctx, values, x, y, width, height, color, lineWidth, showLastDot) {
  const points = normalize(values, x, y, width, height);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  if (showLastDot) {
    const last = points[points.length - 1];
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawVolume(ctx, values, x, y, width, height, color) {
  const max = Math.max(...values);
  const barWidth = width / values.length;
  ctx.save();
  ctx.fillStyle = color;
  values.forEach((value, index) => {
    const barHeight = (value / max) * height;
    ctx.fillRect(x + index * barWidth + 1, y + height - barHeight, Math.max(2, barWidth - 3), barHeight);
  });
  ctx.restore();
}

function normalize(values, x, y, width, height) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => ({
    x: x + (index / (values.length - 1)) * width,
    y: y + height - ((value - min) / span) * height,
  }));
}

function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 260);
  }, 1800);
}

document.querySelectorAll("[data-market]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-market]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    selectedMarket = button.dataset.market;
    selectedStock = marketData[selectedMarket][0];
    document.querySelector("#marketLabel").textContent = selectedMarket;
    renderStocks();
    syncSelectedStock();
    drawMainChart();
    drawFloatChart();
  });
});

document.querySelectorAll(".chart-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chart-tabs button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    chartMode = button.dataset.chart;
    drawMainChart();
  });
});

document.querySelectorAll(".strategy-card").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".strategy-card").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    drawStrategy();
  });
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const section = document.querySelector(`[data-section="${button.dataset.target}"]`);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelector("#positionSize").addEventListener("input", (event) => {
  document.querySelector("#positionLabel").textContent = `${event.target.value}%`;
});

tradeSymbol.addEventListener("change", () => {
  const next = marketData[selectedMarket].find((item) => item.code === tradeSymbol.value);
  if (next) selectStock(next);
});

tradeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const percent = Number(document.querySelector("#positionSize").value);
  const entry = Number(document.querySelector("#entryPrice").value);
  const budget = cash * (percent / 100);
  const shares = Math.max(1, Math.floor(budget / entry));
  const cost = shares * entry;
  cash = Math.max(0, cash - cost);
  holdings.unshift({
    name: selectedStock.name,
    code: selectedStock.code,
    market: selectedMarket,
    shares,
    cost: entry,
    value: shares * selectedStock.price,
    pnl: Math.round((selectedStock.price - entry) * shares),
  });
  document.querySelector("#cashValue").textContent = `¥ ${Math.round(cash).toLocaleString("zh-CN")}`;
  document.querySelector("#planState").textContent = "已进入模拟仓";
  renderHoldings();
  showToast("模拟仓已更新");
});

document.querySelector("#newAlert").addEventListener("click", () => {
  alerts.unshift({
    name: selectedStock.name,
    rule: `价格触达 ${money(selectedStock.alert, selectedStock.currency)}`,
    active: true,
    tone: selectedStock.change >= 0 ? "blue" : "red",
  });
  renderAlerts();
  showToast("预警已创建");
});

document.querySelector("#addWatch").addEventListener("click", () => {
  const extra = stock("科创50ETF", "588000.SH", "¥", 1.07, 0.88, "2,031 万手", 1.1, 1.06, 81, 0.05);
  const exists = marketData[selectedMarket].some((item) => item.code === extra.code);
  if (!exists) marketData[selectedMarket].push(extra);
  renderStocks();
  showToast("自选列表已更新");
});

function focusModule(moduleName) {
  const panel = document.querySelector(`[data-module="${moduleName}"]`);
  if (!panel) return;
  panel.hidden = false;
  document.querySelectorAll(".module-panel").forEach((item) => {
    item.classList.toggle("is-focused", item === panel);
  });
  document.querySelectorAll(`[data-module-tab="${moduleName}"]`).forEach((button) => {
    button.classList.add("is-open", "is-focused");
  });
  document.querySelectorAll(".module-tab").forEach((button) => {
    if (button.dataset.moduleTab !== moduleName) button.classList.remove("is-focused");
  });
  requestAnimationFrame(() => {
    drawMainChart();
    drawStrategy();
  });
}

function closeModule(moduleName) {
  const panel = document.querySelector(`[data-module="${moduleName}"]`);
  if (!panel) return;
  panel.hidden = true;
  panel.classList.remove("is-focused");
  document.querySelectorAll(`[data-module-tab="${moduleName}"]`).forEach((button) => {
    button.classList.remove("is-open", "is-focused");
  });
  showToast(`${panel.querySelector(".module-header h2")?.textContent || moduleName} 已关闭`);
}

document.querySelectorAll("[data-module-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    focusModule(button.dataset.moduleTab);
    document.querySelector("#modulePicker").hidden = true;
  });
});

document.querySelectorAll("[data-close-module]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModule(button.dataset.closeModule);
  });
});

document.querySelectorAll(".panel-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.closest(".module-panel");
    panel.querySelectorAll(".panel-tab").forEach((item) => item.classList.remove("is-active"));
    panel.querySelectorAll(".tab-content").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.tabContent === button.dataset.tabTarget);
    });
    button.classList.add("is-active");
    requestAnimationFrame(() => {
      renderStocks();
      drawMainChart();
    });
  });
});

document.querySelector("#showModulePicker").addEventListener("click", () => {
  const picker = document.querySelector("#modulePicker");
  picker.hidden = !picker.hidden;
});

document.querySelector("#stealthToggle").addEventListener("click", () => {
  floatWidget.classList.toggle("is-stealth");
});

document.querySelector("#floatMini").addEventListener("click", () => {
  floatWidget.classList.toggle("is-minimized");
});

document.querySelector("#floatClose").addEventListener("click", () => {
  floatWidget.hidden = true;
  showToast("悬浮窗已关闭");
});

document.querySelector("#bossKey").addEventListener("click", () => {
  app.classList.add("is-boss");
  if (topbarEyebrow) topbarEyebrow.textContent = "Workspace";
  if (topbarTitle) topbarTitle.textContent = "今日工作概览";
});

document.querySelector("#restoreKey").addEventListener("click", () => {
  app.classList.remove("is-boss");
  if (topbarEyebrow) topbarEyebrow.textContent = initialTopbar.eyebrow;
  if (topbarTitle) topbarTitle.textContent = initialTopbar.title;
});

function setupDrag() {
  const handle = document.querySelector("#dragHandle");
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("pointerdown", (event) => {
    dragging = true;
    const rect = floatWidget.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    floatWidget.style.left = `${rect.left}px`;
    floatWidget.style.top = `${rect.top}px`;
    floatWidget.style.right = "auto";
    floatWidget.style.bottom = "auto";
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const width = floatWidget.offsetWidth;
    const height = floatWidget.offsetHeight;
    const nextLeft = Math.min(Math.max(8, event.clientX - offsetX), window.innerWidth - width - 8);
    const nextTop = Math.min(Math.max(8, event.clientY - offsetY), window.innerHeight - height - 8);
    floatWidget.style.left = `${nextLeft}px`;
    floatWidget.style.top = `${nextTop}px`;
  });

  handle.addEventListener("pointerup", (event) => {
    dragging = false;
    handle.releasePointerCapture(event.pointerId);
  });
}

window.addEventListener("resize", () => {
  renderStocks();
  drawMainChart();
  drawFloatChart();
  drawStrategy();
});

renderStocks();
renderHoldings();
renderAlerts();
syncSelectedStock();
drawMainChart();
drawFloatChart();
drawStrategy();
setupDrag();
