---
id: vhal
title: "Vehicle HAL · HAL"
branch: android
requires: [aaos]
hours: 4
summary: "VHAL 로 차량 신호(속도·공조 등)를 안드로이드에 연결"
---

# Vehicle HAL · HAL

자동차에는 이미 속도계, 연료 게이지, 공조(HVAC) 컨트롤러 같은 장치들이 멀쩡히 동작하고 있다. 이 값들은 대부분 CAN(Controller Area Network) 버스 같은 차량 전용 네트워크를 통해 전기적 신호와 프레임 형태로 흘러다닌다. 그런데 안드로이드 프레임워크는 "지금 속도가 몇 km/h인지", "운전석 에어컨 설정 온도가 몇 도인지" 같은 정보를 CAN 프레임이 아니라 자바/코틀린 API 호출로 알고 싶어한다.

이 둘 사이의 간극을 메우는 것이 바로 Vehicle HAL(VHAL)이다. VHAL은 차량 네트워크에서 오가는 로우(raw) 데이터를 안드로이드가 이해할 수 있는 표준화된 형태로 변환해 주는 계층이며, 동시에 안드로이드가 보낸 제어 명령(예: "공조 온도를 24도로 맞춰라")을 다시 차량 네트워크가 이해하는 신호로 변환해 전달하는 역할도 맡는다. AAOS(Android Automotive OS)가 실제 차량과 "대화"할 수 있는 것은 이 VHAL 덕분이다.

이전 레슨 `aaos` 에서 AAOS가 일반 안드로이드 프레임워크 위에 차량 전용 서비스들을 얹은 구조라는 것을 살펴봤다면, 이번 레슨에서는 그 중에서도 가장 아래쪽, 즉 하드웨어와 프레임워크가 처음 만나는 경계 지점인 VHAL을 집중적으로 파헤친다. VHAL을 제대로 이해하면 이후 레슨에서 다룰 car-framework(CarService, AIDL 기반 Car API)가 왜 그런 구조로 설계되었는지도 훨씬 자연스럽게 이해할 수 있다.

이 레슨에서는 HAL이라는 일반적인 개념을 짧게 복습한 뒤, VHAL이 차량 신호를 어떻게 "프로퍼티(Property)"라는 단위로 모델링하는지, 프레임워크가 그 프로퍼티를 어떻게 읽고 쓰고 구독하는지, 그리고 실제 벤더(OEM/Tier1)가 VHAL을 어떻게 구현하는지를 순서대로 살펴본다.

## 학습 목표

- HAL의 일반적인 역할과 VHAL이 그 역할을 자동차 영역에서 어떻게 수행하는지 설명할 수 있다.
- VehicleProperty 개념(타입, area, 접근 권한)을 이해하고 대표적인 예시를 들 수 있다.
- get, set, subscribe 세 가지 호출 패턴의 차이와 각각이 필요한 상황을 구분할 수 있다.
- VHAL이 Treble 아키텍처 안에서 벤더 프로세스로 분리되어 동작하는 이유를 이해한다.
- 레퍼런스(에뮬레이터용) VHAL과 실차 VHAL 구현의 차이를 설명할 수 있다.
- HVAC 온도 설정처럼 실제 사용자 행동이 VHAL을 거쳐 차량 신호로 변환되는 전체 흐름을 그릴 수 있다.

## VHAL이 필요한 이유

직관적으로 보면, 안드로이드 프레임워크는 "하드웨어가 어떻게 생겼는지" 전혀 모른 채로 동작하고 싶어한다. 카메라 HAL이 있어서 프레임워크가 센서 모델을 몰라도 사진을 찍을 수 있는 것처럼, 자동차 쪽에서도 프레임워크가 "이 차가 CAN 2.0을 쓰는지 CAN-FD를 쓰는지, ECU가 몇 개인지" 같은 걸 몰라도 속도나 온도 값을 다룰 수 있어야 한다. 그래야 같은 AAOS 빌드를 여러 차종, 여러 OEM에 재사용할 수 있다.

예시를 하나 들어보자. 어떤 차는 속도 센서 값을 바로 CAN 프레임에 실어 보내고, 다른 차는 ABS 모듈을 거쳐 가공된 값을 보낼 수도 있다. 프레임워크 입장에서 이런 차이는 전혀 알 필요가 없는 세부사항이다. 프레임워크는 그냥 "PERF_VEHICLE_SPEED 프로퍼티 값을 달라"고 요청하면 되고, 그 값이 어떤 경로로 만들어졌는지는 VHAL 구현체(그리고 그 아래 벤더 드라이버)의 책임이다.

이 구조를 코드 관점에서 생각하면 다음과 같은 모습이 된다.

```
// 프레임워크(상위) 관점: 하드웨어 세부사항을 모른 채 값을 요청
speedValue = VehicleHal.get(PERF_VEHICLE_SPEED)

// VHAL 구현체(벤더) 관점: 실제로는 CAN 프레임을 해석해서 값을 만듦
canFrame = CanBus.readFrame(speedMessageId)
speedValue = decodeSpeedFromCanFrame(canFrame)
```

프레임워크 쪽 코드는 차종이 바뀌어도 그대로 재사용되고, CAN 프레임을 해석하는 부분만 차종별로 달라진다. 이것이 HAL이라는 계층을 두는 근본적인 이유이고, VHAL은 이 원칙을 "차량 신호"라는 도메인에 그대로 적용한 것이다.

## HAL의 역할과 VHAL의 위치

HAL(Hardware Abstraction Layer)은 안드로이드 전반에서 반복되는 패턴이다. 카메라, 센서, 오디오처럼 하드웨어마다 구현이 크게 달라질 수 있는 영역에서, 프레임워크는 표준 인터페이스만 알고 그 인터페이스를 실제로 구현하는 코드는 벤더가 제공한다. 이렇게 하면 구글은 프레임워크를 한 번만 만들고, 각 제조사는 자기 하드웨어에 맞는 HAL 구현만 추가하면 된다.

VHAL은 이 패턴을 자동차 도메인에 적용한 것으로, `android.hardware.automotive.vehicle` 인터페이스를 구현하는 HAL이다. 현재는 AIDL(Android Interface Definition Language) 기반으로 정의되어 있고, 과거 버전(안드로이드 초기 AAOS)에서는 HIDL(HAL Interface Definition Language) 기반으로 정의된 적도 있었다는 정도는 일반적인 수준에서 알아두면 좋다. 중요한 것은 인터페이스 정의 언어가 무엇이든, VHAL이 하는 역할, 즉 "차량 신호를 표준화된 형태로 노출한다"는 본질은 바뀌지 않았다는 점이다.

VHAL은 프레임워크 입장에서 보면 하나의 커다란 "차량 신호 저장소"처럼 보인다. 프레임워크(정확히는 바로 위에 있는 CarService)는 이 저장소에 값을 요청하거나, 값이 쓰기 가능하면 값을 바꾸거나, 특정 신호가 바뀔 때 알림을 받도록 등록할 수 있다. VHAL 아래에서 실제로 무슨 일이 일어나는지는 프레임워크 코드 입장에서는 완전히 가려진다.

```
interface VehicleHal {
    VehiclePropValue get(int propertyId, int areaId)
    void set(int propertyId, int areaId, VehiclePropValue value)
    void subscribe(int propertyId, Callback onPropertyChanged)
}
```

이 인터페이스 하나가 속도, 연료량, 공조 온도, 도어 잠금 상태 등 수백 가지 서로 다른 차량 신호를 전부 다룬다. 어떻게 이게 가능한지는 다음 섹션에서 다루는 "프로퍼티"라는 모델 덕분이다.

## VehicleProperty: 차량 신호를 표현하는 방법

VHAL은 차량의 모든 신호를 하나의 통일된 모델로 표현한다. 바로 VehicleProperty라는 키-값 쌍이다. 속도든 연료량이든 공조 온도든, VHAL 입장에서는 전부 "프로퍼티 ID + 값"의 형태로 다뤄진다. 이렇게 하나의 모델로 통일해두면, 프레임워크는 신호 종류마다 다른 API를 익힐 필요 없이 똑같은 get/set/subscribe 호출만 알면 된다.

대표적인 프로퍼티 몇 가지를 예로 들어보면 감이 잡힌다.

- PERF_VEHICLE_SPEED: 현재 차량 속도. 보통 float 타입이고 읽기 전용(read-only)이다. 센서가 측정하는 값이므로 프레임워크가 임의로 바꿀 수 없다.
- HVAC_TEMPERATURE_SET: 공조 설정 온도. 사용자가 IVI(In-Vehicle Infotainment) 화면에서 온도를 바꾸면 프레임워크가 이 프로퍼티에 값을 쓸 수 있어야 하므로 읽기-쓰기(read-write)이다.
- FUEL_LEVEL: 남은 연료량. 역시 센서 기반이라 읽기 전용에 가깝다.

각 프로퍼티는 몇 가지 속성을 함께 갖는다. 먼저 값의 타입(int32, float, int32 배열, 문자열 등)이 있고, 다음으로 영역(area)이 있다. 예를 들어 HVAC_TEMPERATURE_SET은 차량 전체에 하나의 값만 있는 게 아니라 운전석(driver seat)과 조수석(passenger seat)이 서로 다른 온도를 가질 수 있으므로, 같은 프로퍼티 ID라도 area가 다르면 별개의 값으로 취급된다. 마지막으로 접근 권한(access)이 있는데, 읽기 전용인지 읽기-쓰기인지가 프로퍼티마다 정해져 있다.

```
// 운전석과 조수석의 공조 온도를 각각 설정하는 예
set(HVAC_TEMPERATURE_SET, area = DRIVER_SEAT, value = 24.0)
set(HVAC_TEMPERATURE_SET, area = PASSENGER_SEAT, value = 22.0)

// 같은 프로퍼티라도 area가 다르면 완전히 다른 값으로 저장/조회된다
driverTemp = get(HVAC_TEMPERATURE_SET, area = DRIVER_SEAT)     // 24.0
passengerTemp = get(HVAC_TEMPERATURE_SET, area = PASSENGER_SEAT) // 22.0
```

이렇게 "프로퍼티 ID + area"라는 두 축으로 모든 차량 신호를 식별하는 모델 덕분에, VHAL 인터페이스 자체는 아주 단순하게 유지되면서도 실제로는 수백 개가 넘는 서로 다른 차량 신호를 전부 다룰 수 있게 된다. 정확한 상수 이름과 숫자 값은 AOSP 소스마다 조금씩 늘어나므로, 여기서는 개념과 대표 예시 위주로만 기억해 두는 것이 실제 개발에서도 더 유용하다.

## get · set · subscribe: 프레임워크와 VHAL이 대화하는 방식

VHAL과 프레임워크(CarService)는 세 가지 기본 동작으로 대화한다. get으로 현재 값을 읽고, set으로 값을 쓰고(쓰기 가능한 프로퍼티에 한해), subscribe로 값이 바뀔 때마다 알림을 받는다.

get과 set은 직관적이다. 운전자가 공조 온도를 24도로 바꾸면 CarService가 HVAC_TEMPERATURE_SET에 set(24.0)을 호출하고, 계기판 UI가 지금 설정값을 보여주고 싶으면 get()으로 현재 값을 조회한다. 그런데 속도나 연료량처럼 계속 변하는 값을 다룰 때는 문제가 생긴다. 1초에 한 번씩 get()을 호출해서 값이 바뀌었는지 확인하는 방식(폴링, polling)은 CPU도 낭비하고, 값이 바뀌는 순간과 폴링하는 순간 사이에 지연(latency)도 생긴다.

이 문제를 풀기 위해 subscribe라는 비동기 이벤트 구조가 존재한다. 프레임워크는 "PERF_VEHICLE_SPEED가 바뀔 때마다 나에게 알려줘"라고 한 번만 등록해 두면, 그 뒤로는 실제로 값이 바뀔 때마다 VHAL이 콜백을 호출해 새 값을 밀어 넣어준다(push). 계기판의 속도 바늘이 끊김 없이 움직이는 것도, 이 subscribe 구조 덕분에 값이 바뀌는 즉시 UI까지 전달되기 때문이다.

```
// 속도계 UI가 값이 바뀔 때마다 즉시 갱신되도록 구독
subscribe(PERF_VEHICLE_SPEED, onChange = { newSpeed ->
    speedGaugeView.update(newSpeed)
})

// 공조 온도는 사용자가 조작할 때만 set을 호출
onUserChangedTemperature(newTemp) {
    set(HVAC_TEMPERATURE_SET, area = DRIVER_SEAT, value = newTemp)
}
```

정리하면, 읽기 전용이면서 자주 바뀌는 값(속도, RPM 등)은 subscribe로 다루는 것이 자연스럽고, 사용자가 명령을 내리는 값(공조 온도, 시트 위치 등)은 set으로 다루며, 둘 다 필요할 때는 get으로 초기값을 가져온 뒤 subscribe로 이후 변경을 추적하는 조합이 흔히 쓰인다.

## VHAL 구현 구조: 벤더 코드와 Treble 경계

지금까지는 VHAL이 프레임워크에게 어떤 인터페이스를 보여주는지를 살펴봤다. 이번에는 그 인터페이스 뒤편, 즉 실제로 CAN 버스와 통신하는 부분을 살펴본다.

VHAL의 인터페이스 정의(AIDL)는 구글이 AOSP를 통해 제공하지만, 그 인터페이스를 실제로 구현하는 코드는 차량을 만드는 OEM이나 그 부품을 공급하는 Tier1 업체가 작성한다. 이 구현체 내부에서는 보통 별도의 디바이스 드라이버나 데몬(daemon) 프로세스가 CAN 프레임을 직접 읽고, 그 프레임을 해석해서 VehicleProperty 값으로 변환하는 과정을 거친다. 반대로 set() 호출이 들어오면 VehicleProperty 값을 다시 CAN 프레임 형태로 인코딩해서 차량 네트워크에 실어 보낸다.

이 구조는 안드로이드의 Treble 아키텍처와도 맞물려 있다. Treble의 핵심 아이디어 중 하나는 벤더가 작성한 코드(HAL 구현)를 시스템 프로세스와 분리된 별도 프로세스로 실행해서, 프레임워크 업데이트가 벤더 코드에 직접 영향을 주지 않도록 하는 것이다. VHAL도 마찬가지로 시스템 프로세스가 아니라 벤더 측 별도 프로세스로 구동되고, AIDL 인터페이스를 통해 프레임워크와 통신한다. 이렇게 분리해두면 안드로이드 플랫폼 버전이 올라가도 VHAL 구현체를 다시 컴파일하지 않고도 (호환되는 인터페이스 버전 안에서는) 계속 동작시킬 수 있다.

실제 차량이 없는 개발/테스트 환경, 예를 들어 에뮬레이터에서는 구글이 제공하는 기본(레퍼런스) VHAL이 쓰인다. 이 레퍼런스 VHAL은 진짜 CAN 버스 대신 소켓 기반 통신으로 가상의 차량 신호를 흉내 낸다. 개발자가 테스트 스크립트로 소켓에 "속도를 80으로 바꿔라" 같은 명령을 보내면, 레퍼런스 VHAL이 마치 실제 센서에서 값이 바뀐 것처럼 PERF_VEHICLE_SPEED를 갱신하고 subscribe 중인 쪽에 이벤트를 전달한다. 실차 VHAL과 레퍼런스 VHAL은 프레임워크에게 보이는 인터페이스가 동일하기 때문에, 에뮬레이터에서 개발한 앱이나 서비스 코드는 수정 없이 실제 차량에서도 그대로 동작할 수 있다.

```
// 벤더 VHAL 구현체 내부 흐름(개념적 수도코드)
onCanFrameReceived(frame) {
    if (frame.id == SPEED_MESSAGE_ID) {
        speed = decodeSpeed(frame.payload)
        updateProperty(PERF_VEHICLE_SPEED, speed)   // 구독자에게 이벤트 전파
    }
}

onSetRequest(HVAC_TEMPERATURE_SET, area, value) {
    frame = encodeHvacCommand(area, value)
    CanBus.send(frame)                               // 실제 ECU로 명령 전달
}
```

이제 레슨 앞에서 언급했던 HVAC 예시를 전체 흐름으로 이어보자. 운전자가 IVI 화면에서 공조 온도를 24도로 설정하면, 그 터치 이벤트는 IVI 앱 → CarService → VHAL의 set(HVAC_TEMPERATURE_SET, DRIVER_SEAT, 24.0) 호출로 이어진다. VHAL 구현체는 이 요청을 받아 CAN 프레임으로 인코딩하고, 실제 공조 ECU가 그 프레임을 받아 송풍구 쪽 액추에이터를 움직인다. 반대로 실내 온도 센서가 변화를 감지하면, 그 값이 CAN 프레임을 거쳐 VHAL까지 올라오고, VHAL이 updateProperty를 호출해 subscribe 중인 CarService와 UI까지 변경 사항이 전달된다. 이 양방향 흐름 전체가 VHAL이라는 하나의 경계를 통해 이루어진다.

<details><summary><b>심화: HIDL에서 AIDL로의 전환</b></summary>

초기 AAOS에서는 VHAL 인터페이스가 HIDL(HAL Interface Definition Language)로 정의되어 있었다. 이후 안드로이드 플랫폼 전반이 HAL 정의 방식을 AIDL로 통일하는 방향으로 옮겨가면서, VHAL 역시 AIDL 기반 인터페이스로 전환되었다. 두 방식 모두 "프레임워크와 벤더 구현 사이의 안정적인 경계를 인터페이스 정의 언어로 명시한다"는 목적은 같고, VHAL이 수행하는 역할 자체는 바뀌지 않았다. 다만 최신 AAOS 레퍼런스나 문서를 볼 때 AIDL 기반 인터페이스가 기준이라는 점은 알아두는 것이 좋다.

</details>

<details><summary><b>심화: area로 나뉘는 프로퍼티</b></summary>

같은 프로퍼티 ID라도 차량 안에서 물리적으로 여러 위치에 존재할 수 있는 신호는 area로 구분된다. 공조 온도처럼 좌석별로 다른 값이 필요한 경우가 대표적이고, 창문 개폐 상태처럼 도어마다 다른 값을 가지는 신호도 비슷한 방식으로 모델링된다. area는 보통 비트마스크 형태의 상수로 정의되어 있어서, 하나의 호출로 여러 영역을 한꺼번에 다루는 것도 가능하다. 다만 정확한 비트 값과 상수 이름은 AOSP 버전마다 세부적으로 다를 수 있으므로, 실제 구현 시에는 해당 버전의 공식 정의를 확인해야 한다.

</details>

<details><summary><b>심화: 레퍼런스 VHAL의 소켓 통신</b></summary>

에뮬레이터용 레퍼런스 VHAL은 실제 차량 버스 대신 로컬 소켓을 통해 테스트 도구와 통신한다. 개발자는 커맨드라인 도구나 스크립트로 소켓에 특정 프로퍼티 값을 바꾸라는 메시지를 보낼 수 있고, VHAL은 이를 실제 센서 값이 바뀐 것처럼 취급해서 프레임워크에 그대로 반영한다. 이 구조 덕분에 실차 하드웨어가 전혀 없는 상태에서도 CarService나 그 위의 앱 로직을 개발하고 디버깅할 수 있다. 다만 소켓 프로토콜의 세부 메시지 형식은 구현 버전마다 달라질 수 있으므로, 여기서는 "실차 버스를 흉내 내는 테스트용 경로가 따로 존재한다"는 개념 정도로 이해하면 충분하다.

</details>

**확인 문제.** 왜 VHAL은 속도처럼 자주 바뀌는 값을 다룰 때 get()을 반복 호출하는 폴링 방식보다 subscribe 방식을 선호할까?

<details><summary>답 보기</summary>

폴링 방식은 값이 바뀌었는지 확인하기 위해 일정한 주기로 계속 get()을 호출해야 하므로 CPU와 통신 자원을 불필요하게 소모하고, 실제로 값이 바뀐 시점과 폴링 주기가 어긋나면 지연(latency)이 생긴다. subscribe 방식은 값이 실제로 바뀌는 시점에만 VHAL이 콜백을 호출해 새 값을 전달하기 때문에 자원을 절약하면서도 변경 사항을 즉시 반영할 수 있다. 속도, RPM처럼 계속 변하면서도 실시간성이 중요한 값일수록 이 차이가 크게 드러난다.

</details>

**확인 문제.** HVAC_TEMPERATURE_SET 프로퍼티가 운전석과 조수석에 대해 서로 다른 값을 가질 수 있는 이유는 무엇이며, VHAL은 이를 어떤 개념으로 구분할까?

<details><summary>답 보기</summary>

운전석과 조수석은 물리적으로 독립된 공조 영역을 가지고 있어서 서로 다른 설정 온도를 가질 수 있다. VHAL은 이런 경우를 area(영역)라는 개념으로 구분하는데, 같은 프로퍼티 ID(HVAC_TEMPERATURE_SET)라도 area가 다르면 완전히 별개의 값으로 저장하고 조회한다. 즉 프로퍼티를 식별하는 키는 "프로퍼티 ID" 하나가 아니라 "프로퍼티 ID + area"의 조합이라고 보는 것이 정확하다.

</details>

## 정리

VHAL은 차량 네트워크(CAN 버스 등)를 흐르는 로우 신호와 안드로이드 프레임워크 사이의 경계를 표준화하는 HAL이다. 모든 차량 신호는 VehicleProperty라는 키-값 모델로 통일되어 표현되고, 각 프로퍼티는 타입, area, 접근 권한이라는 세 가지 속성을 함께 가진다. 프레임워크(CarService)는 get, set, subscribe라는 세 가지 동작으로 VHAL과 대화하며, 특히 subscribe는 계속 변하는 값을 효율적으로 추적하기 위한 핵심 구조다. 실제 VHAL 구현은 벤더가 작성하고 Treble 아키텍처에 따라 별도 프로세스로 구동되며, 에뮬레이터에서는 소켓 기반 레퍼런스 VHAL이 그 자리를 대신한다. 이 레슨에서 다룬 VHAL의 구조는 다음 레슨인 car-framework에서 CarService와 AIDL 기반 Car API가 어떻게 그 위에 쌓이는지를 이해하는 바탕이 된다.

## 참고 자료

- AOSP 공식 문서의 Vehicle HAL 개요 설명
- Android Automotive 개발자 문서의 Car API 관련 섹션
- AOSP 소스 트리의 자동차 관련 인터페이스 디렉터리(hardware/interfaces/automotive 계열)
- CAN 버스(Controller Area Network) 기본 개념을 다루는 자동차 네트워크 입문 자료
- 안드로이드 Treble 아키텍처 개요 문서
