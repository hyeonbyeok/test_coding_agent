import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styleSpec from "./style.korea.json";

const INITIAL_CENTER = [127.098636, 37.415632];
const INITIAL_ZOOM = 12;
const POLL_INTERVAL_MS = 7000;
const STALE_AFTER_MS = 5 * 60 * 1000;

function toGeoJSON(positions) {
  const now = Date.now();
  return {
    type: "FeatureCollection",
    features: positions.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {
        userId: p.userId,
        stale: now - new Date(p.updatedAt).getTime() > STALE_AFTER_MS,
      },
    })),
  };
}

async function postPosition({ lat, lng, accuracy, heading }) {
  await fetch("/api/positions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ lat, lng, accuracy, heading, timestamp: new Date().toISOString() }),
  });
}

export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [geoStatus, setGeoStatus] = useState("초기화 중");
  const [sendStatus, setSendStatus] = useState("");

  async function sendTestPosition() {
    const jitter = () => (Math.random() - 0.5) * 0.01; // 약 ±500m
    const lat = INITIAL_CENTER[1] + jitter();
    const lng = INITIAL_CENTER[0] + jitter();
    try {
      await postPosition({ lat, lng, accuracy: 15, heading: Math.random() * 360 });
      setSendStatus(`테스트 위치 전송됨 (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    } catch {
      setSendStatus("전송 실패 — 로그인 상태를 확인하세요");
    }
  }

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleSpec,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: true,
    });
    mapRef.current = map;

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.addControl(geolocate, "top-right");
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    geolocate.on("geolocate", (pos) => {
      setGeoStatus("위치 확인됨 — 서버로 전송 중");
      postPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading ?? undefined,
      })
        .then(() => setGeoStatus("위치 확인됨 — 전송 완료"))
        .catch(() => setGeoStatus("위치 확인됨 — 전송 실패(로그인 확인)"));
    });
    geolocate.on("error", (e) => {
      const msg = e?.error?.message ?? "알 수 없는 오류";
      setGeoStatus(`위치 권한/오류: ${msg}`);
    });
    map.on("load", () => {
      setGeoStatus("지도 로드 완료 — 우측 상단 버튼으로 GPS 허용/거부 확인");

      map.addSource("other-users", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "other-users-point",
        type: "circle",
        source: "other-users",
        paint: {
          "circle-radius": 6,
          "circle-color": ["case", ["get", "stale"], "#9a9a9a", "#1a73e8"],
          "circle-opacity": ["case", ["get", "stale"], 0.4, 0.9],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    let pollTimer = null;
    const poll = async () => {
      try {
        const res = await fetch("/api/positions/latest", { credentials: "include" });
        if (!res.ok) return;
        const positions = await res.json();
        const source = map.getSource("other-users");
        if (source) source.setData(toGeoJSON(positions));
      } catch {
        // 네트워크 일시 실패는 다음 폴링에서 재시도한다 — 화면을 막지 않는다
      }
    };
    map.on("load", () => {
      poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="wrap">
      <p>
        지도가 보여질 화면 —{" "}
        <button onClick={sendTestPosition}>내 위치 임의로 보내기 (GPS 없이 테스트용)</button>{" "}
        {sendStatus}
      </p>
      <div ref={containerRef} id="map" style={{ width: "100%", height: "80vh" }} />
      <p id="status">{geoStatus}</p>
    </div>
  );
}
