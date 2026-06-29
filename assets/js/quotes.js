/**
 * quotes.js — 영어 명언 랜덤 표시
 *
 * 동작 방식:
 *  1. quotes.json을 fetch로 불러옴
 *  2. 배열에서 랜덤으로 하나를 골라 DOM에 표시
 *  3. "새 명언 보기" 버튼 클릭 시 다시 랜덤 선택
 *     (같은 명언이 연속으로 나오지 않도록 처리)
 */

(function () {
  "use strict";

  /* --- DOM 요소 참조 --- */
  const elEn     = document.getElementById("quote-en");
  const elKo     = document.getElementById("quote-ko");
  const elAuthor = document.getElementById("quote-author");
  const elCard   = document.getElementById("quote-card");
  const btnRef   = document.getElementById("refresh-quote");

  let quotes  = [];       /* 전체 명언 배열 */
  let lastIdx = -1;       /* 직전에 표시된 인덱스 (중복 방지) */

  /**
   * 랜덤 인덱스 선택 (직전 인덱스 제외)
   * @param {number} len - 배열 길이
   * @returns {number}
   */
  function randomIdx(len) {
    if (len <= 1) return 0;
    let idx;
    do {
      idx = Math.floor(Math.random() * len);
    } while (idx === lastIdx);
    return idx;
  }

  /**
   * 명언을 DOM에 렌더링
   * fade-out → 내용 교체 → fade-in 으로 부드럽게 전환
   */
  function showQuote() {
    const idx  = randomIdx(quotes.length);
    lastIdx    = idx;
    const item = quotes[idx];

    /* 페이드 아웃 */
    elCard.style.opacity = "0";
    elCard.style.transform = "translateY(6px)";

    setTimeout(function () {
      elEn.textContent     = "“" + item.en + "”";  /* " ~ " 따옴표 */
      elKo.textContent     = item.ko;
      elAuthor.textContent = item.author;

      /* 페이드 인 */
      elCard.style.transition  = "opacity 0.5s ease, transform 0.5s ease";
      elCard.style.opacity     = "1";
      elCard.style.transform   = "translateY(0)";
    }, 250);
  }

  /**
   * quotes.json 로드 후 첫 명언 표시
   */
  async function init() {
    try {
      const res = await fetch("quotes.json");
      if (!res.ok) throw new Error("quotes.json 로드 실패: " + res.status);
      quotes = await res.json();

      if (!Array.isArray(quotes) || quotes.length === 0) {
        throw new Error("quotes.json 형식 오류");
      }

      showQuote();   /* 첫 명언 표시 */

    } catch (err) {
      /* 로드 실패 시 기본 명언 표시 */
      elEn.textContent     = "“Imagination is more important than knowledge.”";
      elKo.textContent     = "지식보다 상상력이 더 중요하다.";
      elAuthor.textContent = "Albert Einstein";
      console.warn("[quotes.js]", err.message);
    }
  }

  /* "새 명언 보기" 버튼 이벤트 */
  if (btnRef) {
    btnRef.addEventListener("click", function () {
      if (quotes.length > 0) showQuote();
    });
  }

  /* 초기화 실행 */
  init();

})();
