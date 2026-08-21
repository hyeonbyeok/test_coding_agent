# test_coding_agent

여러 하위 프로젝트를 담는 컨테이너 폴더. 각 하위 폴더가 독립 프로젝트다.

## 기록 계층

| 계층 | 위치 | 로드 시점 | 예산 |
|---|---|---|---|
| T0 | 이 파일 | 매 세션 전체 + 컴팩션 후 재주입 | 60줄 |
| T1 | `.claude/memory/MEMORY.md` | 매 세션 첫 200줄 / 25KB | 항목당 한 줄 |
| T2 | `<프로젝트>/CLAUDE.md` | **그 폴더 파일을 읽을 때만** | 50줄 |
| T3 | `<프로젝트>/.planning/*` | 명시적으로 읽을 때만 | 무제한 |

예산을 넘기면 아래 계층으로 내린다. T0가 커질수록 모든 세션이 비용을 낸다.

## 메모리 정책

- 메모리는 `.claude/memory/` 에만 쓴다 (`.claude/settings.json` 의 `autoMemoryDirectory` 로 지정)
- `~/.claude/CLAUDE.md` 와 `~/.claude/memory/` 는 만들지도 쓰지도 않는다
- 다른 프로젝트에서 얻은 사실을 이 저장소에 옮기지 않는다
- 전역 설정을 바꿔야 하면 직접 하지 말고 먼저 묻는다

## 새 하위 프로젝트 생성 규칙

"<이름> 프로젝트 만들어줘" 요청을 받으면:

1. `<이름>/` 생성 (kebab-case)
2. `.claude/templates/` 의 4개를 복사해 채운다
   - `subproject-CLAUDE.md` → `<이름>/CLAUDE.md`
   - `PROJECT.md` → `<이름>/.planning/PROJECT.md`
   - `STATE.md` → `<이름>/.planning/STATE.md`
   - `DEAD-ENDS.md` → `<이름>/.planning/DEAD-ENDS.md`
3. `.claude/memory/MEMORY.md` 에 한 줄 추가
4. `ROADMAP.md` `REQUIREMENTS.md` `config.json` `phases/` `todos/` 는 **만들지 않는다**

4번이 중요하다. 이 파일들은 `/gsd-new-project` 가 초기화할 때 생성한다. 미리 빈 껍데기를 두면 초기화와 충돌한다.

경로와 파일명은 GSD 정본을 따랐다. 규모가 커지면 `cd <이름> && /gsd-new-project` 로 GSD를 켜면 되고, `.planning/` 을 그대로 인식한다 (`planningRoot(cwd)` 기준). git 도 그때 GSD가 자동으로 건다 — 미리 만들지 않는다.

## 기록 갱신 규칙

아래가 생기면 **그 자리에서** 기록한다. 세션 끝에 몰아 쓰지 않는다.

| 생긴 것 | 쓸 곳 |
|---|---|
| 왜 그렇게 했는지 (선택의 근거) | `<프로젝트>/.planning/PROJECT.md` → Key Decisions |
| 해봤는데 안 된 것 | `<프로젝트>/.planning/DEAD-ENDS.md` |
| 지금 어디까지 했나 · 다음에 뭐부터 | `<프로젝트>/.planning/STATE.md` |
| 에이전트 환경 설치·셋팅 (스킬·플러그인·도구) | 루트 `README.md` |
| 프로젝트 실행에 필요한 설치·셋팅 | `<프로젝트>/README.md` — 필요해질 때 만든다 |
| 프로젝트 무관한 작업 방식 선호 | `.claude/memory/` |
| 프로젝트 고유 용어 · 제약 | `<프로젝트>/CLAUDE.md` |

**작업 로그는 남기지 않는다.** 결정과 막다른 길만 남긴다 — 양이 안 늘면서 재활용 가치가 높은 것들이다.

쓰기 전에 같은 내용이 이미 있는지 확인하고, 있으면 새로 만들지 말고 고친다. 틀린 것으로 밝혀진 기록은 지운다.
