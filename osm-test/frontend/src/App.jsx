import { useEffect, useState } from "react";
import LoginForm from "./auth/LoginForm";
import MapView from "./map/MapView";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = 확인 중, null = 미로그인
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }

  if (user === undefined) return <p style={{ padding: 16 }}>세션 확인 중…</p>;
  if (user === null) return <LoginForm onLoggedIn={setUser} />;

  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 8 }}>
        <span>
          로그인: <b>{user.userId}</b> ({user.role}
          {user.siteId ? ` · ${user.siteId}` : ""})
        </span>
        <button onClick={logout}>로그아웃</button>
        <button onClick={() => setMounted((m) => !m)}>
          {mounted ? "지도 언마운트" : "지도 마운트"} (map.remove() 누수 확인용)
        </button>
      </div>
      {mounted && <MapView />}
    </>
  );
}
