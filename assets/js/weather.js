/**
 * weather.js — 날씨 카드 + 기온별 코디 추천 렌더링
 *
 * 데이터 소스: data/weather.json (GitHub Actions가 매일 06:00 KST 갱신)
 *
 * 기온별 코디 매핑:
 *   28℃ 이상 → 반팔/린넨 → 무신사 린넨셔츠 검색
 *   17~27℃   → 셔츠/가디건 → 무신사 가디건 검색
 *   9~16℃    → 자켓/니트  → 무신사 자켓 검색
 *   8℃ 이하  → 코트/패딩  → 무신사 패딩 검색
 */

(function () {
  "use strict";

  /* --- DOM 요소 참조 --- */
  const elWeather = document.getElementById("weather-card");
  const elOutfit  = document.getElementById("outfit-card");
  const elUpdated = document.getElementById("weather-updated");

  /* --- 날씨 아이콘 매핑 (조건 키워드 → 이모지) --- */
  const WEATHER_ICONS = {
    "맑음":       "☀️",
    "구름 조금":  "⛅",
    "구름많음":   "🌥",
    "흐림":       "☁️",
    "비":         "🌧️",
    "소나기":     "🌦️",
    "뇌우":       "⛈️",
    "눈":         "❄️",
    "안개":       "🌫️",
    "황사":       "🟡",
  };

  /**
   * 날씨 키워드로 이모지 아이콘 반환
   * 매칭 실패 시 기본 아이콘 "🌤" 사용
   */
  function getWeatherIcon(condition) {
    for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
      if (condition.includes(key)) return icon;
    }
    return "🌤";
  }

  /**
   * 기온 → 코디 정보 객체 반환
   * @param {number} temp - 현재 기온(℃)
   * @returns {{ range, keyword, desc, musinsaQ, pinterestQ }}
   */
  function getOutfitByTemp(temp) {
    if (temp >= 28) {
      return {
        range:      "28℃ 이상",
        keyword:    "반팔 · 린넨 룩",
        desc:       "무더운 날씨엔 가볍고 통기성 좋은 린넨 셔츠나 반팔 티셔츠를 추천합니다. 밝은 색상을 선택하면 시각적으로 시원해 보입니다.",
        musinsaQ:   "린넨셔츠",
        pinterestQ: "summer+linen+outfit",
      };
    } else if (temp >= 17) {
      return {
        range:      "17~27℃",
        keyword:    "셔츠 · 가디건 룩",
        desc:       "활동하기 딱 좋은 날씨입니다. 얇은 가디건이나 셔츠 하나 걸치면 하루 종일 쾌적합니다. 아침저녁에는 쌀쌀할 수 있으니 하나 챙기세요.",
        musinsaQ:   "가디건",
        pinterestQ: "spring+cardigan+outfit",
      };
    } else if (temp >= 9) {
      return {
        range:      "9~16℃",
        keyword:    "자켓 · 니트 룩",
        desc:       "서늘한 날씨에는 자켓이나 두꺼운 니트가 딱입니다. 레이어링으로 스타일리시하게 연출해 보세요. 안에는 긴팔 티셔츠를 추천합니다.",
        musinsaQ:   "자켓",
        pinterestQ: "fall+jacket+outfit",
      };
    } else {
      return {
        range:      "8℃ 이하",
        keyword:    "코트 · 패딩 룩",
        desc:       "꽤 추운 날씨입니다. 두꺼운 패딩이나 롱코트로 보온에 신경 써주세요. 머플러와 장갑까지 챙기면 완벽합니다.",
        musinsaQ:   "패딩",
        pinterestQ: "winter+puffer+coat+outfit",
      };
    }
  }

  /**
   * 날씨 카드 HTML 생성
   */
  function renderWeatherCard(data) {
    const icon = getWeatherIcon(data.condition || "");

    elWeather.innerHTML = `
      <div class="weather-icon">${icon}</div>
      <div class="weather-temp">${data.temp}<span style="font-size:.5em;font-weight:400;">℃</span></div>
      <div class="weather-city">${data.city || "서울"}</div>
      <div class="weather-condition">${data.condition || "정보 없음"}</div>
      <div class="weather-detail-row">
        <span class="weather-detail-item">
          <span>최고</span>
          <strong style="color:#EF4444;">${data.high}℃</strong>
        </span>
        <span class="weather-detail-item">
          <span>최저</span>
          <strong style="color:#3B82F6;">${data.low}℃</strong>
        </span>
        <span class="weather-detail-item">
          <span>습도</span>
          <strong>${data.humidity}%</strong>
        </span>
        ${data.wind ? `<span class="weather-detail-item"><span>바람</span><strong>${data.wind}</strong></span>` : ""}
      </div>
    `;
  }

  /**
   * 코디 추천 카드 HTML 생성
   * 무신사, Pinterest 링크는 새 창으로 열림
   */
  function renderOutfitCard(outfit) {
    const musinsaUrl   = `https://www.musinsa.com/search/musinsa/integration?q=${encodeURIComponent(outfit.musinsaQ)}`;
    const pinterestUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(outfit.pinterestQ)}`;

    elOutfit.innerHTML = `
      <div class="outfit-title">오늘의 코디 추천</div>
      <div class="outfit-badge">기온 ${outfit.range}</div>
      <div class="outfit-keyword">${outfit.keyword}</div>
      <div class="outfit-desc">${outfit.desc}</div>
      <div class="outfit-links">
        <a class="outfit-link outfit-link--musinsa"
           href="${musinsaUrl}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="무신사에서 ${outfit.musinsaQ} 검색">
          🛍 무신사에서 보기
        </a>
        <a class="outfit-link outfit-link--pinterest"
           href="${pinterestUrl}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="Pinterest에서 코디 이미지 검색">
          📌 Pinterest 코디
        </a>
      </div>
    `;
  }

  /**
   * 오류 상태 렌더링
   */
  function renderError(message) {
    const errHtml = `
      <div style="text-align:center;padding:1.5rem 0;color:#64748B;">
        <div style="font-size:2rem;margin-bottom:.5rem;">⚠️</div>
        <p style="font-size:.875rem;">${message}</p>
        <p style="font-size:.75rem;margin-top:.5rem;">
          날씨 데이터는 매일 06:00 KST에 자동 갱신됩니다.
        </p>
      </div>
    `;
    elWeather.innerHTML = errHtml;
    elOutfit.innerHTML  = errHtml;
  }

  /**
   * data/weather.json 불러와 카드 렌더링
   */
  async function init() {
    try {
      const res = await fetch("data/weather.json");
      if (!res.ok) throw new Error("날씨 데이터 로드 실패 (" + res.status + ")");

      const data = await res.json();

      /* GitHub Actions에서 오류 발생 시 error 필드가 채워짐 */
      if (data.error) {
        throw new Error(data.error);
      }

      renderWeatherCard(data);
      renderOutfitCard(getOutfitByTemp(data.temp));

      if (elUpdated && data.updated) {
        elUpdated.textContent = "데이터 기준: " + data.updated + " KST";
      }

    } catch (err) {
      renderError("날씨 정보를 불러올 수 없습니다.");
      console.warn("[weather.js]", err.message);
    }
  }

  init();

})();
