# 자동차 임베디드 개발 로드맵 (Automotive Embedded Roadmap)

[woolimi/robotics-roadmap](https://github.com/woolimi/robotics-roadmap) 의 렌더링 엔진을 **역공학**해 재사용하고,
커리큘럼을 **자동차 임베디드/SDV(BSP · Android Automotive · AUTOSAR)** 중심으로 재구성한 학습 로드맵입니다.

가운데 프로그래밍·HW 기초 동심원에서 세 트랙이 뻗어나가는 **래디얼 스킬트리** 지도입니다.

- 🟣 **플랫폼 & OS** (중심 트렁크) — 임베디드 핵심(베어메탈·RTOS·메모리/링커·커널) / BSP(부트로더·디바이스트리·보드 브링업) / 리눅스(드라이버·Yocto·유저공간) / Android Automotive(AOSP·AAOS·VHAL·CarService) / AUTOSAR(Classic·Adaptive) / 가상화·하이퍼바이저(최전선)
- 🔵 **통신 & 진단** — CAN·LIN·FlexRay·ECU / 차량 이더넷·TSN / SOME/IP·DDS / UDS·SDV/OTA
- 🟠 **안전 · 보안 · 응용** — 기능안전 ISO 26262·MISRA / 사이버보안 ISO/SAE 21434·보안부팅 / 센서 I/O·제어·바디 ECU

공통 기초(C/C++·자료구조, 디지털논리·MCU) 2개 브랜치 + 3개 트랙 13개 브랜치 = **15개 브랜치 / 41개 레슨**, `requires` 선수 관계 DAG.
각 레슨은 직관적 도입 → 숫자/코드 예시 → 수식(말 설명 선행) → `심화` 접기 블록 → `확인 문제` 구조의 상세 강의입니다.

## 실행

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 정적 빌드
npm run preview
npm test           # 엔진 불변식 검증 (39개 통과)
```

> lessons/ 는 site/ 한 단계 위에 있어야 합니다. Vite 플러그인 `site/lesson-data.ts` 가
> `lessons/*/README.md` frontmatter 와 `branches.yaml` 을 읽어 ELK 로 지도 레이아웃을 서버에서 계산합니다.

## 구조

```
roadmap/
  lessons/
    branches.yaml          # hub·트리·브랜치 (색/각도/core/outer)
    <lesson-id>/README.md  # frontmatter(id·title·branch·requires·hours·summary) + 강의 본문
  site/                    # 렌더링 엔진 (robotics-roadmap 재사용, 브랜딩만 교체)
  tools/                   # 커리큘럼 생성 스크립트
```

## 라이선스 · 출처

- 지도 사이트(`site/`)는 **[Robotics Roadmap](https://github.com/woolimi/robotics-roadmap) (Woolim Park)** 엔진을 **MIT** 로 재사용 — `LICENSE` 에 원 저작권 고지 보존.
- 커리큘럼(`lessons/`)은 이 임베디드 로드맵을 위해 새로 작성한 원본 콘텐츠.
- 트랙 배경 아이콘(`site/src/components/treeArt.ts`)은 game-icons.net(CC BY 3.0) 아이콘(cpu-shot · radar-sweep · checked-shield).

## 메모

- 퀴즈(`lessons/<id>/quiz.yaml`)는 선택사항입니다. 추가하면 로컬 `npm run dev` 에서 채점·진도 기록이 동작합니다(정적 Pages 에선 표시만).
- 상세 강의는 입문~학부 수준 개론이며, 더 깊은 내용은 각 레슨 `참고 자료`(표준·교재)로 연결합니다.
