---
title: "Loop Engineering (Addy Osmani) — 5 구성요소 + 메모리"
description: "에이전트를 프롬프트하지 말고, 프롬프트하는 시스템(루프)을 설계하라는 Addy Osmani의 에세이를 정리한 노트."
date: 2026-06-22
tags:
  - reading
  - loop-engineering
  - coding-agent
  - ai-agent
---

# Loop Engineering (Addy Osmani)

원문: [Loop Engineering (addyo.substack.com)](https://addyo.substack.com/p/loop-engineering)

> **핵심** — *"에이전트에 프롬프트하는 당신을 대체하라 — 프롬프트하는 시스템(루프)을 설계하라."* 루프 = **재귀적 목표**(purpose 정의 → AI가 완료까지 반복). 인용: Steipete *"You should be designing loops that prompt your agents"*, Cherny *"My job is to write loops."* 포인트는 **도구 논쟁이 끝났다는 것** — Codex와 Claude Code 둘 다 이제 5개 구성요소를 다 갖춤.

## 5 구성요소 + ⑥ 메모리
1. **Automations(심장박동)** — 스케줄로 발견·triage 자동. Codex: Automations 탭(+Triage 인박스). Claude Code: `/loop`(주기 재실행)·cron·hooks·GitHub Actions. 그리고 **`/goal`**(검증 조건이 참이 될 때까지, **매 턴 별도 작은 모델이 완료 판정** → maker≠checker). 둘 다 `/goal` 보유.
2. **Worktrees(병렬 충돌 방지)** — git worktree / `--worktree` / `isolation: worktree`. *단, 사람의 리뷰 대역폭이 천장*.
3. **Skills(프로젝트 지식 기록)** — `SKILL.md`. intent를 외부에 한 번 적어두면 매 사이클 재추론 안 함(compounds).
4. **Plugins/Connectors(실도구 연결)** — MCP 기반(이슈트래커·DB·Slack). 한쪽 커넥터가 보통 다른 쪽에서도 동작.
5. **Sub-agents(maker/checker 분리)** — 쓴 모델은 자기 채점에 후함 → 다른 에이전트(다른 모델·지시)가 검증. Codex `.codex/agents/*.toml`, Claude `.claude/agents/`.
6. **Memory(척추)** — 대화 밖 markdown/Linear. *"모델은 매 실행 사이 다 잊는다 → 메모리는 디스크에. 에이전트는 잊어도 repo는 안 잊는다."*

## "한 루프"의 모습
아침 automation → triage skill이 어제 CI실패·이슈·커밋 읽어 state 파일에 기록 → 할 일마다 격리 worktree + maker subagent 초안 + checker subagent가 skill·테스트 대조 검증 → connectors가 PR 열고 ticket 갱신 → 처리 못 한 건 triage 인박스로 → state 파일이 척추(어제 멈춘 데서 재개). **한 번 설계, 어느 단계도 직접 프롬프트 안 함.**

## ⚠️ 한계·경고 (저자도 회의적)
- 토큰 비용 변동 큼 / 품질·slop 우려. **검증은 여전히 사람의 몫**("done"은 주장이지 증명 아님). **comprehension debt**(이해 격차)·**cognitive surrender**(생각 포기) 위험.
- *"Build the loop. Stay the engineer."* 같은 루프라도 깊이 이해하는 사람 vs 이해 회피하는 사람 → 정반대 결과. 루프는 차이를 모르지만 **사람은 안다.**

---
*에세이(저자 종합) 정리 노트. 2026-06-22.*
