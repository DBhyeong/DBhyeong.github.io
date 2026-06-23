---
title: "Fable 5로 루프 설계하기 (Anthropic) — 자기교정 루프 + 메모리"
description: "Anthropic의 Fable 5는 직접 프롬프트보다 환경 피드백으로 self-correct하는 루프를 설계할 때 진가를 발휘한다는 정리 노트."
date: 2026-06-22
tags:
  - reading
  - ai-agent
  - loop-engineering
  - harness
---

# Fable 5로 루프 설계하기 (Anthropic)

> **핵심** — Anthropic의 최상위 모델 **Fable 5**(`claude-fable-5`, 자매 모델 Mythos 5)는 직접 프롬프트·스티어링보다 **환경 피드백으로 self-correct하는 루프를 설계**할 때 진가를 발휘한다. 두 가지 팁: ① 자기교정 루프 ② 메모리.

출처: Anthropic 글(사이먼 윌리슨 웹로그 경유 인용). 실험 수치는 Anthropic 자체 측정값이다.

## ① 자기교정 루프

- 도구: **`/goal`**(Claude Code) · **Outcomes**(Claude Managed Agents/CMA) — eval/rubric에 **hillclimb**. Fable 5는 루프 내 self-correct를 잘 수행한다(rubric이 환경에 피드백을 추가 → 실행 → 피드백 → 교정 → 충족까지).
- ⚠️ **채점자가 중요**: 모델은 자기 출력 self-critique에 약하다 → 독립 컨텍스트에서 채점하는 **verifier sub-agent**가 self-critique보다 우수하다. Outcomes는 **grader sub-agent**를 대신 스폰한다. (maker ≠ checker 원칙을 정지조건에도 적용)
- 실험 **Parameter Golf**(16MB·10분·8×H100 ML 챌린지, Karpathy autoresearch류): rubric 9기준, 최대 8시간. **Fable 5가 Opus 4.7보다 약 6배 개선**, **구조적 변화에 베팅**하고 양자화 회귀를 뚫고 최대 성과를 내는 회복력을 보였다. Opus 4.7은 첫 실험 소폭 개선 후 "스칼라 조정 → 측정 → 유지" 템플릿을 반복했다.

## ② 메모리 (세션 간 outer loop)

- Continual Learning Bench 1.0(SQL DB 순차질문, 각 질문 = 별도 세션, 공유 메모리; CMA 마운트 파일시스템).
- 효과적 메모리 진행 단계: **fail → investigate → verify → distill → consult**.
  - **Sonnet 4.6**: step 1(실패 노트·추측 나열, 거의 참조 안 함)
  - **Opus 4.7**: step 3(불확실성을 플래그한 스키마 참조를 작성하나 검증 커버리지 약 17%)
  - **Fable 5**: 완주(강한 런에서 **검증 73%**, 학습을 일반 규칙으로 distill)

## 정리

`/goal`·verifier 분리·메모리라는 세 축은 동일한 사상으로 묶인다. 결론은 **모델을 직접 스티어링하기보다 루프를 설계하고 메모리를 자가관리하게 두는 편**이 낫다는 것이다.

---

### 참고: Fable 5의 관련 API 동작

Anthropic 공개 문서 기준으로, 위 사상과 맞닿은 Fable 5의 특성 몇 가지를 덧붙인다.

- **사고(thinking)는 항상 켜져 있음** — `thinking` 파라미터를 생략하면 adaptive thinking이 적용된다. 깊이는 `output_config.effort`(`low`~`max`)로 조절한다.
- **장기 에이전트 작업** — 단일 요청이 수 분간 실행될 수 있어 timeout·스트리밍·진행 UX를 미리 설계해야 한다.
- **비동기 sub-agent 권장** — spawn-and-block보다 오케스트레이터와 비동기로 소통하는 long-lived sub-agent가 더 나은 결과를 낸다.
- **메모리 표면 제공이 유효** — `.md` 한 장이라도 학습을 적어둘 곳을 주고 "다음 세션에서 참조하라"고 지시하면 성능이 눈에 띄게 향상된다.
- **fresh-context verifier** — 자기비평(self-critique)보다 별도 컨텍스트의 검증 sub-agent가 대체로 우수하다.

*이 노트는 외부 공개 자료의 요약·정리이며, 모델 API 세부 동작은 출시 이후 변경될 수 있다. 정리: 2026-06-22.*
