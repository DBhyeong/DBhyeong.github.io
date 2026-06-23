---
title: "게임 데이터 분석가의 SQL 레시피 — 리텐션(D1/D7/D30)과 LTV를 쿼리 한 방에"
date: 2026-06-21
tags:
  - game-data
  - sql
  - data-analysis
---

> Tags: `#SQL` `#게임데이터분석` `#리텐션` `#LTV` `#코호트분석` `#윈도우함수` `#데이터분석`

> ⚠️ **이 글의 모든 테이블·데이터는 합성(synthetic) 더미입니다.** 스키마와 수치는 설명을 위해 만든 것이며, 특정 게임사의 실제 스키마·매출·지표가 아닙니다. 게임사 재직 시에는 MS-SQL + Stored Procedure로 돌리던 분석을, 여기서는 누구나 따라 돌릴 수 있게 표준 SQL(윈도우 함수)로 합성 재현했습니다.

게임 데이터 분석에서 가장 많이 받는 질문 두 가지는 결국 이걸로 수렴합니다. **"이 유저들 얼마나 남아 있어?"(리텐션)** 그리고 **"이 유저들 결국 얼마 쓰는데?"(LTV)**. 신규 마케팅을 태울지, 콘텐츠 패치 방향을 어디로 잡을지, BM을 어떻게 손볼지 — 의사결정의 출발점이 거의 다 이 두 지표입니다.

저는 드래곤네스트·킹스레이드 등에서 게임 데이터를 다루던 시절, DAU/MAU/NRU/RAU/Retention/PU/ARPPU 같은 지표 체계를 매일 들여다봤습니다. 그때 MS-SQL Stored Procedure로 자동화해 돌리던 코어 로직을, 이 글에서는 합성 데이터로 재현해 봅니다. 핵심은 **테이블 3개와 윈도우 함수 몇 개면 리텐션과 코호트 LTV가 거의 다 나온다**는 것입니다.

---

## 1. 합성 스키마 — users / action_log / purchase_log

분석에 필요한 최소 구성입니다. 모두 더미입니다.

```sql
-- ⚠️ 합성(synthetic) 스키마. 실제 운영 스키마 아님.

-- 유저 마스터: install_at = 최초 설치(가입) 시각
CREATE TABLE users (
    user_id      BIGINT      PRIMARY KEY,
    install_at   TIMESTAMP   NOT NULL,   -- UTC 저장 권장
    platform     VARCHAR(10),            -- 'ios' / 'aos'
    country      VARCHAR(2)              -- 'KR','TH','VN' ...
);

-- 행동 로그: 접속/플레이 등 '활동'의 최소 단위
CREATE TABLE action_log (
    log_id       BIGINT      PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    action_at    TIMESTAMP   NOT NULL,   -- UTC 저장 권장
    action_type  VARCHAR(20)             -- 'login','stage_clear', ...
);

-- 결제 로그: LTV의 원천
CREATE TABLE purchase_log (
    order_id     BIGINT      PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    paid_at      TIMESTAMP   NOT NULL,   -- UTC 저장 권장
    amount       DECIMAL(12,2)           -- 결제 금액(현지통화→환산 권장)
);
```

`install_at`을 코호트의 기준점(Day 0)으로 잡는 게 핵심입니다. 리텐션도 LTV도 전부 "설치 후 N일째"라는 상대 시간으로 환산해서 봅니다.

---

## 2. Day-N 리텐션 — D1 / D7 / D30

리텐션의 정의는 **"Day 0(설치)에 들어온 유저 중, 설치 후 N일째에 다시 활동한 유저 비율"**입니다. 핵심 트릭은 `action_at`과 `install_at`의 **날짜 차이(day diff)**를 구해 N일째에 활동했는지 플래그를 세우는 것입니다.

```sql
-- D1/D7/D30 리텐션 (날짜 경계 기준)
WITH base AS (
    SELECT
        u.user_id,
        CAST(u.install_at AS DATE)        AS install_date,
        CAST(a.action_at  AS DATE)        AS action_date
    FROM users u
    JOIN action_log a
      ON a.user_id = u.user_id
),
day_diff AS (
    SELECT
        user_id,
        install_date,
        DATEDIFF(DAY, install_date, action_date) AS day_n  -- MS-SQL 문법
    FROM base
    WHERE action_date >= install_date
),
flags AS (
    SELECT
        install_date,
        user_id,
        MAX(CASE WHEN day_n = 1  THEN 1 ELSE 0 END) AS d1,
        MAX(CASE WHEN day_n = 7  THEN 1 ELSE 0 END) AS d7,
        MAX(CASE WHEN day_n = 30 THEN 1 ELSE 0 END) AS d30
    FROM day_diff
    GROUP BY install_date, user_id
)
SELECT
    install_date,
    COUNT(*)                                   AS cohort_size,
    1.0 * SUM(d1)  / COUNT(*)                   AS retention_d1,
    1.0 * SUM(d7)  / COUNT(*)                   AS retention_d7,
    1.0 * SUM(d30) / COUNT(*)                   AS retention_d30
FROM flags
GROUP BY install_date
ORDER BY install_date;
```

> 📌 `DATEDIFF(DAY, ...)`는 MS-SQL 문법입니다. MySQL이면 `DATEDIFF(action_date, install_date)`, PostgreSQL이면 `(action_date - install_date)`로 바꾸면 됩니다.

여기서 `MAX(CASE WHEN ...)` 패턴은 **유저 단위로 "N일째에 한 번이라도 활동했나"를 0/1로 접는** 전형적인 피벗 트릭입니다. 한 유저가 D7에 10번 접속해도 리텐션 분자는 1만 더해져야 하니까요.

**"정확한 N일째"가 아니라 "N일째까지 누적 생존"을 보고 싶다면** `day_n = 7`을 `day_n >= 7` 같은 형태가 아니라, rolling retention 정의에 맞춰 "N일 이후에도 활동한 적이 있는가"로 바꿔야 합니다. 이 정의 차이로 숫자가 크게 달라지므로 팀과 정의부터 합의하는 게 먼저입니다.

---

## 3. 코호트 LTV — 누적 결제를 윈도우 함수로

LTV(엄밀히는 누적 ARPU)는 **"설치 후 N일까지 유저 1인당 누적 결제액"**입니다. 결제 로그에 day diff를 붙이고, 코호트별로 누적합을 윈도우 함수로 굴립니다.

```sql
-- 코호트(설치일) × 경과일별 1인당 누적 결제액 (cumulative ARPU)
WITH cohort AS (
    SELECT
        CAST(install_at AS DATE) AS install_date,
        COUNT(*)                 AS cohort_size
    FROM users
    GROUP BY CAST(install_at AS DATE)
),
pay AS (
    SELECT
        u.user_id,
        CAST(u.install_at AS DATE)                       AS install_date,
        DATEDIFF(DAY, CAST(u.install_at AS DATE),
                      CAST(p.paid_at AS DATE))           AS day_n,
        p.amount
    FROM users u
    JOIN purchase_log p
      ON p.user_id = u.user_id
    WHERE CAST(p.paid_at AS DATE) >= CAST(u.install_at AS DATE)
),
daily AS (
    SELECT
        install_date,
        day_n,
        SUM(amount) AS revenue_day
    FROM pay
    GROUP BY install_date, day_n
)
SELECT
    d.install_date,
    d.day_n,
    c.cohort_size,
    SUM(d.revenue_day) OVER (
        PARTITION BY d.install_date
        ORDER BY d.day_n
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                                    AS cum_revenue,
    1.0 * SUM(d.revenue_day) OVER (
        PARTITION BY d.install_date
        ORDER BY d.day_n
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) / c.cohort_size                                    AS cum_ltv  -- 1인당 누적
FROM daily d
JOIN cohort c
  ON c.install_date = d.install_date
ORDER BY d.install_date, d.day_n;
```

핵심은 `SUM(...) OVER (PARTITION BY install_date ORDER BY day_n ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`입니다. **코호트별로 경과일 순서대로 결제액을 누적**해, "이 코호트는 D7에 1인당 얼마, D30에 1인당 얼마 썼나"를 한 번에 뽑습니다.

여기서 `cohort_size`(설치 인원 전체)로 나누면 **cumulative ARPU**, 결제 유저 수(PU)로 나누면 **cumulative ARPPU**가 됩니다. LTV 곡선을 그릴 때는 보통 전체 설치 인원 기준 ARPU 곡선이 마케팅 회수(payback) 판단에 직결됩니다.

특정 일자만 뽑고 싶으면 바깥에서 `WHERE day_n IN (1, 7, 30, 90)`으로 필터하면 LTV D1/D7/D30/D90 표가 나옵니다.

---

## 4. 매출 추세 — 윈도우 함수로 이동평균·증감률

일매출은 요일 효과(주말 스파이크)와 패치 노이즈가 심해서, 7일 이동평균과 전일 대비 증감률을 같이 봐야 추세가 보입니다.

```sql
-- 일매출 + 7일 이동평균 + 전일 대비 증감률
WITH daily_rev AS (
    SELECT
        CAST(paid_at AS DATE) AS d,
        SUM(amount)           AS revenue
    FROM purchase_log
    GROUP BY CAST(paid_at AS DATE)
)
SELECT
    d,
    revenue,
    AVG(revenue) OVER (
        ORDER BY d
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )                                          AS ma7,           -- 7일 이동평균
    LAG(revenue) OVER (ORDER BY d)             AS prev_revenue,
    1.0 * (revenue - LAG(revenue) OVER (ORDER BY d))
        / NULLIF(LAG(revenue) OVER (ORDER BY d), 0) AS dod_growth  -- 전일 대비
FROM daily_rev
ORDER BY d;
```

`LAG`로 전일 매출을 끌어와 증감률을, `AVG ... ROWS BETWEEN 6 PRECEDING`으로 7일 이동평균을 뽑습니다. `NULLIF(..., 0)`로 **0으로 나누기(divide by zero)**를 막는 건 습관처럼 넣어두는 게 좋습니다. 매출이 0인 날이 분모로 들어오면 쿼리가 통째로 터집니다.

---

## 5. 실무 함정 — 타임존과 중복 로그

합성 데이터로는 안 보이지만, 실데이터에서 리텐션·LTV를 **반드시 한 번은 틀리게 만드는** 두 가지입니다.

### (1) 타임존 — "Day 경계"가 어디냐

로그를 UTC로 저장하면서 리텐션은 KST(또는 현지시간) 기준으로 봐야 하는 경우가 대부분입니다. UTC 그대로 `CAST(... AS DATE)`를 하면 **자정 직전(KST 00:00~09:00) 활동이 전날로 밀려** D1 리텐션이 통째로 어긋납니다. 글로벌 서비스라면 유저 `country`별로 기준 타임존이 다르기도 하죠.

```sql
-- UTC → KST(+9) 변환 후 날짜 경계 적용 (MS-SQL 예)
CAST(DATEADD(HOUR, 9, action_at) AS DATE) AS action_date_kst
```

원칙은 **"저장은 UTC, 집계는 명시적 타임존 변환"**. 코호트 기준일(`install_at`)과 활동/결제 시각을 **같은 타임존으로 맞춘 뒤** day diff를 구해야 합니다. 한쪽만 변환하면 오프셋만큼 어긋납니다.

### (2) 중복 로그 — 분자가 부풀거나, 매출이 뻥튀기되거나

클라이언트 재전송, ETL 재적재, 결제 콜백 중복 등으로 **같은 이벤트가 여러 줄** 들어오는 일은 흔합니다.

- **리텐션**: 위 쿼리는 `MAX(CASE WHEN ...)`로 유저 단위 0/1로 접기 때문에 접속 로그가 중복돼도 분자는 안전합니다. 하지만 **유저 수(COUNT)**를 셀 때 `action_log`를 잘못 조인하면 분모가 부풀 수 있으니, 코호트 사이즈는 `users`에서 직접 세야 합니다.
- **결제**: 여기가 진짜 위험합니다. `order_id` 중복이 그대로 `SUM(amount)`에 들어가면 **LTV가 통째로 뻥튀기**됩니다. 적재 단계에서 `order_id` 유니크를 보장하거나, 집계 전에 디듀프(dedup)하세요.

```sql
-- 결제 디듀프: order_id 기준 1건만 남기기
WITH dedup AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY order_id
               ORDER BY paid_at
           ) AS rn
    FROM purchase_log
)
SELECT * FROM dedup WHERE rn = 1;
```

`ROW_NUMBER() OVER (PARTITION BY 식별자 ORDER BY ...)`로 중복 그룹에서 1건만 남기는 건 데이터 분석 SQL의 기본기 중 기본기입니다. 리텐션 분모, LTV 분자 — **숫자가 "너무 좋게" 나오면 십중팔구 중복을 안 지운 것**입니다.

---

## 마무리

테이블 3개(users/action_log/purchase_log)와 윈도우 함수 몇 개로 **리텐션(D1/D7/D30) → 코호트 LTV → 매출 추세**까지 한 줄기로 뽑아봤습니다. 게임사 재직 시 MS-SQL + Stored Procedure로 자동화해 매일 돌리던 코어 로직을, 여기서는 누구나 합성 데이터로 따라 돌릴 수 있게 표준 윈도우 함수로 재현했습니다. 실무에서 숫자를 살리고 죽이는 건 결국 **타임존 정합성**과 **중복 제거** 두 가지라는 것도 같이 정리했습니다.

이 레시피의 전체 코드(합성 스키마 생성 + 더미 데이터 삽입 스크립트 포함)와 게임 도메인 지표 정의는 아래 리포에 정리하고 있습니다.

- **game-data-recipes** — 게임 도메인 SQL/지표 레시피: https://github.com/DBhyeong/game-data-recipes
- **sql-data-recipes** — 도메인 무관 SQL 분석 레시피 모음: https://github.com/DBhyeong/sql-data-recipes

리텐션·LTV 쿼리를 실제 더미 DB에 돌려보는 **영상도 준비 중**입니다. 다음 글에서는 같은 합성 데이터로 **코호트 리텐션 히트맵을 SQL + 시각화로 그리는 법**을 다뤄볼 예정입니다.

> AI가 SQL을 대신 써주는 시대일수록, **"어떤 지표를 어떤 정의로 봐야 하는가"라는 도메인 질문**이 분석가의 무기입니다. 게임이든 이커머스든 회계든, 도메인을 코드로 직접 분석해온 경험이 결국 차이를 만든다고 믿습니다.
