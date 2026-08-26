# OSM 통합 플랜

기준 자료: `260202_OSM_서비스_설치가이드.pptx` (13장)
대상 스택: eGovFrame 4.3 (Spring 5.3.37, javax) / Java 17 / Tomcat 9.0.78 / React 19.2 + Vite / PWA + GPS / MariaDB 10.11
운영 환경: `../네트워크 다이어그램.jpg` (2026-08-26 확인) — TLS_EDGE(Let's Encrypt, :443 종단) → NGINX(WEB VM, :80) → WAS VM(Tomcat :8080 + NodeJS :8090) / DB VM(MariaDB :3306) / SEARCH VM / Squid :3128 / GitLab·Artifactory(CICD). Egress 는 firewalld 로 차단. **테스트 개발 환경에는 이 인프라가 없다** — 개발 PC(외부망 가능) + localhost 로 진행
배치: 내부망. 외부 사용자는 TLS_EDGE(:443) 로 진입한다. 앞단에 기관 게이트웨이가 더 있는지는 미확인 (9절)
용도: 내 현위치 + 다른 사용자 위치를 지도에 표시. 위치는 DB에 계속 저장

## 1. 자료가 실제로 정의하는 것

"OSM 데이터를 조회하는 방법"이 아니라 **자체 벡터 타일 서버 구축 절차**다.
Overpass API도, OSM 메인 API도 쓰지 않는다.

```
Geofabrik "South Korea Shortbread 1.0"  →  korea.mbtiles
                                              ↓
                                  tileserver-gl (Docker, :8080)
                                              ↓
                                  Caddy reverse proxy (:8443, self-signed TLS)
                                              ↓
                          브라우저: Leaflet + MapLibre GL + maplibre-gl-leaflet
                                    + navigator.geolocation 마커
```

구성 요소:

| 요소 | 자료의 값 |
|---|---|
| 타일 데이터 | `south-korea-shortbread-1.0.mbtiles` (Geofabrik) |
| 타일 서버 | `maptiler/tileserver-gl:latest`, `--config /data/config.json` |
| 폰트 | Noto Sans Regular, PBF glyph를 직접 생성해 `fonts_pbf/` 에 배치, `serveAllFonts: true` |
| 스타일 | 손으로 쓴 style spec v8 (JS 인라인). 레이어: ocean / water_polygons / land / buildings / streets / *_labels / pois / sites |
| TLS | openssl self-signed, `CN=192.168.0.147`, Caddy `auto_https off` |
| 프론트 | JSP + unpkg CDN (leaflet 1.9.4, maplibre-gl 4.7.1, maplibre-gl-leaflet 0.0.22) |

## 2. 스택 전환 시 그대로 못 옮기는 지점

### (a) unpkg CDN 의존 → 폐쇄망에서 즉사

자료는 라이브러리 3종을 `https://unpkg.com` 에서 받는다. 망분리 환경이면 그 시점에 지도가 안 뜬다.
Vite로 가면 npm 번들이 되어 자동 해결된다 — 전환의 부수 이득.

### (b) Leaflet + MapLibre 이중 구조

자료는 Leaflet을 지도 컨테이너로 두고 `L.maplibreGL({style})` 로 MapLibre를 레이어로 얹는다.
브리지 플러그인(`maplibre-gl-leaflet` 0.0.22)이 하나 더 낀 구조다.

React 신규 개발에서는 근거가 약하다. MapLibre GL JS 단독으로 마커·팝업·GPS 추적이 전부 된다.
특히 `GeolocateControl` 은 위치 추적 + 방향(heading) + 따라가기를 내장하고 있어 자료의 수동
`getCurrentPosition` 코드보다 PWA GPS 요구에 더 맞는다.

**유지해야 할 경우**: 이미 쓰는 Leaflet 플러그인이 있을 때 (heatmap, draw, markercluster 등).

### (c) 자체 서명 인증서 → PWA를 막는다

이게 가장 큰 문제다. 자료의 인증서는 `-subj "/CN=192.168.0.147"` 로 **SAN이 없다.**

- Chrome 58+ 는 SAN 없는 인증서를 거부한다 (`ERR_CERT_COMMON_NAME_INVALID`)
- Service Worker 는 신뢰되지 않는 인증서에서 등록이 막힌다 → PWA 캐싱·오프라인 불가
- PWA 설치(A2HS) 조건에 유효한 인증서가 포함된다
- `navigator.geolocation` 은 secure context 필요 (localhost만 예외)

즉 **자료 그대로 따라가면 PWA도 GPS도 안 된다.** 환경별 대응이 따로 필요하다 (5절).

### (d) DB·백엔드가 자료에 없다

자료에서 eGov는 JSP 한 장을 내려줄 뿐이고 MariaDB는 등장하지 않는다.
"eGov가 무엇을 하는가", "MariaDB에 무엇이 들어가는가" 는 이 자료 밖에서 정해야 한다.

자료(pptx 1페이지)의 실행 전제는 **Ubuntu 24.04.3 / Java 17 / Spring Tool Suite 4.4.0 / Spring Boot(WAS)** 다 —
eGovFrame·Tomcat 언급은 없다. 실제 프로젝트 백엔드는 eGovFrame 4.3 이므로, 정확한 JDK 버전·WAS(Tomcat 등) 버전·
`javax.*`/`jakarta.*` 여부는 이 자료로 확정할 수 없다. → **2026-08-24 사용자 확인으로 Java 17 / Tomcat 9.0.78 확정** (패치 업그레이드 불가 — 3절 런타임 버전).

## 3. 목표 아키텍처

**NGINX 를 단일 분기점**으로 두고 3방향 분기한다. 운영의 리버스 프록시는 이미 NGINX(WEB VM)이므로 **초안의 Caddy 는 폐기한다** (2026-08-26, 네트워크 다이어그램 확인) — 테스트에서 검증한 프록시 설정을 운영에 그대로 이식하려면 같은 구현체여야 한다.

```
외부 브라우저(PWA)
   │  https://<TLS_EDGE>/...        ← TLS 는 여기서 끝난다 (Let's Encrypt, :443)
   ▼                                  앞단에 기관 게이트웨이가 더 있는지 미확인 (9절)
 TLS_EDGE ──── 내부망 ────▶
   ▼
 NGINX(WEB VM :80, HTTP) ─┬─ /  → React 빌드 정적 파일 (dev: Vite :5173)
        ├─ /api/*       → WAS VM: eGov / Tomcat :8080
        └─ /tiles/*     → tileserver-gl :8081  (Tomcat을 경유하지 않음)
                              ▼
                         korea.mbtiles + fonts_pbf
 eGov ── JDBC ──▶ DB VM: MariaDB :3306 (GPS 궤적 / POI, POINT + SPATIAL INDEX)
```

테스트 개발 환경에는 프록시가 없다 — P2 로컬 검증 때 NGINX 를 직접 띄워 위 구조를 모사한다.

**단일 오리진으로 가는 이유**

| | 자료 방식 (브라우저가 타일서버 직접 호출) | 단일 오리진 |
|---|---|---|
| CORS | 필요 (tileserver 기본 헤더에 의존) | 불필요 |
| 인증서 | 오리진 수만큼 | 1장 |
| Service Worker 스코프 | 타일이 교차 오리진 | 전부 동일 스코프 |
| 접근 제어 | 타일 서버가 무방비 | NGINX/eGov에서 통제 가능 |

타일 트래픽은 NGINX에서 바로 tileserver로 보낸다. **Tomcat을 통과시키지 않는다** — 타일은 요청 수가 많아 WAS 스레드풀을 잠식한다.

tileserver-gl 컨테이너 내부 포트는 8080이지만 Tomcat(:8080)과 겹치므로 **호스트 매핑은 :8081** 로 뺀다 (`-p 8081:8080`). 자료의 `:8080` 표기를 같은 호스트에서 그대로 쓰면 충돌한다. 운영 WAS VM 은 NodeJS 가 **:8090** 도 쓰고 있으므로 8090 역시 피한다. 배치 위치(WAS VM 에 Docker 가 있는지, 없으면 Node 직접 실행인지)는 미확인 — 9절.

### 런타임 버전 (2026-08-24 확정·검증)

- **Java 17 + Tomcat 9.0.78 + eGov 4.3 조합 성립.** eGov 4.3 = Spring Framework 5.3.37 / javax.servlet(Servlet 3.1+) 기반(공식 위키·GitHub 릴리스 확인), Tomcat 9 = Servlet 4.0(javax) 구현 + Java 8 이상 지원
- **Tomcat 9.0.78 고정 — 패치 업그레이드 불가 (2026-08-24 사용자 확정).** 메이저 업그레이드도 불가: Tomcat 10.1+ 는 jakarta 네임스페이스라 eGov 4.x(javax)와 비호환 (jakarta 는 eGov 5.0부터)
- 9.0.78(2023-07) 이후 수정된 CVE 를 안고 간다 — CVE-2024-50379/56337(Default Servlet 쓰기 RCE), CVE-2025-24813(partial PUT RCE), CVE-2023-44487(HTTP/2 Rapid Reset). 패치가 불가하므로 아래 설정 완화가 **필수**다:
  - Default Servlet `readonly` 를 기본값(true)대로 둔다 — `readonly=false` 금지. 위 RCE 3건(CVE-2024-50379/56337, CVE-2025-24813)은 모두 쓰기 허용이 전제라, 이것만 지켜도 성립하지 않는다
  - HTTP/2 커넥터(`UpgradeProtocol`)를 켜지 않는다 — 기본 비활성. Rapid Reset 이 무관해진다
  - Tomcat 을 직접 노출하지 않는다(3절 구조대로 NGINX 뒤에만). NGINX 에서 `/api` 에 필요한 메서드(GET/POST 등)만 통과시켜 PUT 계열 공격면을 추가로 줄인다
- Tomcat 9 지원 종료는 2027-03-31 이전에는 없음 (공식 명시)

**진입점이 TLS_EDGE 하나라는 구조가 단일 오리진을 선택이 아니라 필수로 만든다.**
타일 서버를 별도 포트로 노출하는 자료 방식은 진입점을 하나 더 뚫어야 하므로 성립하지 않는다.

진입점(TLS_EDGE) 관련 추가로 지켜야 할 것:
- **서브패스 배포 가능성** — 허용 URL 이 `https://edge/osm/` 처럼 경로를 가지면 Vite `base`, SW `scope`, 스타일의 타일 URL 모두 **상대 경로**로 써야 한다. 절대 경로 `/tiles/...` 는 깨진다
- **TLS 는 TLS_EDGE 담당 (Let's Encrypt)** — 내부 NGINX 는 HTTP 로 둔다. 5절의 mkcert 는 테스트 개발 환경의 실단말 테스트용으로 남는다 (테스트 환경에는 TLS_EDGE 가 없다)
- **타임아웃·WebSocket 허용 여부** — TLS_EDGE(와 그 앞 기관 장비 유무)에 달렸다. 7절 실시간 전송 방식을 좌우한다. 미리 확인한다

## 4. 단계

### P0 — 검증 스파이크 (브라우저 없이)

자료대로 tileserver-gl 을 띄우고 `curl` 로만 확인한다. 프론트를 붙이기 전에 서버가 맞는지부터 본다.

- `GET /data/korea.json` → TileJSON 이 나오는가
- `GET /data/korea/12/3494/1584.pbf` → gzip 된 protobuf 가 나오는가
- `GET /fonts/Noto Sans Regular/0-255.pbf` → glyph 가 나오는가 (여기가 자주 깨진다)
- `korea.json` 의 `vector_layers` 에 스타일이 참조하는 레이어명이 실제로 있는가

마지막 항목이 중요하다. 스타일은 **Shortbread 스키마 전용**이다.
OpenMapTiles 계열 스타일(Positron, Bright 등)은 레이어명이 달라 그대로 붙지 않는다.

**P0 실행 정의 (재현성)** — 지금까지는 확인 항목만 있고 "누가 그대로 재현할 수 있는가"가 없었다. 실제로 띄우기 전에 아래를 채운다.

- **이미지 태그 고정**: `maptiler/tileserver-gl:latest` 는 쓰지 않는다. 반입 시점에 특정 태그로 고정하고 digest(`sha256:...`)를 기록한다 — 8절 표에 채운다
- **반입물 해시**: `korea.mbtiles`, `fonts_pbf/`, style JSON 각각 SHA-256 을 기록한다 (8절)
- **최소 실행 정의** (자료 3·4번 슬라이드 그대로, 태그만 고정):

  ```
  docker run --rm -it \
    --name tileserver-gl \
    -v "$(pwd)/tiles:/data" \
    -p 8080:8080 \
    maptiler/tileserver-gl:<고정 태그> \
    --config /data/config.json
  ```

  `config.json` 은 자료 4번 슬라이드 그대로: `mbtiles` 경로는 `data`, `fonts` 경로는 `fonts_pbf`, `serveAllFonts: true`.

- **curl 체크리스트** — 상태 코드는 확정, Content-Type 은 tileserver-gl 버전에 따라 달라질 수 있어 실행 시 실제 값으로 채운다 (추측 금지):

  | 확인 | 명령 | 기대 |
  |---|---|---|
  | TileJSON | `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/data/korea.json` | `200` |
  | vector tile | `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/data/korea/12/3494/1584.pbf` | `200` |
  | glyph | `curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/fonts/Noto Sans Regular/0-255.pbf"` | `200` |
  | 레이어 일치 | `curl -s http://localhost:8080/data/korea.json \| jq '.vector_layers[].id'` | 스타일이 참조하는 레이어명(ocean, water_polygons, land, buildings, streets, *_labels, pois, sites) 전부 포함 |

### P1 — React 최소 지도 (localhost)

`localhost` 는 secure context 예외라 인증서 없이 GPS가 동작한다. 인증서 문제를 뒤로 미룬다.

- `maplibre-gl` 단독, `useRef` + `useEffect` 로 초기화 / 언마운트 시 `map.remove()`
- 스타일을 `src/map/style.korea.json` 정적 파일로 분리 (JS 인라인 문자열에서 빼낸다)
- Vite `server.proxy` 로 `/tiles` → tileserver 로 넘겨 오리진을 하나로 유지
- `GeolocateControl` 로 현재 위치
- **ODbL 출처 표기** — 커스텀 스타일에는 attribution 이 없다. source 에 `"attribution"` 을 넣거나 컨트롤에 직접 추가한다. 빠뜨리기 쉬운 항목이다

**완료 기준**: 지도가 렌더링되고 한글 라벨이 보인다 / ODbL 출처 표기가 화면에 있다 / localhost 에서 GPS 허용·거부 모두 처리된다(거부해도 에러로 죽지 않고 안내 UI가 뜬다) / 컴포넌트를 반복 마운트·언마운트해도 `map.remove()` 가 호출되어 지도 인스턴스가 누적되지 않는다

### P2 — 단일 오리진 + 백엔드 연동

- NGINX 3방향 분기 (3절) — 운영 WEB VM 과 같은 구현체로 로컬에서 검증해 설정을 그대로 이식한다
- eGov REST 엔드포인트 1개로 왕복 검증 (예: 현재 위치 저장)
- MariaDB 스키마 — `POINT NOT NULL` + `SPATIAL INDEX` (7절 DDL. `SRID 4326` 컬럼 속성은 MySQL 8 전용이라 쓰지 않는다)

**완료 기준**: 인증된 사용자의 위치가 POST 로 저장되고 `user_position_latest` 에서 값이 확인된다 / 다른 사용자 위치가 GET 으로 조회되어 GeoJSON source 로 지도에 갱신된다 / `updated_at` 이 오래된 위치는 흐리게·숨김 처리된다 / 권한 없는 사용자의 위치가 응답에 섞이지 않는다(7절 API 계약)

### P3 — PWA

`vite-plugin-pwa` (Workbox). 캐시를 3층으로 나눈다.

| 층 | 대상 | 전략 |
|---|---|---|
| L0 | 앱 셸 (JS/CSS/스타일 JSON/폰트 PBF) | precache — 필수, 용량 작음 |
| L1 | 방문한 타일 | runtime CacheFirst + maxEntries + 만료 |
| L2 | 관심 영역 사전 다운로드 (bbox × zoom) | 요구사항 확정 후 |

주의:
- korea.mbtiles 는 **453MB** (2026-08-24 HEAD 확인, 474,722,304 bytes). 전국 통째 프리캐시는 여전히 비현실적 — SW 프리캐시는 타일을 URL 단위로 열거해야 하고 iOS 쿼터에 걸린다. 관심 영역 사전 캐시(L2)까지만
- 타일은 `globPatterns` precache 대상이 아니다. `runtimeCaching` 으로 잡는다
- iOS Safari 는 캐시 할당량이 훨씬 박하고 미사용 시 축출된다
- 여기서부터 실제 단말 테스트가 필요하므로 인증서 정식화가 선행되어야 한다

**완료 기준**: HTTPS 사내망 실단말에서 PWA 설치(A2HS)가 된다 / 그 단말에서 GPS 가 동작한다 / 방문한 타일이 오프라인에서도 표시된다(네트워크 차단 후 확인) / 캐시 상한(`maxEntries`)·만료(`maxAgeSeconds`) 설정대로 오래된 타일부터 축출된다

### P4 — 조건부

검색/경로탐색이 요구사항에 있으면 **서버가 더 필요하다.** 타일 서버로는 안 된다.

| 기능 | 필요한 것 | 비용 |
|---|---|---|
| 주소검색·지오코딩 | Nominatim 또는 Photon | 한국 import 수 시간~1일, RAM 다량 |
| 경로탐색 | OSRM / Valhalla / GraphHopper | `.osm.pbf` 전처리 필요 |

공용 인스턴스(`nominatim.openstreetmap.org`)는 상용·대량 사용 금지다.

## 5. 인증서 전략 (환경별)

| 환경 | 방법 | GPS | SW/PWA |
|---|---|---|---|
| 로컬 개발 | `http://localhost:5173` | O (예외) | O (예외) |
| 테스트 개발 실단말 (P3) | mkcert 로컬 CA + **SAN에 IP/호스트명** + 단말에 CA 설치 — 테스트 환경에는 TLS_EDGE 가 없어 필요 | O | O |
| 운영 (TLS_EDGE 경유) | TLS_EDGE 의 Let's Encrypt 인증서 (:443 종단). 내부 NGINX 는 HTTP | O | O |

운영에서 내부 NGINX 는 TLS 를 켜지 않는다(`:80` 리슨). 초안의 "Let's Encrypt 는 내부망이라 못 쓴다"는 **정정** — 운영 최전단 TLS_EDGE 가 이미 Let's Encrypt 를 쓴다 (2026-08-26 다이어그램 확인). 내부 VM 이 직접 발급 못 하는 것은 여전하다(Egress 차단) — 발급·갱신은 TLS_EDGE 소관이므로 이 프로젝트에서 다룰 일이 없다.

## 6. MariaDB 제약

MariaDB 공간 기능은 PostGIS보다 좁다. 설계 전에 알아야 할 것:

- `ST_Distance_Sphere` — 10.2.38 / 10.3.29 / 10.4.19 / 10.5.10 에서 도입 (공식 릴리즈 노트, 2026-08-24 확인) → 10.11 은 확실히 포함. P2 진입 시 `SELECT ST_Distance_Sphere(POINT(0,0), POINT(1,1))` 한 줄로 실검증
- **좌표 순서는 POINT(경도 위도)** — x=lon, y=lat. KB 예제로 확인. 뒤집으면 거리 계산이 조용히 틀린다
- 좌표계 변환(`ST_Transform` 상당)이 없다. SRID는 저장될 뿐 연산에 거의 반영되지 않는다
- 반경 검색은 가능하다: bbox 로 `SPATIAL INDEX` 사전 필터 → `ST_Distance_Sphere` 로 정밀 필터
- **OSM 원본 데이터를 MariaDB에 적재하려 하지 말 것.** `osm2pgsql` 은 PostgreSQL 전용이고, 타일 데이터는 mbtiles(SQLite)가 이미 담당한다

한국 공공데이터는 EPSG:5179(UTM-K) / 5186 을 자주 쓴다. 지도는 WGS84(4326)다.
변환이 필요해지면 프론트는 `proj4js`, 백엔드는 GeoTools(Java) 로 처리한다 — DB로는 못 한다.

버전 지침 (Java 17 기준, 2026-08-24 확인):
- GeoTools 는 **34.x 이상**(Java 17 이 최소 요구인 첫 시리즈. 28.x~33.x 도 Java 17 구동 관리됨). 35.x 의 jakarta 전환은 XML 바인딩 계열이라 좌표 변환 용도에는 무영향
- JDBC 는 MariaDB Connector/J **3.x** (Java 8+, MariaDB 10.11 공식 지원)

## 7. 실시간 위치 공유 설계

요구: 내 위치를 계속 저장하고, 다른 사용자의 위치를 지도에 표시한다.

### 데이터 흐름

```
단말 GPS ──(N초마다 POST /api/positions)──▶ eGov ──▶ MariaDB
                                                        │
단말 지도 ◀──(N초마다 GET /api/positions/latest)── eGov ◀┘
```

### 테이블 — 둘로 나눈다

| 테이블 | 역할 | 행 수 |
|---|---|---|
| `user_position_latest` | 사용자당 1행, UPSERT | 사용자 수 |
| `user_position_log` | 이력, INSERT only | 사용자 × 시간 |

조회는 항상 `latest` 만 본다. 이력 테이블은 파티션(일 단위) + 보존기간을 정해 잘라낸다 —
사용자 100명 × 10초 간격이면 하루 86만 행이다. 처음부터 분리하지 않으면 조회가 이력 테이블을 훑게 된다.

```sql
CREATE TABLE user_position_latest (
  user_id     VARCHAR(64) PRIMARY KEY,
  pos         POINT NOT NULL,        -- POINT(경도 위도). MySQL 8 의 `SRID 4326` 컬럼 속성은 MariaDB 에 없다
  accuracy_m  FLOAT,
  heading     FLOAT NULL,
  updated_at  DATETIME(3) NOT NULL,
  SPATIAL INDEX (pos)
);
```

MariaDB 의 SRID 컬럼 속성은 `REF_SYSTEM_ID` 인데(공식 CREATE TABLE 문서 확인), 연산에 반영되지
않으므로 붙이지 않는다. WGS84 lon/lat 저장은 팀 규약으로 고정한다.

`SPATIAL INDEX` 는 "내 주변 N km 사용자만" 을 붙일 때 쓴다. 전원 표시라면 없어도 된다.

### `user_position_log` DDL + 보존

```sql
CREATE TABLE user_position_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  pos         POINT NOT NULL,        -- POINT(경도 위도), latest 와 동일 규약
  accuracy_m  FLOAT,
  heading     FLOAT NULL,
  logged_at   DATETIME(3) NOT NULL,
  INDEX idx_user_time (user_id, logged_at)
);
```

보존기간·정리 방식은 사용량이 확정된 뒤 정한다. 후보만 남긴다: `logged_at` 기준 RANGE 파티션(일 단위) + 배치로
N일 경과분 삭제, 또는 파티션 자체를 DROP. 정확한 N일 값과 자동화 방식은 미정 (9절).

### API 계약 (초안)

필드명·값은 초안이다 — eGov 컨트롤러 작성 시 확정한다. 지금 목적은 "무엇을 검증해야 하는가"를 코드보다 먼저 못박는 것.

**`POST /api/positions`**

```json
{ "lat": 37.4156, "lng": 127.0986, "accuracy": 12.3, "heading": 88.0, "timestamp": "2026-08-24T10:00:00.000Z" }
```

- `user_id` 는 body 로 받지 않는다 — 인증 주체(세션/토큰)에서 도출한다. body 의 user_id 는 신뢰하지 않는다
- 서버 검증: `lat ∈ [-90,90]`, `lng ∈ [-180,180]`. 범위 밖이면 4xx 로 거부한다
- `heading` 은 선택값 — 정지 상태에서는 GPS가 값을 안 줄 수 있다

**`GET /api/positions/latest`**

```json
[{ "userId": "u123", "lat": 37.4156, "lng": 127.0986, "heading": 88.0, "updatedAt": "2026-08-24T10:00:00.000Z" }]
```

- `stale` 판정(예: `updated_at` 이 N분 초과) 기준값은 미정 — 프론트 계산인지 서버 플래그인지도 미정
- **권한: 요청자가 열람 가능한 사용자만 반환한다.** 위치 열람 범위(전원 공개 vs 그룹)가 미확정인 동안
  **전원 공개를 기본 구현으로 두지 않는다** — 확정 전까지는 요청자 자기 자신의 위치만 반환하는 것으로 시작한다

### 전송 방식 — 폴링으로 시작한다

| 방식 | 장점 | 게이트웨이 리스크 |
|---|---|---|
| **폴링 (기본)** | 프록시 무관, eGov REST 그대로 | 없음 |
| SSE | 서버 푸시, HTTP 기반 | 프록시 버퍼링·유휴 타임아웃에 끊김 |
| WebSocket | 양방향, 지연 최소 | 게이트웨이가 Upgrade 를 막는 경우 많음 |

진입점 앞단 구성(TLS_EDGE 앞에 기관 게이트웨이가 있는지 — 9절)을 확인하기 전까지는 폴링이 유일하게 확실한 방식이다.
5~10초 주기면 사람 이동 속도에서 체감 차이가 없다. 지연이 문제가 되면 그때 SSE 를 시험한다 — 진입점 확인 후. TLS_EDGE 가 최전단이고 우리 통제라면 SSE 채택 여지가 커진다.

### 프론트 — 마커가 아니라 GeoJSON source

사용자 수만큼 `Marker` DOM 을 만들지 않는다. `GeoJSONSource` 하나에 전원 위치를 넣고
`setData()` 로 갱신한다 — MapLibre 가 WebGL 로 그리므로 수백 명도 문제없다.
내 위치만 `GeolocateControl` 로 따로 둔다.

### PWA 한계 — 알고 시작해야 할 것

- **백그라운드 위치 전송은 안 된다.** 브라우저 PWA 는 앱이 화면에 있을 때만 `watchPosition` 이 동작한다. 화면을 끄거나 다른 앱으로 가면 전송이 멈춘다
- **결정(2026-08-26): 이 한계를 수용하고 PWA 확정.** 네이티브 앱(래퍼 포함)이 불가한 환경이라 웹 기반으로 앱형 기능을 쓰는 PWA 로 정해져 있다 — 배경 인지용. **이번 테스트 프로젝트가 쓰는 것은 지도·GPS·타일 캐싱뿐이다** (푸시 알림 등 다른 PWA 기능은 범위 밖). 위치는 화면에 떠 있는 동안만 흐른다는 전제로 UI·데이터를 설계한다 (오래된 위치 흐림/숨김 처리가 그래서 필수다)
- `updated_at` 이 오래된 사용자는 지도에서 흐리게/숨김 처리한다. 안 그러면 "마지막으로 본 위치" 가 "지금 위치" 로 읽힌다

### 개인정보

위치 이력은 민감정보다. 수집 고지, 보존기간, 열람 범위(누가 누구를 보는가)를 코드보다 먼저 정한다.

## 8. 폐쇄망 반입 목록

운영은 firewalld 로 Egress 가 차단되므로 아래를 외부에서 받아 **반입 절차로** 들여온다.
버전을 고정하고 해시를 남긴다. 경로 후보는 둘이다 (어느 쪽이 표준인지 미확인 — 9절):
① 개발 PC(외부망 가능)에서 받아 **Artifactory**(CICD VM)에 올린다 — npm/Maven 은 물론 mbtiles·Docker 이미지도 generic 저장소로 가능
② **Squid(:3128)** 허용 목록에 출처 도메인을 넣어 프록시로 받는다

| 품목 | 크기 감 | 비고 |
|---|---|---|
| `south-korea-shortbread-1.0.mbtiles` | 453MB (확인) | Geofabrik. Last-Modified 가 전날일 정도로 자주 재생성됨 — 재반입 주기는 우리가 정한다 |
| `maptiler/tileserver-gl` 이미지 | 수백 MB | `docker save` → tar. `latest` 대신 태그 고정 + digest(`sha256:...`) 기록 |
| NGINX | — | 운영 WEB VM 에 이미 있음 — 반입 불요. P2 로컬 검증용은 개발 PC 에서 직접 설치 |
| `node:20` 이미지 | 대 | 폰트 PBF 생성용. **또는 외부에서 `fonts_pbf/` 를 만들어 결과물만 반입** — 이쪽이 가볍다 |
| npm 의존성 | 중 | `maplibre-gl`, `vite-plugin-pwa` 등. Artifactory npm 저장소 또는 `node_modules` tar |
| Maven 의존성 | 중 | eGov 쪽. Artifactory Maven 저장소 |
| JDK 17 / Tomcat 9.0.78 | 중 | 기존 테스트 환경 설치분 사용. 패치 업그레이드 불가 확정(3절)이라 추가 반입 없음 |

`tileserver-gl` 은 로컬 mbtiles·폰트만 쓰면 기동 시 외부 호출이 없을 것으로 **추정**한다 (미검증 — P0 에서 네트워크 차단 상태로 확인). 단 **스타일 JSON 안의 `sprite`·`glyphs`·소스 URL 이 외부를 가리키면 그 시점에 깨진다** — 전부 상대 경로로.

## 9. 확인 결과 / 남은 항목

- [x] 런타임 확정 — Java 17 / Tomcat 9.0.78 / eGov 4.3 조합 성립 (3절. eGov 공식 위키·GitHub 릴리스, tomcat.apache.org 로 2026-08-24 확인)
- [x] Tomcat 패치 업그레이드 — **불가 확정, 9.0.78 고정** (2026-08-24 사용자 확인). 미패치 CVE 대응은 3절의 설정 완화(필수)로 한다
- [x] MariaDB 10.11 — `ST_Distance_Sphere` 가능 (10.5.10 이하 계열에서 이미 도입, 릴리즈 노트 확인)
- [x] 폐쇄망(운영 서버) — 반입 목록(8절) 따른다. CDN 의존 전부 제거. **개발 PC 는 외부망 가능**(GitHub 푸시·Geofabrik HEAD 성공으로 확인) — P0/P1 검증은 여기서 한다
- [x] 운영 네트워크 구조 — `../네트워크 다이어그램.jpg` (2026-08-26 사용자 제공): TLS_EDGE(Let's Encrypt :443) → NGINX(WEB VM :80) → WAS VM(Tomcat :8080 + NodeJS :8090) / DB VM(MariaDB :3306) / SEARCH VM / Squid :3128 / GitLab·Artifactory. **테스트 개발 환경에는 이 인프라가 없다.** 일부 라벨(SEARCH 포트 등)은 가려져 있어 미확인
- [x] 운영 외부망 차단 여부 — 확정: firewalld 로 Egress 차단. 완전 물리 망분리는 아니고 Squid :3128 이 통제 통로 (다이어그램)
- [x] 용도 — 다중 사용자 실시간 위치(7절)
- [ ] 진입점: TLS_EDGE 앞에 기관 게이트웨이가 더 있는가 / 허용 URL 이 루트인지 서브패스인지 / WebSocket·SSE 허용 여부 / 유휴 타임아웃 — **P2 진입 전까지만 확정하면 된다. P0/P1 은 무관.** TLS_EDGE 가 최전단이고 우리 통제라면 서브패스·SSE 는 우리가 결정할 수 있다
- [ ] 운영 WAS VM 에 Docker 가 있는가 — tileserver-gl 배치 방식(컨테이너 vs Node 직접 실행) 결정. Node 런타임은 있을 것으로 추정(NodeJS :8090 구동 중)
- [ ] Squid 허용 정책 — Geofabrik·Docker Hub·npm 이 허용 목록에 들어갈 수 있는지. 반입 절차(8절)의 표준 경로를 좌우
- [x] 백그라운드 위치 전송 — **요구 아님으로 확정** (2026-08-26). 네이티브 앱이 불가한 환경이라 PWA 확정, 백그라운드 제한은 인지·수용. 화면에 떠 있는 동안만 전송한다. 푸시 알림 등 다른 PWA 기능은 이번 프로젝트 범위 밖 (7절)
- [ ] 위치 열람 범위 — 전원이 전원을 보는가, 그룹 단위인가. 확정 전까지 API 는 자기 자신의 위치만 반환한다 (7절)
- [x] 백엔드 정확한 런타임 버전 — 사용자 확인으로 확정: Java 17 / Tomcat 9.0.78 / eGov 4.3 = javax 계열 (2절 (d), 3절)
- [ ] P0 실행 재현성 — 이미지 태그 고정값, mbtiles/glyph/style JSON 해시(SHA-256), 실제 curl 응답의 Content-Type 은 반입·실행 시점에 확정해 8절 표와 P0 체크리스트를 채운다
- [x] mbtiles 용량 — 453MB (2026-08-24 HEAD). 갱신: Last-Modified 2026-08-23, 자주 재생성되는 것으로 보임 (정확한 주기는 미확인)
- [ ] 자료의 손수 작성 스타일이 실사용에 충분한지. 부족하면 Shortbread 호환 완성 스타일(Versatiles Colorful 등) 기반으로 커스터마이즈
