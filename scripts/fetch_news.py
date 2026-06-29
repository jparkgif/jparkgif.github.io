"""
fetch_news.py — 경제 뉴스 + 주식 + 금시세 수집 → data/news.json 저장

실행 환경: GitHub Actions (매일 06:00 KST = 21:00 UTC 전날)
의존성:    requests, beautifulsoup4, yfinance
           pip install requests beautifulsoup4 yfinance
키 없음:  API 키·Secret 불필요

수집 항목:
  1. 네이버 경제 뉴스 헤드라인 + 링크 (소량·정중한 간격)
  2. 주식 지수: KOSPI, KOSDAQ, NASDAQ, USD/KRW (yfinance)
  3. 국제 금시세 (yfinance XAU=F 또는 네이버 금융 스크래핑)

네이버 스크래핑 주의사항:
  - robots.txt 및 이용약관 준수, 개인·소량 사용
  - 구조 변경 시 셀렉터 업데이트 필요
  - 실패 시 기존 news.json 유지
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta

import requests
import yfinance as yf
from bs4 import BeautifulSoup

# ── 상수 설정 ──────────────────────────────────────────────────────────────

OUTPUT   = os.path.join(os.path.dirname(__file__), "..", "data", "news.json")
KST      = timezone(timedelta(hours=9))
MAX_NEWS = 10  # 수집할 뉴스 최대 개수

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

# yfinance 티커 심볼
STOCK_TICKERS = {
    "kospi":  "^KS11",
    "kosdaq": "^KQ11",
    "nasdaq": "^IXIC",
    "usdkrw": "USDKRW=X",
}


def load_existing() -> dict:
    """기존 news.json 읽기 (없으면 빈 딕셔너리)"""
    if os.path.exists(OUTPUT):
        try:
            with open(OUTPUT, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {}


def save_json(data: dict) -> None:
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── 1. 네이버 경제 뉴스 스크래핑 ──────────────────────────────────────────

def fetch_naver_news() -> list[dict]:
    """
    네이버 경제 뉴스 섹션에서 헤드라인과 개별 기사 URL 수집.

    URL: https://news.naver.com/section/101 (경제)

    셀렉터 우선순위 (네이버 구조 변경 대응을 위해 여러 후보 시도):
      1. .sa_text_title a    — 섹션 메인 기사 제목 링크
      2. a[href*='/article/'] — article 경로 포함 링크 (범용)
      3. a[href*='mnews']     — 모바일 뉴스 링크

    ⚠️ 개별 기사 href는 반드시 'http'로 시작하는 절대 URL을 사용합니다.
    상대 경로(/mnews/...)는 'https://n.news.naver.com' 을 붙여 완성합니다.
    """
    BASE   = "https://n.news.naver.com"
    url    = "https://news.naver.com/section/101"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        news_items = []
        seen_urls  = set()  # 중복 URL 방지

        def add_item(a_tag):
            """<a> 태그에서 제목·URL 추출 후 목록에 추가"""
            title = a_tag.get_text(strip=True)
            href  = a_tag.get("href", "").strip()

            # 상대 경로 → 절대 URL 변환
            if href.startswith("/"):
                href = BASE + href

            if not href.startswith("http"):
                return
            if len(title) < 5:          # 너무 짧은 텍스트 제외
                return
            if href in seen_urls:       # 중복 제외
                return

            seen_urls.add(href)
            news_items.append({"title": title, "url": href})

        # ── 후보 1: .sa_text_title a (네이버 섹션 메인 헤드라인) ──
        for a in soup.select(".sa_text_title a"):
            add_item(a)
            if len(news_items) >= MAX_NEWS:
                break

        # ── 후보 2: /article/ 경로가 포함된 링크 ──
        if not news_items:
            for a in soup.select("a[href*='/article/']"):
                add_item(a)
                if len(news_items) >= MAX_NEWS:
                    break

        # ── 후보 3: mnews 경로가 포함된 링크 (모바일 버전) ──
        if not news_items:
            for a in soup.select("a[href*='mnews']"):
                add_item(a)
                if len(news_items) >= MAX_NEWS:
                    break

        # 셀렉터가 하나도 안 맞으면 섹션 페이지 링크를 기본값으로 사용
        if not news_items:
            print("[fetch_news] 셀렉터 불일치 — 섹션 링크를 기본값으로 사용")
            news_items = [{"title": "네이버 경제 뉴스 보러가기", "url": url}]

        print(f"[fetch_news] 뉴스 수집: {len(news_items)}건")
        time.sleep(1)  # 정중한 요청 간격
        return news_items

    except Exception as e:
        print(f"[fetch_news] 뉴스 스크래핑 실패: {e}")
        # 실패 시에도 섹션 링크는 살아있으므로 기본값 반환
        return [{"title": "네이버 경제 뉴스 보러가기", "url": "https://news.naver.com/section/101"}]


# ── 2. 주식 시세 (yfinance) ──────────────────────────────────────────────

def fetch_stocks() -> dict:
    """
    yfinance를 사용해 KOSPI·KOSDAQ·NASDAQ·USD/KRW 시세 수집.
    반환 형식: { "kospi": {"value": 2750.5, "change": 12.3, "change_pct": 0.45}, ... }
    """
    result = {}
    for key, ticker in STOCK_TICKERS.items():
        try:
            t     = yf.Ticker(ticker)
            hist  = t.history(period="2d")  # 최근 2일치 (어제·오늘 비교용)

            if hist.empty:
                raise ValueError("빈 데이터")

            close_today = float(hist["Close"].iloc[-1])
            close_prev  = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else close_today

            change     = round(close_today - close_prev, 2)
            change_pct = round((change / close_prev) * 100, 2) if close_prev else 0.0

            result[key] = {
                "value":      round(close_today, 2),
                "change":     change,
                "change_pct": change_pct,
            }
            print(f"[fetch_news] {key}: {close_today}")

        except Exception as e:
            print(f"[fetch_news] {key} 수집 실패: {e}")

    return result


# ── 3. 국제 금시세 ───────────────────────────────────────────────────────

def fetch_gold(usdkrw_rate: float = 1350.0) -> dict | None:
    """
    yfinance GC=F (금 선물) 또는 GLD (ETF)로 금시세 수집.
    가격 단위: USD/troy oz → 환율 적용해 KRW도 계산.
    """
    try:
        # GC=F: 금 선물 (가장 직접적)
        gold_ticker = yf.Ticker("GC=F")
        hist = gold_ticker.history(period="2d")

        if hist.empty:
            raise ValueError("금시세 데이터 없음")

        price_usd  = float(hist["Close"].iloc[-1])
        price_prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price_usd

        change     = round(price_usd - price_prev, 2)
        change_pct = round((change / price_prev) * 100, 2) if price_prev else 0.0
        price_krw  = int(price_usd * usdkrw_rate)

        print(f"[fetch_news] 금시세: ${price_usd:.2f}")
        return {
            "price_usd":  round(price_usd, 2),
            "price_krw":  price_krw,
            "change":     change,
            "change_pct": change_pct,
        }

    except Exception as e:
        print(f"[fetch_news] 금시세 수집 실패: {e}")
        return None


# ── 메인 ─────────────────────────────────────────────────────────────────

def main():
    now_kst  = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    existing = load_existing()

    errors = []

    # 뉴스 수집
    news = fetch_naver_news()
    if not news:
        errors.append("뉴스 스크래핑 실패")

    # 주식 수집
    stocks = fetch_stocks()
    if not stocks:
        errors.append("주식 시세 수집 실패")

    # 금시세 수집 (USD/KRW 환율이 있으면 더 정확한 KRW 계산 가능)
    usdkrw_rate = stocks.get("usdkrw", {}).get("value", 1350.0)
    gold = fetch_gold(usdkrw_rate)

    data = {
        "news":    news    or existing.get("news",    []),
        "stocks":  stocks  or existing.get("stocks",  {}),
        "gold":    gold    or existing.get("gold",    None),
        "updated": now_kst,
        "error":   "; ".join(errors) if errors else None,
    }

    save_json(data)

    if errors:
        print(f"[fetch_news] 일부 오류 있음: {'; '.join(errors)}")
    else:
        print(f"[fetch_news] 완료 ({now_kst})")


if __name__ == "__main__":
    main()
