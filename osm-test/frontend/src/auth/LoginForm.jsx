import { useState } from "react";

const TEST_ACCOUNTS = [
  { userId: "admin1", label: "admin1 (ADMIN · 전원 열람)" },
  { userId: "siteA_user1", label: "siteA_user1 (USER · siteA)" },
  { userId: "siteA_user2", label: "siteA_user2 (USER · siteA)" },
  { userId: "siteB_user1", label: "siteB_user1 (USER · siteB)" },
];
const TEST_PASSWORD = "test1234";

export default function LoginForm({ onLoggedIn }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(id, pw) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: id, password: pw }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `로그인 실패 (${res.status})`);
      }
      onLoggedIn(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>osm-test 로그인</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        권한 필터링 검증용 테스트 계정(비밀번호 전부 <code>test1234</code>) — 하나 눌러 바로 로그인:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {TEST_ACCOUNTS.map((acc) => (
          <button
            key={acc.userId}
            disabled={loading}
            onClick={() => login(acc.userId, TEST_PASSWORD)}
          >
            {acc.label}
          </button>
        ))}
      </div>
      <hr />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login(userId, password);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        <input placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          직접 로그인
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
