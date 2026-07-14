---
title: "엑셀이 무거워지기 시작했다: DB로 넘어갈 타이밍과 이행 전략"
date: 2026-07-14
tags:
  - data-analysis
  - sql
  - automation
  - knowledge-management
description: "xlsx 파일이 비대해지고 자주 깨질 때가 DB로 옮길 신호다. 전환 타이밍을 알아채는 지표와 단계적 마이그레이션 의사결정을 합성 데이터로 정리했다."
---

엑셀은 참 좋은 도구다. 나도 데이터 일을 시작할 때 거의 모든 걸 xlsx로 처리했다. 그런데 어느 순간부터 파일을 열 때마다 커피 한 잔을 내려야 할 만큼 느려지고, 가끔은 열자마자 "복구할 수 없습니다"라는 창이 뜨기 시작했다. 그때가 바로 "이제 엑셀을 벗어날 때"라는 신호였다.

이 글은 그 신호를 어떻게 알아채고, 무엇을 준비해서, 어떤 순서로 DB로 넘어갈지를 실무자 관점에서 정리한 회고다. 등장하는 수치·표·스키마는 전부 **합성(더미) 데이터**이고, 특정 회사의 실제 파일이나 구성과는 무관하다.

## 한눈에 보면 이야기가 어떻게 흐르나?

```mermaid
flowchart LR
  A["엑셀로 충분한<br/>초기 단계"] --> B{"경고 신호<br/>감지"}
  B -->|여러 신호 겹침| C["전환 판단"]
  C --> D["단계적<br/>이행"]
  D --> E["DB 중심<br/>운영"]
  B -->|아직 견딜만| A

  classDef ok fill:#d3f9d8,stroke:#2f9e44,color:#1d6b2c;
  classDef warn fill:#fff3bf,stroke:#e67700,color:#8a5a00;
  classDef move fill:#e7f5ff,stroke:#1c7ed6,color:#10548f;
  class A,E ok
  class B,C warn
  class D move
```

엑셀이 나쁜 게 아니라, 데이터가 자라면서 엑셀이 감당할 수 있는 범위를 넘어가는 순간이 온다는 얘기다. 그 순간을 놓치면 "느린데 참고 쓰다가 결국 파일이 깨져서 하루를 날리는" 사고가 난다.

## 왜 엑셀이 어느 순간 한계에 부딪히나?

엑셀은 태생이 "사람이 눈으로 보고 손으로 고치는" 스프레드시트다. 데이터가 작을 때는 이게 장점인데, 커지면 바로 그 특성이 발목을 잡는다.

```mermaid
flowchart TD
  R["데이터 증가"] --> P1["행 수 폭증<br/>(수십만 행)"]
  R --> P2["수식 의존성<br/>거미줄"]
  R --> P3["여러 명이<br/>동시 편집"]
  R --> P4["파일 여러 개로<br/>쪼개짐"]

  P1 --> X["느려짐 · 잦은 크래시"]
  P2 --> X
  P3 --> X
  P4 --> X

  classDef cause fill:#f3f0ff,stroke:#7048e8,color:#4b2fa8;
  classDef pain fill:#ffe3e3,stroke:#e03131,color:#a01818;
  class R,P1,P2,P3,P4 cause
  class X pain
```

핵심은 이렇다. 엑셀은 데이터와 로직(수식)과 표현(서식)이 한 파일에 뒤엉켜 있다. 반면 DB는 데이터를 순수하게 저장만 하고, 계산과 표현은 분리한다. 데이터가 커질수록 이 분리가 주는 이점이 커진다.

## 그래서 '넘어갈 때'라는 신호는 어떻게 알아채나?

한두 개 신호는 그냥 참고 쓸 수 있다. 문제는 여러 개가 동시에 켜질 때다. 나는 아래 표를 체크리스트처럼 쓴다. (수치는 합성 데이터 기준의 감각적 임계값이다.)

| 신호 | 엑셀이 편한 구간 | 슬슬 위험 | DB로 넘어갈 때 |
| --- | --- | --- | --- |
| 행 수 | 1만 행 이하 | 5만~10만 행 | 수십만 행 이상 |
| 파일 크기 | 5MB 이하 | 20~50MB | 파일 열기만 수십 초 |
| 동시 편집자 | 1명 | 2~3명 | 여러 명이 같은 파일 다툼 |
| 파일 개수 | 1개 | 월별로 쪼갠 몇 개 | 이름만 다른 사본 난립 |
| 깨짐 빈도 | 없음 | 가끔 복구 창 | 한 달에 여러 번 손상 |
| 이력 추적 | 필요 없음 | 수동 버전 관리 | "누가 언제 바꿨나"가 중요 |

한 열만 오른쪽 끝에 걸려도 신경 쓰이지만, 세 개 이상이 "DB로 넘어갈 때" 칸에 몰리면 나는 거의 무조건 전환을 준비한다.

```mermaid
flowchart LR
  subgraph SIG["관찰되는 신호"]
    S1["파일 자꾸 깨짐"]
    S2["동시 편집 충돌"]
    S3["집계가 너무 느림"]
    S4["같은 데이터<br/>사본 여러 개"]
  end
  SIG --> J{"3개 이상<br/>겹치나?"}
  J -->|예| GO["전환 착수"]
  J -->|아니오| WAIT["일단 유지 · 관찰"]

  classDef s fill:#fff3bf,stroke:#e67700,color:#8a5a00;
  classDef go fill:#d3f9d8,stroke:#2f9e44,color:#1d6b2c;
  classDef wait fill:#e7f5ff,stroke:#1c7ed6,color:#10548f;
  class S1,S2,S3,S4,J s
  class GO go
  class WAIT wait
```

## 신호를 숫자로 확인해볼 수는 없나?

감으로만 판단하면 설득이 안 된다. 그래서 나는 옮기기 전에 지금 쓰는 파일들의 상태를 간단히 스캔한다. 아래는 합성 데이터로 만든 예시 스크립트다. 폴더 안 xlsx들의 크기·행 수를 훑어서 "위험 점수"를 매긴다.

```python
# 합성 데이터 예시입니다. 실제 회사 파일과 무관합니다.
from pathlib import Path
import pandas as pd

# 실제로는 폴더를 훑지만, 여기서는 더미 목록으로 대체
dummy_files = [
    {"name": "sales_2026.xlsx", "size_mb": 42.0, "rows": 180_000},
    {"name": "sales_2026_backup.xlsx", "size_mb": 41.5, "rows": 179_800},
    {"name": "members.xlsx", "size_mb": 3.1, "rows": 4_200},
    {"name": "log_daily.xlsx", "size_mb": 66.0, "rows": 320_000},
]

def risk_score(f):
    score = 0
    if f["size_mb"] >= 20: score += 1
    if f["size_mb"] >= 50: score += 1
    if f["rows"] >= 50_000: score += 1
    if f["rows"] >= 150_000: score += 1
    if "backup" in f["name"] or "사본" in f["name"]: score += 1
    return score

df = pd.DataFrame(dummy_files)
df["risk"] = df.apply(risk_score, axis=1)
df["verdict"] = df["risk"].map(
    lambda s: "DB 권장" if s >= 3 else ("주의" if s >= 1 else "엑셀 유지")
)
print(df[["name", "size_mb", "rows", "risk", "verdict"]])
```

출력은 대략 이렇게 나온다(합성 데이터).

```
                     name  size_mb    rows  risk    verdict
0         sales_2026.xlsx     42.0  180000     3     DB 권장
1  sales_2026_backup.xlsx     41.5  179800     3     DB 권장
2            members.xlsx      3.1    4200     0   엑셀 유지
3           log_daily.xlsx     66.0  320000     4     DB 권장
4  ... (이하 생략)
```

`members.xlsx`처럼 작고 사람이 직접 관리하는 표는 굳이 옮길 필요가 없다. 반대로 로그성·거래성 데이터는 점수가 금방 올라간다. 전부 다 옮기는 게 아니라 **점수 높은 것부터** 옮기는 게 요령이다.

## 엑셀의 표를 DB 테이블로 어떻게 바꾸나?

가장 헷갈리는 지점이다. 엑셀은 한 시트에 모든 걸 다 넣는 경향이 있는데, DB는 성격이 다른 정보를 나눠서 저장한다. 예를 들어 "주문 시트" 하나에 고객 이름·상품명·수량이 다 들어 있다면, DB에서는 이렇게 쪼갠다.

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDERS : places
  PRODUCT  ||--o{ ORDERS : contains
  CUSTOMER {
    int customer_id PK
    string name
  }
  PRODUCT {
    int product_id PK
    string title
    int unit_price
  }
  ORDERS {
    int order_id PK
    int customer_id FK
    int product_id FK
    int qty
    date ordered_at
  }
```

엑셀에서 고객 이름을 100번 반복해 적던 걸, DB에서는 고객을 한 번만 등록하고 주문에서 번호로 참조한다. 이렇게 하면 이름이 바뀌어도 한 곳만 고치면 되고, 오타로 인한 "김철수 / 김 철수 / 김철수 " 같은 중복 집계 사고가 사라진다.

옮기는 것 자체는 파이썬 몇 줄로 끝난다(합성 데이터 예시).

```python
# 합성 데이터 예시입니다.
import pandas as pd
import sqlite3

# 엑셀 → DataFrame (여기서는 더미 프레임으로 대체)
orders = pd.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": [10, 11, 10],
    "product_id": [100, 100, 101],
    "qty": [2, 1, 5],
    "ordered_at": ["2026-07-01", "2026-07-01", "2026-07-02"],
})

# DataFrame → DB 테이블
con = sqlite3.connect("shop.db")
orders.to_sql("orders", con, if_exists="append", index=False)

# 집계는 이제 SQL로
q = """
SELECT ordered_at, SUM(qty) AS total_qty
FROM orders
GROUP BY ordered_at
ORDER BY ordered_at
"""
print(pd.read_sql(q, con))
con.close()
```

엑셀에서 피벗테이블로 끙끙대던 일별 합계가 SQL 세 줄로 끝난다. 처음엔 SQLite처럼 파일 하나로 되는 가벼운 DB로 시작해도 충분하다. 서버형 DB는 나중에 필요할 때 옮기면 된다.

## 한 번에 다 갈아엎어야 하나?

이게 제일 흔한 실수다. 잘 돌아가던 걸 어느 날 통째로 DB로 바꾸겠다고 덤비면, 기존 리포트가 다 멈추고 팀이 패닉에 빠진다. 나는 항상 병행 운영 구간을 둔다.

```mermaid
stateDiagram-v2
  [*] --> 엑셀단독
  엑셀단독 --> 병행운영: DB 적재 시작
  병행운영 --> 병행운영: 숫자 대조 검증
  병행운영 --> DB중심: 결과 일치 확인
  DB중심 --> [*]

  note right of 병행운영
    엑셀과 DB에
    같은 데이터를 넣고
    집계 결과를 맞춰본다
  end note
```

순서를 풀어 쓰면 이렇다.

```mermaid
flowchart TD
  A["① 옮길 대상 선정<br/>(위험 점수 높은 것부터)"] --> B["② DB 스키마 설계<br/>(시트를 테이블로 분해)"]
  B --> C["③ 적재 스크립트 작성<br/>(엑셀→DB)"]
  C --> D["④ 병행 운영<br/>(양쪽 결과 대조)"]
  D --> E["⑤ 리포트 연결 전환<br/>(집계를 SQL로)"]
  E --> F["⑥ 엑셀은 입력/열람용만"]

  classDef step fill:#e7f5ff,stroke:#1c7ed6,color:#10548f;
  class A,B,C,D,E,F step
```

④번 병행 운영이 핵심이다. 같은 기간의 매출 합계가 엑셀과 DB에서 똑같이 나오는지 며칠 대조해보고, 어긋나면 원인을 잡는다. 여기서 신뢰가 쌓여야 리포트를 DB로 갈아탈 수 있다.

그리고 ⑥번, 엑셀을 완전히 버릴 필요는 없다. 사람이 손으로 입력하거나 눈으로 훑어보는 용도로는 여전히 최고다. 무거운 저장과 집계만 DB로 넘기고, 엑셀은 "입력 창구 겸 뷰어"로 남겨두는 하이브리드가 현실적으로 가장 오래간다.

## 넘어가고 나면 뭐가 달라지나?

| 항목 | 엑셀 중심 | DB 중심 |
| --- | --- | --- |
| 대용량 집계 | 파일 열기부터 지연 | 쿼리로 즉시 |
| 동시 작업 | 파일 잠김·충돌 | 여러 명이 동시에 조회 |
| 중복/오타 | 사람이 눈으로 방지 | 참조 구조로 예방 |
| 이력 추적 | 사본 파일로 수동 | 적재 시각 컬럼으로 자동 |
| 사고 위험 | 파일 손상 = 전체 손실 | 백업·복구 체계화 |
| 진입 장벽 | 낮음(누구나) | SQL 학습 필요 |

물론 공짜는 아니다. SQL을 배워야 하고, 초기 설계에 품이 든다. 그래서 "무조건 DB가 옳다"가 아니라, 앞의 신호들이 겹칠 때 그 비용을 감수할 가치가 생긴다는 얘기다.

## 핵심 3줄 요약

- 엑셀이 느려지고 자주 깨지고 사본이 난립하기 시작하면, 그게 DB로 넘어갈 신호다. 여러 신호가 겹칠 때 움직인다.
- 통째로 갈아엎지 말고, 위험 점수 높은 데이터부터 골라 병행 운영으로 숫자를 대조하며 단계적으로 옮긴다.
- 엑셀을 완전히 버리는 게 아니라, 무거운 저장·집계는 DB로, 입력·열람은 엑셀로 나누는 하이브리드가 오래간다.
