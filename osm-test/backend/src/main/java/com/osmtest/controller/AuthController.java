package com.osmtest.controller;

import com.osmtest.domain.AppUserRow;
import com.osmtest.domain.LoginRequest;
import com.osmtest.domain.SessionUser;
import com.osmtest.mapper.AppUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Map;

/**
 * 간이 세션 인증 스텁 — 실제 인증 체계 이식은 P2 범위 밖 (기존 환경 이식 시점 몫).
 * 여기서는 "user_id 는 세션에서 도출한다"는 API 계약(7절)을 지키기 위한 최소 로그인만 제공한다.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AppUserMapper appUserMapper;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest httpReq) {
        AppUserRow row = appUserMapper.findByUserId(req.getUserId());
        if (row == null || !row.getPassword().equals(req.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "invalid credentials"));
        }
        SessionUser sessionUser = new SessionUser(row.getUserId(), row.getRole(), row.getSiteId());
        httpReq.getSession(true).setAttribute("user", sessionUser);
        return ResponseEntity.ok(Map.of(
                "userId", sessionUser.getUserId(),
                "role", sessionUser.getRole(),
                "siteId", sessionUser.getSiteId() == null ? "" : sessionUser.getSiteId()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest httpReq) {
        Object user = httpReq.getSession(true).getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Collections.singletonMap("error", "not logged in"));
        }
        return ResponseEntity.ok(user);
    }
}
