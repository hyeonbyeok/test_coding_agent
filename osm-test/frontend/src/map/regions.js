// 지역 전환용 목록. dataKey 는 tiles/config.json 의 "data" 키(=tileserver-gl TileJSON 경로)와 일치해야 한다.
export const REGIONS = [
  { id: "korea", dataKey: "korea", label: "대한민국 (한국)", center: [127.098636, 37.415632], zoom: 12 },
  { id: "kenya", dataKey: "kenya", label: "케냐 (아프리카) — 나이로비", center: [36.8219, -1.2921], zoom: 11 },
  { id: "peru", dataKey: "peru", label: "페루 (남아메리카) — 리마", center: [-77.0428, -12.0464], zoom: 11 },
];
