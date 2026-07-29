---
title: "국토부·부동산·금융 공공데이터 API 통합 레퍼런스 — 7개 시스템 전수 정리"
date: 2026-07-24
tags:
  - automation
  - data-analysis
  - javascript
  - public-data
description: "한국은행 ECOS·수출입은행·부동산원 R-ONE·국토부 V-World·data.go.kr 실거래가·건축HUB·KOSIS까지, 한국의 금리·부동산·국토 공공데이터 7개 시스템을 하나로 엮은 마스터 레퍼런스. 각 시스템의 호스트·통계표 코드·서비스명·파라미터·함정과, 주소 하나를 PNU로 바꿔 전부를 잇는 연결고리를 실측 기준으로 정리했다."
---

앞서 [연결 구조](/blog/korean-public-data-realestate-api-linking)와 [실전 함정 13선](/blog/public-data-api-troubleshooting-13-pitfalls)을 요약으로 정리했는데, 요청이 있어 **전체 기술 레퍼런스**를 통째로 옮긴다. 한국의 금리·부동산·국토 공공데이터 **7개 시스템 + KOSIS + archhub MCP**를, 각 시스템의 호스트·코드·파라미터·함정까지 실측 기준으로 담은 마스터 문서다.

> ⚠️ **안전 고지**: 이 글은 **공개된 정부 오픈데이터 API**의 기술 레퍼런스다. 등장 수치는 정부가 공표한 공개 통계이며 **2026년 5\~6월 기준**(7/16 금리인상·7/23 유가 반영 전)이다. 투자 판단이나 회계·법률 자문이 아니다. **모든 API 키는 `.env`에만 두고 값은 본문에 싣지 않는다.**

## 전체 지도 — 무엇을 어디서 받나

각 시스템은 원기관 API에 **직결**하는 게 최신이고, KOSIS는 "검색·발견" 도구로 쓴다.

| 데이터 | 시스템 | 키(.env 변수) | 최신성 | 도구 |
|---|---|---|---|---|
| 기준금리·시장금리·대출/수신금리·연체율·서베이 | 한국은행 ECOS | `BOK_ECOS_API_KEY` | 일별\~월 | `fetch_rates.js` |
| 환율·수은채 커브·국제금리 | 한국수출입은행 | `KOREAEXIM_API_KEY` | 일별 | `fetch_macro_data.js` |
| 주택·아파트 가격지수·거래량·지가 | 한국부동산원 R-ONE | `REB_API_KEY` | 월 | `fetch_reb*.js` |
| 공시지가·주택공시가격·토지특성·지오코딩 | 국토부 V-World | `VWORLD_API_KEY` | 연·상시 | `fetch_realestate.js` |
| 실거래가(매매·전월세 12유형) | 국토부 실거래가(data.go.kr) | `MOLIT_API_KEY` | 월 | `fetch_region_trades.js` |
| 건축물대장·인허가·에너지·폐쇄말소 | 국토부 건축HUB(data.go.kr) | `MOLIT_API_KEY` | 월 | `lib_bldreg.js` + archhub MCP |
| 인구·고용·분위별 가계부채 등 파생통계 | KOSIS | (MCP) | 다양 | `korean-stats` MCP |

★ **`MOLIT_API_KEY` 하나로 실거래가 + 건축HUB 둘 다** 쓴다(같은 data.go.kr 계정키, API별 활용신청 필요).

## 키 처리의 기본

- **data.go.kr 키는 Encoding/Decoding 2종** 발급 → **Decoding본**을 넣고 코드가 `encodeURIComponent`로 처리(= Encoding본과 동일 결과). Decoding본을 인코딩 없이 쓰면 **401**.
- V-World 키는 요청마다 `domain=localhost`(또는 등록 도메인) 필요.

## 1. 한국은행 ECOS — 금리·통화·실물

- **호스트**: `https://ecos.bok.or.kr/api/<Service>/<KEY>/json/kr/<start>/<end>/<statCode>/<cycle>/<t1>/<t2>/…`

| 통계표 | 코드 | 주기 |
|---|---|---|
| 기준금리·여수신금리 | `722Y001`(0101000) | D |
| 시장금리(일별) 12종 | `817Y002` | D |
| 대출금리 신규취급/잔액 | `121Y006` / `121Y015` | M |
| 수신금리 신규취급 | `121Y002` | M |
| 은행 연체율(1개월↑) | `901Y124` | M |
| 대출행태서베이 태도/위험/수요 | `514Y001`/`514Y002`/`514Y003` | Q |
| 100대 지표 | KeyStatisticList | 혼합 |

**★함정**: ① `901Y124`는 2차원(대출종류×은행종류) → `itemCode1`+`itemCode2` 둘 다 필수. ② 서베이 항목코드 접두 상이(태도 `AA*`·위험 `BB*`·수요 `CC*`). ③ 여수신금리 2개월 시차.

## 2. 한국수출입은행 — 환율·수은채·국제금리

- **호스트**: `https://www.koreaexim.go.kr/site/program/financial/` (`exchangeJSON`/`loanJSON`/`internationalJSON`)
- **3개 서비스가 키 1개 공용**.
- `exchange` 통화별 매매기준율(주말·공휴일 빈배열 → 7일 역순 폴백) / `loan` = 수은채 유통수익률 커브 1M\~10Y / `international` SOFR·ESTR·EURIBOR·TIBOR·스왑·CIRR.

## 3. 한국부동산원 R-ONE — 가격지수·거래·지가

- **호스트**: `https://www.reb.or.kr/r-one/openapi/` — `SttsApiTbl.do`(표목록)·`SttsApiTblItm.do`(항목)·`SttsApiTblData.do`(데이터)
- **공통**: `KEY`·`Type=json`·`pIndex`·`pSize` / 주기 `MM`·`QY`·`YY`·`WK` / 정상코드 `INFO-000`

**핵심 표**: 아파트 매매지수 `A_2024_00178`·전세 `A_2024_00182`·평균가 `A_2024_00188`/`00192` / 연립 매매 `A_2024_00080`·전세 `A_2024_00085` / 오피스텔 매매 `A_2024_00615`·전세 `A_2024_00618` / 지가변동률 `A_2024_00903`·지가지수 `A_2024_00901` / 아파트매매거래 `A_2024_00554`.

**★함정 (심각)**:
1. **`ITM_ID` 미지정 시 두 항목(100001 동호수·100002 면적)이 섞여** MoM −92% 허수 → 반드시 지정.
2. **표마다 지역 CLS_ID가 다르다** — 같은 서울: 거래표 `500002` / 아파트지수 `500007` / 아파트평균가 `500004` / 연립지수 `500008`. 표별 `SttsApiTblItm.do?ITM_TAG=분류`로 확인 필수.
3. **카탈로그 `DATA_END_YY` 부정확**(2024 표기지만 실제 2026-05/06). `pIndex=1`은 오래된 순 → 최신은 `START_WRTTIME`/`END_WRTTIME` 창으로.
4. 오피스텔은 GRP=지역·CLS=규모(500005 전체) 구조.

## 4. 국토부 V-World — 공시지가·주택공시가격·토지특성

- **호스트**: `https://api.vworld.kr` (요청마다 `domain=localhost`)

| 기능 | 엔드포인트 |
|---|---|
| 지오코더(주소→좌표+법정동) | `/req/address?request=getcoord&type=road\|parcel` |
| 필지조회(좌표→PNU) | `/req/data?request=GetFeature&data=LP_PA_CBND_BUBUN&geomFilter=POINT(x y)` (★geomFilter 필수) |
| 개별공시지가 | `/ned/data/getIndvdLandPriceAttr?pnu=&stdrYear=` (`pblntfPclnd` 원/㎡) |
| 토지특성 | `/ned/data/getLandCharacteristics` (용도지역·지목·이용상황·면적) |
| 개별주택가격(단독) | `/ned/data/getIndvdHousingPriceAttr` (`housePc` 원) |
| 공동주택가격(아파트) | `/ned/data/getApartHousingPriceAttr` (`pblntfPc` 원) |

**실측(공표 공시가격, 2025)**: 역삼동737 대지 6,730만원/㎡ · 은마 84㎡ 공시 20.63억 · 가회동 단독 6.16억. **★V-World엔 실거래가 없음** → §5 참조.

## 5. 국토부 실거래가 (data.go.kr) — 12유형 ★전량 작동 검증

- **호스트**: `https://apis.data.go.kr/1613000/<서비스>/<get서비스>`
- **파라미터**: `serviceKey`·`LAWD_CD`(시군구 5자리 = **PNU 앞 5자리**)·`DEAL_YMD`(YYYYMM)·numOfRows·pageNo. 응답 **XML**(`<item>`, 정상 `<resultCode>000`)

| 유형 | 서비스 | 유형 | 서비스 |
|---|---|---|---|
| 아파트매매 | `RTMSDataSvcAptTradeDev` | 아파트전월세 | `RTMSDataSvcAptRent` |
| 아파트분양권 | `RTMSDataSvcSilvTrade` | 단독다가구매매 | `RTMSDataSvcSHTrade` |
| 단독다가구전월세 | `RTMSDataSvcSHRent` | 연립다세대매매 | `RTMSDataSvcRHTrade` |
| 연립다세대전월세 | `RTMSDataSvcRHRent` | 오피스텔매매 | `RTMSDataSvcOffiTrade` |
| 오피스텔전월세 | `RTMSDataSvcOffiRent` | 토지매매 | `RTMSDataSvcLandTrade` |
| 상업업무용매매 | `RTMSDataSvcNrgTrade` | 공장창고매매 | `RTMSDataSvcInduTrade` |

**주요 필드**: 매매 `dealAmount`(만원,콤마)·`umdNm`(법정동)·`dealYear/Month/Day`·`excluUseAr`/`totalFloorAr`·`jimok`(토지)·`buildingUse`(상업). 전월세 `deposit`·`monthlyRent`.

**★함정 (실측)**: 갓 발급/활용신청 직후엔 게이트웨이가 **평문 `403 Forbidden`**(XML 아님) 반환 — 키 오류가 아니라 **API별 활성화 전파 지연**(수분\~수시간, 순차). 실제로 발급 직후 5/12만 작동 → 수 분 뒤 12/12. 아파트매매는 **상세=Dev**(`AptTradeDev`), 비Dev는 미구독.

## 6. 국토부 건축HUB (data.go.kr) — 대장·인허가·에너지·폐쇄말소

- **호스트**: `https://apis.data.go.kr/1613000/<서비스>/<operation>` · 키 = `MOLIT_API_KEY`(실거래가와 공용)
- **파라미터**: `serviceKey`·`sigunguCd`(5)·`bjdongCd`(5)·`platGbCd`(0=대지, 1=산)·`bun`(4)·`ji`(4)
- **★PNU 연결**: V-World PNU(19) = `sigunguCd`(1-5) + `bjdongCd`(6-10) + platGb(11: 1대지/2산 → API 0/1) + `bun`(12-15) + `ji`(16-19)

**5종 서비스 — ★전부 실측 작동 확인(2026-07-24)**:

| 서비스 | 데이터ID | 서비스명 | 오퍼레이션 | 검증(공개 건축물) |
|---|---|---|---|---|
| 건축물대장정보 | 15134735 | `BldRgstHubService` | `getBr*` | ✅ 은마 표제부 31건(29동) |
| 건축인허가정보 | 15136267 | `ArchPmsHubService` | `getAp*` | ✅ 금천독산 기본개요 7,141건 |
| 주택인허가정보 | 15136560 | `HsPmsHubService` | `getHp*` | ✅ 독산동 308건 |
| 건물에너지정보 | 15135963 | `BldEngyHubService` | `getBeElctyUsgInfo`·`getBeGasUsgInfo` | ✅ 은마 전기(useYm 필수) |
| 폐쇄말소대장정보 | 15137093 | `ShtRgstHubService` | `getSr*` | ✅ 대치동 기본개요 7,663건 |

**오퍼레이션 목록**:
- 건축물대장 `getBr{BasisOuln,RecapTitle,Title,FlrOuln,Expos,Hsprc,Jijigu}Info`
- 건축인허가 `getAp{BasisOuln,DongOuln,FlrOuln}Info`
- 주택인허가 `getHp{BasisOuln,DongOuln,FlrOuln,HoOuln,SbsdFc,Wclf,Pklot,AtchPklot,…}Info` (16종)
- 건물에너지 `getBeElctyUsgInfo`(전기)·`getBeGasUsgInfo`(가스) — **`useYm`(사용연월 YYYYMM) 필수** + bun/ji. 제외: 단독주택·200세대 미만 공동주택(2020.1\~)·산업/수송/발전용 등
- 폐쇄말소 `getSr{BasisOuln,RecapTitle,Title,FlrOuln,AtchJibun,ExposPubuseArea,Wclf,Expos,Hsprc,Jijigu}Info` (10종)

**공통 파라미터**: `serviceKey`·`sigunguCd`·`bjdongCd`·`platGbCd`(0대지/1산/2블록)·`bun`·`ji`·`startDate`·`endDate`·`numOfRows`·`pageNo`. bun/ji 생략 시 **동(洞) 전체** 조회.

**★★핵심 함정 (실측 발견)**: 건축물대장·폐쇄말소·에너지는 **`_type=json` 지정 시 빈 응답(len=0)** 반환 → **`_type` 생략(XML 기본)으로 요청하고 XML 파싱**해야 데이터가 나온다.

> **★archhub MCP 병행**: 건축물대장·인허가·주택인허가는 `archhub` MCP(`find_region`→`building_profile`→`permits_pipeline`→`old_buildings`·`demolitions`·`price_history`·`seismic_check`)로도 조회. 원시 API는 대량·자동화용.

## 7. KOSIS — 검색·발견 + 고유통계

- 도구: `search_statistics`·`quick_stats`·`quick_trend`·`get_statistics_data`·`explain_statistic` 등 14종.
- **★1차 소스로 쓰지 말 것** — 금리는 한국은행 표 미러(`orgId=301`), 부동산은 REB 미러(`orgId=408`), **갱신 지연**(아파트가격지수 2025-03에서 정지).
- **올바른 용법**: KOSIS로 `orgId/tableId` 발견 → 원기관 API(ECOS·R-ONE) 직결로 최신치.
- **KOSIS 고유 가치**: ① 가계금융복지조사(`orgId=101`) 가구 평균 자산·부채 금액(`DT_1HDAAD01`) + 소득/자산 분위별 부채 비율(`DT_1HDAAC08/09/10`, \~2025) ② 주택보급률(`orgId=116`) ③ 중견기업 대출금리(`orgId=115`) ④ 인구·고용·지역 파생통계.

### 7-1. 가계부채 — 한국은행(총량) + KOSIS(분포) 병행 ★실측(공표 통계)

**"나라 전체 얼마"=한국은행 / "누가 얼마나"=KOSIS.**

| 데이터 | 소스 | 표/코드 | 값(최신) |
|---|---|---|---|
| 가계신용 총량 | 한국은행 ECOS | 100대지표 | 1,993조(2026Q1) |
| 차주당 가계대출 잔액 | 한국은행(KOSIS 미러 301) | `DT_181Y002` | 9,740만원(2026Q1) |
| 가구 평균 부채(금액) | KOSIS 가계금융복지조사 | `DT_1HDAAD01`(T01·C06·B000) | 9,534만원(2025, YoY +4.4%) |
| 가구 평균 자산 | KOSIS | `DT_1HDAAD01`(T01·C05·B000) | 5.67억(2025) |
| 연령별 부채 | KOSIS | `DT_1HDAAD01`(objL1 B023\~B026) | 40대 1.43억 정점·30대 1.09·50대 1.10·60대+ 0.65억 |
| 분위별 부채 비율 | KOSIS | `DT_1HDAAC08/09/10` | 소득/자산/순자산 5분위별 |

★ "비율" 표(HDAAC08)는 전체 100%라 무의미 → **금액 표 HDAAD01** 사용.

## 8. 지역 조회 연결고리 — 지역명 하나로 전부 잇기

```
지역명/주소
   │ V-World 지오코더 (/req/address)
   ▼
좌표(x,y) + 법정동 구조(시도·시군구·동)
   │ V-World 필지조회 (LP_PA_CBND_BUBUN)
   ▼
PNU(19자리) ── 앞5자리 = LAWD_CD = sigunguCd
   ├─→ V-World /ned/     : 공시지가·주택공시가격·토지특성
   ├─→ 실거래가 LAWD_CD  : 아파트·단독·연립·오피스텔 매매/전월세
   └─→ 건축HUB sigunguCd+bjdongCd+bun+ji : 건축물대장·인허가
```

즉 **주소 하나 → PNU → (공시가격 + 실거래가 + 건축물대장)** 이 모두 연결된다.

## 9. 함정 총정리

| # | 시스템 | 함정 | 대응 |
|---|---|---|---|
| 1 | ECOS | `901Y124` 2차원 | itemCode1+2 둘 다 |
| 2 | ECOS | 서베이 접두 AA/BB/CC | 표별 접두 |
| 3 | 수출입 | 주말 빈배열 | 7일 역순 폴백 |
| 4 | REB | ITM_ID 미지정 시 항목 혼입 | `ITM_ID=100001` 고정 |
| 5 | REB | 표마다 지역코드 다름 | ITM_TAG=분류로 확인 |
| 6 | REB | DATA_END_YY 부정확·pIndex 오래된순 | 기간창 조회 |
| 7 | V-World | data API geomFilter 필수 | POINT 필터 |
| 8 | V-World | 실거래가 없음 | data.go.kr 별도 |
| 9 | MOLIT | 발급직후 403(전파지연) | 수분\~수시간 후 재시도 |
| 10 | MOLIT | Decoding 원본은 401 | encodeURIComponent |
| 11 | 건축HUB | `_type=json` 빈 응답 | `_type` 생략(XML)+파싱 |
| 12 | 건축HUB | 에너지 useYm 필수·서비스명 오추정 | Swagger 명세 확인 |
| 13 | KOSIS | 금리·부동산 미러·지연 | 원기관 직결 |

## 10. 실측 응용 — "거래량 감소 = 공급 부족?"을 데이터로 가르기

한 지역(금천)의 아파트 거래량이 5월 170 → 6월 103건으로 꺾였을 때, 그게 수요 위축인지 공급 부족인지 실거래가만으론 못 가른다.

**판별 원리**: 거래량↓ + 가격↑ = 공급 부족 / 거래량↓ + 가격↓ = 수요 위축.
- 실측: 거래량 170→103(↓), 중위가 6.20→6.03억(**거의 보합**) → 어느 쪽도 뚜렷치 않은 **관망 국면**.

**건축HUB 공급 파이프라인 실측**(archhub, 공개 인허가): 건축인허가 기본개요 7,141건 중 진행 중 159건, 장기 미착공(허가 5년↑) 3,685건. 2026년 신규 인허가는 소형 위주(공동주택 29세대·12세대, 오피스텔, 근생 용도변경), **대형 아파트 단지 신축은 사실상 없음**.

**결론**: 가격 보합이라 수요·공급 어느 쪽도 단정 불가(관망)이되, 건축HUB상 **신규 공급 파이프라인이 빈약**함은 확인된다 — "공급 부족과 수요 관망이 겹친 국면." **실거래가(거래·가격)만으로 못 가르는 것을 건축HUB(공급)를 붙여야 판별한다** — 이것이 API를 잇는 이유다.

> ⚠️ 위 해석은 **공개 데이터 기반의 방법론 예시**이며 특정 지역·시점의 투자 판단이 아니다. 중위가는 평형·연식이 섞인 값이고, 진행 중인 달(신고 마감 전)은 건수가 적어 왜곡될 수 있다. 오피스텔 전세가율 100%+ 같은 표면값은 매매·전세 물건집합이 달라 생기는 착시일 수 있다.

## 검증 노트

- ✅ 실거래가 12종·V-World 6종·ECOS·REB·수출입은행·건축HUB 5종 **전부 실측 작동**.
- ⚠️ 부동산 데이터 대부분 **2026-05\~06 기준**.
- ⚠️ 모든 키는 `.env`에만(`.gitignore`), 본문에 값 미기재.

요약 두 편([연결 구조](/blog/korean-public-data-realestate-api-linking) · [함정 13선](/blog/public-data-api-troubleshooting-13-pitfalls))이 "왜"라면, 이 문서는 "어떻게"의 전체 색인이다.
