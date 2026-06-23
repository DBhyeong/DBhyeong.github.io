---
title: "claude-obsidian (AgriciDaniel) — Obsidian을 자기조직 AI 두뇌로 만드는 Claude Code 플러그인 [출처요약+팩트체크]"
description: "Karpathy의 LLM 위키 패턴을 구현한 Claude Code 플러그인 claude-obsidian의 스킬 구성과 동작을 1차 출처와 대조해 정리하고, 원문 블로그의 과장된 통계를 팩트체크한 노트."
date: 2026-06-22
tags:
  - reading
  - llm-wiki
  - coding-agent
  - knowledge-management
---

# claude-obsidian (AgriciDaniel)

> **무엇** — Obsidian 볼트를 **자기조직 AI 두뇌**로 만드는 **Claude Code 플러그인/스킬 모음**. Karpathy의 LLM 위키 패턴 구현체. clone → `bin/setup-vault.sh` → 폴더를 Obsidian으로 열고 같은 폴더에서 Claude Code 실행 → `/wiki`. 소스를 `raw/`에 드롭하면 **엔티티·개념·소스 페이지를 위키링크로 자동 연결**한 평문 MD 그래프 생성.

## 출처

- [GitHub: AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) (repo)
- [원문 블로그: claude-obsidian — AI Second Brain](https://agricidaniel.com/blog/claude-obsidian-ai-second-brain)
- [한국 리포스트 (discuss.pytorch.kr)](https://discuss.pytorch.kr/t/claude-obsidian-claude-code-obsidian/10325)

## 검증된 사실 (1차 출처 대조)

- **MIT 라이선스**, **2026-04-07 생성**, 최신 **v1.9.2 (2026-05)**. 저자 Agrici Daniel.
- **스킬 15개**(블로그 본문은 "~10개"라 했으나 실제 15): `wiki · wiki-ingest · wiki-query · wiki-lint · save · autoresearch · canvas · defuddle · obsidian-markdown · obsidian-bases` + `think · wiki-cli · wiki-fold · wiki-mode · wiki-retrieve`.
- **Hot cache**: `wiki/hot.md`(최근 컨텍스트 캐시, 설계 스펙 ~500단어, 세션마다 갱신, `index.md`보다 먼저 읽음) → 세션 기억상실 완화.
- **병렬 멀티에이전트 ingest**: `scripts/wiki-lock.sh` 파일별 advisory lock(한 writer가 잠그면 다른 쪽 재시도). v1.7부터 다중 writer 안전.
- **`setup-multi-agent.sh` = 6개 툴 설치**: Claude Code(`.claude-plugin/`) · Codex(`~/.codex/skills`) · OpenCode · Gemini(`~/.gemini/skills`) · Cursor(`.cursor/skills`) · Windsurf.
- **`/autoresearch`**: 자율 웹리서치 루프(광범위 검색 → 공백 보완 → 종합 → 위키 파일링, 교차참조 포함).

## 주요 스킬 (트리거)

| 스킬 | 기능 | 트리거 |
|---|---|---|
| wiki / wiki-ingest | 볼트 셋업 / 소스→엔티티·개념 페이지 + 상호참조 | `/wiki` / `ingest [source]` |
| wiki-query | 특정 페이지 인용해 검색·응답 | "X에 대해 뭐 알아?" |
| wiki-lint | 고아·깨진 링크·모순·결측 점검 | "lint the wiki" |
| autoresearch | 자율 웹리서치 루프 | `/autoresearch [주제]` |
| save / canvas / defuddle | 대화→위키노트 / 시각자료 / 웹페이지 정제(토큰 40~60%↓) | `/save` `/canvas` URL |

## 팩트체크 정정

| 글 주장 | 실제 (검증) |
|---|---|
| 스타 **~358** | ❌ 실제 **7,282 (~7.3k)**, 포크 ~846 — 글이 크게 outdated/오류 |
| 스킬 "~10개" | 실제 **15개** |
| PKM AI 시장 $1.65B / 46.7% CAGR $11.24B / McKinsey 30-45% / Fed 5.4% | ⚠️ **마케팅 필러** — repo 속성 아님. 두 통계는 서로 다른 유료 리포트를 섞은 것. 신뢰 X |

> vs Smart Connections·Copilot(둘 다 RAG 챗봇 = 기존 노트에 질의) — claude-obsidian은 **생성·정리·유지·진화하는 엔진**이라는 글 주장은 기능상 합리적(검증된 스킬셋과 부합).

## 평가 메모

- **평문 MD · MIT · Claude Code · Obsidian** 조합으로, 로컬 평문 마크다운 지식 관리 환경과 잘 맞는 자동화 후보다.
- LLM 위키형 자동화 툴 중에서 기능(15스킬·hot cache·autoresearch·lint)이 풍부한 편이며 라이선스도 MIT로 열려 있다.

---

*동일 대상(통합): `discuss.pytorch.kr/.../10325` · `agricidaniel.com/blog/...` · `github.com/AgriciDaniel/claude-obsidian`. 팩트체크: 2026-06-22, GitHub API·README·setup 스크립트 직접 확인.*
