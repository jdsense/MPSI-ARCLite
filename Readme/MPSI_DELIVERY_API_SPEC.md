# MPSI SCM 배송현황 외부 연동 API 인터페이스 정의서
(Logistics & Delivery Status Pull API Specification)

> **문서 버전:** v1.1 (과제용 소프트러쉬 Pull 방식 반영)  
> **최신 갱신일자:** 2026-10-29  
> **주관 시스템:** MPSI 차세대 스마트 제조 협업 포털 (MPSI 본사 전용 과제 메뉴)  
> **외부 연계사:** **소프트러쉬 (SoftRush)**  
> **연동 방식:** **Pull 방식 (MPSI ➔ 소프트러쉬 API 서버 호출 및 데이터 조회)**  
> **기준 화면:** [`/portal/delivery-status`](file:///d:/PROJECT/IMPIX_2026/MPSI/src/app/portal/delivery-status/page.tsx)  
> **준수 표준:** KS X 9101-1:2025 (`DeliveryHeader`, `DeliveryLine`) 및 MPSI 통합 스키마(`MpsiDeliveryTracking`)  

---

## 1. 개요 및 연동 메커니즘 (Pull 방식)

본 문서는 MPSI 스마트 제조 포털의 **SCM 배송현황 메뉴([`/portal/delivery-status`](file:///d:/PROJECT/IMPIX_2026/MPSI/src/app/portal/delivery-status/page.tsx))**에서 외부 연계 회사인 **소프트러쉬(SoftRush)**의 물류 시스템 API 서버에 접속하여 배송 데이터를 가져오는(Pull) 표준 인터페이스를 정의합니다.

### 1.1 연동 성격 및 메뉴 특성
- **적용 대상:** 본 메뉴는 정부 과제 평가 및 기능 시연용으로 구성된 연계 메뉴로, **MPSI 본사 포털에만 탑재**됩니다. (외주 협력사인 우성정공, 뉴몰드 포털에는 노출되지 않음)
- **연동 구조:** 
  ```
  [MPSI 시스템 / 화면] ──(1. GET 요청: Pull)──▶ [소프트러쉬 API 서버]
                      ◀──(2. JSON 데이터 응답)───
  ```
- **데이터 인코딩:** UTF-8 (`application/json`)
- **인증 방식:** HTTP Header Authorization (Bearer Token 또는 x-api-key)

---

## 2. ⭐ 시스템 컨버전 및 서버 이전 시 설정 가이드 (Q&A)

> **Q. MPSI 시스템이 아크포지(ArcForge)로 컨버팅되어 다른 서버에 세팅될 때, 배송현황 API 주소가 바뀌거나 다른 설정을 해야 하나요?**

### ✅ 결론: 우리 서버의 주소가 바뀌어도 소프트러쉬(외부 업체)에 설정을 바꿀 필요가 전혀 없습니다!

* **이유:** 외부에서 우리 쪽으로 밀어 넣는(Push/Webhook) 방식이 아니라, **우리가 소프트러쉬 API 서버로 접속해서 가져오는(Pull) 방식**이기 때문입니다.
* 소프트러쉬 입장에서는 MPSI가 어느 서버(로컬, AWS, 아크포지 클라우드 등)에 있든 고정된 소프트러쉬 API 서버로 들어오는 조회 요청에 응답만 해주면 되므로, **MPSI 서버의 IP나 도메인 변경에 영향을 받지 않습니다.**
* 공장 내부망이나 방화벽 뒤에 서버가 설치되어도 외부 인터넷으로 나가는(Outbound) 통신만 허용되어 있으면 정상 동작합니다.

### 📌 MPSI 시스템에서 설정해야 할 항목 (단 2가지)
MPSI 환경설정(`.env`) 또는 시스템 파라미터에 소프트러쉬 접속 정보만 등록해 두면 됩니다:

```env
# .env 환경변수 설정 예시
SOFTRUSH_API_BASE_URL=https://api.softrush.co.kr    # 소프트러쉬 API 서버 대표 도메인
SOFTRUSH_API_KEY=mpsi_softrush_secure_key_2026     # 소프트러쉬에서 발급받은 인증키
```

---

## 3. 소프트러쉬가 제공해야 할 API 엔드포인트 명세

소프트러쉬(SoftRush) 개발팀은 MPSI가 배송 데이터를 조회할 수 있도록 다음 엔드포인트를 제공해야 합니다:

| 기능 구분 | HTTP Method | 소프트러쉬 엔드포인트 URL | 설명 |
| :--- | :---: | :--- | :--- |
| **배송현황 목록 조회** | `GET` | `/api/v1/logistics/deliveries` | 전체 또는 조건별(프로젝트/운송장/상태) 배송 목록 조회 |
| **특정 배송 건 상세 조회**| `GET` | `/api/v1/logistics/deliveries/{trackingNo}` | 특정 운송장의 상세 정보 및 타임라인 조회 |

### 3.1 요청 파라미터 (Query Parameters - MPSI ➔ 소프트러쉬)
```http
GET /api/v1/logistics/deliveries?projectNo=MI26001P0&status=배송중 HTTP/1.1
Host: api.softrush.co.kr
Authorization: Bearer mpsi_softrush_secure_key_2026
```

| 파라미터명 | 타입 | 필수 여부 | 설명 및 예시 |
| :--- | :---: | :---: | :--- |
| `projectNo` | String | 선택 | MPSI 프로젝트 관리번호 필터 (예: `MI26001P0`) |
| `trackingNo` | String | 선택 | 운송장번호 단건 검색 (예: `CJ-20261018-001`) |
| `status` | String | 선택 | 배송상태 필터 (`출하준비`, `배송중`, `배송완료`) |

---

## 4. 데이터 항목 상세 정의표 (소프트러쉬 응답 규격)

MPSI 포털 [`/portal/delivery-status`](file:///d:/PROJECT/IMPIX_2026/MPSI/src/app/portal/delivery-status/page.tsx)의 그리드 및 모달에 반영될 항목입니다.

### 4.1 메인 배송 데이터 (DeliveryItem)

| No | 그리드 표시 항목 | API 필드명 (JSON) | DB 물리 컬럼 | 데이터 타입 | 필수 | 포맷/크기 | 코드값 및 설명 |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | - | **`id`** | `DeliveryId` | String | 선택 | VARCHAR(50) | 배송 고유 식별자 |
| 2 | **운송장 번호** | **`trackingNo`** | `TrackingNumber` | String | **필수** | VARCHAR(100) | **운송장 번호 (고유키)**<br/>예: `CJ-20261018-001` |
| 3 | **배송 상태** | **`status`** | `DeliveryStatus` | String | **필수** | VARCHAR(20) | **상태 코드 (3종)**<br/>• `출하준비`<br/>• `배송중`<br/>• `배송완료` |
| 4 | **프로젝트번호** | **`projectNo`** | `ProjectNo` | String | **필수** | VARCHAR(50) | MPSI 프로젝트 관리번호<br/>예: `MI26001P0` |
| 5 | **고객사** | **`customerName`** | `CustomerName` | String | **필수** | VARCHAR(100) | 납품 고객사명<br/>예: `현대자동차 (아산공장)` |
| 6 | **납품처 (하차지)** | **`destination`** | `Destination` | String | 선택 | VARCHAR(150) | 상세 하차지/라인<br/>예: `아산공장 1라인 부품하차장 B구역` |
| 7 | **품목명** | **`productName`** | `ProductName` | String | **필수** | VARCHAR(100) | 납품 부품 명칭<br/>예: `Front Door Upper Cover` |
| 8 | **품번 (Part No)** | **`partNo`** | `PartNo` | String | 선택 | VARCHAR(50) | 고객사 품번<br/>예: `84710-NT500-LH` |
| 9 | **수량** | **`qty`** | `Quantity` | Number | **필수** | Integer | 출하/적재 수량 (정수, 0 초과)<br/>예: `500` |
| 10 | **단위** | **`unit`** | `Unit` | String | **필수** | VARCHAR(10) | 단위 코드<br/>예: `EA`, `BOX`, `SET` |
| 11 | **운송사명** | **`carrierName`** | `CarrierName` | String | 선택 | VARCHAR(50) | 운송사 명칭<br/>예: `CJ대한통운`, `롯데글로벌로지스` |
| 12 | **차량번호** | **`vehicleNo`** | `VehicleNumber` | String | 선택 | VARCHAR(30) | 화물차 등록번호<br/>예: `경기 88바 1234` |
| 13 | **차종/규격** | **`vehicleType`** | `VehicleType` | String | 선택 | VARCHAR(50) | 배차 차량 종류<br/>예: `11톤 윙바디`, `5톤 윙바디` |
| 14 | **운전기사명** | **`driverName`** | `DriverName` | String | 선택 | VARCHAR(50) | 기사 성명<br/>예: `김철수 기사` |
| 15 | **기사 연락처** | **`driverPhone`** | `DriverPhone` | String | 선택 | VARCHAR(30) | 기사 휴대전화번호<br/>예: `010-3849-2910` |
| 16 | **출발일시** | **`departureTime`** | `DepartureDateTime` | String | 선택 | YYYY-MM-DD HH:mm | 상차 후 출발 일시<br/>예: `2026-10-18 09:30` |
| 17 | **도착예정일시** | **`estimatedArrival`** | `EstimatedArrivalDateTime` | String | 선택 | YYYY-MM-DD HH:mm | 도착 예정 일시<br/>예: `2026-10-18 15:30` |
| 18 | **실제도착일시** | **`actualArrival`** | `ActualArrivalDateTime` | String | 조건부 | YYYY-MM-DD HH:mm | **status='배송완료'일 때 필수 권장**<br/>예: `2026-10-18 13:50` |
| 19 | **현재 위치** | **`currentLocation`** | `CurrentLocation` | String | 선택 | VARCHAR(100) | GPS 위치 또는 경유 거점<br/>예: `서해안고속도로 평택분기점 통과` |
| 20 | **API 제공처** | **`apiSource`** | `ApiSource` | String | 선택 | VARCHAR(50) | 고정 표기값: `소프트러쉬 물류 API v1.0 (GPS)` |
| 21 | **경유 타임라인** | **`transitSteps`** | (하위 엔티티) | Array | 선택 | Object[] | 배송 거점별 상세 이력 목록 (하단 4.2 참조) |

---

### 4.2 배송 거점별 상세 타임라인 (transitSteps)

| No | 필드명 | 데이터 타입 | 필수 | 설명 및 예시 |
| :-: | :--- | :---: | :---: | :--- |
| 1 | **`step`** | String | **필수** | 단계 명칭 (예: `출하 등록 & 상차 완료`, `물류 터미널 통과`, `간선 수송 및 배송 중`, `납품처 도착 & 하차/입고`) |
| 2 | **`location`** | String | **필수** | 발생 위치/거점 (예: `(주)뉴몰드 사출 1공장`, `평택 스마트 물류허브`, `현대차 아산공장 하차장`) |
| 3 | **`time`** | String | **필수** | 통과 일시 또는 도착 예정 시각 (예: `2026-10-18 09:30`, `2026-10-18 15:30 (예정)`) |
| 4 | **`isCompleted`** | Boolean | **필수** | 해당 단계 통과/완료 여부 (`true` / `false`) |
| 5 | **`note`** | String | 선택 | 부가 메모 (예: `출하 검수 및 윙바디 상차 완료`, `자동 바코드 스캔 통과`, `정상 운행 중`) |

---

## 5. 소프트러쉬 응답 샘플 (JSON Response Payload)

소프트러쉬 API 서버가 MPSI의 GET 요청에 대해 반환하는 JSON 구조입니다:

```json
{
  "success": true,
  "code": 200,
  "message": "배송 데이터 목록 조회가 완료되었습니다.",
  "data": [
    {
      "id": "deliv-1",
      "trackingNo": "CJ-20261018-001",
      "projectNo": "MI26001P0",
      "customerName": "현대자동차 (아산공장)",
      "destination": "아산공장 1라인 부품하차장 B구역",
      "productName": "Front Door Upper Cover",
      "partNo": "84710-NT500-LH",
      "qty": 500,
      "unit": "EA",
      "status": "배송중",
      "carrierName": "CJ대한통운",
      "vehicleNo": "경기 88바 1234",
      "vehicleType": "11톤 윙바디",
      "driverName": "김철수 기사",
      "driverPhone": "010-3849-2910",
      "departureTime": "2026-10-18 09:30",
      "estimatedArrival": "2026-10-18 15:30",
      "currentLocation": "서해안고속도로 평택분기점 통과",
      "apiSource": "소프트러쉬 물류 API v1.0 (GPS)",
      "transitSteps": [
        {
          "step": "출하 등록 & 상차 완료",
          "location": "(주)뉴몰드 사출 1공장",
          "time": "2026-10-18 09:30",
          "isCompleted": true,
          "note": "출하 검수 및 윙바디 상차 완료"
        },
        {
          "step": "물류 터미널 통과",
          "location": "평택 스마트 물류허브",
          "time": "2026-10-18 11:20",
          "isCompleted": true,
          "note": "자동 바코드 스캔 통과"
        },
        {
          "step": "간선 수송 및 배송 중",
          "location": "서해안고속도로 평택JCT",
          "time": "2026-10-18 13:40",
          "isCompleted": true,
          "note": "정상 운행 중 (시속 82km)"
        },
        {
          "step": "납품처 도착 & 하차/입고",
          "location": "현대차 아산공장 하차장",
          "time": "2026-10-18 15:30 (예정)",
          "isCompleted": false,
          "note": "하차 대기 예정"
        }
      ]
    }
  ]
}
```

---

## 6. 결론 요약

1. **소프트러쉬에 전달할 내용:**  
   - 본 문서의 3장(엔드포인트 명세)과 4장(데이터 항목 정의), 5장(응답 JSON 샘플)을 소프트러쉬 개발팀에 전달하여 `GET /api/v1/logistics/deliveries` API를 개발해 달라고 요청하시면 됩니다.
2. **서버 이전/아크포지 컨버전 시:**  
   - MPSI 시스템은 소프트러쉬의 API 주소(`https://api.softrush.co.kr`)로 데이터를 요청하는 Client이므로, **MPSI 서버가 이전되거나 주소가 바뀌어도 소프트러쉬 쪽에 주소 변경을 요청할 필요가 전혀 없습니다.**
   - MPSI 설정에 소프트러쉬 API URL과 발급받은 API Key만 입력해 두면 어디서든 정상 작동합니다.
