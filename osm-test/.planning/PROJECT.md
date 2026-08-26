# osm-test

## What This Is

기존 테스트 개발 환경(eGov 4.3 / React 19.2 + Vite / PWA + GPS / MariaDB)에
자체 호스팅 OSM 벡터 타일 지도를 붙이는 실험 프로젝트.
설치 가이드(pptx, JSP 기준)를 React 스택으로 옮기고, 여러 사용자의 현재 위치를 지도에 실시간으로 표시한다.

## Core Value

**작동하는 것을 빨리 본다.** 설계보다 실행 — 충돌이 생기면 실제로 데이터가 흐르는 쪽을 고른다.

## Requirements

### Active

- tileserver-gl 을 띄워 curl 로 타일·폰트·TileJSON 응답 확인 (P0)
- React + MapLibre 로 지도와 현재 위치 표시 (P1)
- NGINX 단일 오리진 + 위치 저장/조회 API + `user_position_latest` 테이블 (P2)
- 다른 사용자 위치를 GeoJSON source 로 표시, 폴링 갱신 (P2)
- PWA 타일 캐싱 (P3)

단계 상세는 `OSM-INTEGRATION.md`.

### Validated

<!-- 완료되고 확인까지 끝난 것을 Active에서 여기로 옮긴다 -->

### Out of Scope

- OSM에 데이터를 기여(편집)하는 것 — 읽기만 한다
- 전국 오프라인 지도 — mbtiles 가 GB 단위라 불가능. 관심 영역 사전 캐시까지만
- 지오코딩·경로탐색 — 별도 서버(Nominatim/OSRM)가 필요. 요구사항에 오르면 그때 (P4)
- 푸시 알림·백그라운드 동기화 등 지도 외 PWA 기능 — PWA 선택의 배경이었을 뿐, 이번 테스트에서는 쓰지 않는다

## Context

`test_coding_agent` 컨테이너 안의 하위 프로젝트. 출발점은 `260202_OSM_서비스_설치가이드.pptx` —
Geofabrik 한국 Shortbread mbtiles → tileserver-gl(Docker) → Caddy TLS → JSP+Leaflet+MapLibre 구성이다.

기존 환경: eGovFrame 4.3 백엔드(Java 17 / Tomcat 9.0.78), React 19.2 + Vite 프론트, PWA 셋업 완료(GPS 사용 가능), MariaDB 10.11.
내부망 배치. 운영은 TLS_EDGE(Let's Encrypt :443) → NGINX(WEB VM) 구조이고 Egress 는 firewalld 로 차단(통로는 Squid·Artifactory) —
`osm-test/네트워크 다이어그램.jpg` (2026-08-26). **테스트 개발 환경에는 이 인프라가 없다** — 개발 PC(외부망 가능) + localhost 로 개발한다.

## Constraints

- **라이선스**: OSM 데이터는 ODbL — 출처 표기 필수. 커스텀 스타일엔 attribution 이 자동으로 안 붙는다
- **보안 컨텍스트**: GPS·Service Worker 는 HTTPS(또는 localhost) 에서만 동작. 자료의 SAN 없는 self-signed 인증서로는 PWA 가 안 된다
- **DB**: MariaDB 공간 함수는 PostGIS 보다 좁다 (좌표계 변환 없음). OSM 원본을 DB에 넣지 않는다
- **폐쇄망**: 이미지·mbtiles·npm 전부 반입. 스타일 JSON 에 외부 URL 이 있으면 안 된다
- **PWA**: 백그라운드 위치 전송 불가 — 화면에 떠 있을 때만 GPS 가 흐른다
- **스타일 호환**: Shortbread 스키마 전용 스타일만 쓸 수 있다. OpenMapTiles 계열 스타일은 레이어명이 다르다

## Key Decisions

<!-- 이후 작업을 제약하는 결정. 프로젝트 내내 추가한다. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 읽기 전용으로 한정 | 편집은 실제 지도에 영향을 준다 — 실험 프로젝트에 맞지 않는다 | 확정 |
| 자체 타일 서버 운영 (Out of Scope 에서 철회) | 설치 가이드가 이미 이 방식이고, 외부 타일 서비스는 사내망·비용 문제가 있다 | 확정 — tileserver-gl + Geofabrik Shortbread |
| MapLibre GL JS 단독 (Leaflet 브리지 제거) | React 신규 개발에 이중 구조 근거 없음. GeolocateControl 이 GPS 추적 내장 | 확정 — Leaflet 플러그인 의존이 생기면 재검토 |
| NGINX 단일 오리진 (/, /api, /tiles) — Caddy 폐기 | CORS·인증서·SW 스코프 문제가 한 번에 사라진다. 타일은 Tomcat 우회. 운영 리버스 프록시가 이미 NGINX(WEB VM)라 같은 구현체로 검증해야 설정을 이식할 수 있다 | 확정 (2026-08-26 다이어그램 확인으로 Caddy→NGINX 변경) |
| 인증서: 로컬 localhost → 테스트 실단말 mkcert+SAN → 운영은 TLS_EDGE(Let's Encrypt) | 자료의 self-signed 는 PWA 를 막는다. 운영 TLS 는 최전단 TLS_EDGE 가 담당, 내부는 HTTP. 테스트 환경엔 TLS_EDGE 가 없어 mkcert 필요 | 확정 (2026-08-26 갱신) |
| 위치 갱신은 폴링 (5~10초) | 기관 게이트웨이를 통제 못 함 — WebSocket/SSE 는 막힐 수 있다 | 확정 — 게이트웨이 확인 후 SSE 재검토 |
| 위치 테이블 latest/log 분리 | 조회는 latest 만, 이력은 파티션+보존기간 | 확정 |
| 타 사용자 마커는 GeoJSON source 하나 | Marker DOM 은 수십 명부터 무거움 | 확정 |
| 지오코딩·경로탐색 | 타일 서버로 안 됨. 별도 서버 비용이 크다 | 보류 — 요구사항 확정 후 |
| PWA 확정 (네이티브 앱·래퍼 불가) | 네이티브 배포가 불가한 환경이라 웹 기반으로 앱형 기능을 쓰는 선택 (배경 인지용). 백그라운드 위치 제한은 인지하고 수용 — 화면에 떠 있는 동안만 전송. 이번 프로젝트 범위는 지도·GPS·타일 캐싱만 | 확정 (2026-08-26) |
| 위치 열람 범위: 관리자는 전원, 일반 사용자는 같은 파견지 인원만 | 운영은 파견지 단위로 참여 인원끼리만 상호 열람, 관리자는 전체 관리. 서버에서 역할·파견지로 필터링 (테스트는 role + site_id 스텁) | 확정 (2026-08-26) |
| Tomcat 9.0.78 고정 — 패치·메이저 업그레이드 모두 불가 | 10.1+ 는 jakarta 라 eGov 4.x(javax)와 비호환, 패치는 기관 사정으로 불가. 미패치 RCE 는 설정 완화로 차단: Default Servlet readonly 유지·HTTP/2 미사용·Caddy 메서드 제한 (플랜 3절) | 확정 (2026-08-24) |

<!--
GSD 정본 섹션 구성을 따랐다 (gsd-core/templates/project.md).
/gsd-new-project 를 켜면 이 파일을 그대로 인식하고 확장한다.
-->
