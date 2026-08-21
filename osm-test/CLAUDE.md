# osm-test

OpenStreetMap 데이터를 직접 다뤄보는 실험 프로젝트. 구체적인 산출물은 아직 미정.

## 제약

- **데이터 출처**: OSM 원본 API 대신 Overpass API / 지역 추출본(pbf) 우선 — 원본 API는 대량 조회 금지 정책이 있다
- **라이선스**: OSM 데이터는 ODbL — 파생 데이터를 공개하면 같은 라이선스가 따라붙는다

<!-- 종류 예: 기술 스택, 기한, 의존성, 호환성, 성능, 보안. 없으면 이 섹션 삭제 -->

## 용어

- **OSM** — OpenStreetMap. 이 프로젝트에서 OSM은 항상 지도 데이터를 뜻한다
- **element** — OSM의 기본 단위. node(점) / way(선·면) / relation(묶음) 세 가지
- **tag** — element에 붙는 key=value 쌍. 의미는 전부 여기서 나온다 (예: `highway=residential`)
- **Overpass** — OSM 데이터를 질의하는 읽기 전용 API. 자체 질의 언어(Overpass QL)를 쓴다

## 기록 위치

| 무엇 | 어디 |
|---|---|
| 결정과 근거 | `.planning/PROJECT.md` → Key Decisions |
| 해봤는데 안 된 것 | `.planning/DEAD-ENDS.md` |
| 현재 상황 · 다음 할 일 | `.planning/STATE.md` |

<!--
이 파일은 T2다. 이 폴더의 파일을 읽을 때만 로드된다.
50줄을 넘기지 말 것 — 넘치면 .planning/ 으로 내린다.
HTML 주석은 컨텍스트 주입 전에 제거되므로 토큰을 쓰지 않는다.
-->
