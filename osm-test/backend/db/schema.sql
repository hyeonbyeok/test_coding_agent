-- osm-test 위치 공유 스키마
-- 좌표 순서는 POINT(경도 위도). SRID 컬럼 속성은 MariaDB 에서 연산에 반영되지 않아 붙이지 않는다.
-- 참고: 플랜 7절

CREATE TABLE IF NOT EXISTS app_user (
  user_id     VARCHAR(64)  PRIMARY KEY,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  site_id     VARCHAR(64)  NULL,        -- 파견지. ADMIN 은 NULL 허용(전원 관리)
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS user_position_latest (
  user_id     VARCHAR(64) PRIMARY KEY,
  pos         POINT NOT NULL,
  accuracy_m  FLOAT,
  heading     FLOAT NULL,
  updated_at  DATETIME(3) NOT NULL,
  SPATIAL INDEX (pos)
);

CREATE TABLE IF NOT EXISTS user_position_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  pos         POINT NOT NULL,
  accuracy_m  FLOAT,
  heading     FLOAT NULL,
  logged_at   DATETIME(3) NOT NULL,
  INDEX idx_user_time (user_id, logged_at)
);

-- P2 검증용 테스트 계정 (role/site_id 권한 필터링 확인용)
-- 비밀번호는 전부 'test1234' — 테스트 스텁 전용, 실제 인증 체계 아님 (7절 참고)
INSERT INTO app_user (user_id, password, role, site_id) VALUES
  ('admin1', 'test1234', 'ADMIN', NULL),
  ('siteA_user1', 'test1234', 'USER', 'siteA'),
  ('siteA_user2', 'test1234', 'USER', 'siteA'),
  ('siteB_user1', 'test1234', 'USER', 'siteB')
ON DUPLICATE KEY UPDATE password = VALUES(password);
