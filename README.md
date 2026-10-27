# 자동차 개발 로드맵 (Car Roadmap)

[woolimi/robotics-roadmap](https://github.com/woolimi/robotics-roadmap) 를 **역공학(reverse engineering)** 해서,
렌더링 엔진(`site/`)은 원본 구조 그대로 재사용하고 **커리큘럼 데이터(`lessons/`)만 자동차 도메인으로 교체**한 학습 로드맵입니다.

가운데 공통 기초 동심원에서 세 트랙이 뻗어나가는 **래디얼 스킬트리** 지도로, 원본과 동일한 룩앤필(ELK 레이어드 레이아웃, WebGL 성운 배경, 선수 관계 지도)을 유지합니다.

- 🟣 **자율주행 & 전장·SW** (angle 180, 트렁크) — 제어·SW 핵심 / 인지 센서 / 센서 융합·측위 / 전장·네트워크 / 판단·경로계획 / ADAS·기능안전 / 미래 모빌리티(outer)
- 🟠 **파워트레인 & 전동화** (angle 300) — 내연기관 / 연소·배기 / 변속기·구동계 / 전기구동·모터 / 배터리·BMS / 수소·연료전지
- 🔵 **차량동역학 & 섀시** (angle 60) — 타이어·접지 / 서스펜션 / 조향 / 제동 / 주행 동역학·안정성 / NVH

공통 기초(공학수학·물리, 전기·전자) 2개 브랜치 + 3개 트랙 19개 브랜치 = **21개 브랜치 / 64개 레슨**, `requires` 선수 관계 DAG.

## 실행

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 정적 빌드
npm run preview    # 빌드 결과 미리보기
npm test           # 엔진 불변식 검증 (39개 전부 통과)
```

> lessons/ 는 site/ 한 단계 위에 있어야 합니다(원본과 동일). Vite 플러그인 `site/lesson-data.ts` 가
> `lessons/*/README.md` frontmatter 와 `branches.yaml` 을 읽어 ELK 로 지도 레이아웃을 서버에서 계산합니다.

## 구조

```
roadmap/
  lessons/
    branches.yaml          # hub·트리·브랜치 정의 (색/각도/core/outer)
    <lesson-id>/README.md  # frontmatter(id·title·branch·requires·hours·summary) + 본문
  progress/                # 퀴즈 기록(선택) — fork 커밋용
  site/                    # 렌더링 엔진 (원본 robotics-roadmap 그대로 재사용, 브랜딩만 교체)
```

## 원본과의 차이 (reverse engineering 메모)

- **엔진(`site/`)은 미변경 재사용.** 리브랜딩만: `src/config.ts`(제목/설명/저장소 키), `index.html` 타이틀,
  `components/Intro.tsx`·`Chrome.tsx` 문구, `components/treeArt.ts`·`config.ts`의 트리 키(learning/manipulation/mobile → autonomy/chassis/powertrain).
- **커리큘럼은 새로 설계.** 원본의 구조 규칙을 그대로 지킴:
  - 시작점(빈 `requires`) 정확히 1개 = `calc-vectors`(지도 중심).
  - `core: true` 브랜치 정확히 1개 = `sw-core`(단일 직선 체인 → 수직 트렁크). 그래서 autonomy 트리를 angle 180 에 둠.
  - `outer: true` 브랜치 = `future`(세 레슨 모두 트리 마지막 행).
- **퀴즈는 선택사항.** 원본은 레슨마다 `quiz.yaml` 필수였으나, 이 로드맵은 읽기 중심이라 퀴즈를 선택으로 완화
  (`site/test/curriculum.test.ts`). 퀴즈 기능 자체는 엔진에 그대로 남아 있어, `lessons/<id>/quiz.yaml` 을 추가하면 동작.
- **레슨 본문은 개요(scaffold).** frontmatter·선수 관계·표준 섹션(학습 목표/정리/참고 자료)은 완비되어 지도·레이아웃이 완전히 동작하며,
  상세 이론·수식·그림은 이후 보강 대상.

커리큘럼을 바꾸려면 `lessons/branches.yaml` 과 각 `lessons/<id>/README.md` 를 편집하면 됩니다.
(초기 64개 레슨은 `tools/gen-curriculum.js` 로 일괄 생성되었습니다.)

## 라이선스 · 출처

- 지도 사이트(`site/`)는 **[Robotics Roadmap](https://github.com/woolimi/robotics-roadmap) (Woolim Park)** 의
  렌더링 엔진을 **MIT** 라이선스로 재사용했습니다 — `LICENSE` 에 원 저작권 고지를 보존했습니다.
- 커리큘럼(`lessons/`)은 이 자동차 로드맵을 위해 새로 작성한 원본 콘텐츠입니다(상류 강의와 무관).
- 트리 실루엣(`site/src/components/treeArt.ts`)은 game-icons.net(CC BY 3.0)과 Microsoft Fluent UI(MIT) 아이콘입니다.

> 참고: 링크 미리보기 이미지(`site/public/og.png`)는 아직 원본 이미지라, 원하시면 자동차 지도 스크린샷으로 교체하세요.
