// Shortbread 스키마는 Geofabrik 의 모든 지역 추출본(대한민국·케냐·페루 등)이 공유한다 —
// 레이어명이 동일하므로 데이터 소스 URL 만 바꾸면 같은 레이어 정의를 그대로 재사용할 수 있다.
//
// 색상 체계는 osm.org 기본 지도(OpenStreetMap Carto)를 참고했다 — 데이터는 같으므로
// 스타일만으로 비슷한 인상을 낼 수 있다. Carto 원본 스타일시트가 아니라 근사치다.

const NAME = ["coalesce", ["get", "name"], ["get", "name_en"]];
const HALO = { "text-halo-width": 1.2, "text-halo-color": "#ffffff" };

// 도로 등급 판별 (streets 레이어의 kind)
const MAJOR_ROADS = ["motorway", "trunk", "primary", "secondary", "tertiary",
  "unclassified", "residential", "living_street", "service", "pedestrian", "busway"];
const RAIL_KINDS = ["rail", "light_rail", "subway", "tram", "monorail", "funicular", "narrow_gauge"];
const PATH_KINDS = ["footway", "path", "steps", "cycleway", "track", "bridleway"];

const roadColor = ["match", ["get", "kind"],
  "motorway", "#e892a2",
  "trunk", "#f9b29c",
  "primary", "#fcd6a4",
  "secondary", "#f7fabf",
  "pedestrian", "#dddde8",
  /* tertiary·residential·service 등 */ "#ffffff"];

const roadCasingColor = ["match", ["get", "kind"],
  "motorway", "#dc2a67",
  "trunk", "#c84e2f",
  "primary", "#a06b00",
  "secondary", "#707d05",
  "tertiary", "#8f8f8f",
  "service", "#cccccc",
  "#adadad"];

// 등급별 굵기 — 줌에 따라 지수적으로 커진다 (motorway > primary > residential 순)
const roadWidth = ["interpolate", ["exponential", 1.5], ["zoom"],
  8, ["match", ["get", "kind"], ["motorway", "trunk"], 1.4, ["primary"], 0.9, 0.4],
  12, ["match", ["get", "kind"], ["motorway", "trunk"], 3.2, ["primary"], 2.4,
    ["secondary"], 1.8, ["tertiary"], 1.4, ["service"], 0.6, 1],
  14, ["match", ["get", "kind"], ["motorway", "trunk"], 6.5, ["primary"], 5.5,
    ["secondary"], 4.5, ["tertiary"], 3.5, ["service"], 1.6, 2.8],
  18, ["match", ["get", "kind"], ["motorway", "trunk"], 22, ["primary"], 19,
    ["secondary"], 17, ["tertiary"], 15, ["service"], 9, 13]];

const roadCasingWidth = ["interpolate", ["exponential", 1.5], ["zoom"],
  8, ["match", ["get", "kind"], ["motorway", "trunk"], 2.2, ["primary"], 1.5, 0.8],
  12, ["match", ["get", "kind"], ["motorway", "trunk"], 4.6, ["primary"], 3.6,
    ["secondary"], 2.8, ["tertiary"], 2.2, ["service"], 1.2, 1.8],
  14, ["match", ["get", "kind"], ["motorway", "trunk"], 8.5, ["primary"], 7.5,
    ["secondary"], 6.2, ["tertiary"], 5, ["service"], 2.6, 4.2],
  18, ["match", ["get", "kind"], ["motorway", "trunk"], 26, ["primary"], 23,
    ["secondary"], 20.5, ["tertiary"], 18, ["service"], 11.5, 16]];

const SHORTBREAD_LAYERS = [
  { id: "background", type: "background", paint: { "background-color": "#f2efe9" } },
  { id: "ocean", type: "fill", source: "sb", "source-layer": "ocean", paint: { "fill-color": "#aad3df" } },

  // 토지이용 — kind 별 채색 (osm.org 가 풍성해 보이는 핵심 요소). 미분류 kind 는 투명.
  { id: "land", type: "fill", source: "sb", "source-layer": "land",
    paint: { "fill-color": ["match", ["get", "kind"],
      ["forest", "wood"], "#add19e",
      ["grass", "meadow", "village_green", "recreation_ground"], "#cdebb0",
      ["park", "garden"], "#c8facc",
      ["cemetery", "grave_yard"], "#aacbaf",
      ["farmland"], "#eef0d5",
      ["orchard", "vineyard", "allotments", "plant_nursery", "greenhouse_horticulture"], "#aedfa3",
      ["heath"], "#d6d99f",
      ["scrub"], "#c8d7ab",
      ["beach", "sand", "dune"], "#fff1ba",
      ["residential", "garages"], "#e0dfdf",
      ["commercial", "retail"], "#f2dad9",
      ["industrial", "railway", "brownfield", "landfill"], "#ebdbe8",
      ["quarry"], "#c5c3c3",
      "rgba(0,0,0,0)"] } },

  { id: "water", type: "fill", source: "sb", "source-layer": "water_polygons", paint: { "fill-color": "#aad3df" } },
  { id: "water-lines", type: "line", source: "sb", "source-layer": "water_lines",
    paint: { "line-color": "#aad3df",
      "line-width": ["interpolate", ["exponential", 1.5], ["zoom"],
        8, ["match", ["get", "kind"], ["river", "canal"], 1.2, 0.5],
        14, ["match", ["get", "kind"], ["river", "canal"], 4, 1.4],
        18, ["match", ["get", "kind"], ["river", "canal"], 12, 4]] } },

  { id: "street-polygons", type: "fill", source: "sb", "source-layer": "street_polygons",
    paint: { "fill-color": ["match", ["get", "kind"], ["pedestrian"], "#dddde8", "#ededed"] } },

  { id: "buildings", type: "fill", source: "sb", "source-layer": "buildings",
    paint: { "fill-color": "#d9d0c9", "fill-outline-color": "#c5b8a8" } },

  // 도로 — 외곽선(casing)을 먼저, 본선(fill)을 위에. 등급별 색은 osm.org 관례.
  { id: "streets-casing", type: "line", source: "sb", "source-layer": "streets", minzoom: 11,
    filter: ["match", ["get", "kind"], MAJOR_ROADS, true, false],
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: { "line-color": roadCasingColor, "line-width": roadCasingWidth } },
  { id: "streets", type: "line", source: "sb", "source-layer": "streets",
    filter: ["match", ["get", "kind"], MAJOR_ROADS, true, false],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": roadColor, "line-width": roadWidth } },

  // 보행로·자전거길 — 점선
  { id: "paths", type: "line", source: "sb", "source-layer": "streets", minzoom: 13,
    filter: ["match", ["get", "kind"], PATH_KINDS, true, false],
    paint: { "line-color": ["match", ["get", "kind"], ["cycleway"], "#4c4cf0", ["track"], "#996600", "#fa8072"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 18, 2.2],
      "line-dasharray": [2, 2] } },

  // 철도
  { id: "rail", type: "line", source: "sb", "source-layer": "streets",
    filter: ["match", ["get", "kind"], RAIL_KINDS, true, false],
    paint: { "line-color": "#707070",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.6, 18, 3.5] } },
  { id: "rail-hatch", type: "line", source: "sb", "source-layer": "streets", minzoom: 13,
    filter: ["match", ["get", "kind"], RAIL_KINDS, true, false],
    paint: { "line-color": "#ffffff", "line-dasharray": [2, 3],
      "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 18, 1.8] } },

  { id: "ferries", type: "line", source: "sb", "source-layer": "ferries",
    paint: { "line-color": "#6666ff", "line-width": 1.2, "line-dasharray": [4, 4] } },

  // 행정경계 — 국경은 실선, 광역(도) 경계는 점선. 해상 경계는 그리지 않는다.
  { id: "boundary-state", type: "line", source: "sb", "source-layer": "boundaries",
    filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], true]],
    paint: { "line-color": "#ac46ac", "line-width": 1.1, "line-dasharray": [3, 2], "line-opacity": 0.6 } },
  { id: "boundary-country", type: "line", source: "sb", "source-layer": "boundaries",
    filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], true]],
    paint: { "line-color": "#ac46ac", "line-width": 1.8, "line-opacity": 0.6 } },

  // ── 라벨 (아래에서 위 순서로 그려진다) ──
  { id: "water-line-labels", type: "symbol", source: "sb", "source-layer": "water_lines_labels",
    layout: { "symbol-placement": "line", "text-field": NAME,
      "text-font": ["Noto Sans Regular"], "text-size": 12 },
    paint: { "text-color": "#3b5b7a", ...HALO } },
  { id: "water-polygon-labels", type: "symbol", source: "sb", "source-layer": "water_polygons_labels",
    layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"], "text-size": 12 },
    paint: { "text-color": "#3b5b7a", ...HALO } },

  { id: "street-labels", type: "symbol", source: "sb", "source-layer": "street_labels", minzoom: 12,
    layout: { "symbol-placement": "line", "text-field": NAME,
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 12] },
    paint: { "text-color": "#333333", ...HALO } },

  { id: "public-transport-labels", type: "symbol", source: "sb", "source-layer": "public_transport", minzoom: 12,
    filter: ["match", ["get", "kind"], ["station", "halt", "airport", "ferry_terminal"], true, false],
    layout: { "text-field": NAME, "text-font": ["Noto Sans Bold"], "text-size": 11,
      "text-offset": [0, 0.6], "text-anchor": "top" },
    paint: { "text-color": "#3a5fbf", ...HALO } },

  { id: "boundary-labels", type: "symbol", source: "sb", "source-layer": "boundary_labels", maxzoom: 11,
    filter: ["<=", ["get", "admin_level"], 4],
    layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"],
      "text-size": 11.5, "text-letter-spacing": 0.15 },
    paint: { "text-color": "#9e7ab5", ...HALO } },

  // 지명 위계 — 도시는 굵고 크게, 동네는 작고 옅게
  { id: "place-minor-labels", type: "symbol", source: "sb", "source-layer": "place_labels", minzoom: 10,
    filter: ["match", ["get", "kind"],
      ["village", "hamlet", "suburb", "quarter", "neighbourhood", "island"], true, false],
    layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"], "text-size": 11.5 },
    paint: { "text-color": "#444444", ...HALO } },
  { id: "place-town-labels", type: "symbol", source: "sb", "source-layer": "place_labels",
    filter: ["==", ["get", "kind"], "town"],
    layout: { "text-field": NAME, "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 6, 11.5, 12, 14] },
    paint: { "text-color": "#222222", ...HALO } },
  { id: "place-city-labels", type: "symbol", source: "sb", "source-layer": "place_labels",
    filter: ["match", ["get", "kind"], ["city", "capital", "state_capital"], true, false],
    layout: { "text-field": NAME, "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4, 12, 12, 17] },
    paint: { "text-color": "#111111", ...HALO } },

  { id: "poi-labels", type: "symbol", source: "sb", "source-layer": "pois", minzoom: 15,
    layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"],
      "text-size": 10.5, "text-offset": [0, 0.8], "text-anchor": "top" },
    paint: { "text-color": "#6b6b5e", ...HALO } },
  { id: "site-labels", type: "symbol", source: "sb", "source-layer": "sites", minzoom: 15,
    layout: { "text-field": NAME, "text-font": ["Noto Sans Regular"],
      "text-size": 10.5, "text-offset": [0, 0.8], "text-anchor": "top" },
    paint: { "text-color": "#6b6b5e", ...HALO } },
];

export function buildStyle(dataKey, label) {
  return {
    version: 8,
    name: label,
    glyphs: "/tiles/fonts/{fontstack}/{range}.pbf",
    sources: { sb: { type: "vector", url: `/tiles/data/${dataKey}.json` } },
    layers: SHORTBREAD_LAYERS,
  };
}
