package com.osmtest.domain;

import java.io.Serializable;

public class SessionUser implements Serializable {
    private final String userId;
    private final String role;   // ADMIN | USER
    private final String siteId; // USER 만 값이 있다. ADMIN 은 null

    public SessionUser(String userId, String role, String siteId) {
        this.userId = userId;
        this.role = role;
        this.siteId = siteId;
    }

    public String getUserId() { return userId; }
    public String getRole() { return role; }
    public String getSiteId() { return siteId; }
    public boolean isAdmin() { return "ADMIN".equals(role); }
}
