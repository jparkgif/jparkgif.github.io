/**
 * news.js — 경제 뉴스 목록 + 주식 + 금시세 카드 렌더링
 *
 * 데이터 소스: data/news.json (GitHub Actions가 매일 06:00 KST 갱신)
 *
 * 렌더링 항목:
 *  - 주식 카드 4개: KOSPI, KOSDAQ, NASDAQ, USD/KRW
 *  - 금시세 카드: 국제 금 현물가 (USD, KRW)
 *  - 경제 뉴스 목록: 제목 클릭 시 새 창으로 원문 이동
 */

(function () {
  "use strict";

  /* --- DOM 요소 참조 --- */
  const elStockGrid = document.getElementById("stock-grid");
  const elNewsCard  = document.getElementById("news-card");
  const elUpdated   = document.getElementById("news-updated");

  /* --- 주식 메타 정보 (라벨, 단위 등) --- */
  const STOCK_META = {
    kospi:  { label: "KOSPI",      unit: "",    decimals: 2 },
    kosdaq: { label: "KOSDAQ",     unit: "",    decimals: 2 },
    nasdaq: { label: "NASDAQ",     unit: "",    decimals: 2 },
    usdkrw: { label: "USD / KRW",  unit: "원",  decimals: 2 },
  };

  /**
   * 변화량 → 방향 클래스 및 기호 반환
   * @param {number} change - 변화량
   * @returns {{ cls: string, symbol: string }}
   */
  function changeStyle(change) {
    if (change > 0)  return { cls: "up",   symbol: "▲" };
    if (change < 0)  return { cls: "down", symbol: "▼" };
    return            { cls: "flat",  symbol: "—" };
  }

  /**
   * 숫자를 천 단위 콤마 형식으로 포매팅
   * @param {number} num
   * @param {number} decimals
   */
  function fmt(num, decimals) {
    return Number(num).toLocaleString("ko-KR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * 주식 카드 4개 + 금시세 카드 1개 렌더링
   */
  function renderStocks(stocks, gold) {
    let html = "";

    /* 주식 4개 카드 */
    for (const [key, meta] of Object.entries(STOCK_META)) {
      const s = stocks[key];
      if (!s) continue;

      const { cls, symbol } = changeStyle(s.change);
      html += `
        <div class="stock-card">
          <div class="stock-label">${meta.label}</div>
          <div class="stock-value">${fmt(s.value, meta.decimals)}${meta.unit}</div>
          <div class="stock-change ${cls}">
            ${symbol} ${fmt(Math.abs(s.change), 2)} (${s.change_pct >= 0 ? "+" : ""}${s.change_pct.toFixed(2)}%)
          </div>
        </div>
      `;
    }

    /* 금시세 카드 */
    if (gold) {
      const { cls, symbol } = changeStyle(gold.change);
      html += `
        <div class="stock-card stock-card--gold">
          <div class="stock-label">국제 금시세 (XAU)</div>
          <div class="stock-value">$${fmt(gold.price_usd, 2)}</div>
          <div style="font-size:.78rem;color:#92400E;margin-bottom:.25rem;">
            ≈ ${fmt(gold.price_krw, 0)}원/oz
          </div>
          <div class="stock-change ${cls}">
            ${symbol} $${fmt(Math.abs(gold.change), 2)} (${gold.change_pct >= 0 ? "+" : ""}${gold.change_pct.toFixed(2)}%)
          </div>
        </div>
      `;
    }

    elStockGrid.innerHTML = html;
  }

  /**
   * 경제 뉴스 목록 렌더링
   * 제목 클릭 시 새 창으로 원문 이동 (target="_blank" rel="noopener")
   */
  function renderNews(newsArr) {
    if (!newsArr || newsArr.length === 0) {
      elNewsCard.innerHTML = `<p style="color:#64748B;font-size:.875rem;">뉴스 정보를 불러오지 못했습니다.</p>`;
      return;
    }

    const items = newsArr
      .map(function (item) {
        return `
          <li class="news-item">
            <a href="${item.url}"
               target="_blank"
               rel="noopener noreferrer"
               title="${item.title}">
              ${item.title}
            </a>
          </li>
        `;
      })
      .join("");

    elNewsCard.innerHTML = `
      <div class="news-title-bar">📰 오늘의 경제 뉴스</div>
      <ul class="news-list">${items}</ul>
    `;
  }

  /**
   * 오류 시 안내 렌더링
   */
  function renderError() {
    const errHtml = `
      <div style="text-align:center;padding:1.5rem 0;color:#64748B;">
        <div style="font-size:2rem;margin-bottom:.5rem;">⚠️</div>
        <p style="font-size:.875rem;">시세·뉴스 정보를 불러올 수 없습니다.</p>
        <p style="font-size:.75rem;margin-top:.5rem;">데이터는 매일 06:00 KST에 자동 갱신됩니다.</p>
      </div>
    `;
    elStockGrid.innerHTML = errHtml;
    elNewsCard.innerHTML  = "";
  }

  /**
   * data/news.json 불러와 렌더링
   */
  async function init() {
    try {
      const res = await fetch("data/news.json");
      if (!res.ok) throw new Error("뉴스 데이터 로드 실패 (" + res.status + ")");

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      renderStocks(data.stocks || {}, data.gold || null);
      renderNews(data.news || []);

      if (elUpdated && data.updated) {
        elUpdated.textContent = "데이터 기준: " + data.updated + " KST";
      }

    } catch (err) {
      renderError();
      console.warn("[news.js]", err.message);
    }
  }

  init();

})();
