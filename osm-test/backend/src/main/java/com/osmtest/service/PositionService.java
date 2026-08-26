package com.osmtest.service;

import com.osmtest.domain.PositionUpdateRequest;
import com.osmtest.domain.PositionView;
import com.osmtest.domain.SessionUser;

import java.util.List;

public interface PositionService {
    void savePosition(SessionUser requester, PositionUpdateRequest req);
    List<PositionView> findVisiblePositions(SessionUser requester);
}
