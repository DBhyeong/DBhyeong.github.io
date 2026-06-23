---
title: "DART OpenAPI로 재무제표 자동 수집·파싱하기 (공개데이터, 데이터 분석가의 자동화)"
date: 2026-06-21
tags:
  - automation
  - python
  - data-analysis
---

---
---

> ⚠️ **먼저 면책부터.** 저는 **회계사가 아닙니다.** 광고홍보학 전공으로 시작해 SEO → 이커머스 → 게임 데이터 분석 → 디지털 마케팅을 거친 12년차 데이터 분석가/디지털 마케터입니다. 지금은 회계법인에서 데이터·자동화·마케팅을 담당하고 있어서 "재무 데이터"를 자주 만지지만, 이 글은 철저히 **공개 데이터(DART)를 코드로 수집·파싱하는 자동화/교육 관점**입니다. **회계 판단·감사의견·종목 추천·투자 권유가 전혀 아닙니다.** 모든 수치는 공개 DART 데이터 또는 더미(dummy)로 다룹니다.

AI 시대일수록 "도메인 + 자동화 실행력"이 무기라고 믿습니다. 회계/공시 도메인에 들어와서 가장 먼저 한 일이, 손으로 받던 재무제표를 **API로 긁어와 pandas DataFrame으로 정규화**하는 파이프라인을 짜는 것이었습니다. 게임에서 DAU/ARPPU를 SQL로 집계하던 감각이 그대로 옮겨오더군요. 이 글에서 그 첫 단추를 공유합니다.

전체 코드는 레포에 정리해 두었습니다 → **[github.com/DBhyeong/dart-xbrl-parser](https://github.com/DBhyeong/dart-xbrl-parser)** (관련 레포: [related_kws](https://github.com/DBhyeong/related_kws) · [python-automation-100](https://github.com/DBhyeong/python-automation-100) · [sql-data-recipes](https://github.com/DBhyeong/sql-data-recipes))

---

## 1. DART OpenAPI란, 그리고 키 발급

[DART(전자공시시스템)](https://opendart.fss.or.kr/)는 금융감독원이 운영하는 기업 공시 시스템입니다. 그 공개 데이터를 프로그램으로 받을 수 있게 열어준 게 **OpenDART API**입니다. 사업보고서, 재무제표, 공시 목록 등을 JSON/XML/XBRL로 내려받을 수 있습니다.

발급 절차는 단순합니다.

1. [opendart.fss.or.kr](https://opendart.fss.or.kr/) 회원가입
2. **인증키 신청/관리** 메뉴에서 API 키 발급 (40자리 문자열)
3. 하루 호출 한도가 있으니 운영 시엔 캐싱 권장

키는 **절대 코드에 하드코딩하지 말고** `.env`로 분리합니다. 이건 게임사 시절 DB 접속정보부터 지켜온 원칙입니다.

```bash
# .env  (git에 커밋 금지 — .gitignore에 추가)
DART_API_KEY=YOUR_API_KEY
```

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()
DART_API_KEY = os.environ["DART_API_KEY"]
BASE = "https://opendart.fss.or.kr/api"

session = requests.Session()
session.headers.update({"User-Agent": "dart-parser/1.0 (data-automation)"})
```

---

## 2. corp_code — 모든 것의 시작 (기업 고유번호)

DART는 종목코드(6자리)가 아니라 **고유번호(corp_code, 8자리)** 로 기업을 식별합니다. 재무제표를 받으려면 먼저 이 매핑이 필요합니다. `corpCode.xml`은 zip 한 방으로 전체를 내려줍니다.

```python
import io
import zipfile
import xml.etree.ElementTree as ET
import pandas as pd

def load_corp_codes() -> pd.DataFrame:
    """DART 전체 기업 고유번호 매핑을 DataFrame으로."""
    url = f"{BASE}/corpCode.xml"
    resp = session.get(url, params={"crtfc_key": DART_API_KEY}, timeout=30)
    resp.raise_for_status()

    # 응답이 zip(xml 1개 포함)
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        xml_bytes = zf.read(zf.namelist()[0])

    root = ET.fromstring(xml_bytes)
    rows = []
    for item in root.iter("list"):
        rows.append({
            "corp_code": item.findtext("corp_code"),
            "corp_name": item.findtext("corp_name"),
            "stock_code": (item.findtext("stock_code") or "").strip(),
        })
    df = pd.DataFrame(rows)
    # 상장사만: 종목코드가 있는 행
    return df[df["stock_code"] != ""].reset_index(drop=True)

corp_df = load_corp_codes()

def corp_code_of(name: str) -> str:
    hit = corp_df[corp_df["corp_name"] == name]
    if hit.empty:
        raise ValueError(f"'{name}' not found in corp codes")
    return hit.iloc[0]["corp_code"]
```

> 💡 **자주 깨지는 첫 지점:** `corp_code`는 앞자리 0이 의미를 가집니다(`00126380` 같은 형태). pandas가 정수로 읽어 `126380`으로 만들면 호출이 전부 실패합니다. **항상 문자열(`dtype=str`)로 다루세요.**

---

## 3. 공시 검색 (list.json)

특정 기업의 공시 목록을 기간/유형으로 조회합니다. 사업보고서(`A001`) 같은 정기보고서를 찾는 데 씁니다.

```python
def search_disclosures(corp_code: str, bgn: str, end: str) -> pd.DataFrame:
    """기간 내 공시 목록 (bgn/end: 'YYYYMMDD')."""
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bgn_de": bgn,
        "end_de": end,
        "pblntf_ty": "A",   # A: 정기공시
        "page_count": 100,
    }
    resp = session.get(f"{BASE}/list.json", params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # status 000이 정상. 그 외는 메시지 확인
    if data.get("status") != "000":
        raise RuntimeError(f"DART error {data.get('status')}: {data.get('message')}")
    return pd.DataFrame(data.get("list", []))
```

---

## 4. 재무제표 추출 (BS / IS / CF)

핵심 API는 **`fnlttSinglAcntAll.json`** 입니다. 한 번에 재무상태표(BS)·손익계산서(IS)·현금흐름표(CF)를 계정 단위로 줍니다.

| 파라미터 | 값 | 의미 |
|---|---|---|
| `bsns_year` | `2023` | 사업연도 |
| `reprt_code` | `11011` | 사업보고서(연간). 분기: 11013/11012/11014 |
| `fs_div` | `CFS` / `OFS` | 연결(CFS) / 별도(OFS) |

```python
def get_financial_statements(corp_code: str, year: str,
                             reprt_code: str = "11011",
                             fs_div: str = "CFS") -> pd.DataFrame:
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bsns_year": year,
        "reprt_code": reprt_code,
        "fs_div": fs_div,
    }
    resp = session.get(f"{BASE}/fnlttSinglAcntAll.json", params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "000":
        raise RuntimeError(f"DART {data.get('status')}: {data.get('message')}")

    df = pd.DataFrame(data["list"])
    # sj_div: BS(재무상태표) / IS(손익) / CIS(포괄손익) / CF(현금흐름)
    keep = ["sj_div", "account_nm", "thstrm_amount", "frmtrm_amount"]
    df = df[keep].copy()
    # 금액은 콤마 박힌 문자열 → 숫자. 빈 값/('-') 방어
    for col in ["thstrm_amount", "frmtrm_amount"]:
        df[col] = (df[col].astype(str)
                          .str.replace(",", "", regex=False)
                          .replace({"": None, "-": None}))
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df
```

**더미 출력 예시** (실제 호출 결과 형태만 보여주는 합성 데이터):

```python
# 예시 출력 (synthetic dummy — 실제 수치 아님)
#   sj_div         account_nm   thstrm_amount   frmtrm_amount
# 0     BS               자산총계   4.500000e+12    4.100000e+12
# 1     BS               부채총계   1.800000e+12    1.700000e+12
# 2     BS               자본총계   2.700000e+12    2.400000e+12
# 3     IS               매출액     3.200000e+12    2.950000e+12
# 4     IS               영업이익   4.100000e+11    3.600000e+11
# 5     CF   영업활동현금흐름       5.200000e+11    4.800000e+11

bs = df[df["sj_div"] == "BS"]      # 재무상태표만
is_ = df[df["sj_div"] == "IS"]     # 손익계산서만
```

`thstrm_amount`(당기) / `frmtrm_amount`(전기)가 한 행에 같이 오기 때문에 **YoY 비교가 별도 호출 없이 바로** 됩니다. 게임에서 M+1 리텐션 보던 감각으로 전기/당기 증감률을 붙이면 끝입니다.

---

## 5. XBRL vs JSON(HTML 파싱) — 무엇을 쓸까

DART에서 재무 데이터를 얻는 경로는 크게 셋입니다.

| 방식 | 장점 | 단점 | 추천 상황 |
|---|---|---|---|
| **JSON API** (`fnlttSinglAcntAll`) | 가장 간단, 계정 정규화됨 | 표준계정 위주, 주석/세부 누락 | **대부분의 자동화** |
| **XBRL** (재무제표 원본 파일) | 태그(컨셉) 기반, 기계가독 최고, 단위/기간 명시 | 분류체계(taxonomy) 학습 비용 | 정밀·대량·교차검증 |
| **HTML(원문) 파싱** | 주석·비표준 항목까지 | 레이아웃마다 깨짐, 유지보수 지옥 | 최후의 수단 |

저는 **"JSON 우선, 막히면 XBRL, HTML은 회피"** 원칙을 씁니다. JSON이 안 주는 세부 계정(특정 주석 항목 등)이 필요할 때만 XBRL 원본(`fnlttXbrl.xml`로 zip 수신)을 파싱합니다.

```python
def download_xbrl(rcept_no: str, reprt_code: str = "11011") -> bytes:
    """XBRL 원본(zip) 수신. rcept_no는 공시 접수번호(list.json에서 획득)."""
    params = {"crtfc_key": DART_API_KEY, "rcept_no": rcept_no, "reprt_code": reprt_code}
    resp = session.get(f"{BASE}/fnlttXbrl.xml", params=params, timeout=60)
    resp.raise_for_status()
    return resp.content  # zip bytes — 내부 .xbrl/.xml을 ET/arelle로 파싱
```

XBRL은 `concept`(예: `ifrs-full:Revenue`), `contextRef`(기간), `unitRef`(통화), `decimals`(정밀도)를 들고 있어서 **숫자 자체보다 "이 숫자가 무엇인지"가 명확**합니다. 본격 파싱은 `arelle` 같은 전용 라이브러리가 편하지만, 단순 추출은 `ElementTree`로도 충분합니다.

---

## 6. 동종업계 비교 아이디어 (+ Claude로 요약 자동화)

여러 기업의 표준계정을 한 테이블로 모으면 **동종업계 비교**가 됩니다. 게임 3사 지표를 나란히 놓고 원인 분석하던 방식 그대로입니다.

```python
def build_peer_table(names: list[str], year: str) -> pd.DataFrame:
    metrics = ["매출액", "영업이익", "자산총계"]
    rows = []
    for name in names:
        df = get_financial_statements(corp_code_of(name), year)
        wide = (df[df["account_nm"].isin(metrics)]
                .set_index("account_nm")["thstrm_amount"])
        rows.append({"기업": name, **{m: wide.get(m) for m in metrics}})
    peer = pd.DataFrame(rows)
    peer["영업이익률(%)"] = (peer["영업이익"] / peer["매출액"] * 100).round(1)
    return peer

# peer = build_peer_table(["A기업", "B기업", "C기업"], "2023")
```

여기에 **숫자 해석을 자연어로 정리하는 보조 단계**를 붙이면 리포트 자동화가 완성됩니다. 회계법인 메모리 규칙대로, 아래 helper는 **수집·정리된 공개 수치를 "데이터 관점에서 설명"** 할 뿐 회계 판단/투자 권유를 하지 않습니다. (Anthropic 표준 SDK, 모델은 `claude-opus-4-8`)

```python
import os
import anthropic
import pandas as pd

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수에서 읽음

SYSTEM_PROMPT = (
    "너는 데이터 분석 보조다. 입력으로 받은 공개 재무 수치(표)를 "
    "'데이터 관점'에서 사실 위주로 비교·요약한다. "
    "회계 판단·감사의견·투자 권유·종목 추천은 절대 하지 않는다. "
    "수치 출처는 공개 DART 데이터임을 전제로, 증감과 비율만 담백하게 서술한다."
)

def summarize_peer_table(peer: pd.DataFrame) -> str:
    user_prompt = (
        "다음 동종업계 비교 표를 3~4문장으로 요약해줘. "
        "매출/영업이익률 차이를 사실 위주로만.\n\n"
        f"{peer.to_markdown(index=False)}"
    )
    resp = client.messages.create(
        model="claude-opus-4-8",           # 고볼륨/비용절감이면 "claude-sonnet-4-6"
        max_tokens=1024,
        thinking={"type": "adaptive"},      # opus 4.8 권장: 적응형 사고
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return next(b.text for b in resp.content if b.type == "text")
```

> 참고: `claude-opus-4-8`은 `temperature`/`budget_tokens` 같은 옛 파라미터를 받지 않습니다(400). 사고 조절은 `thinking={"type": "adaptive"}` + `output_config={"effort": ...}`로 합니다.

---

## 7. 자주 깨지는 데이터 처리 팁 (실전 체크리스트)

손으로 100번 깨져 보고 정리한 목록입니다.

1. **`status` 코드를 먼저 확인.** `000`만 정상. `013`(조회 데이터 없음), `020`(키 한도 초과)은 예외가 아니라 정상 응답으로 옵니다. `raise_for_status()`만으론 못 잡습니다.
2. **금액은 콤마 문자열.** `"3,200,000,000,000"` → 콤마 제거 후 `pd.to_numeric(errors="coerce")`. 빈 문자열·`"-"`도 방어.
3. **`corp_code`/`stock_code`는 무조건 str.** 앞자리 0 보존(`00126380`).
4. **연결(CFS) vs 별도(OFS).** 비교할 땐 반드시 같은 기준으로 통일. 섞으면 분석이 통째로 틀어집니다.
5. **계정명(`account_nm`)은 회사·연도마다 표기가 흔들립니다.** "영업이익" vs "영업이익(손실)" 등. 가능하면 XBRL `account_id`(표준 컨셉)로 매칭하는 게 안전.
6. **호출 한도 + 캐싱.** `corp_code` 매핑은 하루 한 번만 받아 로컬 캐시(parquet)로. 재무제표도 `(corp_code, year, fs_div)` 키로 캐싱.
7. **재시도/타임아웃.** `requests.Session` + 지수 백오프. 대량 수집 시 필수.
8. **분기 코드 헷갈림.** `11011`(사업보고서), `11014`(3분기), `11012`(반기), `11013`(1분기). 연간 비교인데 분기 코드를 섞지 말 것.

---

## 마무리

DART OpenAPI는 "공개 데이터를 코드로 다루는 자동화"를 연습하기에 정말 좋은 소재입니다. **키 발급 → corp_code → 공시검색 → 재무제표 추출 → (필요시) XBRL** 흐름만 잡으면, 나머지는 pandas로 원하는 만큼 가공할 수 있습니다. 게임·이커머스에서 쌓은 지표 집계 감각이 회계 도메인에서도 똑같이 통했고, 그게 제가 말하는 "도메인 + 자동화"의 실체입니다.

다시 강조하지만 — 저는 회계사가 아니고, 이 글은 **데이터 수집·파싱·교육 관점**입니다. 회계 판단·투자 권유는 전문가/공식 자료를 따르세요.

전체 코드(캐싱·재시도·XBRL 파서 포함)와 더미 데이터 예제는 레포에 있습니다.

- 📦 **[github.com/DBhyeong/dart-xbrl-parser](https://github.com/DBhyeong/dart-xbrl-parser)**
- 🎬 영상 버전 준비 중입니다 (수집→파싱→비교 라이브 코딩).

질문이나 깨지는 케이스 제보는 레포 이슈로 남겨주세요. 다음 글에선 XBRL taxonomy를 본격적으로 파서 표준 컨셉 매핑 테이블을 만드는 과정을 다루겠습니다.
