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
**Current focus:** P3 — PWA 캐싱, 실단말 필요 (사용자 진행)

## Current Position

Status: P0~P2 구현·검증 완료, 브라우저 로그인 UI + 다지역(케냐·페루) 확장까지 완료, 코드 존재
Last activity: 2026-08-26 — P0(tileserver-gl+curl 4종)·P1(React+MapLibre 지도)·P2(NGINX+eGov 스타일 백엔드+MariaDB, 권한 필터링 e2e 검증)까지 전부 완료. 이어서 브라우저 로그인 폼(테스트 계정 4종 원클릭)·로그아웃 API·GPS 실측 위치 전송·"테스트 위치 보내기" 버튼을 붙이고, 케냐·페루 지도를 추가해 지역 전환 UI로 검증. 컨테이너 3개(tileserver-gl, osm-test-mariadb, osm-test-nginx) + Tomcat + Vite dev 서버가 로컬에 기동 중

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
- 위치 열람 범위 확정(2026-08-26) — 관리자는 전원, 일반 사용자는 같은 파견지 인원만. 서버 필터링 (플랜 7절)

### Blockers/Concerns

- 진입점 미확인: TLS_EDGE 앞 기관 게이트웨이 유무 / 서브패스 여부 / WebSocket·SSE 허용 / 유휴 타임아웃 (`OSM-INTEGRATION.md` 9절) — **P3(실단말)·운영 이식 전까지만 필요**
- 폐쇄망 반입 절차 — 8절. 경로 2안(Artifactory 업로드 vs Squid 허용 목록) 중 표준 미정, WAS VM Docker 유무도 미확인
- Tomcat 9.0.78 미패치 CVE — 로컬 인스턴스에서 완화 3종(readonly 기본값·HTTP/2 비활성) **파일로 직접 확인 완료** (P2). 운영 배치 시 동일 확인 필요
- **운영 이식 시 tileserver-gl `--public_url` 필수** — 안 하면 NGINX 뒤에서 타일이 조용히 깨진다 (DEAD-ENDS.md)
- 위치 열람 범위(관리자 전원/파견지 단위)를 e2e 로 실증했지만, 실제 파견지 조직 데이터 연동은 미이행 — 지금은 `app_user.site_id` 테스트 스텁뿐

## Session Continuity

Last session: 2026-08-26
Stopped at: **P0~P2 구현·검증 + 브라우저 로그인 UI + 다지역 확장 완료.** tileserver-gl(:8081, `--public_url`
적용, korea/kenya/peru 3지역)·MariaDB 10.11(:3307)·eGov 스타일 백엔드+Tomcat 9.0.78(:8082, 로그인/로그아웃
포함)·NGINX(:8888, 단일 오리진)·React+MapLibre 프론트(Vite :5173, 로그인 폼+지역 선택 UI) 전부 로컬에 떠
있고 서로 연동 확인됨. 권한 필터링(관리자 전원/파견지 단위) e2e 실증 완료. agent-browser 로 로그인→한국/
케냐/페루 전환→위치 전송까지 스크린샷으로 실측(확인 후 삭제 — 결론은 위 문장 자체가 기록). 상세는 OSM-INTEGRATION.md 4절, 삽질은
DEAD-ENDS.md(Tomcat 핫재배포 파일 잠금, MapLibre setStyle 재호출 시 'style.load' 미발생)
Next: P3 — PWA 캐싱, mkcert 인증서 + 실단말 필요 (사용자 진행). 커밋·푸시 완료(1215c77 로그인 UI,
69ac165 다지역 — origin/main). 로컬 컨테이너·프로세스를 계속 띄워둘지 정리할지 다음 세션에서 사용자와 확인

<!--
100줄을 넘기지 말 것. 아카이브가 아니라 다이제스트다.
"한 번 읽으면 지금 어디인지 안다"가 목표 — 길어지면 그 목적이 깨진다.
결정이 쌓이면 여기엔 최근 3~5개만 두고 전체는 PROJECT.md 로 보낸다.
Performance Metrics / Deferred Items 섹션은 GSD 를 켤 때 자동으로 추가된다.
-->
