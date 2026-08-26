package com.osmtest.mapper;

import com.osmtest.domain.PositionView;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface PositionMapper {

    int upsertLatest(
            @Param("userId") String userId,
            @Param("lng") double lng,
            @Param("lat") double lat,
            @Param("accuracy") Double accuracy,
            @Param("heading") Double heading);

    int insertLog(
            @Param("userId") String userId,
            @Param("lng") double lng,
            @Param("lat") double lat,
            @Param("accuracy") Double accuracy,
            @Param("heading") Double heading);

    /** ADMIN 전용 — 전원 위치 */
    List<PositionView> findAllLatest();

    /** USER 전용 — app_user.site_id 가 같은 사용자만 (7절 확정: 파견지 단위 열람) */
    List<PositionView> findLatestBySite(@Param("siteId") String siteId);
}
