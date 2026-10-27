---
id: adas-features
title: "ADAS 기능"
branch: adas
requires: [sensor-fusion, control-theory]
hours: 3
summary: "ACC·LKAS·AEB 등 대표 운전보조 기능의 동작과 통합"
---

# ADAS 기능

고속도로에서 크루즈 컨트롤을 켜두면 앞차와의 거리를 알아서 유지해 주고, 차선을 벗어나려 하면 핸들이 스스로 살짝 틀어지고, 갑자기 앞차가 급정거하면 운전자가 반응하기도 전에 브레이크가 걸리는 경험을 해본 적이 있을 것이다. 이런 기능들을 통틀어 첨단 운전자 보조 시스템(Advanced Driver Assistance System, ADAS)이라 부른다. ADAS는 완전자율주행과 달리 운전자가 운전의 주체이고, 시스템은 특정 상황에서 운전자를 "보조"하는 역할을 맡는다. 이 레슨에서는 앞서 배운 센서 퓨전(sensor fusion)과 제어 이론(control theory)이 실제로 어떻게 조합되어 ACC, LKAS, AEB 같은 대표 ADAS 기능으로 구현되는지 살펴본다.

ADAS 기능 하나하나는 독립적으로 보이지만, 사실 "센서로 상황을 인식하고(sensing) → 판단하고(decision) → 액추에이터를 제어한다(actuation)"는 동일한 구조를 공유한다. 차이는 어떤 센서를 쓰고, 어떤 판단 로직을 적용하고, 어떤 액추에이터(조향, 브레이크, 가속)를 제어하느냐에 있다. 이 공통 구조를 이해하면 개별 기능을 외우는 것이 아니라, 새로운 ADAS 기능이 나와도 같은 틀로 분석할 수 있게 된다.

## 학습 목표

- ACC, LKAS, AEB 각각의 동작 원리와 사용하는 센서·제어 방식을 설명할 수 있다.
- ADAS 기능들이 공유하는 "인지-판단-제어" 공통 구조를 이해한다.
- 여러 ADAS 기능이 동시에 작동할 때 발생하는 우선순위(arbitration) 문제를 이해한다.
- SAE 자동화 레벨(Level 0 ~ 2) 관점에서 ADAS와 자율주행의 경계를 구분할 수 있다.

## ACC: 적응형 크루즈 컨트롤

적응형 크루즈 컨트롤(Adaptive Cruise Control, ACC)은 전방 레이더나 카메라로 앞차와의 거리와 상대속도를 측정해, 설정 속도를 유지하면서도 앞차와의 안전 거리를 자동으로 조절하는 기능이다. 보통 운전자가 설정한 "시간 간격(time headway)"을 기준으로 삼는데, 예를 들어 시간 간격을 1.5초로 설정하면 시속 100 km/h(약 27.8 m/s)로 달릴 때 목표 차간 거리는 약 41.7 m가 된다. 앞차가 가까워지면 ACC는 가속 페달 제어를 거두고 필요시 브레이크를 걸어 간격을 벌리고, 앞차가 사라지면 다시 설정 속도로 가속한다. 제어 이론 관점에서 ACC는 종방향(longitudinal) 거리·속도 오차를 입력으로 받는 피드백 제어기로 설계되며, 최근에는 모델 예측 제어(MPC) 기반으로 구현되는 경우도 많다.

## LKAS: 차선 유지 보조 시스템

차선 유지 보조 시스템(Lane Keeping Assist System, LKAS)은 전방 카메라로 좌우 차선을 인식하고, 차량이 차선 중앙에서 벗어나려 하면 조향 토크를 더해 차선 안으로 되돌리는 기능이다. 센서 퓨전 관점에서는 카메라 영상에서 차선의 곡률과 차량의 횡방향 오프셋(lateral offset), 요각(yaw angle) 오차를 추정하고, 이를 제어 이론의 횡방향 제어기(예: PID 제어나 상태 피드백 제어)에 입력해 조향각 명령을 만든다. LKAS와 혼동되는 차선 이탈 경고(Lane Departure Warning, LDW)는 경고만 하고 직접 조향에 개입하지 않는다는 점에서 구분된다. LKAS는 "보조"이므로 운전자가 핸들에서 손을 완전히 떼면 일정 시간 뒤 경고하거나 기능을 해제하도록 설계되는 것이 일반적이다.

## AEB: 자동 긴급 브레이크

자동 긴급 브레이크(Autonomous Emergency Braking, AEB)는 전방 레이더·카메라·라이다의 센서 퓨전 결과로 전방 장애물과의 충돌 위험을 지속적으로 계산하고, 운전자의 반응이 늦거나 없을 때 시스템이 스스로 강한 제동을 거는 기능이다. 핵심 판단 지표는 충돌까지 남은 시간(Time-to-Collision, TTC)이다. 예를 들어 TTC가 일정 임계값(가령 1.5초) 이하로 떨어지면 먼저 경고를 하고, 더 짧아지면(가령 0.6초 이하) 시스템이 최대 제동력으로 브레이크를 건다. AEB는 유럽 Euro NCAP, 국내 신차 안전도 평가(KNCAP) 등에서 핵심 평가 항목으로 다뤄질 만큼 사고 예방 효과가 크게 검증된 기능이다.

## 기능 간 우선순위와 통합의 어려움

실제 차량에는 ACC, LKAS, AEB뿐 아니라 사각지대 경고(BSD), 후측방 접근 경고(RCCA) 등 여러 ADAS 기능이 동시에 돌아간다. 이때 두 기능이 동시에 서로 다른 제어 명령(예: ACC는 가속을, AEB는 급제동을)을 내리면 어느 쪽을 따를지 결정하는 중재(arbitration) 로직이 필요하다. 일반적으로 안전에 더 직결된 기능(AEB)이 편의 기능(ACC)보다 높은 우선순위를 가지도록 설계된다. 이런 다중 기능의 통합과 중재 문제는 이후 배울 기능안전(ISO 26262)과 SOTIF에서 더 체계적으로 다룬다. 또한 SAE가 정의한 자동화 레벨 기준으로 보면, ACC·LKAS·AEB는 모두 운전자가 항상 주시하고 개입할 책임을 지는 Level 1 ~ 2에 해당하며, 시스템이 주행의 전체 책임을 지는 Level 3 이상과는 책임 소재가 근본적으로 다르다.

## 정리

ADAS 기능들은 각기 다른 역할을 하지만 "센서로 인지하고, 상황을 판단하고, 액추에이터를 제어한다"는 공통 구조를 공유한다. ACC는 종방향 거리·속도를 제어하고, LKAS는 횡방향 차선 추종을 제어하며, AEB는 TTC를 기준으로 충돌 직전 긴급 제동을 수행한다. 여러 기능이 동시에 작동할 때는 안전 우선순위에 따른 중재가 필요하며, 이 모든 기능은 SAE Level 1 ~ 2 수준의 "보조" 기능으로, 운전 책임이 여전히 운전자에게 있다는 점이 완전자율주행과의 핵심적인 차이다.

## 참고 자료

- SAE J3016, "Taxonomy and Definitions for Terms Related to Driving Automation Systems"
- Euro NCAP, "Autonomous Emergency Braking (AEB) Test Protocol"
- Jo, Kim, Lee, Sunwoo, "Design and Implementation of Advanced Driving Assistance System" 관련 ADAS 설계 문헌
- Rajamani, "Vehicle Dynamics and Control" 중 ACC·차선유지 제어 관련 장
- ISO 15622 (Adaptive Cruise Control systems), ISO 11270 (Lane Keeping Assistance Systems) 표준 개요
