---
id: autosar-adaptive
title: "AUTOSAR Adaptive"
branch: autosar
requires: [autosar-classic]
hours: 3
summary: "POSIX 기반·ara::com. 고성능 컴퓨팅 ECU 를 위한 Adaptive"
---

# AUTOSAR Adaptive

앞서 배운 `autosar-classic` 에서 우리는 ECU 소프트웨어를 SWC(Software Component)로 쪼개고, 이들을 RTE(Runtime Environment)로 연결하며, BSW(Basic Software) 위의 AUTOSAR OS가 정적으로 정의된 태스크를 돌리는 세계를 보았다. 이 세계의 가장 큰 미덕은 "모든 것이 빌드 시점에 결정된다"는 점이다. 어떤 Runnable이 어떤 주기로 돌고, 어떤 신호가 어느 포트를 통해 흐르며, 메모리를 얼마나 쓰는지가 ARXML 설정과 함께 컴파일되어 하나의 바이너리로 굳는다. 덕분에 브레이크나 조향 같은 안전 필수 기능을 수 밀리초 데드라인 안에서 결정론적으로 돌릴 수 있었다.

그런데 자동차에 ADAS(Advanced Driver Assistance System)와 자율주행 기능이 들어오면서 상황이 달라졌다. 카메라 여러 대의 영상을 합쳐 객체를 인식하고(센서 퓨전), 주변 차량의 경로를 예측하고, 고정밀 지도 위에서 수 초 앞의 주행 경로를 계획하는 일은 MCU 하나로는 감당할 수 없는 연산량을 요구한다. 이런 기능은 멀티코어 CPU와 GPU를 갖춘 고성능 컴퓨팅 ECU(High Performance Computer) 위에서 돌아가며, 수백 MB 단위의 메모리와 복잡한 소프트웨어 스택을 쓴다. 게다가 이런 기능은 출고 후에도 계속 개선된다. 스마트폰 앱처럼 OTA(Over-The-Air) 업데이트로 새 버전을 내려받고, 일부 모듈만 교체하거나 새 기능을 추가하기를 원한다.

문제는 Classic의 정적 구조가 이런 유연성과 상극이라는 점이다. 모든 것이 하나의 바이너리로 굳어 있으면 한 기능만 교체하기 어렵고, 동적으로 메모리를 할당하거나 실행 중에 새 애플리케이션을 띄우는 것도 전제가 아니다. 더구나 자율주행 소프트웨어는 클라우드의 마이크로서비스처럼 "서비스를 제공하는 쪽"과 "소비하는 쪽"이 느슨하게 연결되고, 네트워크 토폴로지가 바뀌어도 코드가 그대로 동작하기를 바란다. 이 요구를 충족하기 위해 AUTOSAR는 완전히 다른 두 번째 플랫폼, 즉 AUTOSAR Adaptive Platform을 만들었다. 이번 장에서는 Adaptive가 Classic과 무엇이 다른지, 그 핵심인 서비스 지향 통신 미들웨어 ara::com은 어떻게 동작하는지, 그리고 두 플랫폼을 실제 차량에서 어떻게 역할을 나눠 함께 쓰는지를 살펴본다.

## 학습 목표

- AUTOSAR Classic의 정적 구조와 Adaptive의 동적·프로세스 기반 구조가 어떻게 다른지 비교해 설명할 수 있다.
- Adaptive Platform이 POSIX 준수 OS 위에서 Adaptive Application을 프로세스 단위로 실행한다는 구조를 이해한다.
- 서비스 지향 통신(ara::com)의 Proxy/Skeleton 패턴과 Method·Event·Field 세 통신 패턴을 예시로 설명할 수 있다.
- Execution Management, Communication Management, UCM 등 주요 Functional Cluster의 역할을 기능 중심으로 설명할 수 있다.
- Classic과 Adaptive를 언제 각각 쓰고 왜 함께 쓰는지 안전성과 유연성 관점에서 판단할 수 있다.

## POSIX 위의 프로세스: Adaptive의 실행 구조

Adaptive Platform의 가장 근본적인 전환은 운영체제에 대한 가정에서 시작한다. Classic의 AUTOSAR OS는 OSEK 계보를 잇는 작고 정적인 실시간 OS로, 메모리 보호가 제한적이고 태스크가 빌드 시점에 고정된다. 반면 Adaptive는 POSIX(Portable Operating System Interface) 표준의 일부(구체적으로는 PSE51이라 불리는 실시간 프로파일)를 준수하는 OS를 전제로 한다. 실무에서는 임베디드 Linux 나 QNX 같은 상용 실시간 OS가 이 역할을 맡는 경우가 많다. POSIX를 전제로 한다는 것은 스레드, 파일 시스템, 동적 메모리 할당, 프로세스 간 메모리 보호 같은 "범용 OS가 제공하는 풍부한 기능"을 그대로 쓸 수 있다는 뜻이다.

이 전제 위에서 가장 큰 차이가 드러난다. Classic에서 SWC의 Runnable은 RTE를 거쳐 하나의 정적 바이너리에 모두 컴파일되어 들어간다. 즉 수십 개의 기능이 한 덩어리의 펌웨어로 묶여 같은 주소 공간에서 돈다. 반면 Adaptive에서는 각 Adaptive Application이 독립된 프로세스(process)로 실행된다. 프로세스는 OS가 보장하는 별도의 가상 주소 공간을 가지므로, 한 애플리케이션이 메모리를 잘못 건드려도 다른 애플리케이션으로 오류가 번지지 않는다(메모리 격리, memory isolation). 또한 각 애플리케이션은 공유 라이브러리를 동적 링킹(dynamic linking)으로 불러올 수 있어, 전체를 다시 빌드하지 않고도 개별 애플리케이션 단위로 교체하거나 추가할 수 있다.

조금 더 구체적으로 보면, Classic은 애플리케이션 코드가 BSW·RTE·OS와 한 덩어리로 묶여 전원이 켜지는 순간 모든 태스크가 미리 정해진 대로 시작된다. 반면 Adaptive에서는 OS가 먼저 부팅되고, 그 위에서 플랫폼이 올라온 다음, 필요한 애플리케이션 프로세스들이 하나씩 실행된다. 이 "먼저 OS, 그 다음 애플리케이션"이라는 순서 자체가 범용 컴퓨터의 동작 방식에 가깝고, 그래서 PC나 서버에서 쓰던 라이브러리·개발 도구·언어 기능(예: 최신 C++ 표준 라이브러리)을 상당 부분 그대로 가져다 쓸 수 있다. Classic이 자동차에 특화된 폐쇄적 환경이라면, Adaptive는 범용 소프트웨어 생태계와 자동차의 요구를 잇는 다리에 가깝다.

정리하면 이렇게 대비된다. Classic은 "하나의 바이너리 안에서 정적으로 배치된 Runnable들이 협력하는" 모델이고, Adaptive는 "POSIX OS 위에서 격리된 프로세스들이 서비스로 통신하는" 모델이다. 전자는 작은 자원과 엄격한 결정론에 강하고, 후자는 큰 연산과 유연한 배포에 강하다. 이 구조적 차이가 뒤에서 볼 통신 방식과 생애주기 관리의 차이로 그대로 이어진다.

## ara::com: 서비스 지향 통신 미들웨어

Adaptive 애플리케이션들이 서로 통신하는 방식은 Classic과 질적으로 다르다. Classic에서는 포트와 신호가 ARXML에 정적으로 매핑되어, "어느 신호가 어느 ECU로 간다"가 빌드 시점에 못 박힌다. Adaptive는 대신 서비스 지향 아키텍처(SOA, Service-Oriented Architecture)를 택한다. 이는 클라우드의 마이크로서비스와 비슷한 발상이다. 어떤 애플리케이션이 "나는 이런 서비스를 제공한다"고 등록하면, 그 서비스가 필요한 다른 애플리케이션이 런타임에 이를 찾아내(서비스 디스커버리, service discovery) 연결한다. 제공자가 어느 ECU에 있는지 소비자는 몰라도 된다.

이 통신을 담당하는 표준 API가 ara::com 이다. 핵심 설계는 Proxy/Skeleton 패턴이다. 서비스를 제공하는 쪽(서버)은 Skeleton 객체를 구현하고, 서비스를 소비하는 쪽(클라이언트)은 Proxy 객체를 통해 그 서비스를 마치 자기 안에 있는 것처럼 호출한다. Proxy는 소비자 측에서 서비스의 "대리인" 역할을 하며, 실제 통신(직렬화, 네트워크 전송 등)은 미들웨어가 뒤에서 처리한다. 개발자는 네트워크 세부사항을 몰라도 함수 호출 수준에서 서비스를 쓸 수 있다.

ara::com은 서비스가 제공할 수 있는 요소를 세 가지 통신 패턴으로 나눈다.

- Method: 원격 프로시저 호출(RPC) 방식이다. 소비자가 Proxy를 통해 제공자의 함수를 호출하고 결과를 돌려받는다. 예를 들어 "현재 조향각을 계산해서 반환하라" 같은 요청-응답형 상호작용에 쓴다. 비동기 호출을 지원해 결과를 나중에 받을 수도 있다.
- Event: 발행-구독(publish-subscribe) 방식이다. 제공자가 어떤 데이터를 발행하면, 그 Event를 구독한 모든 소비자에게 전달된다. 예를 들어 주차 보조 서비스가 "주변 장애물 거리"라는 Event를 구독하면, 초음파 센서 서비스가 값을 갱신할 때마다 자동으로 그 값을 받는다. 요청 없이 데이터가 흘러들어오는 스트리밍형 통신에 적합하다.
- Field: Event와 Method의 성격을 합친 것이다. Field는 "현재 값"을 가지는 상태 변수처럼 동작한다. 소비자는 Getter로 현재 값을 읽고, 권한이 있으면 Setter로 값을 바꾸며, 값이 바뀌면 Event처럼 변경 통지를 받을 수 있다. 예를 들어 "운전 모드(일반/스포츠)" 같은 설정 값을 Field로 두면, 초기값을 즉시 읽을 수 있으면서 이후 변경도 구독할 수 있다.

이 서비스들이 실제 네트워크 위를 어떻게 오가는가는 바인딩(binding)이 결정한다. ara::com의 기본 바인딩으로 흔히 쓰이는 것이 SOME/IP(Scalable service-Oriented MiddlewarE over IP)다. 이름대로 IP 네트워크(주로 차량용 이더넷) 위에서 서비스 지향 통신을 실어 나르는 프로토콜로, 서비스 디스커버리와 Method·Event·Field 전송을 모두 규정한다. ara::com API는 바인딩과 분리되어 있어서, 애플리케이션 코드는 그대로 둔 채 하부 전송 방식을 바꿀 수 있다는 것이 중요한 장점이다.

아래는 Event 구독의 개념을 아주 단순화한 C++ 유사 코드다. 실제 API는 더 복잡하지만, Proxy를 통해 Event를 구독하고 콜백으로 값을 받는 흐름을 보여준다.

```cpp
// 소비자: 장애물 거리 서비스의 Proxy 를 찾아 Event 를 구독
ObstacleServiceProxy proxy = FindService("ObstacleService");

proxy.DistanceEvent.SetReceiveHandler([&proxy]() {
    auto samples = proxy.DistanceEvent.GetNewSamples();   // 새로 도착한 값들
    for (auto& d : samples) {
        if (*d < 0.3) {
            TriggerBrakeAssist();   // 30cm 이내면 제동 보조
        }
    }
});
proxy.DistanceEvent.Subscribe(10);   // 버퍼 10개로 구독 시작
```

여기서 제공자가 어느 ECU에 있는지, 값이 SOME/IP로 어떻게 직렬화되어 전송되는지는 코드에 드러나지 않는다. 소비자는 "장애물 거리가 갱신되면 알려달라"고 선언할 뿐이고, 나머지는 ara::com과 바인딩이 처리한다. 이것이 Classic의 정적 신호 매핑과 가장 크게 대비되는 지점이다.

## Functional Cluster: 플랫폼을 이루는 기능 블록

Adaptive Platform 자체는 여러 기능 블록의 모음으로 정의되며, 이 블록들을 Functional Cluster라 부른다. Classic의 BSW가 통신·진단·메모리 같은 서비스를 모듈로 제공했듯이, Adaptive는 각 기능을 Functional Cluster로 제공한다. 전부를 외울 필요는 없고, 역할 중심으로 핵심 몇 개만 짚어 보자.

- Execution Management(EM): 프로세스의 생애주기를 관리한다. 어떤 애플리케이션을 언제 시작하고, 어떤 순서로 올리며, 종료할지를 담당한다. Classic의 정적 태스크 테이블 대신, EM이 매니페스트를 보고 프로세스를 띄우고 상태를 추적한다.
- Communication Management(CM): 바로 앞에서 본 ara::com을 구현하는 블록이다. 서비스 디스커버리, Proxy/Skeleton 중개, 직렬화, 바인딩(SOME/IP 등)으로의 전달을 모두 책임진다.
- State Management(SM): 차량 또는 머신 전체의 동작 상태(예: 시동, 주행, 정비 모드)를 관리하고, 그 상태에 맞춰 어떤 기능을 활성화할지 조율한다.
- Diagnostic Management(DM): 진단 통신(예: UDS 기반 고장 코드 조회)을 처리한다. Classic의 진단 스택과 역할이 대응된다.
- Update and Configuration Management(UCM): OTA 업데이트의 핵심이다. 새 소프트웨어 패키지를 받아 검증하고, 설치하고, 실패 시 이전 버전으로 되돌리는(rollback) 일을 담당한다. Adaptive가 "출고 후에도 계속 진화하는 소프트웨어"를 지향하게 해 주는 블록이다.
- Persistency: 애플리케이션이 전원이 꺼져도 유지해야 하는 데이터를 저장하고 읽는 표준 방법을 제공한다.
- Identity and Access Management(IAM): 어떤 애플리케이션이 어떤 서비스나 자원에 접근할 권한이 있는지를 통제한다. 프로세스가 격리되고 동적으로 로드되는 환경에서 보안을 지키기 위한 장치다.

이 클러스터들이 POSIX OS 위에 한 겹 더 쌓여서, 그 위에서 Adaptive Application들이 ara::com으로 통신하며 동작하는 전체 그림이 완성된다. Classic의 BSW가 하나의 ECU 안에 고정된 서비스 계층이었다면, Adaptive의 Functional Cluster는 표준이 정한 역할별 기능 블록으로서 벤더마다 구현은 다르되 애플리케이션이 쓰는 인터페이스(ara:: 로 시작하는 표준 API)는 같다는 점이 핵심이다. 덕분에 애플리케이션 개발자는 어느 벤더의 Adaptive Platform 위에서 돌든 같은 API로 코드를 작성할 수 있고, 이는 소프트웨어의 이식성과 재사용성을 높인다.

## Manifest: 동적 배포를 기술하는 설정

Classic에서 ARXML이 모든 것을 빌드 시점에 정적으로 못 박았다면, Adaptive에서는 매니페스트(Manifest)가 그 역할을 대신하되 더 동적인 배포를 지원한다. 매니페스트도 ARXML 형식으로 기술되지만, 쓰임이 다르다.

- Machine Manifest: 하나의 머신(ECU)에 관한 설정을 기술한다. 네트워크 구성, OS 수준 자원, 어떤 Functional Cluster가 올라가는지 같은 "그 ECU 전체"의 밑그림이다.
- Execution Manifest: 개별 Adaptive Application을 어떻게 실행할지를 기술한다. 시작 조건, 자원 요구량, 어떤 서비스를 제공하거나 소비하는지 등이 담긴다. EM은 이 매니페스트를 읽어 프로세스를 띄운다.

핵심 차이는, Classic의 설정이 하나의 바이너리에 녹아 들어가 바꾸려면 전체 재빌드가 필요한 반면, Adaptive의 매니페스트는 애플리케이션과 함께 배포 단위로 다루어진다는 점이다. 그래서 UCM을 통해 특정 애플리케이션과 그 Execution Manifest만 교체하는 식의, 모듈 단위 업데이트가 가능하다.

## Classic과 Adaptive, 언제 무엇을 쓰고 왜 함께 쓰는가

여기서 가장 중요한 오해를 바로잡아야 한다. Adaptive는 Classic을 대체하려고 만든 것이 아니다. 두 플랫폼은 서로 다른 문제를 풀며, 현대 차량은 둘을 함께 쓴다.

판단 기준은 명확하다. 하드 리얼타임(hard real-time)과 높은 안전 등급이 요구되는 기능은 Classic이 맞다. 조향, 제동, 엔진·모터 제어처럼 수 밀리초의 데드라인을 어기면 바로 사고로 이어지고, 최고 수준의 ASIL(Automotive Safety Integrity Level) 인증이 필요한 영역이다. 이런 곳에는 작고 결정론적이며 오랜 기간 검증된 Classic이 적합하다. 메모리 보호가 제한적인 대신, 동적 할당 같은 예측 불가능한 요소가 없어 최악 실행 시간을 엄격히 보장할 수 있기 때문이다.

반대로 연산량이 크고 유연성이 필요한 기능은 Adaptive가 맞다. 카메라·라이다 기반 센서 퓨전, 경로 계획, 고정밀 지도 처리, 그리고 복잡한 HMI(Human-Machine Interface)처럼 큰 메모리와 멀티코어 연산을 쓰고, 출고 후에도 OTA로 자주 개선되는 영역이다. 이런 곳에는 POSIX의 풍부한 기능과 동적 배포, 서비스 지향 통신을 제공하는 Adaptive가 어울린다.

실제 차량에서는 이 둘이 차량 이더넷과 SOME/IP, 그리고 게이트웨이를 통해 연결되어 협력한다. 예를 들어 Adaptive ECU가 센서 퓨전으로 "앞차와의 거리와 상대 속도"를 계산해 서비스로 발행하면, Classic ECU의 제동 제어기가 이를 받아 실제 브레이크 압력을 하드 리얼타임으로 제어한다. 즉 "생각하고 계획하는" 유연한 영역은 Adaptive가, "즉시 안전하게 작동하는" 결정론적 영역은 Classic이 맡아 상호 보완한다.

<details><summary><b>심화: ara::com의 SOME/IP 바인딩과 네트워크 전송</b></summary>

ara::com은 추상 API이고, 실제로 바이트가 네트워크를 건너가는 과정은 바인딩이 맡는다. SOME/IP 바인딩을 예로 들면, 통신은 크게 두 단계로 나뉜다. 먼저 서비스 디스커버리(SOME/IP-SD) 단계에서 제공자는 "이 서비스를 이 IP와 포트에서 제공한다"는 Offer 메시지를 멀티캐스트로 알리고, 소비자는 자신이 필요한 서비스를 Find 메시지로 찾거나 Offer를 받아 구독을 신청한다. 이 과정 덕분에 소비자 코드는 제공자의 물리적 위치를 하드코딩하지 않아도 된다.

연결이 맺어지면 실제 데이터가 오간다. Method 호출은 요청·응답 메시지 쌍으로, Event는 구독자에게 보내는 알림 메시지로 전송된다. 이때 C++ 객체인 인자와 반환값은 네트워크로 보내기 위해 바이트 열로 변환되는데, 이를 직렬화(serialization)라 한다. SOME/IP는 이 직렬화 규칙(바이트 순서, 구조체 배치 등)을 표준으로 정해, 서로 다른 벤더가 만든 ECU끼리도 같은 방식으로 데이터를 해석하게 한다. 전송 계층으로는 신뢰성이 필요한 경우 TCP, 지연이 중요한 주기적 Event에는 UDP를 쓰는 식으로 특성에 맞게 선택한다. 애플리케이션은 이 모든 과정을 몰라도 Proxy의 함수 호출과 콜백만으로 통신할 수 있다는 것이 미들웨어의 가치다.

</details>

<details><summary><b>심화: OTA 업데이트와 안전성 검증 (UCM과 ASIL 영향 분리)</b></summary>

Adaptive가 OTA로 소프트웨어를 바꿀 수 있다는 것은 강력하지만, 동시에 안전 관점에서 매우 조심스러운 기능이다. 잘못된 업데이트가 차량의 핵심 기능을 망가뜨리면 안 되기 때문이다. UCM은 이를 위해 여러 안전장치를 둔다. 업데이트 패키지는 설치 전에 서명과 무결성을 검증받고, 설치는 보통 차량이 안전한 상태(예: 주차·시동 꺼짐)일 때만 수행되며, 설치가 실패하거나 새 버전이 정상 동작하지 않으면 이전 버전으로 되돌리는 rollback 경로가 반드시 마련된다.

더 근본적인 설계 원칙은 기능 간 영향 분리(freedom from interference)다. 안전 등급이 높은 기능(높은 ASIL)과 낮은 기능이 한 머신에 공존할 때, 낮은 등급 기능의 업데이트나 오류가 높은 등급 기능의 동작을 침범해서는 안 된다. Adaptive의 프로세스 메모리 격리와 IAM의 접근 제어가 바로 이 분리를 떠받친다. 그리고 실무에서는 애초에 최고 등급의 하드 리얼타임 기능을 Adaptive가 아니라 Classic ECU에 두어, OTA로 자주 바뀌는 유연한 영역과 자주 바뀌면 안 되는 안전 핵심 영역을 물리적으로 갈라 놓는 설계를 선호한다. 유연성과 안전성을 동시에 얻기 위한 아키텍처적 타협인 셈이다.

</details>

**확인 문제.** Classic ECU에서 돌던 "앞차와의 거리를 CAN 신호로 주고받는" 기능과 비교할 때, Adaptive에서 같은 거리 정보를 ara::com의 Event로 주고받는 방식은 어떤 점이 다르고, 그것이 자율주행 소프트웨어에 왜 유리한지 설명하라.

<details><summary>답 보기</summary>

Classic의 CAN 신호 방식은 "어느 신호가 어느 ECU로 간다"가 ARXML에 빌드 시점으로 정적으로 못 박힌다. 송신자와 수신자가 서로의 존재와 물리적 연결을 전제로 고정되어 있어, 네트워크 구성이 바뀌거나 수신자를 추가하려면 설정과 빌드를 다시 해야 한다.

반면 ara::com의 Event 방식은 발행-구독 모델이다. 거리 정보를 제공하는 서비스가 값을 발행하면, 그 Event를 구독한 소비자들에게 미들웨어가 전달한다. 소비자는 런타임의 서비스 디스커버리로 제공자를 찾으므로 제공자가 어느 ECU에 있는지 몰라도 되고, 새 소비자(예: 추가된 로깅 기능이나 또 다른 ADAS 기능)가 같은 Event를 구독하기만 하면 제공자 코드를 바꾸지 않고도 데이터를 공유할 수 있다. 이런 느슨한 결합과 동적 연결은 기능이 자주 추가·변경되고 OTA로 진화하는 자율주행 소프트웨어에서 유연성과 확장성을 크게 높여 준다.

</details>

## 정리

- AUTOSAR Adaptive는 Classic을 대체하는 것이 아니라, ADAS·자율주행처럼 연산량이 크고 OTA로 진화하며 서비스 지향적인 고성능 ECU를 위해 만들어진 두 번째 플랫폼이다.
- Classic이 하나의 정적 바이너리 안에 Runnable을 컴파일해 넣는다면, Adaptive는 POSIX 준수 OS(임베디드 Linux, QNX 등) 위에서 각 애플리케이션을 격리된 프로세스로 실행하고 동적 링킹을 지원한다.
- ara::com은 서비스 지향 통신 미들웨어로, Proxy/Skeleton 패턴과 Method(RPC) · Event(발행-구독) · Field(상태 값) 세 통신 패턴을 제공하며, 기본 바인딩으로 SOME/IP를 흔히 쓴다.
- Execution Management, Communication Management, UCM 같은 Functional Cluster가 프로세스 생애주기, 통신, OTA 업데이트 등을 담당하고, Machine/Execution Manifest가 동적 배포를 기술한다.
- 하드 리얼타임·고안전 등급 기능은 Classic, 연산량이 크고 유연성이 필요한 기능은 Adaptive가 맡아 차량 이더넷과 SOME/IP로 연결되어 상호 보완한다.

이번 장에서 본 서비스 지향 통신과 프로세스 기반 구조는, 앞으로 차량 네트워크와 사이버보안, 그리고 소프트웨어 정의 차량(SDV)으로 나아가는 논의의 토대가 된다. Classic과 Adaptive라는 두 세계를 함께 이해해야 현대 차량의 전자·소프트웨어 아키텍처 전체를 조망할 수 있다.

## 참고 자료

- AUTOSAR Adaptive Platform 공식 명세 (Explanation of Adaptive Platform Design)
- AUTOSAR 공식 명세 (Specification of Communication Management, ara::com)
- AUTOSAR 공식 명세 (Specification of Execution Management)
- SOME/IP 프로토콜 명세 (Scalable service-Oriented MiddlewarE over IP)
- AUTOSAR 공식 명세 (Specification of Update and Configuration Management)
- ISO 26262 (자동차 기능 안전과 ASIL 개념)
