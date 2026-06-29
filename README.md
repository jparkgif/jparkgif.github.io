# 나만의 AI 비서 웹앱

> **GitHub Pages 무료 배포 | API 키·Secret 전혀 없음 | 모바일 반응형**
>
> 오늘의 영어 명언 · 날씨·코디 추천 · 경제 뉴스·주식·금시세 · FAQ 챗봇을 한 페이지에서!

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [기능 설명](#2-기능-설명)
3. [폴더 구조](#3-폴더-구조)
4. [로컬에서 바로 열기](#4-로컬에서-바로-열기)
5. [GitHub 저장소 만들기 & 업로드](#5-github-저장소-만들기--업로드)
6. [GitHub Pages 활성화](#6-github-pages-활성화)
7. [GitHub Actions로 데이터 자동 갱신](#7-github-actions로-데이터-자동-갱신)
8. [FAQ 챗봇 업데이트 방법](#8-faq-챗봇-업데이트-방법)
9. [자주 발생하는 문제 해결](#9-자주-발생하는-문제-해결)
10. [파일별 역할 요약](#10-파일별-역할-요약)

---

## 1. 프로젝트 소개

### 이 프로젝트가 특별한 이유

| 항목 | 내용 |
|------|------|
| **비용** | 완전 무료 (GitHub Pages 호스팅) |
| **API 키** | 전혀 없음 — 웹 스크래핑 + yfinance + 정적 JSON 방식 |
| **백엔드** | 없음 — GitHub Actions가 Python으로 데이터 수집 후 JSON으로 저장 |
| **기술 스택** | HTML + CSS + Vanilla JS (빌드 도구 없음) |
| **모바일** | 완전 반응형 (모바일·태블릿·데스크톱) |

### 아키텍처 원리

```
GitHub Actions (매일 06:00 KST)
      │
      ├─ fetch_weather.py  → 네이버 날씨 스크래핑
      └─ fetch_news.py     → 네이버 뉴스 + yfinance 주식/금시세
                                       │
                                       ▼
                              data/*.json 커밋 & 푸시
                                       │
                                       ▼
                            GitHub Pages 자동 재배포
                                       │
                                       ▼
                        브라우저에서 JSON만 fetch해서 렌더링
```

**핵심 포인트:** 프론트엔드(브라우저)는 JSON 파일만 읽습니다. 스크래핑·API 호출은 전부 Actions(서버 측)에서 합니다.

---

## 2. 기능 설명

### ① 영어 명언 (상단 Hero 섹션)

- **60개**의 유명 영어 명언이 `quotes.json`에 저장되어 있습니다.
- **새로고침할 때마다** 또는 `↻` 버튼 클릭 시 랜덤으로 바뀝니다.
- 영어 원문 (크게) → 한글 해석 → 작자 순으로 표시됩니다.

### ② 오늘의 날씨 + 코디 추천

- **날씨 소스:** 네이버 날씨 웹스크래핑 (API 키 없음)
- **갱신 주기:** 매일 06:00 KST (GitHub Actions cron)
- **기온별 코디 매핑:**

| 기온 | 코디 | 무신사 링크 |
|------|------|-------------|
| 28℃ 이상 | 반팔/린넨 | 린넨셔츠 검색 |
| 17~27℃ | 셔츠/가디건 | 가디건 검색 |
| 9~16℃ | 자켓/니트 | 자켓 검색 |
| 8℃ 이하 | 코트/패딩 | 패딩 검색 |

- 무신사, Pinterest 링크는 모두 새 창으로 열립니다.

### ③ 경제 뉴스 + 주식 + 금시세

- **경제 뉴스:** 네이버 경제 섹션 헤드라인 스크래핑 (새 창으로 원문 이동)
- **주식 시세:** yfinance — KOSPI, KOSDAQ, NASDAQ, USD/KRW
- **금시세:** yfinance GC=F (금 선물)
- **갱신 주기:** 매일 06:00 KST

### ④ FAQ 챗봇

- **우하단 플로팅 버튼** 클릭 → 사이드 패널 슬라이드 인
- **키워드 검색 방식** (런타임 AI API 호출 없음, 키 불필요)
  - q·tags에 매칭: 높은 점수 → 명확한 답변 표시
  - 약한 매칭 → "관련 항목" 버튼 제시
- **FAQ 내용:** ChatGPT 사용법 + Claude Code 사용법 (PDF에서 추출한 50개 Q&A)

---

## 3. 폴더 구조

```
my-ai-assistant/
├── index.html              ← 단일 페이지 앱
├── quotes.json             ← 영어 명언 60개 (정적)
│
├── assets/
│   ├── css/
│   │   └── style.css       ← 모바일 반응형 스타일 (CSS 변수 기반)
│   ├── img/
│   │   ├── bg.jpg          ← Hero 배경 이미지
│   │   └── sea.jpg         ← 보조 이미지
│   └── js/
│       ├── quotes.js       ← 명언 랜덤 표시
│       ├── weather.js      ← 날씨 카드 + 코디 추천
│       ├── news.js         ← 뉴스·주식·금시세 카드
│       └── chatbot.js      ← 플로팅 버튼 + 사이드 패널 + FAQ 검색
│
├── data/                   ← GitHub Actions가 매일 갱신하는 JSON
│   ├── weather.json        ← 날씨 데이터
│   ├── news.json           ← 뉴스·주식·금시세 데이터
│   └── faq.json            ← ChatGPT + Claude Code FAQ (50개 Q&A)
│
├── docs/                   ← 원본 가이드 PDF
│   ├── ChatGPT_사용가이드.pdf
│   └── 클로드코드_사용가이드.pdf
│
├── scripts/                ← GitHub Actions가 실행하는 Python
│   ├── fetch_weather.py    ← 네이버 날씨 스크래핑
│   └── fetch_news.py       ← 네이버 뉴스 + yfinance
│
└── .github/workflows/
    ├── update-data.yml     ← 매일 06:00 KST 데이터 갱신
    └── deploy.yml          ← main 브랜치 push → Pages 자동 배포
```

---

## 4. 로컬에서 바로 열기

### 방법 1: VS Code Live Server (가장 쉬움)

1. VS Code에서 `my-ai-assistant` 폴더를 엽니다.
2. `index.html` 파일을 클릭합니다.
3. 우하단 **"Go Live"** 버튼 클릭 → 브라우저 자동 오픈

### 방법 2: Python 내장 서버

```bash
# my-ai-assistant 폴더로 이동
cd my-ai-assistant

# Python 3 서버 실행 (포트 8000)
python -m http.server 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

### 방법 3: Node.js serve

```bash
# 전역 설치 (최초 1회)
npm install -g serve

# 실행
serve my-ai-assistant
```

> **주의:** `index.html`을 더블클릭해서 `file://` 프로토콜로 열면  
> `fetch()` API가 CORS 정책으로 차단되어 JSON을 불러오지 못합니다.  
> 반드시 로컬 서버를 통해 `http://localhost:...` 로 열어야 합니다.

---

## 5. GitHub 저장소 만들기 & 업로드

### 단계별 순서

**Step 1: GitHub 저장소 생성**

1. [github.com](https://github.com) 로그인
2. 우상단 `+` → **New repository** 클릭
3. Repository name: `my-ai-assistant` (원하는 이름으로 변경 가능)
4. Public 선택 (Pages 무료 배포는 Public이어야 함)
5. **Create repository** 클릭

**Step 2: 로컬 저장소 초기화 & 업로드**

```bash
# my-ai-assistant 폴더로 이동
cd my-ai-assistant

# Git 초기화
git init

# 모든 파일 스테이징
git add .

# 첫 커밋
git commit -m "feat: 나만의 AI 비서 초기 구성"

# 원격 저장소 연결 (YOUR_GITHUB_USERNAME을 자신의 아이디로 교체)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/my-ai-assistant.git

# main 브랜치로 push
git branch -M main
git push -u origin main
```

---

## 6. GitHub Pages 활성화

1. 저장소 페이지에서 **Settings** 탭 클릭
2. 왼쪽 메뉴 → **Pages** 클릭
3. **Source** 섹션 → **GitHub Actions** 선택
4. 저장하면 `deploy.yml` 워크플로우가 자동 실행됩니다.
5. 잠시 후 `https://YOUR_GITHUB_USERNAME.github.io/my-ai-assistant` 로 접속 가능

> **배포 상태 확인:** 저장소 → **Actions** 탭 → 최근 워크플로우가 초록색 체크(✓)이면 성공

---

## 7. GitHub Actions로 데이터 자동 갱신

### 자동 실행 (cron)

`update-data.yml`이 **매일 21:00 UTC (= 다음날 06:00 KST)** 에 자동 실행됩니다.

```
실행 흐름:
  cron 트리거
     │
     ├── fetch_weather.py 실행 → data/weather.json 갱신
     └── fetch_news.py 실행   → data/news.json 갱신
                                        │
                              변경사항 git commit & push
                                        │
                              deploy.yml 자동 트리거
                                        │
                              GitHub Pages 재배포 완료
```

### 수동 실행 (첫 데이터 채우기)

배포 직후 `data/*.json`에는 샘플 데이터가 들어 있습니다.  
실제 스크래핑 데이터로 채우려면:

1. 저장소 → **Actions** 탭
2. 왼쪽 **"데이터 갱신 (날씨·뉴스·주식·금시세)"** 클릭
3. **Run workflow** 버튼 → **Run workflow** 클릭
4. 1~2분 후 완료 → 데이터가 갱신됨

### Secret 설정 여부

**없음.** 이 프로젝트는 모든 데이터를 무인증 방식으로 수집합니다.  
GitHub Settings → Secrets에 아무것도 추가할 필요 없습니다.

---

## 8. FAQ 챗봇 업데이트 방법

챗봇은 `data/faq.json`을 검색합니다. 내용을 바꾸려면:

### FAQ 항목 추가/수정

`data/faq.json`을 열어 아래 형식으로 항목을 추가합니다:

```json
{
  "q": "질문 내용을 자연스럽게 적으세요",
  "a": "답변 내용. 여러 줄은 \\n으로 구분합니다.\n줄바꿈 예시입니다.",
  "tags": ["키워드1", "키워드2", "검색될단어"]
}
```

**좋은 태그 작성 팁:**
- 사용자가 검색할 법한 단어를 넣습니다.
- 동의어도 태그에 포함합니다. (예: "클로드코드", "Claude Code", "Claude")
- 짧고 핵심적인 단어 위주로 씁니다.

### PDF가 바뀌었을 때

새 PDF를 `docs/` 폴더에 넣고, `data/faq.json`을 직접 수정하거나  
Claude Code / ChatGPT에 PDF 내용을 붙여넣고 FAQ를 생성해 달라고 요청하세요.

```
프롬프트 예시:
"아래 내용을 바탕으로 FAQ를 만들어줘.
형식: [{ "q": "...", "a": "...", "tags": ["...", "..."] }]
질문 20개 이상, 초보자도 이해할 수 있게 답변해줘."
```

---

## 9. 자주 발생하는 문제 해결

### 날씨/뉴스가 "불러오는 중"에서 멈춤

**원인:** `data/weather.json` 또는 `data/news.json` 파일이 없거나 형식이 잘못됨  
**해결:**
1. Actions 탭에서 "데이터 갱신" 워크플로우 수동 실행
2. 또는 GitHub에서 직접 `data/weather.json` 파일을 확인

### 스크래핑이 실패해서 Actions가 빨간색(✗)

**원인:** 네이버 페이지 구조 변경으로 CSS 셀렉터가 깨짐  
**해결:**
1. `scripts/fetch_weather.py` 또는 `fetch_news.py` 열기
2. Chrome에서 네이버 날씨/뉴스 페이지 → F12 → 해당 요소 셀렉터 확인
3. 스크립트의 셀렉터 업데이트 후 다시 push

> `continue-on-error: true` 설정으로 스크래핑이 실패해도 기존 데이터가 유지됩니다.

### 챗봇이 "FAQ 데이터를 로드하지 못했다"고 함

**원인:** `data/faq.json` 파일 없음 또는 JSON 형식 오류  
**해결:**
1. `data/faq.json`이 있는지 확인
2. JSON 형식 검증: [jsonlint.com](https://jsonlint.com) 에 붙여넣어 확인

### 로컬에서 열었을 때 JSON 로드 안 됨

**원인:** `file://` 프로토콜은 `fetch()` 사용 불가  
**해결:** 위의 [4. 로컬에서 바로 열기](#4-로컬에서-바로-열기) 섹션 참조

### GitHub Pages URL 접속 시 404 오류

**원인:** Pages가 아직 활성화 안 됨 또는 배포 진행 중  
**해결:**
1. Settings → Pages에서 Source가 "GitHub Actions"인지 확인
2. Actions 탭에서 deploy 워크플로우가 완료됐는지 확인 (3~5분 소요)

---

## 10. 파일별 역할 요약

| 파일 | 역할 | 수정 빈도 |
|------|------|-----------|
| `index.html` | 전체 페이지 구조 | 거의 없음 |
| `assets/css/style.css` | 모든 스타일 (반응형 포함) | 디자인 변경 시 |
| `assets/js/quotes.js` | 명언 랜덤 표시 로직 | 거의 없음 |
| `assets/js/weather.js` | 날씨 카드 + 코디 추천 렌더링 | 거의 없음 |
| `assets/js/news.js` | 뉴스·주식·금시세 카드 렌더링 | 거의 없음 |
| `assets/js/chatbot.js` | 챗봇 UI + FAQ 키워드 검색 | 거의 없음 |
| `quotes.json` | 영어 명언 60개 | 내용 추가 시 |
| `data/weather.json` | 날씨 데이터 (Actions가 갱신) | 자동 갱신 |
| `data/news.json` | 뉴스·시세 데이터 (Actions가 갱신) | 자동 갱신 |
| `data/faq.json` | 챗봇 Q&A 50개 | 가이드 변경 시 |
| `scripts/fetch_weather.py` | 날씨 스크래핑 Python | 셀렉터 깨질 때 |
| `scripts/fetch_news.py` | 뉴스·주식·금시세 Python | 셀렉터 깨질 때 |
| `.github/workflows/update-data.yml` | 데이터 갱신 자동화 | 거의 없음 |
| `.github/workflows/deploy.yml` | Pages 자동 배포 | 거의 없음 |

---

## 기술 스택 & 라이선스

- **Frontend:** HTML5 · CSS3 (Custom Properties, Grid, clamp()) · Vanilla JavaScript (ES6+)
- **Data:** Python 3 · requests · beautifulsoup4 · yfinance
- **Hosting:** GitHub Pages (무료)
- **CI/CD:** GitHub Actions
- **외부 서비스:** 무신사 검색 링크 · Pinterest 검색 링크 (공개 URL)

이 프로젝트는 **교육용** 자료입니다.  
날씨·뉴스 데이터는 공개 웹페이지 스크래핑이며, 개인·소량 사용 목적입니다.
