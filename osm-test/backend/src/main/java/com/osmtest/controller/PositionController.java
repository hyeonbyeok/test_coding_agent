package com.osmtest.controller;

import com.osmtest.domain.PositionUpdateRequest;
import com.osmtest.domain.PositionView;
import com.osmtest.domain.SessionUser;
import com.osmtest.service.PositionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/positions")
public class PositionController {

    @Autowired
    private PositionService positionService;

    private SessionUser requireSession(HttpServletRequest httpReq) {
        Object user = httpReq.getSession(true).getAttribute("user");
        return (user instanceof SessionUser) ? (SessionUser) user : null;
    }

    @PostMapping
    public ResponseEntity<?> post(@RequestBody PositionUpdateRequest req, HttpServletRequest httpReq) {
        SessionUser requester = requireSession(httpReq);
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "login required"));
        }
        try {
            positionService.savePosition(requester, req);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
        return ResponseEntity.ok(Collections.singletonMap("status", "saved"));
    }

    @GetMapping("/latest")
    public ResponseEntity<?> latest(HttpServletRequest httpReq) {
        SessionUser requester = requireSession(httpReq);
        if (requester == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "login required"));
        }
        List<PositionView> visible = positionService.findVisiblePositions(requester);
        return ResponseEntity.ok(visible);
    }
}
