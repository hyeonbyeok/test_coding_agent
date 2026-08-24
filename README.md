# test_coding_agent

코딩 에이전트(Claude Code) 실험용 컨테이너 저장소. 하위 폴더 하나가 독립 프로젝트다.

이 문서는 **에이전트 환경을 새 PC에서 재현하는 방법**만 다룬다.
저장소가 어떻게 굴러가는지(기록 계층, 하위 프로젝트 생성 규칙)는 [`CLAUDE.md`](CLAUDE.md) 에 있다.
개별 프로젝트에 필요한 설치·설정은 **그 프로젝트 폴더의 `README.md`** 에 있다.

## 필요한 것

| | 용도 |
|---|---|
| [Claude Code](https://claude.com/claude-code) | 본체 |
| Node.js | GSD 훅이 `node` 로 실행된다 |
| git | — |

## 셋업

### 1. 클론

```bash
git clone https://github.com/hyeonbyeok/test_coding_agent.git
cd test_coding_agent
```

### 2. GSD 설치

이 저장소는 [GSD](https://www.npmjs.com/package/@opengsd/gsd-core) 워크플로를 쓴다. 저장소에는 포함되어 있지 않다 (아래 [저장소에 없는 것](#저장소에-없는-것) 참고).

```bash
npx @opengsd/gsd-core@latest
```

- 설치되는 위치: `.claude/gsd-core/` `.claude/agents/` `.claude/commands/` `.claude/hooks/` `.claude/scripts/`
- 마지막 확인 버전: **1.10.0** / 프로필 `full` / 런타임 `claude`
- 서브에이전트를 전역으로 쓰려면 `--global` 을 붙인다. 안 붙이면 이 저장소 안에만 설치된다
- `.claude/settings.local.json` (훅 등록)은 설치가 만든다 — 손으로 만들지 않는다

설치 후 `/gsd-help` 가 뜨면 성공이다. 업데이트는 `/gsd-update`.

### 3. 플러그인

Claude Code 안에서 `/plugin` 으로 설치한다. `.claude/settings.json` 에 켜져 있는 것:

- `agent-browser@agent-browser` — 브라우저 자동화
- `taste-skill@taste-skill` — 프론트엔드 디자인 스킬 묶음

### 4. 스킬

`skills-lock.json` 이 출처와 해시를 잠근다. 업데이트는 `npx skills update`. 현재 항목:

- `find-skills` — 스킬 검색·설치 도우미. "X 하는 스킬 있어?" 같은 요청에 오픈 스킬 생태계를 뒤져 찾아 설치해 준다. 출처 `vercel-labs/skills`, 설치 위치 `.agents/skills/find-skills/`
- `subagent-driven-development` — 구현 계획을 작업 단위로 쪼개 작업마다 새 서브에이전트를 띄워 실행하고, 작업별 리뷰 + 마지막 전체 리뷰를 거친다. 출처 `obra/superpowers`, 설치 위치 `.agents/skills/subagent-driven-development/` (Claude Code용 심링크: `.claude/skills/`)
- `dispatching-parallel-agents` — 서로 독립인 작업이 2개 이상일 때 문제마다 에이전트 하나씩 병렬로 분배해 동시에 처리한다. 출처 `obra/superpowers`, 설치 위치·심링크 동일 패턴

### 5. 메모리 경로 고치기 ⚠️

`.claude/settings.json` 의 `autoMemoryDirectory` 는 **절대경로**다. 다른 PC라면 반드시 고쳐야 한다.

```json
{ "autoMemoryDirectory": "<클론한 경로>/.claude/memory" }
```

안 고치면 메모리가 엉뚱한 곳에 쌓이거나 조용히 실패한다.

## 저장소에 없는 것

`.gitignore` 로 제외한 것들과 이유:

| 제외 | 이유 |
|---|---|
| `.claude/gsd-core/` `agents/` `commands/` `hooks/` `scripts/` `skills/` | 설치물(15MB·859파일). 커밋하면 `/gsd-update` 한 번에 수백 파일 diff가 생겨 실제 변경이 묻힌다 |
| `.claude/gsd-install-state.json` `gsd-file-manifest.json` `gsd-migration-journal/` | **머신별 설치 상태.** 공유하면 PC마다 충돌한다 |
| `.claude/settings.local.json` | 로컬 설정. `node.exe` 절대경로가 박혀 있고 GSD가 재생성한다 |
| `.agents/` | 스킬 설치물. `skills-lock.json` 으로 복원한다 |

원칙: **설치물이 아니라 설치 방법을 남긴다.** 잠금 파일(`skills-lock.json`)과 이 문서가 그 역할이다.

## 구조

```
test_coding_agent/
├── README.md          ← 지금 이 문서 (에이전트 환경 셋업)
├── CLAUDE.md          ← 저장소 운영 규칙 (기록 계층, 하위 프로젝트 생성)
├── skills-lock.json
├── .claude/
│   ├── settings.json  ← 커밋됨 (플러그인 목록·메모리 경로)
│   ├── memory/        ← 커밋됨 (메모리 인덱스)
│   └── templates/     ← 커밋됨 (하위 프로젝트 템플릿 4종)
└── <프로젝트>/
    ├── README.md      ← 그 프로젝트의 설치·설정
    ├── CLAUDE.md
    └── .planning/
```

## 하위 프로젝트

- [osm-test](osm-test/) — OpenStreetMap 데이터 실험 (읽기 전용, 산출물 미정)

새로 만들려면 Claude Code 에서 `"<이름> 프로젝트 만들어줘"` — 규칙은 [`CLAUDE.md`](CLAUDE.md) 에 있다.
