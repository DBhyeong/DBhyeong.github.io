---
title: "Vrew 자막(.srt)을 SEO 블로그 글로 자동 변환하기 — LLM 콘텐츠 파이프라인"
date: 2026-06-21
tags:
  - ai-workflow
  - automation
  - seo
---

영상 하나를 찍으면 끝나는 시대는 지났다. 같은 콘텐츠를 블로그, 숏폼 설명란, 링크드인 글로 흩뿌려야 도달이 나온다. 문제는 그 "재가공"이 매번 30분~1시간씩 손으로 갈아넣는 단순노동이라는 점이다. 나는 12년차 데이터 분석가로 게임·이커머스·마케팅 도메인에서 "반복되는 손작업은 코드로 죽인다"를 신조로 삼아 왔는데, 콘텐츠 제작도 예외가 아니었다.

이 글은 **Vrew로 만든 자막 파일(.srt) 한 개를 입력하면 → SEO 구조를 갖춘 블로그 초안이 나오는** 파이프라인을 다룬다. 핵심은 세 가지다. (1) .srt를 깨끗한 텍스트로 파싱, (2) "구어체 → SEO 글 구조"로 바꾸는 LLM 프롬프트 설계, (3) 내 [related_kws](https://github.com/DBhyeong/related_kws)로 뽑은 실검색 키워드를 본문에 자연스럽게 주입.

## 왜 .srt에서 시작하나 — 영상 1개 → OSMU

영상을 다 만들고 나면 가장 정제된 텍스트 자산이 바로 자막이다. Vrew는 음성을 자동 인식해 타임코드가 박힌 .srt를 뱉어주는데, 이건 이미 "내가 실제로 말한 내용"이라 정보 밀도가 높다. 이걸 버리고 블로그를 백지부터 쓰는 건 낭비다.

OSMU(One Source Multi Use) 관점에서 자막 한 벌은 이렇게 퍼진다.

- **블로그**: 검색 유입용 장문 SEO 글 (이 글의 주제)
- **숏폼 설명란/핀 댓글**: 3~5문장 요약 + 해시태그
- **링크드인**: 인사이트 1개를 도발적으로 던지는 짧은 글
- **뉴스레터**: 블로그 글의 리드 문단 재활용

한 번 파이프라인을 깔아두면 영상 업로드 → 자막 export → 스크립트 실행 → 초안 4종이 떨어진다. 테라상사 마케팅 시절 300여 개 SNS 채널을 반자동 포스팅하며 누적 15만 view를 만들었던 경험에서 배운 건 하나다. **"콘텐츠는 양으로 누르되, 그 양을 사람 손으로 만들면 망한다."**

## 1단계 — .srt 파싱

.srt 포맷은 단순하다. `인덱스 번호 → 타임코드 → 자막 텍스트 → 빈 줄`이 반복된다.

```
1
00:00:00,120 --> 00:00:03,400
안녕하세요 오늘은 자막을 블로그로 바꾸는

2
00:00:03,400 --> 00:00:06,900
파이프라인을 만들어 보겠습니다
```

LLM에 넣기 전에 타임코드·인덱스를 걷어내고, Vrew 특유의 짧은 줄바꿈을 문장 단위로 다시 이어붙여야 한다. 외부 라이브러리 없이 표준 라이브러리만으로 처리한다.

```python
# tools/srt_to_blog.py
import re
from pathlib import Path

TIMECODE = re.compile(r"\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}")

def parse_srt(path: str) -> str:
    """Vrew .srt를 타임코드/인덱스 제거한 평문으로 변환."""
    raw = Path(path).read_text(encoding="utf-8-sig")  # Vrew는 BOM이 붙는 경우가 많다
    blocks = re.split(r"\n\s*\n", raw.strip())

    lines = []
    for block in blocks:
        block_lines = block.splitlines()
        # 1줄=인덱스, 2줄=타임코드를 걷어내고 본문만 남긴다
        text_lines = [
            ln.strip()
            for ln in block_lines
            if ln.strip()
            and not ln.strip().isdigit()
            and not TIMECODE.search(ln)
        ]
        if text_lines:
            lines.append(" ".join(text_lines))

    # 자막 줄바꿈을 한 덩어리로 이어붙이고, 중복 공백 정리
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    return text
```

`utf-8-sig`가 포인트다. Vrew export 파일은 BOM이 붙어 첫 인덱스가 `\ufeff1`로 읽히면 `isdigit()` 필터가 새서 타임코드가 본문에 섞인다. 게임 현금시세 크롤러를 MS-SQL에 적재하던 시절 한글 인코딩(charset/codepage)으로 데였던 기억 때문에 인코딩은 항상 먼저 의심한다.

너무 긴 영상은 자막이 1만 자를 넘기도 한다. 토큰·맥락 관리를 위해 문장 경계로 청크를 자른다.

```python
def chunk_text(text: str, max_chars: int = 6000) -> list[str]:
    """문장 경계(. ? ! 다/요)를 살려 청크 분할."""
    sentences = re.split(r"(?<=[.?!다요])\s+", text)
    chunks, buf = [], ""
    for s in sentences:
        if len(buf) + len(s) > max_chars and buf:
            chunks.append(buf.strip())
            buf = ""
        buf += s + " "
    if buf.strip():
        chunks.append(buf.strip())
    return chunks
```

## 2단계 — LLM 프롬프트 설계: 구어체 → SEO 글 구조

여기가 파이프라인의 두뇌다. 말로 한 내용은 "어, 그래서, 이게 좀" 같은 군더더기가 많고 논리 순서가 들쭉날쭉하다. LLM이 할 일은 **번역이 아니라 재구조화**다. 프롬프트를 설계할 때 내가 지키는 규칙.

- **사실 보존**: 자막에 없는 수치·주장 창작 금지 (할루시네이션 차단)
- **구조 강제**: H2/H3, 도입 후킹, 소제목, 마무리 CTA를 명시
- **SEO 메타**: title 후보, meta description(150자 내), slug를 함께 생성
- **키워드 슬롯**: 본문에 자연 삽입할 타깃 키워드를 인자로 받아 빈도·위치를 지시
- **출력 포맷 고정**: 후처리를 위해 frontmatter + 본문 형태로 강제

```python
SYSTEM_PROMPT = """당신은 한국어 기술 블로그 에디터다.
입력은 영상 자막에서 추출한 '구어체 스크립트'다.
이를 검색엔진 친화적인 블로그 글로 재구조화한다.

규칙:
1. 자막에 없는 사실/수치/고유명사를 새로 지어내지 마라.
2. 구어체 군더더기(어, 그래서, 음)는 제거하고 문어체로 다듬어라.
3. H2(##)/H3(###)로 논리 구조를 만들고, 도입부에 검색 의도를 잡는 후킹 문단을 둬라.
4. 제공된 '타깃 키워드'를 제목 1회, 첫 문단 1회, 소제목·본문에 자연스럽게 분포시켜라(키워드 스터핑 금지).
5. 출력은 아래 형식 그대로:
---
title: <SEO 제목>
description: <150자 이내 메타 설명>
slug: <영문 하이픈 slug>
keywords: [k1, k2, k3]
---
<마크다운 본문>
"""

def build_user_prompt(script: str, keywords: list[str]) -> str:
    kw = ", ".join(keywords) if keywords else "(없음 — 본문에서 핵심어 자동 추출)"
    return (
        f"[타깃 키워드]\n{kw}\n\n"
        f"[자막 스크립트]\n{script}\n\n"
        "위 스크립트를 SEO 블로그 글로 재구조화해줘."
    )
```

## 3단계 — related_kws로 실검색 키워드 주입

타깃 키워드를 감으로 넣으면 안 된다. 실제로 사람들이 검색하는 말이어야 유입이 난다. 그래서 내 사이드 프로젝트 [related_kws](https://github.com/DBhyeong/related_kws)를 끼운다. 이건 유튜브·구글·빙·다음·줌·네이버 멀티 엔진의 연관/자동완성 검색어를 수집하는 도구로, 테라상사 마케팅 FLOW의 1단계(키워드 리서치)를 그대로 코드화한 것이다.

영상의 핵심 주제어(seed)를 넣으면 연관어 후보가 나오고, 그중 상위를 LLM 프롬프트의 `keywords`로 전달한다.

```python
# related_kws 연동 (https://github.com/DBhyeong/related_kws)
# from related_kws import collect_related   # 실제 모듈 시그니처에 맞춰 호출

def get_target_keywords(seed: str, top_n: int = 5) -> list[str]:
    """seed 주제어로 멀티엔진 연관 검색어를 수집해 상위 N개 반환."""
    try:
        from related_kws import collect_related
        candidates = collect_related(seed, engines=["naver", "google", "youtube"])
        # 빈도·중복 정리 후 상위 N
        ranked = sorted(set(candidates), key=lambda k: candidates.count(k), reverse=True)
        return ranked[:top_n]
    except Exception:
        # 연동 전이면 seed만으로 진행
        return [seed]
```

키워드를 "발굴 → 글에 주입 → 발행 후 순위 모니터링"으로 닫는 게 핵심이다. 마케팅 시절 네이버 쇼핑 검색 1·3위, 통합검색 상위를 만든 로직이 정확히 이 루프였다.

## 4단계 — Anthropic SDK로 변환 실행

이제 파싱 결과 + 키워드를 LLM에 태운다. CONTEXT 표준 스니펫을 그대로 따른다.

```python
import os
import anthropic

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수에서 키를 읽음

def convert_to_blog(script: str, keywords: list[str]) -> str:
    user_prompt = build_user_prompt(script, keywords)
    resp = client.messages.create(
        model="claude-opus-4-8",   # 고볼륨/비용절감이면 "claude-sonnet-4-6"
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = next(b.text for b in resp.content if b.type == "text")
    return text
```

`thinking`/`temperature` 파라미터는 넣지 않는다(opus 4.8에서 `temperature`는 400 에러). 긴 자막은 청크별로 돌리되, 여러 청크면 1차로 청크별 요약 → 2차로 전체 통합 글 생성의 2패스 구조가 품질이 좋다. 전체를 엮는 엔트리 포인트.

```python
def run(srt_path: str, seed: str) -> str:
    script = parse_srt(srt_path)
    keywords = get_target_keywords(seed)
    chunks = chunk_text(script)

    if len(chunks) == 1:
        return convert_to_blog(chunks[0], keywords)

    # 멀티 청크: 청크 요약 → 통합
    partials = [convert_to_blog(c, keywords) for c in chunks]
    merged = "\n\n".join(partials)
    return convert_to_blog(merged, keywords)  # 통합 재구조화 1패스 더


if __name__ == "__main__":
    import sys
    out = run(sys.argv[1], seed=sys.argv[2])
    print(out)
```

## 5단계 — 자동 발행으로 연결

초안이 frontmatter + 본문 포맷으로 고정돼 있으니, 발행 단계는 단순 파싱 후 플랫폼 API에 태우면 된다. 나는 frontmatter를 떼어내 메타로, 본문을 페이로드로 분리한다.

```python
def split_frontmatter(doc: str) -> tuple[dict, str]:
    m = re.match(r"---\s*\n(.*?)\n---\s*\n(.*)", doc, re.S)
    if not m:
        return {}, doc
    meta_raw, body = m.group(1), m.group(2)
    meta = {}
    for line in meta_raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, body.strip()
```

여기서 곧장 티스토리/네이버/dev.to 발행 API나 GitHub 커밋으로 잇는다. 단, **자동 발행은 항상 "초안(draft)" 상태로 떨군 뒤 사람이 한 번 검수**하는 게 안전하다. LLM이 사실을 약간 비틀 수 있고, SEO 메타는 사람 눈으로 마지막에 다듬는 게 전환율에 유리하다. 반자동이 진짜 자동보다 오래 살아남는다 — 이건 마케팅 자동화에서 수없이 확인한 원칙이다.

## 마무리

정리하면 이 파이프라인은 **자막(.srt) → 평문 파싱 → related_kws 키워드 → LLM 재구조화 → frontmatter 초안 → 반자동 발행**으로 흐른다. 영상 하나가 블로그·숏폼·링크드인으로 분기하는 OSMU의 출발점이 자막 파일 하나라는 게 핵심이다.

AI 시대일수록 무기는 "도메인 지식 + 자동화 실행력"이다. 콘텐츠도 똑같다. 무엇을 말할지(도메인)는 사람이 정하고, 그걸 여러 채널 포맷으로 펴 바르는 단순 반복은 코드와 LLM에 넘긴다.

전체 코드는 `tools/srt_to_blog.py`로 정리해 [GitHub](https://github.com/DBhyeong)에 올릴 예정이고, 이 파이프라인을 실제로 돌리는 시연 영상도 준비 중이다. 관련해서 키워드 수집 로직이 궁금하면 [related_kws](https://github.com/DBhyeong/related_kws), 다른 자동화 레시피는 [python-automation-100](https://github.com/DBhyeong/python-automation-100)을 참고하면 된다.
