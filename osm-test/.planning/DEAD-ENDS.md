# osm-test — 막다른 길 / 삽질 기록

## tileserver-gl 이 자기참조 타일 URL을 잘못 만든다 (2026-08-26, P2)

**증상**: NGINX(`/tiles/*` → tileserver-gl) 뒤에 둔 상태에서 TileJSON(`/tiles/data/korea.json`)은
정상 응답하지만, 그 안의 `tiles` 필드가 `http://localhost/data/korea/{z}/{x}/{y}.pbf` 처럼
① `/tiles` 접두어가 빠지고 ② 포트(8888)도 빠진 URL을 반환했다. 브라우저(MapLibre)가 이 URL로
직접 타일을 요청해 nginx 의 `/` 캐치올(→ Vite)로 잘못 라우팅되며 콘솔에 `Failed to fetch` 가 반복됐다.

**원인**: tileserver-gl 은 자신이 어떤 경로 접두어 뒤에 마운트됐는지 모른다. 응답의 `tiles`/`glyphs`
URL은 요청의 `Host` 헤더 + 자기 자신의 라우트 규칙(`/data/...`)으로만 조립한다 — 기동 로그의
"Host header poisoning mitigation is NOT enabled" 경고가 이 문제를 정확히 가리키고 있었다.

**해결**: `--public_url "http://<외부에서 보이는 origin>/tiles/"` 옵션을 tileserver-gl 기동 인자에
추가하면 이 값을 기준으로 `tiles`/`glyphs` URL을 만든다. 로컬 검증에선 `http://localhost:8888/tiles/`.

**운영 이식 시 반드시 반영**: NGINX 뒤에 tileserver-gl 을 두는 배치라면 `--public_url` 을
**실제 진입점 URL**(`https://<TLS_EDGE>/tiles/` 또는 서브패스가 있다면 그 경로 포함)로 맞춰야 한다.
빠뜨리면 로컬처럼 조용히 깨진다 — curl 로 `/data/korea.json` 응답 코드만 보면 200 이라 P0 체크리스트조차
이 문제를 못 잡는다(TileJSON 자체는 200 이니까). **`vector_layers` 뿐 아니라 `tiles` 필드의 실제 URL도
확인 항목에 넣어야 한다.**

## 개발 PC 포트 8080 / 8005 선점 (2026-08-26, P2)

**증상**: Tomcat 9.0.78 을 기본 설정(8080/8005)으로 기동하면 `BindException: Address already in use`.

**원인**: 이 개발 PC에 2026-08-24 부터 구동 중인 무관한 `java.exe` 프로세스(PID 27912)가 이미 8080 을,
다른 프로세스가 8005 를 점유하고 있었다. osm-test 가 오늘 띄운 것이 아니다 — 확인 후 그대로 뒀다
(무관한 프로세스를 죽이지 않는다).

**해결**: 이 로컬 테스트 환경에 한해 `tomcat/apache-tomcat-9.0.78/conf/server.xml` 에서
HTTP 커넥터 8080→**8082**, shutdown 포트 8005→**8006** 으로 변경. 운영/계획 문서상 정식 포트는
그대로 8080 이다 — 이 변경은 `tomcat/conf/server.xml` 에만 있고 계획 문서(3절)에는 반영하지 않는다
(개발 PC 국지적 사정이라 재현성 문서를 오염시키지 않는다). 다른 PC에서 재현할 때는 먼저
`netstat -ano | findstr :8080` 로 충돌 여부를 확인할 것.

## Tomcat WAR 재배포가 Windows 파일 잠금으로 깨진다 (2026-08-26)

**증상**: 백엔드에 엔드포인트를 추가해 재빌드한 `ROOT.war` 를 실행 중인 Tomcat 위에 그냥 덮어썼더니
자동 재배포는 로그상 "완료"라고 나오는데 실제로는 기존 엔드포인트(`/api/auth/login`)까지 전부 404.

**원인**: Windows 는 사용 중인 JAR 파일을 삭제하지 못한다. HostConfig 가 기존 `webapps/ROOT/` 를
지우려다 `WEB-INF/lib` 삭제 실패(`SEVERE ... 완전히 삭제될 수 없었습니다`) 로그를 남기면서도 배치
자체는 "완료"로 보고해, 새 클래스와 오래된 잠긴 JAR가 뒤섞인 상태로 컨텍스트가 broken 상태에 빠졌다.

**해결**: WAR 교체 전에 Tomcat 프로세스를 완전히 종료(`Stop-Process -Force`) → `webapps/ROOT/` 와
`work/Catalina/` 를 수동 삭제 → WAR 복사 → 재기동. 살아있는 Tomcat 위에 WAR 만 덮어쓰는 "핫 재배포"는
이 환경(Windows, 로컬 개발)에서 신뢰할 수 없다 — 백엔드 코드를 바꿀 때마다 이 절차를 따른다.

## MapLibre GL JS 4.7 은 setStyle() 재호출 시 'style.load' 를 다시 쏘지 않는다 (2026-08-26)

**증상**: 다지역 전환(`map.setStyle(buildStyle(...))`) 후 `map.once('style.load', cb)` 로 완료를
기다렸는데 콜백이 영원히 안 온다 — 화면은 "전환 중…" 에 멈추고 캔버스는 빈 화면.

**원인**: 브라우저에서 직접 이벤트 타임라인을 찍어 확인한 결과 `'style.load'` 는 지도 최초 생성 시
한 번만 발생하고, 이후 `setStyle()` 호출에는 다시 발생하지 않았다. `'styledata'` 는 매번 발생하지만
그 시점에 `isStyleLoaded()` 가 아직 `false` 인 경우가 있고, 그 뒤로 추가 `'styledata'` 가 안 와서
"로드 완료 시점 확인"용으로 못 쓴다. `setStyle()` 자체는 문제없이 성공했다(`getStyle()` 로 확인) —
이벤트만 안 왔을 뿐이다.

**해결**: `'idle'`(렌더링이 안정된 시점) 이벤트로 교체. `map.once('idle', cb)` 는 초기 로드든
`setStyle()` 재호출이든 안정적으로 온다. 지역 전환·스타일 교체가 있는 코드에서는 `'style.load'` 를
쓰지 말 것 — 최초 로드 전용으로만 신뢰할 수 있다.

## Windows Git Bash 함정 (2026-08-26, P0/P2)

- `python3` 이 Windows Store 스텁으로 잡혀 아무 것도 안 하고 "Python" 만 찍고 종료한다(exit 49).
  실제 파이썬은 `python`(`C:\Python\python.exe`) 이었다. `which python3 python py` 로 먼저 확인할 것
- `docker run -v ... -w /work` 처럼 컨테이너 내부 경로를 옵션에 쓰면 Git Bash 의 자동 경로 변환이
  `/work` 를 `C:/Program Files/Git/work` 로 바꿔버려 `docker: invalid working directory` 로 실패한다.
  `MSYS_NO_PATHCONV=1` 을 명령 앞에 붙여야 한다
- Windows 콘솔 기본 코드페이지(cp949)로는 파이썬 stdout 의 유니코드(한글, `–` 등 특수문자)를
  그대로 못 찍고 `UnicodeEncodeError` 로 죽는다. 콘솔에 직접 찍지 말고 파일로 리다이렉트하거나
  `sys.stdout` 을 UTF-8 로 재래핑할 것
