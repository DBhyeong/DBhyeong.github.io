---
title: "판매글 URL부터 모으고 상세는 나중에 — 2단계 크롤링이 안정적인 이유"
date: 2026-07-13
tags:
  - crawling
  - python
  - automation
description: "목록 페이지에서 판매글 URL만 먼저 수집해 큐에 쌓고, 상세 파싱은 별도 단계로 분리하는 2단계 크롤링 패턴을 정리했다. 재시도·증분 수집·장애 복구가 왜 쉬워지는지 도식과 더미 코드로 풀어본다."
---

한동안 중고 판매글을 긁는 스크립트를 목록→상세를 한 번에 처리하는 방식으로 짰다가 크게 데였다. 상세 페이지 하나가 타임아웃 나면 그 목록 페이지 전체가 도로 아미타불이 되고, 어디까지 긁었는지도 몰라서 매번 처음부터 다시 돌렸다. 그래서 아예 **단계를 둘로 쪼갰다(2-stage)**. URL만 먼저 다 모으고, 상세는 나중에 따로. 이 글은 그 이유를 내 방식대로 정리한 기록이다.

## 왜 목록과 상세를 한 번에 긁으면 안 되나?

한 루프 안에서 목록을 열고 그 자리에서 상세까지 파싱하면, 두 개의 성격이 전혀 다른 작업이 한 운명으로 묶인다. 목록은 **가볍고 빠른** 요청이고, 상세는 **무겁고 잘 깨지는** 요청이다. 이 둘을 붙여놓으면 약한 쪽 사고가 강한 쪽까지 끌고 넘어진다.

```mermaid
flowchart TD
  subgraph BAD["결합형: 목록·상세 한 루프"]
    L1["① 목록 열기"] --> D1["② 상세 파싱"]
    D1 -->|타임아웃| X1["③ 루프 전체 중단"]
    X1 --> R1["④ 처음부터 재실행"]
  end
  subgraph GOOD["2단계: 수집·파싱 분리"]
    L2["① 목록에서 URL만 수집"] --> Q["② 큐에 적재(pending)"]
    Q --> D2["③ 상세는 별도 워커가 소비"]
    D2 -->|실패| RE["④ 해당 URL만 재시도"]
  end
  classDef bad fill:#fff0f0,stroke:#e03131,color:#a01a1a;
  classDef good fill:#e7f5ff,stroke:#1c7ed6,color:#10548f;
  class L1,D1,X1,R1 bad;
  class L2,Q,D2,RE good;
```

핵심은 **실패의 격리(isolation)**다. 결합형은 실패 단위가 "전체 실행"이지만, 분리형은 실패 단위가 "URL 하나"다. 이 차이가 나머지 모든 장점을 만든다.

## 큐에는 어떤 상태를 들고 있어야 하나?

URL을 모아 큐에 넣을 때, 그냥 주소만 넣으면 반쪽짜리다. 각 URL이 지금 어느 단계인지 **상태(status)**를 함께 들고 있어야 재시도와 증분 수집이 자동으로 굴러간다. 나는 보통 아래 정도면 충분했다.

| 컬럼 | 뜻 | 쓰임새 |
|------|------|--------|
| `url` | 판매글 상세 주소 | 유일 키(중복 방지) |
| `status` | pending / done / failed | 다음에 뭘 처리할지 판단 |
| `retries` | 재시도 횟수 | 임계치 넘으면 포기 |
| `first_seen` | 처음 목록에서 본 시각 | 증분 수집 기준 |
| `updated_at` | 마지막 처리 시각 | 오래된 것 우선 |

이 표 하나가 사실상 작은 작업 대기열(job queue)이다. SQLite 파일 하나로도 충분하고, 상태 전이는 `pending → done` 또는 `pending → failed → (재시도) → pending`으로 단순하게 유지하는 게 좋다.

## 1단계: URL만 모을 때 코드는 어떻게 생겼나?

목록 단계는 최대한 가볍게, "주소 긁어서 큐에 넣기"만 한다. 상세는 절대 건드리지 않는다. 아래는 합성 예시다.

```python
import sqlite3, time

def enqueue_urls(conn, urls):
    now = time.time()
    for u in urls:
        # 이미 있으면 무시(중복/증분 처리의 핵심)
        conn.execute(
            "INSERT OR IGNORE INTO queue(url, status, retries, first_seen, updated_at) "
            "VALUES (?, 'pending', 0, ?, ?)", (u, now, now))
    conn.commit()

# 목록 페이지를 넘기며 URL만 추출(더미)
for page in range(1, 6):
    urls = parse_list_page(fetch(f"https://example.test/list?p={page}"))
    enqueue_urls(conn, urls)
```

`INSERT OR IGNORE`가 조용한 주역이다. `url`을 유일 키로 걸어두면, 어제 본 글은 자동으로 건너뛰고 **새 글만 pending으로 쌓인다**. 증분 수집이 별도 로직 없이 공짜로 따라온다.

## 2단계: 상세 파싱은 어떻게 소비하나?

상세 워커는 큐에서 `pending`을 하나씩 꺼내 파싱하고, 결과에 따라 상태만 바꾼다. 실패해도 다른 URL엔 영향이 없다.

```python
def process_pending(conn, max_retries=3):
    rows = conn.execute(
        "SELECT url FROM queue WHERE status='pending' "
        "ORDER BY updated_at LIMIT 50").fetchall()
    for (url,) in rows:
        try:
            data = parse_detail(fetch(url))     # 무거운 요청
            save_detail(conn, url, data)
            conn.execute("UPDATE queue SET status='done', updated_at=? WHERE url=?",
                         (time.time(), url))
        except Exception:
            conn.execute(
                "UPDATE queue SET retries=retries+1, "
                "status=CASE WHEN retries+1>=? THEN 'failed' ELSE 'pending' END, "
                "updated_at=? WHERE url=?", (max_retries, time.time(), url))
        conn.commit()
```

여기서 얻는 실무 이점을 정리하면 이렇다.

```mermaid
flowchart LR
  subgraph P["2단계 분리가 주는 것"]
    A["① 재시도<br/>실패 URL만 다시"] 
    B["② 증분 수집<br/>새 URL만 pending"]
    C["③ 장애 복구<br/>중단돼도 큐가 진척 기억"]
    D["④ 속도 분리<br/>목록·상세 각자 튜닝"]
  end
  classDef p fill:#ebfbee,stroke:#2f9e44,color:#1a6b30;
  class A,B,C,D p;
```

- **재시도**: 프로세스가 죽어도 `pending`으로 남은 것부터 다시 시작. 성공한 상세를 두 번 긁지 않는다.
- **장애 복구**: 큐 자체가 체크포인트다. 어디까지 했는지 파일이 기억하니 "처음부터"가 사라진다.
- **속도 튜닝 분리**: 목록은 빠르게 넘기고, 상세는 차단을 피해 천천히 —단계별로 딜레이를 따로 준다.

## 트러블슈팅: 실제로 뭘 조심했나?

내가 굴리며 데인 지점 몇 가지. 첫째, `failed`를 영원히 방치하면 큐가 시체로 쌓인다. `retries`가 임계치를 넘은 건 주기적으로 리포트하거나 사유별로 갈라 봤다(410 삭제글 vs 일시 차단). 둘째, 목록에서 뽑은 URL은 **정규화(normalize)** 해서 넣어야 한다. 쿼리스트링 순서만 달라도 다른 글로 오인해 중복 적재된다. 셋째, 상세 워커는 한 번에 조금씩(`LIMIT 50`) 커밋해야 중간에 끊겨도 손실이 작다.

결국 2단계 크롤링의 본질은 거창한 게 아니다. **"수집(빠름·안전)"과 "파싱(느림·위험)"을 큐로 갈라놓는 것**, 그거 하나다. 이 경계 하나 그었을 뿐인데 재실행이 무섭지 않아졌고, 매일 돌려도 새 글만 얌전히 붙는 파이프라인이 됐다.

> 본 글의 코드·수치는 전부 합성/더미 예시이며, 특정 사이트의 실데이터나 실무 코드가 아니다.
