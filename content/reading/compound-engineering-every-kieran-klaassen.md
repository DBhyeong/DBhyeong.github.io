---
title: "Compound Engineering (Every / Kieran Klaassen) 정리 + 팩트체크"
description: "엔지니어링 작업이 다음 작업을 더 쉽게 만든다는 'Compound Engineering' 철학과 Every의 플러그인을 요약하고, 글의 수치를 실제 repo와 대조해 팩트체크한 노트."
date: 2026-06-22
tags:
  - reading
  - coding-agent
  - loop-engineering
  - knowledge-management
---

# Compound Engineering (Every)

> **철학** — *각 엔지니어링 작업 단위가 다음 단위를 더 **쉽게** 만들어야 한다.* 기능이 복잡성을 더하는 대신 **시스템에 새 능력을 가르친다**. 버그 수정 = 버그 범주 제거, 패턴 = 미래 도구. 시간이 갈수록 코드베이스가 더 이해·수정·신뢰하기 쉬워짐. (Every가 1인 팀으로 Cora 등 6개 제품 운영하며 정립)

출처: [EveryInc/compound-engineering-plugin (GitHub repo)](https://github.com/EveryInc/compound-engineering-plugin) · Every.to — Compound Engineering 글(2026-05 업데이트)

## 핵심 루프 & 7단계
- 글의 서사: **아이디어구상 → 브레인스토밍 → 계획 → 실행 → 검토 → 다듬기 → 합성(가장 중요) → 반복**. 3국면: 시작(사람=무엇을), 중간(에이전트=계획·코딩·테스트·검토·PR), 끝(사람=충분한가 + 시스템이 재사용 가능한 걸 배웠나).
- **⑦ 합성(Compound)** = 해결책 기록 + YAML frontmatter로 검색가능화 + `CLAUDE.md`에 패턴 추가 → 다음번 자동 적용. "전통 개발은 6단계서 멈추지만 진짜 성과는 7단계."

## 버려야 할/받아들일 신념 (요지)
- 버릴 것: "코드는 손으로"·"모든 줄 수동 검토"·"해결책은 엔지니어에게서"·"코드가 주산출물"·"타이핑=학습"… → **시스템이 산출물**, 검토는 **안전망(테스트·검토에이전트)** 으로.
- 받아들일 것: **취향을 시스템에 인코딩**(CLAUDE.md/AGENTS.md·스킬·슬래시) · **50/50 법칙**(시간 절반은 시스템 개선) · **병렬화** · **계획이 새 코드** · **작업 아닌 결과물을 할당** · **장기 오케스트레이션(LFG)**.
- AI 개발 **5단계**: 0 수동 → 1 채팅보조 → 2 줄별검토 → **3 계획우선·PR만 검토(핵심 전환)** → 4 아이디어→출시(단일기기) → 5 병렬 클라우드(함대 지휘).

## 팩트체크 (글 vs 실제 repo)
실제 **`EveryInc/compound-engineering-plugin`** 확인 결과 — 글의 일부 수치가 현재 repo와 다름:

| 글/본문 주장 | 실제 repo (검증) |
|---|---|
| "40+ 에이전트 · 30+ 명령 · 35+ 스킬" / 파일트리 "43 subagents · 38 skills" | ❌ README 명시: **"27 skills, 0 standalone agents"**. (글은 구버전/사내 셋업 기준인 듯) |
| 7단계 루프(ideate→…→polish→compound) | repo는 **5단계** "brainstorm → plan → work → review → compound". `/ce-ideate`는 **선택**(루프 전) |
| 스타 | **약 21.9k** · MIT · v3.13.1(2026-06-17) |
| 지원 | Claude Code·Cursor·Codex·Copilot·Factory Droid·Qwen·OpenCode·Pi·Gemini CLI (9개) |
| 메인테이너 | **@kieranklaassen · @tmchow** (EveryInc) |

- 설치(Claude Code): `/plugin marketplace add EveryInc/compound-engineering-plugin` → `/plugin install compound-engineering`.
- 주요 명령(확인): `/ce-strategy /ce-ideate /ce-brainstorm /ce-plan /ce-work /ce-code-review /ce-doc-review /ce-debug /ce-compound /ce-compound-refresh /ce-product-pulse /lfg`.
- 생성 디렉터리: `AGENTS.md`(or `CLAUDE.md`) · `docs/{brainstorms,plans,solutions}/`(solutions는 문제유형별 카테고리 자동생성 — 기관 지식 축적).

## 메모
- **"시스템을 가르쳐라"·"취향을 CLAUDE.md에 인코딩"·합성(7단계)** 는 읽을거리/지식을 누적해 다음 작업을 쉽게 만드는 사상과 통한다. `/code-review`·`/simplify` 같은 검토 슬래시 워크플로가 ce의 검토 스킬과 대응된다.
- 플러그인 자체는 MIT라 차용 가능하나 Rails/제품팀 지향. **개념(50/50·계획=코드·결과물 할당·합성)** 차용이 현실적.

---
*팩트체크: 2026-06-22, EveryInc/compound-engineering-plugin README 직접 확인. 글은 Every.to 2026-05 버전 기준이라 현재 repo와 수치 차이.*
