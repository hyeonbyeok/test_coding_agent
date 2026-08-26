import { useState } from "react";
import MapView from "./map/MapView";

export default function App() {
  const [mounted, setMounted] = useState(true);

  return (
    <>
      <button onClick={() => setMounted((m) => !m)} style={{ margin: 8 }}>
        {mounted ? "지도 언마운트" : "지도 마운트"} (map.remove() 누수 확인용)
      </button>
      {mounted && <MapView />}
    </>
  );
}
