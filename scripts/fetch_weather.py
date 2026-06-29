"""
fetch_weather.py — 네이버 날씨 스크래핑 → data/weather.json 저장

실행 환경: GitHub Actions (매일 06:00 KST = 21:00 UTC 전날)
의존성:    requests, beautifulsoup4  (pip install requests beautifulsoup4)
키 없음:  API 키·Secret 불필요

주의사항:
  - 네이버 페이지 구조가 변경되면 CSS 셀렉터가 깨질 수 있습니다.
  - 파싱 실패 시 기존 weather.json을 유지하고 error 필드에 사유를 기록합니다.
  - 개인용·소량 요청으로 사용하며, 네이버 이용약관을 준수합니다.
"""

import json
import os
import re
from datetime import datetime, timezone, timedelta

import requests
from bs4 import BeautifulSoup

# ── 상수 설정 ──────────────────────────────────────────────────────────────

CITY      = "서울"
NAVER_URL = f"https://search.naver.com/search.naver?query={CITY}날씨"
OUTPUT    = os.path.join(os.path.dirname(__file__), "..", "data", "weather.json")

# 요청 헤더 (차단 방지를 위한 User-Agent)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
}

# KST = UTC+9
KST = timezone(timedelta(hours=9))


def load_existing() -> dict:
    """기존 weather.json을 읽어 반환 (파일 없으면 빈 딕셔너리)"""
    if os.path.exists(OUTPUT):
        try:
            with open(OUTPUT, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {}


def save_json(data: dict) -> None:
    """data/weather.json 저장 (디렉토리 자동 생성)"""
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def parse_temp(text: str) -> float | None:
    """문자열에서 숫자만 추출 (예: '24°' → 24.0)"""
    m = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(m.group()) if m else None


def scrape() -> dict:
    """
    네이버 날씨 페이지를 스크래핑해 날씨 데이터 딕셔너리 반환.

    네이버 HTML 구조 (2025~2026 기준):
      현재 기온: .temperature_text 또는 .ct
      날씨 상태: .weather_summary 또는 .wt-cnt
      최고기온:  .temperature_high
      최저기온:  .temperature_low
      습도:      .humidity

    ⚠️ 네이버가 구조를 변경하면 아래 셀렉터를 업데이트해야 합니다.
    """
    res = requests.get(NAVER_URL, headers=HEADERS, timeout=10)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    data = {}

    # ── 현재 기온 ──────────────────────────────────────────────
    # 셀렉터 후보를 순서대로 시도 (네이버 구조 변경 대응)
    temp_el = (
        soup.select_one(".temperature_text strong")
        or soup.select_one(".ct")
        or soup.select_one(".current")
    )
    if temp_el:
        data["temp"] = parse_temp(temp_el.get_text())

    # ── 날씨 상태 ──────────────────────────────────────────────
    cond_el = (
        soup.select_one(".weather_summary")
        or soup.select_one(".wt-cnt")
        or soup.select_one(".desc")
    )
    if cond_el:
        data["condition"] = cond_el.get_text(strip=True)

    # ── 최고 / 최저 기온 ─────────────────────────────────────
    high_el = soup.select_one(".temperature_high") or soup.select_one(".highest")
    low_el  = soup.select_one(".temperature_low")  or soup.select_one(".lowest")
    if high_el:
        data["high"] = parse_temp(high_el.get_text())
    if low_el:
        data["low"] = parse_temp(low_el.get_text())

    # ── 습도 ─────────────────────────────────────────────────
    humid_el = soup.select_one(".humidity") or soup.select_one(".hm")
    if humid_el:
        m = re.search(r"\d+", humid_el.get_text())
        if m:
            data["humidity"] = int(m.group())

    # ── 바람 ─────────────────────────────────────────────────
    wind_el = soup.select_one(".wind") or soup.select_one(".wn")
    if wind_el:
        data["wind"] = wind_el.get_text(strip=True)

    # 필수 필드 검증
    if "temp" not in data or data["temp"] is None:
        raise ValueError("기온 파싱 실패 — 셀렉터 점검 필요")

    return data


def main():
    now_kst = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
    existing = load_existing()

    try:
        data = scrape()
        data["city"]    = CITY
        data["updated"] = now_kst
        data["error"]   = None
        save_json(data)
        print(f"[fetch_weather] 완료: {CITY} {data['temp']}℃ ({now_kst})")

    except Exception as e:
        # 스크래핑 실패 시 기존 데이터를 유지하고 error 필드만 업데이트
        existing["error"]   = str(e)
        existing["updated"] = now_kst
        save_json(existing)
        print(f"[fetch_weather] 오류: {e} — 기존 데이터 유지")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
