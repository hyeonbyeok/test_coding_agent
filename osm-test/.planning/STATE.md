---
gsd_state_version: '1.0'
status: planning
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-21)

**Core value:** 작동하는 것을 빨리 본다 — 설계보다 실행
**Current focus:** P0 — tileserver-gl 띄우고 curl 로 응답 검증

## Current Position

Status: 계획 중
Last activity: 2026-08-21 — 설치 가이드(pptx) 분석 → `OSM-INTEGRATION.md` 플랜 작성. 코드는 아직 없다

## Accumulated Context

### Decisions

전체 목록은 `PROJECT.md` 의 Key Decisions 표에 있다. 지금 작업에 영향을 주는 것만:

- 자체 타일 서버 운영 (tileserver-gl + Geofabrik Shortbread) — Out of Scope 에서 철회
- MapLibre GL JS 단독, Leaflet 브리지 안 씀
- NGINX 단일 오리진(Caddy 폐기 — 운영 WEB VM 이 NGINX), 타일은 Tomcat 우회
- 인증서: 운영은 TLS_EDGE(Let's Encrypt)가 TLS 담당, 내부 NGINX 는 HTTP. 테스트 실단말은 mkcert(테스트 환경엔 TLS_EDGE 없음)
- 위치 갱신은 폴링, 테이블은 latest/log 분리
- 런타임 확정: Java 17 / Tomcat 9.0.78 고정(패치·메이저 업그레이드 불가) — 조합 성립 검증 완료, 미패치 CVE 는 설정 완화 필수 (플랜 3절)
- PWA 확정(네이티브 불가 환경) — 백그라운드 위치 제한 인지·수용, 화면에 떠 있는 동안만 전송

### Blockers/Concerns

- 진입점 미확인: TLS_EDGE 앞 기관 게이트웨이 유무 / 서브패스 여부 / WebSocket·SSE 허용 / 타임아웃 (`OSM-INTEGRATION.md` 9절) — **P2 진입 전까지만 필요, P0/P1 은 무관**
- 폐쇄망 반입 절차 — 8절. 경로 2안(Artifactory 업로드 vs Squid 허용 목록) 중 표준 미정, WAS VM Docker 유무도 미확인. **개발 PC 는 외부망 가능**하므로 P0/P1 검증 자체는 막히지 않는다
- Tomcat 9.0.78 미패치 CVE (RCE 포함) — 업그레이드 불가라 설정 완화가 유일한 방어. P2 배치 시 3절 완화 3종(readonly·HTTP/2 미사용·메서드 제한) 적용 확인 필요

## Session Continuity

Last session: 2026-08-26
Stopped at: 운영 네트워크 다이어그램(실제 운영 환경, 테스트 환경엔 없음) 반영 — Caddy→NGINX 전환, 인증서 운영=TLS_EDGE(Let's
Encrypt), 폐쇄망 확정(firewalld+Squid), 반입 경로 Artifactory/Squid 2안 (OSM-INTEGRATION.md 3·5·7·8·9절 + CLAUDE.md·PROJECT.md 정합화)
Next: P0 (tileserver-gl 띄우고 curl 4종 확인, 재현성 절 참고) — 진입점 구성·백그라운드 요구·위치 열람 범위·WAS Docker
유무·Squid 정책 확인은 P0 를 막지 않는다. P2 진입 전까지만 확정하면 된다 (런타임은 이미 확정됨)

<!--
100줄을 넘기지 말 것. 아카이브가 아니라 다이제스트다.
"한 번 읽으면 지금 어디인지 안다"가 목표 — 길어지면 그 목적이 깨진다.
결정이 쌓이면 여기엔 최근 3~5개만 두고 전체는 PROJECT.md 로 보낸다.
Performance Metrics / Deferred Items 섹션은 GSD 를 켤 때 자동으로 추가된다.
-->
