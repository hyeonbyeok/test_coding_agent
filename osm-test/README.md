# osm-test — 로컬 재현 방법

전체 계획은 `.planning/OSM-INTEGRATION.md`. 이 파일은 P0~P2 로컬 실행/재현 명령만 담는다.

## 사전 준비

- Docker (tileserver-gl, MariaDB, NGINX)
- JDK 17 (`C:\Program Files\Java\jdk-17` 등 — 백엔드 빌드·Tomcat 구동)
- Node 22 (프론트엔드)
- Maven 3.9+ (백엔드 빌드)

**포트 충돌 주의**: 이 개발 PC는 8080/8005 를 다른 프로세스가 이미 쓰고 있어 Tomcat 을 8082/8006 으로
띄웠다(DEAD-ENDS.md). 다른 PC에서는 `netstat -ano | findstr :8080` 으로 먼저 확인할 것 — 비어 있으면
`tomcat/apache-tomcat-9.0.78/conf/server.xml` 을 8080/8005 로 되돌려도 된다.

## P0 — 타일 서버

```bash
# 이미 받아둔 것: tiles/data/korea.mbtiles, tiles/fonts_pbf/, tiles/config.json, tiles/style.korea.json
docker run -d --name tileserver-gl \
  -v "<repo>/osm-test/tiles:/data" -p 8081:8080 \
  maptiler/tileserver-gl:v5.6.0 \
  --config /data/config.json --public_url "http://localhost:8888/tiles/"
# --public_url 은 NGINX 뒤에서 자기참조 타일 URL을 맞추기 위해 필수 (DEAD-ENDS.md)
```

검증: `curl http://localhost:8081/data/korea.json`, `.../data/korea/12/3494/1584.pbf`,
`.../fonts/Noto%20Sans%20Regular/0-255.pbf` 전부 200.

## P1 — 프론트엔드

```bash
cd frontend
npm install
npm run dev -- --port 5173 --strictPort --host 0.0.0.0   # --host 필수: Docker(NGINX)에서 접근하려면
```

`vite.config.js` 가 `/tiles`→8081, `/api`→8082 로 프록시한다(단일 오리진 모사, NGINX 없이도 확인 가능).

## P2 — DB · 백엔드 · NGINX

```bash
# MariaDB
docker run -d --name osm-test-mariadb \
  -e MARIADB_ROOT_PASSWORD=osmtest_root -e MARIADB_DATABASE=osmtest \
  -e MARIADB_USER=osmtest -e MARIADB_PASSWORD=osmtest_pw \
  -p 3307:3306 mariadb:10.11
docker exec -i osm-test-mariadb mariadb -uroot -posmtest_root osmtest < backend/db/schema.sql

# 백엔드 빌드 + 배포
cd backend && mvn -DskipTests package
cp target/osm-test-backend.war ../tomcat/apache-tomcat-9.0.78/webapps/ROOT.war

# Tomcat (JDK 17 필수, 포트는 위 "포트 충돌 주의" 참고)
cd ../tomcat/apache-tomcat-9.0.78
JAVA_HOME="C:/Program Files/Java/jdk-17" CATALINA_HOME="$(pwd)" ./bin/catalina.sh run

# NGINX (단일 오리진, :8888)
docker run -d --name osm-test-nginx --add-host=host.docker.internal:host-gateway \
  -v "<repo>/osm-test/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  -p 8888:80 nginx:1.27
```

테스트 계정(전부 비밀번호 `test1234`, `backend/db/schema.sql` 참고): `admin1`(ADMIN),
`siteA_user1`/`siteA_user2`(USER, site=siteA), `siteB_user1`(USER, site=siteB).

```bash
# 로그인 → 위치 저장 → 조회 (전부 http://localhost:8888 경유)
curl -c cookie.txt -H "Content-Type: application/json" \
  -d '{"userId":"siteA_user1","password":"test1234"}' http://localhost:8888/api/auth/login
curl -b cookie.txt -H "Content-Type: application/json" \
  -d '{"lat":37.4,"lng":127.1,"accuracy":10,"heading":90}' http://localhost:8888/api/positions
curl -b cookie.txt http://localhost:8888/api/positions/latest
```

## 정리 (필요할 때)

```bash
docker rm -f tileserver-gl osm-test-mariadb osm-test-nginx
# Tomcat/Vite 는 각각의 프로세스를 Ctrl+C 또는 taskkill 로 종료
```
