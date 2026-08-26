# 메모리 인덱스

한 항목당 한 줄. 본문은 같은 폴더의 토픽 파일에 둔다.
프로젝트별 기록은 여기가 아니라 `<프로젝트>/.planning/` 에 있다.

## 하위 프로젝트

<!-- - [이름](../../이름/CLAUDE.md) — 한 줄 설명 -->

- [osm-test](../../osm-test/CLAUDE.md) — eGov/React/PWA/MariaDB 환경에 자체 호스팅 OSM 벡터 타일 붙이기 (플랜: .planning/OSM-INTEGRATION.md)

## 작업 방식 · 선호

<!-- - [제목](파일명.md) — 훅 -->

- [기존 관례 먼저 확인](check-existing-conventions-first.md) — 새 규칙을 만들기 전에 이미 있는지 찾는다
- [서브에이전트 운영 원칙](subagent-operating-principles.md) — 3단 구분 · 비가역성 기준 개입 · 검증이 싸면 저모델
- [일반화 대상 규칙의 배치 기준](generalizable-convention-placement.md) — 도메인 사실 vs 반복될 관행 구분, gitignore/템플릿/T0 중 어디에 반영할지
- [필요해지기 전엔 인프라를 만들지 않는다](defer-infrastructure-until-actual-need.md) — 폴더·gitignore·스킬 설치도 쓸 대상이 생긴 뒤에
