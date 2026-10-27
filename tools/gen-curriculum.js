/* 자동차 개발 로드맵 커리큘럼 생성기
   원본 robotics-roadmap 엔진에 주입할 branches.yaml + lessons/<id>/README.md 생성 */
const fs = require("fs");
const path = require("path");

const OUT = process.argv[2] || "C:/project/MY/study/car_loadmap/roadmap/lessons";

/* ---------------- 트리 ---------------- */
// core 브랜치(sw-core)가 든 autonomy 트리를 angle 180(정확히 아래)에 두어야 트렁크가 수직 직선이 된다
// (원본에서도 core 가 든 learning 트리가 180). 나머지 둘은 300/60.
const trees = [
  { id: "autonomy",  title: "자율주행 & 전장·SW", color: "#b794f6", angle: 180 },
  { id: "powertrain", title: "파워트레인 & 전동화", color: "#ff7a45", angle: 300 },
  { id: "chassis",    title: "차량동역학 & 섀시",   color: "#35c2f0", angle: 60 },
];

/* hub: 공통 기초 (가운데 동심원) */
const hub = { rings: [{ branches: ["fmath", "fee"], lessons: [] }] };

/* ---------------- 브랜치 ---------------- */
/* tree=null 이면 hub 소속 (branches.yaml hub.rings 에 등록) */
const branches = [
  // --- hub 기초 ---
  { id: "fmath", tree: "hub", title: "공학수학 · 물리", color: "#d6d3d1",
    summary: "벡터·미적분·동역학·확률. 자동차의 운동·하중·신호를 숫자로 다루는 공통 언어" },
  { id: "fee", tree: "hub", title: "전기 · 전자 기초", color: "#38bdf8",
    summary: "회로·신호·센서. 전동화와 전장 소프트웨어로 들어가는 입구" },

  // --- 자율주행 & 전장·SW (autonomy) ---
  { id: "sw-core", tree: "autonomy", title: "제어 · SW 핵심", color: "#cbd5e1", core: true,
    summary: "신호처리·제어이론·상태추정·임베디드. 자율주행과 전장이 공통으로 딛는 소프트웨어 뼈대" },
  { id: "perception", tree: "autonomy", title: "인지 센서", color: "#60a5fa",
    summary: "카메라·레이더·라이다로 주변을 읽고 객체를 찾아내는 인지 파이프라인" },
  { id: "fusion", tree: "autonomy", title: "센서 융합 · 측위", color: "#a78bfa",
    summary: "여러 센서를 섞어 차의 위치와 주변 지도를 아는 방법. 퓨전·측위·SLAM" },
  { id: "network", tree: "autonomy", title: "전장 · 네트워크", color: "#38bdf8",
    summary: "ECU 와 CAN·이더넷. 센서·제어기를 한 차 위에서 잇는 전장 아키텍처" },
  { id: "planning", tree: "autonomy", title: "판단 · 경로계획", color: "#a3e635",
    summary: "상황을 판단하고 안전한 경로를 만들며 주변 거동을 예측하는 의사결정" },
  { id: "adas", tree: "autonomy", title: "ADAS · 기능안전", color: "#fb923c",
    summary: "ACC·LKAS·AEB 같은 운전보조와 ISO 26262·SOTIF 안전 체계" },
  { id: "future", tree: "autonomy", title: "미래 모빌리티", color: "#f87171", outer: true,
    summary: "아직 굳지 않은 최전선. V2X 협력주행, L4+ 완전자율, 소프트웨어 정의 차량(SDV)" },

  // --- 파워트레인 & 전동화 (powertrain) ---
  { id: "engine", tree: "powertrain", title: "내연기관", color: "#fbbf24",
    summary: "열·유체에서 출발해 4행정 사이클·흡배기·과급까지, 연료를 힘으로 바꾸는 엔진" },
  { id: "combustion", tree: "powertrain", title: "연소 · 배기", color: "#f59e0b",
    summary: "연소와 노킹, 배기 규제와 후처리(촉매·DPF·SCR)" },
  { id: "driveline", tree: "powertrain", title: "변속기 · 구동계", color: "#818cf8",
    summary: "토크·속도를 바퀴로 전하는 변속기와 차동·AWD 구동계" },
  { id: "emotor", tree: "powertrain", title: "전기구동 · 모터", color: "#2dd4bf",
    summary: "구동 모터와 인버터, FOC 모터 제어로 전기로 바퀴를 돌리는 길" },
  { id: "battery", tree: "powertrain", title: "배터리 · BMS", color: "#4ade80",
    summary: "셀 화학과 팩, SOC/SOH 를 추정·보호하는 BMS, 충전과 열관리" },
  { id: "fuelcell", tree: "powertrain", title: "수소 · 연료전지", color: "#22d3ee",
    summary: "수소-산소 전기화학으로 전기를 만드는 연료전지와 FCEV 시스템" },

  // --- 차량동역학 & 섀시 (chassis) ---
  { id: "tire", tree: "chassis", title: "타이어 · 접지", color: "#f472b6",
    summary: "마찰원·슬립·하중이동으로 코너링·제동력이 생기는 접지의 물리" },
  { id: "suspension", tree: "chassis", title: "서스펜션 · 현가", color: "#35c2f0",
    summary: "현가 지오메트리와 스프링·댐퍼, 액티브 서스펜션의 승차감-핸들링 균형" },
  { id: "steering", tree: "chassis", title: "조향", color: "#60a5fa",
    summary: "조향 기구와 EPS/MDPS, 조향감과 스티어-바이-와이어" },
  { id: "braking", tree: "chassis", title: "제동", color: "#fb7185",
    summary: "유압 제동계와 ABS·EBD, 유압+회생 협조제어" },
  { id: "vdyn", tree: "chassis", title: "주행 동역학 · 안정성", color: "#fbbf24",
    summary: "요·롤·피치 차량 운동과 핸들링, ESC/VDC 자세제어" },
  { id: "nvh", tree: "chassis", title: "NVH · 승차감", color: "#a78bfa",
    summary: "소음·진동의 전달 경로와 방진·차음, 모달·CAE 해석" },
];

/* ---------------- 레슨 ---------------- */
/* [id, branch, title, hours, requires[], summary] */
const L = (id, branch, title, hours, requires, summary) => ({ id, branch, title, hours, requires, summary });
const lessons = [
  // hub: fmath
  L("calc-vectors", "fmath", "미적분 · 벡터", 3, [], "벡터·행렬·미분. 위치·속도·힘을 좌표로 다루는 자동차 해석의 기본 도구"),
  L("dynamics-basics", "fmath", "동역학 기초", 3, ["calc-vectors"], "뉴턴 운동법칙과 자유물체도. 차량에 작용하는 힘과 가속도를 세우는 법"),
  L("prob-stats", "fmath", "확률 · 통계", 2, ["calc-vectors"], "분포·추정·노이즈. 센서 오차와 신뢰도를 다루는 확률 기초"),
  // hub: fee
  L("circuits", "fee", "회로 기초", 2, ["calc-vectors"], "전압·전류·임피던스. 자동차 전장과 전동화를 읽는 회로의 기본"),
  L("signals", "fee", "신호 · 센서", 2, ["circuits"], "아날로그·디지털 신호와 센서/액추에이터. 측정값이 전기 신호가 되는 과정"),

  // autonomy: sw-core (core trunk — 단일 직선 체인: 신호처리→제어→추정→임베디드)
  L("signal-processing", "sw-core", "디지털 신호처리", 3, ["signals"], "샘플링·필터·FFT. 센서 신호에서 잡음을 걷어내고 특징을 뽑는 처리"),
  L("control-theory", "sw-core", "제어이론 (PID · 상태공간)", 3, ["signal-processing", "dynamics-basics"], "피드백·PID·상태공간. 원하는 상태로 시스템을 수렴시키는 제어의 핵심"),
  L("state-estimation", "sw-core", "상태추정 · 칼만필터", 3, ["control-theory", "prob-stats"], "믿을 수 없는 측정과 모델을 섞어 상태를 추정하는 칼만필터"),
  L("embedded-sw", "sw-core", "임베디드 SW · RTOS", 3, ["state-estimation"], "MCU 펌웨어와 실시간 운영체제. 제어기를 실제 하드웨어 위에서 돌리기"),
  // autonomy: perception
  L("cam-vision", "perception", "카메라 · 비전", 3, ["signal-processing"], "카메라 모델과 영상 처리. 자율주행이 세상을 픽셀로 읽는 첫 단계"),
  L("object-detection", "perception", "객체 탐지 · 딥러닝", 3, ["cam-vision"], "딥러닝으로 차·보행자·차선을 검출·분할·추적하는 인지"),
  L("radar-lidar", "perception", "레이더 · 라이다", 3, ["signal-processing"], "전파·레이저로 거리와 속도를 재는 레이더·라이다의 원리와 포인트클라우드"),
  // autonomy: fusion
  L("sensor-fusion", "fusion", "센서 퓨전", 3, ["state-estimation", "radar-lidar"], "카메라·레이더·라이다를 섞어 더 정확한 주변 인식을 만드는 융합"),
  L("localization", "fusion", "측위 · HD맵", 3, ["sensor-fusion"], "GNSS·IMU·정밀지도로 차선 수준의 자기 위치를 아는 측위"),
  L("slam", "fusion", "SLAM", 3, ["localization"], "지도 작성과 동시 측위. 미지의 환경에서 지도와 위치를 함께 추정"),
  // autonomy: network
  L("can-lin", "network", "CAN · LIN 통신", 2, ["embedded-sw"], "차량 내부를 잇는 CAN·LIN 버스 프로토콜과 메시지 설계"),
  L("ecu-arch", "network", "ECU · 전장 아키텍처", 3, ["can-lin"], "ECU 구성과 전원·접지, 도메인으로 묶는 전장 아키텍처"),
  L("auto-ethernet", "network", "차량 이더넷 · 존", 3, ["ecu-arch"], "대역폭이 큰 Automotive Ethernet 과 존(zone) 아키텍처로의 전환"),
  // autonomy: planning
  L("behavior", "planning", "행동 결정", 3, ["localization"], "교차로·차선변경 같은 상황에서 무엇을 할지 정하는 행동 결정"),
  L("path-gen", "planning", "경로 생성", 3, ["behavior"], "동역학·장애물 제약을 지키며 주행 가능한 경로를 만드는 계획"),
  L("prediction", "planning", "거동 예측", 3, ["object-detection", "behavior"], "주변 차량·보행자의 미래 움직임을 예측해 안전 여유를 확보"),
  // autonomy: adas
  L("adas-features", "adas", "ADAS 기능", 3, ["sensor-fusion", "control-theory"], "ACC·LKAS·AEB 등 대표 운전보조 기능의 동작과 통합"),
  L("iso26262", "adas", "기능안전 ISO 26262", 3, ["embedded-sw"], "ASIL 등급·안전 수명주기·FMEA 로 고장을 다루는 기능안전"),
  L("sotif", "adas", "SOTIF · 검증", 3, ["iso26262", "adas-features"], "의도된 기능의 안전(SOTIF)과 시나리오 기반 자율주행 검증"),
  // autonomy: future (outer — 트리 가장 바깥 행. 각 레슨이 최심부 레슨들을 선수로 가진다)
  L("v2x", "future", "V2X · 협력주행", 2, ["auto-ethernet", "slam"], "차-차/차-인프라 통신으로 서로의 의도를 나누는 협력주행"),
  L("sdv-ota", "future", "SDV · OTA", 3, ["auto-ethernet", "embedded-sw", "sotif"], "소프트웨어로 기능이 정의되는 차량과 무선 업데이트(OTA)"),
  L("l4-driving", "future", "L4+ 완전자율", 4, ["auto-ethernet", "slam", "prediction", "sotif"], "운전자 개입 없는 L4+ 자율주행 스택의 통합과 남은 과제"),

  // powertrain: engine
  L("thermo-fluid", "engine", "열 · 유체 기초", 3, ["calc-vectors"], "열역학·유체역학. 연소·냉각·공력을 다루는 에너지와 흐름의 토대"),
  L("ice-cycle", "engine", "4행정 사이클", 3, ["thermo-fluid"], "흡입·압축·팽창·배기. 오토/디젤 사이클과 열효율의 기본"),
  L("intake-valve", "engine", "흡배기 · 밸브트레인", 2, ["ice-cycle"], "체적효율과 캠·밸브 타이밍, 가변밸브(VVT)"),
  L("forced-induction", "engine", "과급 (터보)", 2, ["intake-valve"], "터보·슈퍼차저로 출력밀도를 높이는 과급과 인터쿨링"),
  // powertrain: combustion
  L("combustion-knock", "combustion", "연소 · 노킹", 3, ["ice-cycle"], "불꽃·압축착화와 공연비, 노킹 같은 이상연소의 메커니즘"),
  L("emissions", "combustion", "배기 규제 대응", 2, ["combustion-knock"], "배출가스 성분과 유로·국내 규제, 실도로(RDE) 시험"),
  L("aftertreatment", "combustion", "후처리 (촉매·DPF·SCR)", 2, ["emissions"], "삼원촉매·매연필터·요소수 SCR 로 유해물질을 줄이는 후처리"),
  // powertrain: driveline
  L("transmission", "driveline", "변속기 (MT/AT)", 3, ["dynamics-basics"], "토크·속도 변환과 유성기어·토크컨버터의 작동 원리"),
  L("dct-cvt", "driveline", "DCT · CVT", 2, ["transmission"], "듀얼클러치와 무단변속기의 구조·효율·주행 특성"),
  L("differential-awd", "driveline", "구동 · 차동 · AWD", 2, ["transmission"], "종감속·차동기어와 AWD/4WD 의 토크 배분"),
  // powertrain: emotor
  L("emachine", "emotor", "구동 모터 (PMSM/IM)", 3, ["circuits", "dynamics-basics"], "영구자석 동기모터와 유도모터의 원리·특성"),
  L("inverter", "emotor", "인버터 · 전력전자", 3, ["emachine", "signals"], "DC→AC 변환과 IGBT/SiC, PWM 스위칭"),
  L("motor-control", "emotor", "모터 제어 (FOC)", 3, ["inverter", "control-theory"], "벡터제어(FOC)로 모터 토크를 정밀하게 제어"),
  // powertrain: battery
  L("cell-chem", "battery", "셀 화학 · 팩", 3, ["circuits"], "리튬이온 셀 화학과 모듈·팩으로 확장되는 구조"),
  L("bms", "battery", "BMS · SOC/SOH", 3, ["cell-chem", "state-estimation"], "셀 밸런싱과 충전상태·수명 추정, 안전 보호"),
  L("charging-thermal", "battery", "충전 · 열관리", 2, ["bms"], "완속·급속 충전과 팩 냉각/가열 열관리 전략"),
  // powertrain: fuelcell
  L("fc-principle", "fuelcell", "연료전지 원리", 3, ["thermo-fluid", "circuits"], "수소-산소 전기화학 반응과 스택(MEA) 구조"),
  L("hydrogen", "fuelcell", "수소 저장 · 공급", 2, ["fc-principle"], "고압 수소 탱크와 안전, 수소 공급 시스템"),
  L("fcev", "fuelcell", "FCEV 시스템", 3, ["fc-principle", "bms"], "연료전지+배터리 하이브리드 파워트레인 구성"),

  // chassis: tire
  L("tire-mechanics", "tire", "타이어 역학", 3, ["dynamics-basics"], "마찰원과 슬립으로 코너링·제동력이 생기는 원리"),
  L("load-transfer", "tire", "하중 이동", 2, ["tire-mechanics"], "가감속·선회 시 네 바퀴 접지하중의 변화"),
  L("grip-model", "tire", "그립 한계 · 모델", 3, ["load-transfer"], "파세이카(Pacejka) 타이어 모델과 한계거동"),
  // chassis: suspension
  L("susp-geometry", "suspension", "현가 지오메트리", 3, ["dynamics-basics"], "캠버·캐스터·토와 롤센터가 거동에 미치는 영향"),
  L("spring-damper", "suspension", "스프링 · 댐퍼", 3, ["susp-geometry"], "강성·감쇠 튜닝으로 승차감과 핸들링의 균형 잡기"),
  L("active-susp", "suspension", "멀티링크 · 액티브", 2, ["spring-damper"], "독립현가 구조와 전자제어 액티브 서스펜션"),
  // chassis: steering
  L("steer-mech", "steering", "조향 기구", 2, ["susp-geometry"], "랙앤피니언과 애커먼 지오메트리의 기본"),
  L("eps", "steering", "EPS / MDPS", 3, ["steer-mech", "circuits"], "전동식 파워스티어링의 구조와 보조 제어"),
  L("sbw", "steering", "조향감 · SBW", 3, ["eps", "control-theory"], "조향감 튜닝과 스티어-바이-와이어(SBW)"),
  // chassis: braking
  L("hydraulic-brake", "braking", "유압 제동계", 2, ["dynamics-basics"], "마스터실린더·캘리퍼·디스크/드럼의 동작"),
  L("abs-ebd", "braking", "ABS · EBD", 3, ["hydraulic-brake", "tire-mechanics"], "바퀴 잠김 방지와 전·후륜 제동력 분배"),
  L("regen-brake", "braking", "회생제동 통합", 3, ["abs-ebd"], "유압+회생 협조제어(brake blending)"),
  // chassis: vdyn
  L("vehicle-motion", "vdyn", "차량 운동 (요/롤/피치)", 3, ["tire-mechanics", "load-transfer"], "6자유도 차량 거동과 좌표계의 기초"),
  L("handling", "vdyn", "핸들링 특성", 3, ["vehicle-motion"], "언더·오버스티어와 조종안정성의 이해"),
  L("esc", "vdyn", "ESC / VDC", 3, ["handling", "abs-ebd"], "자세제어로 스핀·전복을 억제하는 전자 안정성 제어"),
  // chassis: nvh
  L("nvh-basics", "nvh", "소음 · 진동 기초", 2, ["dynamics-basics"], "NVH 전달 경로와 음압·진동 평가 지표"),
  L("isolation", "nvh", "방진 · 차음", 2, ["nvh-basics", "spring-damper"], "마운트·부싱·흡차음재로 소음/진동을 저감"),
  L("modal-cae", "nvh", "모달 · CAE 해석", 3, ["nvh-basics"], "고유진동수 해석으로 공진을 회피하는 설계"),
];

/* ---------------- 생성 ---------------- */
const branchTitle = Object.fromEntries(branches.map((b) => [b.id, b.title]));
const treeTitle = Object.fromEntries(trees.map((t) => [t.id, t.title]));
const branchTree = Object.fromEntries(branches.map((b) => [b.id, b.tree]));

function yamlStr(s) { return '"' + String(s).replace(/"/g, '\\"') + '"'; }

function buildBranchesYaml() {
  const lines = [];
  lines.push("# 자동차 개발 로드맵 — 가운데 공통 기초에서 세 트랙(파워트레인·섀시·자율주행)이 뻗어나간다.");
  lines.push("# robotics-roadmap 엔진을 역공학해 자동차 도메인으로 재구성한 커리큘럼 지도.");
  lines.push("");
  lines.push("hub:");
  lines.push("  rings:");
  for (const r of hub.rings) {
    lines.push("    - branches: [" + r.branches.join(", ") + "]");
    if (r.lessons && r.lessons.length) lines.push("      lessons: [" + r.lessons.join(", ") + "]");
  }
  lines.push("");
  lines.push("trees:");
  for (const t of trees) {
    const br = branches.filter((b) => b.tree === t.id).map((b) => b.id);
    lines.push(`  - id: ${t.id}`);
    lines.push(`    title: ${yamlStr(t.title)}`);
    lines.push(`    color: ${yamlStr(t.color)}`);
    lines.push(`    angle: ${t.angle}`);
    lines.push(`    branches: [${br.join(", ")}]`);
  }
  lines.push("");
  lines.push("branches:");
  for (const b of branches) {
    lines.push(`  - id: ${b.id}`);
    lines.push(`    title: ${yamlStr(b.title)}`);
    lines.push(`    summary: ${yamlStr(b.summary)}`);
    lines.push(`    color: ${yamlStr(b.color)}`);
    if (b.core) lines.push(`    core: true`);
    if (b.outer) lines.push(`    outer: true`);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

function body(l) {
  const bt = branchTitle[l.branch];
  const tt = treeTitle[branchTree[l.branch]] || "공통 기초";
  const reqText = l.requires.length
    ? "선수 학습: " + l.requires.map((r) => "`" + r + "`").join(", ") + "."
    : "선행 지식 없이 시작할 수 있는 출발 레슨입니다.";
  return `# ${l.title}

${l.summary}.

이 레슨은 **${tt}** 트랙의 **${bt}** 단계입니다. ${reqText}

## 학습 목표

- ${l.summary.split(". ")[0]}의 핵심 개념을 이해한다.
- 실제 차량·시스템에서 ${l.title}이(가) 어떻게 쓰이는지 설명할 수 있다.
- 다음 단계 학습으로 넘어갈 수 있는 기반을 갖춘다.

## 정리

${l.summary}. 이 주제는 ${tt} 트랙에서 다음 단계로 나아가는 바탕이 됩니다.

## 참고 자료

- 이 문서는 로드맵의 선수 관계 구조에 맞춰 생성된 **개요(scaffold)** 입니다. 상세 이론·수식·그림·참고문헌은 이후 보강하세요.
`;
}

function frontmatter(l) {
  const req = "[" + l.requires.join(", ") + "]";
  return `---
id: ${l.id}
title: ${yamlStr(l.title)}
branch: ${l.branch}
requires: ${req}
hours: ${l.hours}
summary: ${yamlStr(l.summary)}
---

`;
}

// write
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "branches.yaml"), buildBranchesYaml());
let n = 0;
for (const l of lessons) {
  const dir = path.join(OUT, l.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), frontmatter(l) + body(l));
  n++;
}

// validation hints
const ids = new Set(lessons.map((l) => l.id));
const errs = [];
for (const l of lessons) {
  for (const r of l.requires) if (!ids.has(r)) errs.push(`${l.id} requires unknown ${r}`);
  if (!branchTitle[l.branch]) errs.push(`${l.id} unknown branch ${l.branch}`);
}
const coreCount = branches.filter((b) => b.core).length;
console.log(`branches.yaml + ${n} lessons written to ${OUT}`);
console.log(`trees=${trees.length} branches=${branches.length} core=${coreCount} lessons=${n}`);
if (errs.length) { console.log("ERRORS:\n" + errs.join("\n")); process.exit(1); }
else console.log("local reference check OK");
