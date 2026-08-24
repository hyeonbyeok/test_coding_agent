# osm-test

eGov 4.3 / React 19.2 + Vite / PWA / MariaDB 환경에 자체 호스팅 OSM 벡터 타일 지도를 붙이는 실험 프로젝트.

## 제약

- **런타임**: Java 17 / Tomcat 9.0.78 **고정 — 패치·메이저 업그레이드 모두 불가.** 미패치 CVE 는 설정 완화 필수 (플랜 3절)
- **타일 출처**: Geofabrik 한국 Shortbread mbtiles → tileserver-gl. Overpass/원본 API 는 쓰지 않는다
- **스타일**: Shortbread 스키마 전용. OpenMapTiles 계열 스타일은 레이어명이 달라 안 붙는다
- **지도 라이브러리**: MapLibre GL JS 단독. Leaflet 브리지는 쓰지 않는다
- **오리진**: Caddy 하나로 `/` `/api` `/tiles` 분기. 타일은 Tomcat 을 거치지 않는다
- **라이선스**: ODbL — 출처 표기 필수. 커스텀 스타일엔 자동으로 안 붙는다
- **DB**: MariaDB 10.11. OSM 원본을 적재하지 않는다. 좌표계 변환은 DB 밖(proj4js / GeoTools)
- **폐쇄망**: **운영 서버**는 외부 다운로드 불가(개발 PC는 외부망 가능 — OSM-INTEGRATION.md 9절). 코드·스타일 JSON 에 외부 URL 금지, 경로는 상대 경로
- **실시간**: 위치 갱신은 폴링. WebSocket/SSE 는 게이트웨이 확인 전까지 쓰지 않는다

## 용어

- **OSM** — OpenStreetMap. 이 프로젝트에서 OSM은 항상 지도 데이터를 뜻한다
- **element** — OSM의 기본 단위. node(점) / way(선·면) / relation(묶음) 세 가지
- **tag** — element에 붙는 key=value 쌍. 의미는 전부 여기서 나온다 (예: `highway=residential`)
- **Shortbread** — Geofabrik 이 배포하는 벡터 타일 스키마. 레이어명(streets, place_labels 등)이 스타일과 맞아야 한다
- **mbtiles** — 타일을 담은 SQLite 파일. tileserver-gl 이 읽는다
- **glyph PBF** — 라벨 폰트. 없으면 지도에 글자가 안 뜬다

## 기록 위치

| 무엇 | 어디 |
|---|---|
| 결정과 근거 | `.planning/PROJECT.md` → Key Decisions |
| 해봤는데 안 된 것 | `.planning/DEAD-ENDS.md` |
| 현재 상황 · 다음 할 일 | `.planning/STATE.md` |
| 통합 플랜 (단계·아키텍처·인증서·DB) | `.planning/OSM-INTEGRATION.md` |

<!--
이 파일은 T2다. 이 폴더의 파일을 읽을 때만 로드된다.
50줄을 넘기지 말 것 — 넘치면 .planning/ 으로 내린다.
HTML 주석은 컨텍스트 주입 전에 제거되므로 토큰을 쓰지 않는다.
-->
