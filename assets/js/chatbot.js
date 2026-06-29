/**
 * chatbot.js — FAQ 챗봇 (플로팅 버튼 + 사이드 패널 + 키워드 검색)
 *
 * 동작 방식:
 *  1. data/faq.json을 fetch로 불러옴 (런타임 API 호출 없음, 키 불필요)
 *  2. 사용자 입력을 토큰화해 q·a·tags 필드와 매칭 점수 계산
 *  3. 최고 점수 항목을 답변으로 표시, 점수 낮으면 "관련 항목" 버튼 제시
 *
 * 점수 기준:
 *  - 질문(q)에 토큰 포함  → 3점
 *  - 태그(tags)에 포함    → 2점
 *  - 답변(a)에 토큰 포함  → 1점
 */

(function () {
  "use strict";

  /* --- DOM 요소 참조 --- */
  const btnToggle  = document.getElementById("chatbot-toggle");
  const btnClose   = document.getElementById("chatbot-close");
  const panel      = document.getElementById("chatbot-panel");
  const backdrop   = document.getElementById("chatbot-backdrop");
  const messages   = document.getElementById("chatbot-messages");
  const input      = document.getElementById("chatbot-input");
  const btnSend    = document.getElementById("chatbot-send");

  let faqData = [];           /* FAQ 전체 배열 */
  let isOpen  = false;        /* 패널 열림 상태 */

  /* --- 임계값 설정 --- */
  const SCORE_GOOD    = 4;    /* 이 점수 이상이면 명확한 답변 */
  const SCORE_WEAK    = 1;    /* 이 점수 이상이면 관련 항목 제시 */
  const MAX_RESULTS   = 3;    /* 최대 결과 표시 수 */

  /* ================================================================
     패널 열기 / 닫기
  ================================================================ */

  /** 챗봇 패널 열기 */
  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    backdrop.classList.add("active");
    btnToggle.classList.add("hidden");
    input.focus();
  }

  /** 챗봇 패널 닫기 */
  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    backdrop.classList.remove("active");
    btnToggle.classList.remove("hidden");
  }

  /* 버튼 이벤트 연결 */
  if (btnToggle) btnToggle.addEventListener("click", openPanel);
  if (btnClose)  btnClose.addEventListener("click", closePanel);
  if (backdrop)  backdrop.addEventListener("click", closePanel);

  /* ESC 키로 닫기 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  /* ================================================================
     메시지 추가 헬퍼
  ================================================================ */

  /**
   * 채팅창에 메시지 버블 추가
   * @param {"bot"|"user"} role
   * @param {string} html   - innerHTML로 삽입될 HTML 문자열
   */
  function addMessage(role, html) {
    const div = document.createElement("div");
    div.className = "msg msg--" + role;
    div.innerHTML = html;
    messages.appendChild(div);
    /* 항상 최신 메시지로 스크롤 */
    messages.scrollTop = messages.scrollHeight;
  }

  /**
   * 사용자 메시지 추가 (텍스트 이스케이프 후 삽입)
   */
  function addUserMessage(text) {
    addMessage("user", escHtml(text));
  }

  /**
   * HTML 이스케이프 (XSS 방지)
   */
  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ================================================================
     FAQ 검색 알고리즘
  ================================================================ */

  /**
   * 텍스트 토큰화
   *  - 2글자 이상 한글/영문/숫자 추출
   *  - 불용어(조사·어미) 제거
   */
  function tokenize(text) {
    /* 한글 형태소 분리는 브라우저에서 어려우므로
       2글자 이상 연속 문자 추출 방식을 사용 */
    const tokens = text.match(/[가-힣a-zA-Z0-9]{2,}/g) || [];
    /* 흔한 불용어 제거 */
    const stopwords = new Set(["있나요", "있을", "있는", "무엇", "어떻게", "인가요", "하나요", "되나요", "인지", "이란"]);
    return tokens.filter(function (t) { return !stopwords.has(t); });
  }

  /**
   * FAQ 전체를 스캔해 점수를 매기고 상위 결과 반환
   * @param {string} query - 사용자 입력
   * @returns {{ item, score }[]}  점수 내림차순 정렬
   */
  function searchFAQ(query) {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const scored = faqData.map(function (item) {
      let score = 0;
      tokens.forEach(function (token) {
        const t = token.toLowerCase();
        /* 질문(q)에 포함: 3점 */
        if (item.q.toLowerCase().includes(t)) score += 3;
        /* 태그(tags)에 포함: 2점 */
        if (item.tags && item.tags.some(function (tag) {
          return tag.toLowerCase().includes(t);
        })) score += 2;
        /* 답변(a)에 포함: 1점 */
        if (item.a.toLowerCase().includes(t)) score += 1;
      });
      return { item: item, score: score };
    });

    return scored
      .filter(function (r) { return r.score >= SCORE_WEAK; })
      .sort(function (a, b) { return b.score - a.score })
      .slice(0, MAX_RESULTS);
  }

  /* ================================================================
     답변 렌더링
  ================================================================ */

  /**
   * 검색 결과에 따라 봇 답변 메시지 추가
   */
  function renderAnswer(results) {
    if (results.length === 0) {
      /* 결과 없음 */
      addMessage("bot", `
        <p>죄송합니다. 관련 항목을 찾지 못했어요. 😥</p>
        <p>다른 키워드로 다시 질문해 주시거나, 아래 예시 버튼을 눌러보세요.</p>
      `);
      appendSuggestedButtons();
      return;
    }

    const best = results[0];

    if (best.score >= SCORE_GOOD) {
      /* 좋은 매칭: 명확한 답변 표시 */
      addMessage("bot", `
        <p><strong>Q. ${escHtml(best.item.q)}</strong></p>
        <div class="answer-card">${escHtml(best.item.a)}</div>
      `);

      /* 관련 항목이 더 있으면 "다른 관련 항목" 버튼 추가 */
      if (results.length > 1) {
        appendRelatedButtons(results.slice(1));
      }

    } else {
      /* 약한 매칭: 관련 항목 제시 */
      addMessage("bot", `
        <p>정확한 답변을 찾기 어려웠어요. 아래 관련 항목 중 하나를 선택해 보세요.</p>
      `);
      appendRelatedButtons(results);
    }
  }

  /**
   * 관련 항목 버튼들을 메시지 영역에 추가
   */
  function appendRelatedButtons(results) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg msg--bot";

    let html = "<p>관련 항목:</p>";
    results.forEach(function (r) {
      html += `<button class="related-btn" data-q="${escHtml(r.item.q)}">${escHtml(r.item.q)}</button>`;
    });
    wrapper.innerHTML = html;

    /* 관련 항목 버튼 클릭 이벤트 */
    wrapper.querySelectorAll(".related-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const q = btn.getAttribute("data-q");
        handleQuery(q);
      });
    });

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  /**
   * 예시 질문 버튼 추가 (검색 결과 없을 때)
   */
  function appendSuggestedButtons() {
    const suggestions = [
      "ChatGPT가 무엇인가요?",
      "프롬프트 공식을 알려주세요",
      "클로드 코드 설치 방법",
      "파일 업로드 활용법",
    ];

    const wrapper = document.createElement("div");
    wrapper.className = "suggested-questions";

    suggestions.forEach(function (q) {
      const btn = document.createElement("button");
      btn.className   = "suggest-btn";
      btn.textContent = q;
      btn.addEventListener("click", function () {
        handleQuery(q);
      });
      wrapper.appendChild(btn);
    });

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  /* ================================================================
     입력 처리 핵심 함수
  ================================================================ */

  /**
   * 사용자 질문 처리 → 검색 → 답변 표시
   * @param {string} query
   */
  function handleQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return;

    /* 사용자 메시지 표시 */
    addUserMessage(trimmed);
    input.value = "";

    /* FAQ가 아직 로드 중이면 대기 메시지 */
    if (faqData.length === 0) {
      addMessage("bot", "<p>FAQ 데이터를 로드 중입니다. 잠시 후 다시 시도해 주세요.</p>");
      return;
    }

    /* 검색 및 답변 */
    const results = searchFAQ(trimmed);
    renderAnswer(results);
  }

  /* ================================================================
     이벤트 바인딩
  ================================================================ */

  /* 전송 버튼 */
  if (btnSend) {
    btnSend.addEventListener("click", function () {
      handleQuery(input.value);
    });
  }

  /* Enter 키로 전송 (Shift+Enter는 줄바꿈 목적이지만 input이라 단순 Enter) */
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleQuery(input.value);
      }
    });
  }

  /* 초기 예시 질문 버튼 이벤트 */
  document.querySelectorAll(".suggest-btn[data-q]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      handleQuery(btn.getAttribute("data-q"));
    });
  });

  /* ================================================================
     FAQ 데이터 로드 초기화
  ================================================================ */

  async function init() {
    try {
      const res = await fetch("data/faq.json");
      if (!res.ok) throw new Error("faq.json 로드 실패 (" + res.status + ")");
      faqData = await res.json();

      if (!Array.isArray(faqData) || faqData.length === 0) {
        throw new Error("faq.json 형식 오류 또는 빈 배열");
      }

      console.info("[chatbot.js] FAQ 로드 완료:", faqData.length + "개 항목");

    } catch (err) {
      console.warn("[chatbot.js]", err.message);
      /* 로드 실패해도 챗봇은 작동하되 결과 없음 메시지 표시 */
      faqData = [];
    }
  }

  init();

})();
