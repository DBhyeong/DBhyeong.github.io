---
title: "LLM/AI 정보원·구독처 카탈로그"
description: "코딩 에이전트·문서AI·RAG 실무자를 위한 해외/국내 AI 뉴스레터, 논문 피드, 모델 비교 사이트 큐레이션."
date: 2026-06-22
tags:
  - reading
  - ai-news
  - knowledge-management
---

# LLM/AI 정보원·구독처 카탈로그

> **이 노트는?** AI/LLM 읽을거리 스트림을 보강할 **정보원 목록**이자, 향후 일일 다이제스트 자동화의 소스 레지스트리로 활용할 수 있는 카탈로그. PyTorch KR·GeekNews(=Hacker News 한국판)와 겹치지 않는 보완재 위주로 골랐다. 우선순위: **뉴스레터(시간 대비 정보량) > 논문 피드 > 커뮤니티.** ★ = 코딩 에이전트·Claude Code 실무자에게 특히 추천.

## 최소 조합 (이것만 추가해도 충분)

**AI News(smol.ai) + Simon Willison + HF Daily Papers** (+ 모델 고를 때 **Artificial Analysis**, 국내 적용사례 **TechBlogPosts**). 문서AI·MCP·코딩에이전트·RAG·업무자동화에 관심이 있다면 **Latent Space + Simon Willison + HF** 조합이 가장 효율적이다.

## 해외 뉴스레터 (구독형)

| 사이트 | 특징 | 추천 | 구독 |
|---|---|---|---|
| **AI News** ([news.smol.ai](https://news.smol.ai)) ★ | Reddit·Discord·X·arXiv 자동요약 **일간 다이제스트**. 하나만 본다면 이거 | ★★★★★ | 뉴스레터/웹 |
| **Latent Space** ([latent.space](https://www.latent.space)) ★ | 엔지니어 관점 심층분석+팟캐스트, 에이전트 트렌드 강함 | ★★★★★ | RSS/뉴스레터 |
| **Simon Willison** ([simonwillison.net](https://simonwillison.net)) ★ | LLM 실전·툴링·CLI, Claude Code와 결이 가장 맞음 | ★★★★★ | **RSS** |
| The Batch ([deeplearning.ai/the-batch](https://www.deeplearning.ai/the-batch/)) | Andrew Ng, 주간, 균형 잡힌 개관 | ★★★★☆ | RSS/뉴스레터 |
| Import AI ([importai.substack.com](https://importai.substack.com)) | Jack Clark(Anthropic 공동창업자), 정책·안전·연구 | ★★★★☆ | RSS |
| Ahead of AI ([magazine.sebastianraschka.com](https://magazine.sebastianraschka.com)) | Sebastian Raschka, 아키텍처/학습 심화 | ★★★★☆ | RSS |
| TLDR AI ([tldr.tech/ai](https://tldr.tech/ai)) · AlphaSignal | 5분 일간 요약, 가벼운 보조 | ★★★★☆ | 뉴스레터 |

## 논문·기술 피드

| 사이트 | 특징 | 추천 | 구독 |
|---|---|---|---|
| **HF Daily Papers** ([huggingface.co/papers](https://huggingface.co/papers)) ★ | 커뮤니티 큐레이션 일간 트렌딩 논문 | ★★★★★ | 웹/RSS(비공식) |
| alphaXiv ([alphaxiv.org](https://www.alphaxiv.org)) | 논문 라인별 토론·트렌딩 | ★★★★☆ | 웹 |
| arXiv cs.CL / cs.LG | 원천 소스 | ★★★★☆ | **RSS** |

> ⚠️ **팩트체크:** Papers with Code는 2025-07 Meta가 종료(벤치마크 9,327·논문-코드 79,817 등 미유지)하면서 해당 도메인은 **HF Trending Papers로 리다이렉트**된다. 북마크에 있으면 교체할 것.

## 모델 비교·순위

| 사이트 | 특징 | 추천 |
|---|---|---|
| **Artificial Analysis** ★ | 성능 + **API 가격·속도·지연·컨텍스트·오픈웨이트** 비교 (모델 선택 판단) | ★★★★★ |
| LM Arena | 사용자 선호 투표 기반 텍스트·코딩·비전 순위 | ★★★★☆ |
| OpenRouter Rankings | 실제 사용량 기반(채택 흐름 보조지표) | ★★★★☆ |

## 국내 (한국어)

| 사이트 | 특징 | 추천 |
|---|---|---|
| **TechBlogPosts** ★ | 네이버·카카오·AWS·삼성·한컴 등 **국내 기업 기술블로그 집약** (적용 사례) | ★★★★☆ |
| **AI타임스** ([aitimes.com](https://www.aitimes.com) / [aitimes.kr](https://www.aitimes.kr)) 🤖 | 국내외 생성형 AI·기업·에이전트 일간 (원문 재확인 권장). allArticle RSS 2종 제공(`cdn.aitimes.com/rss/gn_rss_allArticle.xml`·`www.aitimes.kr/rss/allArticle.xml`). 일반 AI뉴스라 하드웨어·정책 포함 → LLM/에이전트만 큐레이션하면 좋다 | ★★★★☆ |
| 박재홍의 실리콘밸리 (wikidocs.net) | **AI News(smol.ai) 한국어 번역·해설** (영어 부담↓) | ★★★★☆ |
| 44BITS 팟캐스트 | 코딩 에이전트·로컬LLM·도구 이슈 (이동 중 청취) | ★★★★☆ |
| arca.live AI 로컬채널 | 로컬LLM·오픈웨이트 실측/세팅 디테일 빠름 (신호대잡음 낮음) | ★★★☆☆ |

## 커뮤니티 (디테일 풍부 / 잡음 많음 → 공식 재확인 필수)

- **r/LocalLLaMA** — 오픈웨이트·로컬 추론 최전선
- **r/ClaudeAI** — Claude Code 활용/트러블슈팅
- r/MachineLearning — 연구 토론
- **Hacker News** ([news.ycombinator.com](https://news.ycombinator.com), GeekNews 원조) · **Lobsters** ([lobste.rs](https://lobste.rs), 기술 깊이)

## 인프라·정책 (깊게 볼 때)

- **SemiAnalysis** — GPU·데이터센터·추론 비용·반도체 공급망 (AI 산업·비용 구조)
- The Batch / Import AI (위 뉴스레터에도 포함)

## 공식 발표 확인용 (최종 검증)

OpenAI News · **Anthropic Newsroom**(Claude/Claude Code) · Google DeepMind Blog(Gemini/Gemma) · Hugging Face Blog · Mistral AI News · Meta AI Blog

## 권장 운영 루틴

- **매일 10분**: GeekNews → AI News(smol.ai)/Latent Space → TLDR AI
- **주 1회**: Simon Willison → HF Daily Papers
- **신규 모델 출시 시**: Artificial Analysis → LM Arena → 공식 발표
- **업무 적용 사례 조사**: TechBlogPosts → 기업 기술블로그 원문

---

*활용 아이디어: 이 카탈로그를 소스로 한 일일 다이제스트 자동화(RSS 수집 → 관심 키워드 필터·요약 → 날짜별 마크다운 정리)를 구성하면 읽을거리 스트림 관리가 한결 수월해진다.*
