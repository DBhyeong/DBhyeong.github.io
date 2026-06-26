---
title: "drawio-skill — 자연어로 draw.io 다이어그램을 그리는 에이전트 스킬 (코드베이스 시각화까지)"
description: "좌표를 일일이 찍지 않고 '마이크로서비스 아키텍처 그려줘'처럼 말로 설명하면 .drawio XML을 생성하고 PNG/SVG/PDF로 내보내는 에이전트 스킬. 순수 SKILL.md 하나로 동작하고, 출력 PNG를 스스로 읽어 겹침·잘린 라벨을 자동 교정하는 self-check 루프가 특징. 코드베이스 임포트 그래프/클래스 계층도 자동 배치. 9bow(박정환)가 공유한 글을 정리한 학습 노트."
date: 2026-06-26
tags:
  - reading
  - claude-code
  - agent-skill
  - diagram
---

# drawio-skill — 자연어를 draw.io 다이어그램으로

> **출처 메모** — 9bow(박정환)가 공유한 글([pytorchkr 경유](https://github.com/Agents365-ai/drawio-skill?utm_source=pytorchkr&ref=pytorchkr))을 읽고 정리한 노트다. 도구는 Agents365-ai의 오픈소스(MIT)이고, 나는 아직 직접 설치해 돌려보진 않았다. 아래 수치·기능은 저자/문서가 주장하는 값이다.

블로그 문체 가이드를 만들면서 가장 자주 부딪힌 게 **"모든 설명을 도식으로"**였다. Mermaid는 README에 박기 좋지만, AWS 아이콘이 박힌 아키텍처 그림이나 발표용 다이어그램은 결국 draw.io를 손으로 그려야 했다. **drawio-skill**은 바로 그 손작업을 없애는 걸 노린다 — 말로 설명하면 배치·연결을 알아서 계획해 `.drawio` 파일과 PNG/SVG/PDF/JPG까지 만들어준다.

## 한 장 요약

```mermaid
flowchart LR
    NL["자연어 설명<br/>'마이크로서비스<br/>전자상거래 아키텍처'"] --> PLAN["레이아웃 계획"]
    PLAN --> XML[".drawio XML 생성"]
    XML --> EXPORT["내보내기<br/>PNG/SVG/PDF/JPG"]
    EXPORT --> CHECK["self-check<br/>PNG를 직접 읽어<br/>겹침·잘린 라벨 탐지"]
    CHECK -->|"최대 2회 자동수정"| XML
    CHECK --> OUT["결과 + 최대 5회<br/>사용자 반복 수정"]
```

핵심 차별점은 **"자기 출력을 스스로 읽고 고친 뒤에 보여주는 순수 SKILL.md 솔루션"**이라는 점이다. 별도 MCP 서버나 백그라운드 데몬 없이 `SKILL.md` 하나 + draw.io 데스크톱 CLI로 동작한다.

## 두 갈래 기능

| 갈래 | 무엇 | 어떻게 |
|---|---|---|
| **자연어 → 다이어그램** | 말로 설명 → 배치·연결 자동 계획 | 6개 프리셋(ERD·UML 클래스·시퀀스·아키텍처·ML/딥러닝·플로우차트) |
| **코드베이스 → 구조도** | 기존 프로젝트의 구조를 자동 추출·배치 | 추출기 → 자동 배치(Graphviz) → 검증 |

**코드베이스 시각화**가 특히 눈에 띈다. Python·JS/TS·Go·Rust의 임포트 그래프와 Python 클래스 상속 계층을 뽑아 자동 배치한다. 큰 그래프에선 **전이적 감소(transitive reduction)**로 이미 함축된 간선을 지워 — 저자에 따르면 asyncio 모듈 간선을 149개 → 46개로 줄였다고 한다. (배치엔 Graphviz 필요, 나머지는 없이도 동작)

```bash
# 임포트 그래프 추출 (Py / JS-TS / Go / Rust)
python3 scripts/pyimports.py myproject --group -o graph.json
# Python 클래스 상속 계층
python3 scripts/pyclasses.py mypackage --group -o graph.json
# 추출 결과 → 자동 배치 → 편집 가능한 .drawio
python3 scripts/autolayout.py graph.json -o diagram.drawio
```

## 소소하지만 실용적인 두 가지

- **도형 검색(`shapesearch.py`)**: 공식 draw.io 도형 1만+ 개에서 정확한 스타일 문자열을 찾아 AWS·Azure·GCP·Cisco·Kubernetes·UML·BPMN 아이콘이 빈 상자로 깨지지 않게 한다.
- **AI/LLM 로고(`aiicons.py`)**: draw.io에 없는 최신 로고 321개(OpenAI·Claude·Gemini·Mistral·Llama·LangChain·HuggingFace…)를 lobe-icons(MIT)에서 가져와 draw.io 이미지 스타일로 변환. LLM 앱 아키텍처 그림이 밋밋한 상자로 그려지는 문제를 푼다.

## 설치

```bash
# macOS: draw.io 데스크톱 CLI (Windows/Linux는 문서 참고)
brew install --cask drawio
# 스킬 설치 (Claude Code·Cursor·Copilot 등)
npx skills add Agents365-ai/365-skills -g
# 또는 플러그인 마켓플레이스
# /plugin marketplace add Agents365-ai/365-skills  →  /plugin install drawio
```

Claude Code·Opencode·OpenClaw·Hermes·Codex·SkillsMP 등 Agent Skills 형식을 지원하는 여러 에이전트에서 동작한다. 데스크톱 CLI가 없으면 diagrams.net 브라우저 URL로 폴백한다.

## 내 메모

- 나는 평소 Mermaid로 도식을 쌓는데([[graphify-llm-wiki-ast-preprocessing|코드베이스→그래프]] 류와 결이 닿는다), drawio-skill은 **"발표·문서용 정식 다이어그램"** 쪽을 메운다. 같은 제작자(Agents365-ai)가 mermaid-skill·excalidraw-skill·plantuml-skill도 내놨다니, 용도별로 갈라 쓰면 될 듯.
- 가장 끌리는 건 **self-check 루프**다. 도식 자동생성의 고질병이 '선이 도형을 가로지르는' 배선 문제인데, 출력 PNG를 모델이 직접 보고 고친다는 접근은 검증해볼 가치가 있다.
- 아직 직접 안 돌려봤으니, 실제로 한국어 프롬프트·복잡한 토폴로지에서 배선이 얼마나 깔끔한지는 추후 실습 후 보강 예정.

---

*원문(저자: Agents365-ai, MIT) · 9bow(박정환) 공유 · [GitHub](https://github.com/Agents365-ai/drawio-skill) · [문서](https://agents365-ai.github.io).*
