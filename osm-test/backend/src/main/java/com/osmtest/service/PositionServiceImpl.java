package com.osmtest.service;

import com.osmtest.domain.PositionUpdateRequest;
import com.osmtest.domain.PositionView;
import com.osmtest.domain.SessionUser;
import com.osmtest.mapper.PositionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PositionServiceImpl implements PositionService {

    @Autowired
    private PositionMapper positionMapper;

    @Override
    public void savePosition(SessionUser requester, PositionUpdateRequest req) {
        if (req.getLat() < -90 || req.getLat() > 90) {
            throw new IllegalArgumentException("lat out of range");
        }
        if (req.getLng() < -180 || req.getLng() > 180) {
            throw new IllegalArgumentException("lng out of range");
        }
        // userId 는 body 가 아니라 세션(인증 주체)에서 도출한다 — body 의 user_id 는 신뢰하지 않는다 (7절)
        String userId = requester.getUserId();
        positionMapper.upsertLatest(userId, req.getLng(), req.getLat(), req.getAccuracy(), req.getHeading());
        positionMapper.insertLog(userId, req.getLng(), req.getLat(), req.getAccuracy(), req.getHeading());
    }

    @Override
    public List<PositionView> findVisiblePositions(SessionUser requester) {
        // 2026-08-26 확정: 관리자는 전원, 일반 사용자는 같은 파견지 인원만 (7절)
        if (requester.isAdmin()) {
            return positionMapper.findAllLatest();
        }
        return positionMapper.findLatestBySite(requester.getSiteId());
    }
}
