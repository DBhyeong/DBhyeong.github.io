---
title: "파이썬으로 네이버·카카오·구글·빙·줌 연관검색어 한 번에 긁기 — related_kws 만든 이야기"
date: 2026-06-21
tags:
  - seo
  - marketing
  - python
---

마케팅 키워드 리서치를 해 본 사람이라면 안다. "이 키워드 하나 잡으면 얼마나 더 파생되지?"를 알아내려고 검색창에 단어를 치고, 자동완성을 노려보고, 페이지 맨 아래 연관검색어를 손으로 복사하는 그 반복 노동. 엔진 하나당 5분이라 쳐도 네이버·구글·다음·빙·줌·유튜브를 다 돌면 한 키워드에 30분이 날아간다. 시드 키워드가 50개면? 그날 하루는 끝이다.

유료 키워드 툴도 써봤다. 좋긴 한데 (1) 월 구독료가 아깝고 (2) 국내 엔진(특히 네이버·다음·줌) 연관어 커버리지가 약하고 (3) 내가 원하는 형태로 가공이 안 된다. 결국 "그냥 내가 긁자" 싶어서 만든 게 **related_kws**다. 12년차 데이터 분석가로서 게임·이커머스 도메인을 거치며 늘 하던 일 — 데이터는 직접 수집해서 직접 가공한다 — 의 연장선이었다.

이 글은 그 과정을 정리한 것이다. 레포는 여기 있다. 👉 https://github.com/DBhyeong/related_kws

## 핵심 통찰: 연관검색어 API는 거의 다 "GET 한 방"이다

직접 까보면 알겠지만, 대부분의 포털 자동완성·연관검색어는 검색창에 글자를 칠 때마다 호출되는 **가벼운 JSON(혹은 JSONP) 엔드포인트**다. 즉 브라우저를 띄울 필요 없이 `requests.get()` 한 줄이면 끝나는 경우가 많다. 엔진별로 URL 패턴만 일반화하면 된다.

개념적으로 정리하면 이렇다(실제 파라미터는 엔진마다 다르고 수시로 바뀐다 — 레포의 최신 코드를 보자).

- **자동완성형(suggest)**: `https://<suggest-host>/...?q=<키워드>` → 입력어로 시작하는 추천어 리스트
- **연관검색어형(related)**: 검색 결과 페이지(HTML) 하단의 "함께 많이 찾는" 블록을 파싱
- **JSONP 응답**: `callback(...)` 으로 감싸 오는 경우 → 콜백 래퍼를 벗겨내고 `json.loads`

핵심은 두 가지다. **(a) suggest는 JSON이라 빠르고 안정적, (b) related는 HTML이라 셀렉터가 잘 깨진다.** 그래서 나는 가능한 한 suggest 계열을 우선 쓰고, HTML 파싱은 fallback으로 둔다.

## 한 엔진 수집 함수 (더미)

먼저 엔진 하나를 긁는 함수의 뼈대다. 실제 호스트/파라미터는 더미(`example`)로 대체했다 — 구조만 보면 된다.

```python
import json
import requests

HEADERS = {
    # 자동완성 엔드포인트는 보통 브라우저처럼 보이는 UA를 요구한다
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Referer": "https://www.example.com/",
}

def fetch_suggest(keyword: str, timeout: float = 3.0) -> list[str]:
    """단일 엔진의 자동완성 추천어를 가져온다 (더미 엔드포인트)."""
    url = "https://suggest.example.com/api/sugg"
    params = {"q": keyword, "st": 100, "frm": "nv"}  # 파라미터는 엔진마다 다름
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"[warn] {keyword!r} 요청 실패: {e}")
        return []

    text = r.text.strip()
    # JSONP 래퍼(callback(...))가 있으면 벗겨낸다
    if text.startswith("(") or "callback(" in text[:20]:
        text = text[text.find("(") + 1 : text.rfind(")")]

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    # 응답 구조는 엔진마다 다르다. 보통 중첩 리스트 안에 추천어가 들어있다.
    suggestions = []
    for group in data.get("items", []):
        for row in group:
            if isinstance(row, list) and row:
                suggestions.append(row[0])
            elif isinstance(row, str):
                suggestions.append(row)
    return suggestions
```

포인트는 세 가지다. **타임아웃을 짧게**(자동완성은 원래 빠르다, 안 오면 버린다), **예외를 삼켜서 한 엔진이 죽어도 전체가 멈추지 않게**, 그리고 **JSONP 래퍼 방어**. 국내 엔진은 의외로 `callback(...)` 형태가 많다.

## 정규화 + 중복 제거 + 저장

엔진마다 표기가 제각각이라(공백·대소문자·전각공백) 그냥 합치면 중복이 폭발한다. 그래서 정규화 후 **순서 보존 dedup**을 한다.

```python
import csv
import re

def normalize(kw: str) -> str:
    kw = kw.strip().lower()
    kw = kw.replace("\u3000", " ")        # 전각 공백 → 일반 공백
    kw = re.sub(r"\s+", " ", kw)          # 연속 공백 1개로
    return kw

def dedup_keep_order(keywords: list[str]) -> list[str]:
    seen, out = set(), []
    for kw in keywords:
        n = normalize(kw)
        if n and n not in seen:
            seen.add(n)
            out.append(kw)                # 원본 표기는 살리되 판정은 정규화로
    return out

def save_csv(rows: list[dict], path: str = "related_kws.csv") -> None:
    with open(path, "w", newline="", encoding="utf-8-sig") as f:  # 엑셀 한글 대비 BOM
        w = csv.DictWriter(f, fieldnames=["seed", "engine", "keyword"])
        w.writeheader()
        w.writerows(rows)
```

`utf-8-sig`는 사소해 보이지만 중요하다. 결과 CSV를 마케터(나 포함)가 엑셀로 바로 여는데, BOM이 없으면 한글이 깨진다. 데이터를 "쓰는 사람" 입장에서 만들면 이런 디테일이 쌓인다.

## 멀티엔진 통합 + 비동기 팁

엔진을 하나씩 순차로 돌면 네트워크 대기 시간이 그대로 누적된다. 엔진 6개 × 키워드 50개면 순차로는 한참이다. 수집은 전형적인 **I/O 바운드**라, 동시성을 주면 거의 공짜로 빨라진다. 나는 처음엔 `ThreadPoolExecutor`로 시작했다(코드가 제일 단순하다).

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

ENGINES = {
    "naver":  fetch_suggest,   # 실제론 엔진별 전용 함수
    "daum":   fetch_suggest,
    "google": fetch_suggest,
    "bing":   fetch_suggest,
    "zoom":   fetch_suggest,
}

def collect(seed_keywords: list[str], max_workers: int = 8) -> list[dict]:
    rows = []
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = {
            ex.submit(fn, seed): (seed, name)
            for seed in seed_keywords
            for name, fn in ENGINES.items()
        }
        for fut in as_completed(futures):
            seed, name = futures[fut]
            for kw in dedup_keep_order(fut.result()):
                rows.append({"seed": seed, "engine": name, "keyword": kw})
    return rows
```

규모가 더 커지면 `asyncio` + `aiohttp`로 넘어가면 된다. 다만 현실적인 조언 하나: **동시성은 8~16 정도에서 멈춰라.** 그 이상 올리면 빨라지는 게 아니라 차단당한다(뒤에서 설명). 비동기로 바꿀 때는 엔진별로 `asyncio.Semaphore`를 둬서 "엔진당 동시 요청 수"를 따로 제한하는 게 안전하다.

## 실전 적용: 테라상사 마케팅에서 어떻게 썼나

이 도구가 장난감이 아니라 실무 무기가 된 건 휴대폰 액세서리 브랜드 **테라상사** 마케팅을 맡으면서다. 키워드 리서치를 6단계 데이터 마케팅 FLOW의 1번으로 두고, related_kws의 결과물을 이후 모든 단계의 연료로 썼다.

흐름은 이랬다.

1. **시드 → 확장**: "투명 케이스", "그립톡" 같은 시드 몇 개를 넣고 멀티엔진으로 수천 개 연관어를 뽑는다. 여기에 네이버 검색광고 API로 검색량·경쟁도를 붙이면, "수요는 있는데 경쟁이 빈" 롱테일 키워드가 드러난다.
2. **SEO**: 그 키워드를 상세페이지 제목·태그·본문에 반영. 결과적으로 **네이버 쇼핑 검색 1·3위, 통합검색 상위(통합 4위 / 모바일 2위)** 노출까지 끌어올렸다.
3. **SNS**: 추출한 연관어를 300여 개 채널 반자동 포스팅의 해시태그·캡션 소스로 사용(6개월 누적 약 15만 view).
4. **광고**: 롱테일 키워드를 인스타 광고 타겟·소재 카피에 반영 → **CPC 160원→90원(약 44%↓), ROAS 110%→167%, CTR 6~7%**.

키워드 리서치 자동화 하나가 출발점이었지만, 그 위에 SEO·SNS·광고가 쌓이면서 운영 기간 동안 **전체 유입 약 55%↑, 매출 약 30%↑**에 기여했다. (수치는 특정 시점 운영 성과이고, related_kws 단독 효과가 아니라 FLOW 전체의 합이라는 점은 정직하게 밝혀둔다.) 핵심 교훈은 분명했다 — 손으로 30분 걸리던 일을 30초로 줄이면, 남는 시간은 "키워드를 모으는 일"이 아니라 "키워드로 무엇을 할까"에 쓰게 된다.

## ⚠️ 윤리 · 약관 · 레이트리밋

도구가 강력할수록 절제가 필요하다. 내가 지키는 선은 이렇다.

- **공개된 자동완성/연관검색어만** 대상으로 한다. 로그인이 필요한 영역, 개인정보가 담긴 영역은 건드리지 않는다.
- 각 서비스의 **이용약관·robots.txt를 확인**하고, 상업적 대량 수집은 가능하면 공식 API(네이버 검색광고 API 등)로 대체한다. 실제로 검색량·경쟁도 같은 "판단에 쓰는 숫자"는 전부 공식 API에서 가져왔다.
- **레이트리밋 매너**: 요청 간 지연(`time.sleep` 또는 비동기 지터), 동시성 상한, 짧은 타임아웃. 한 엔진을 두들겨 패지 않는다. 차단은 상대 서버에 민폐이고, 내 IP에도 손해다.
- **개인정보·제3자 데이터는 수집하지 않는다.** 이 도구는 "검색어"를 모으는 것이지 "사람"을 모으는 게 아니다.

기술적으로 가능한 것과 해도 되는 것은 다르다. 자동화는 남의 서비스 위에서 돌아간다는 걸 잊지 않으려 한다.

## 마무리

related_kws는 거창한 프로젝트가 아니다. "검색창에 단어 치고 연관어 복사하는 30분짜리 노동을 30초로 줄이자"는 단순한 동기에서 시작했다. 하지만 그 30초가 테라상사 마케팅 FLOW 전체의 출발점이 됐다. AI 시대일수록 이런 생각이 든다 — 모델이 아무리 좋아져도, **내 도메인의 데이터를 내 손으로 수집·가공할 줄 아는 능력**은 여전히 무기다.

코드는 레포에 다 있다. 엔진별 실제 엔드포인트와 파서, asyncio 버전까지 포함되어 있다.

👉 **https://github.com/DBhyeong/related_kws**

(사용법을 보여주는 데모 영상도 준비 중이다. 공개되면 이 글에 임베드해 두겠다.)
