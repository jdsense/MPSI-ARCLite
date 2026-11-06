# MPSI ↔ 외주 협력사(우성정공 · 뉴몰드) 프로세스 총괄 가이드

본 문서는 **MPSI 본사(발주처)**와 **외주 협력사 2개사(우성정공: 금형제작 / 뉴몰드: 사출양산)** 간의 전체 프로젝트 라이프사이클 업무 흐름과 각 단계별 시스템 화면 매핑(URL 경로 포함)을 설명합니다.

프로세스의 시작은 **① 프로젝트 생성** 후 **② MPSI가 원청사(고객사)에 견적을 제출(수주 활동)**하는 것에서 출발하여, 이후 **외주 금형 개발/제작** 및 **사출 시양산/PPAP 승인**으로 이어집니다.

---

## 1. MPSI 외주 프로세스 전체 아키텍처 다이어그램

```mermaid
flowchart LR
    subgraph MPSI["🏢 MPSI 본사 (발주처 / 통합 관제)"]
        M1["프로젝트 관리\n(/portal/project)"] --> M2["원청사 견적\n(/portal/quotation)"]
        M2 --> M3["금형 견적 관리\n(/portal/mold-dev/quotation)"]
        M3 --> M4["제품 도면 접수 검토\n(/portal/mold-dev/design)"]
        M4 --> M5["금형설계\n(/portal/mold-dev/manufacture)"]
        M5 --> M6["시사출/금형 육성 및 승인\n(/portal/mold-dev/trial)"]
        M6 --> M7["양산 견적 관리\n(/portal/mass-prod/quotation)"]
        M7 --> M8["시양산/12H 양산성 검증\n(/portal/mass-prod/validation)"]
        M8 --> M9["양산 승인(PPAP)\n(/portal/mass-prod/ppap)"]
    end

    subgraph V_MOLD["⚙️ 금형(자체/외주) : 우성정공(주)"]
        V1["프로젝트 관리\n(/portal/vendor-portal/mold/projects)"]
        V2["견적 관리\n(/portal/vendor-portal/mold/quotation)"]
        V3["제품 도면 접수 검토\n(/portal/vendor-portal/mold/design)"]
        V4["금형제작\n(/portal/vendor-portal/mold/manufacture)"]
        V5["시사출/금형 육성\n(/portal/vendor-portal/mold/trial)"]
    end

    subgraph V_MASS["🏭 시양산(자체/외주) : (주)뉴몰드"]
        S1["프로젝트 관리\n(/portal/vendor-portal/mass/projects)"]
        S2["견적 관리\n(/portal/vendor-portal/mass/quotation)"]
        S3["양산 착수 및 사출기 셋업\n(/portal/vendor-portal/mass/validation)"]
        S4["양산 승인(PPAP 승인)\n(/portal/vendor-portal/mass/ppap)"]
    end

    %% MPSI ↔ 우성정공 연동 화살표
    M3 -->|외주 견적 요청 RFQ| V2
    V2 -->|4대 원가 산출 견적 제출| M3
    M4 -->|도면(DR) 검토 요청| V3
    V3 -->|DR 검토의견 등록| M4
    V4 -.->|가공 진척도 연동| M5
    V5 -.->|T1~T4 트라이얼 성형조건 연동| M6

    %% MPSI ↔ 뉴몰드 연동 화살표
    M7 -->|양산 단가 RFQ| S2
    S2 -->|사출 단가 견적 제출| M7
    S3 -.->|12H 연속사출 실적 연동| M8
    S4 -->|PPAP 초도품 성적서 제출| M9
    M9 -->|최종 양산 승인| S4
```

---

## 2. 3자 협업 체계 및 역할 정의

| 구분               | 주체                   | 소속 포털 역할 키 | 핵심 역할 및 권한                                                                                                        |
| :----------------- | :--------------------- | :---------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **발주사**   | **MPSI 본사**    | `MPSI`          | 프로젝트 발의,**원청사(고객사) 견적 제출 및 수주**, 외주사 RFQ 발행, 공정 모니터링, 단가 심의/발주, 최종 PPAP 승인 |
| **금형외주** | **우성정공(주)** | `VENDOR_MOLD`   | 금형 견적서 작성(4대 세부 원가+엑셀), 제품 도면 DR 검토, 금형 가공/조립 실적 입력, T1~T4 시사출 육성 및 금형 이관        |
| **양산외주** | **(주)뉴몰드**   | `VENDOR_MASS`   | 사출 양산 단가 견적 제출, 양산 착수 및 사출기 셋업, 12H 연속 사출 검증, 초도품 검사(ISIR) 및 PPAP 서류 제출              |

---

## 3. End-to-End 상세 프로세스 흐름 (순서별)

### [STEP 0] 프로젝트 발의 및 기준정보 등록

* **수행 주체**: 🏢 MPSI
* **주요 내용**: 고객사 차종 및 신규 부품 개발 프로젝트 마스터 등록 (차종, 품명, 고객사, 목표 납기 등 수립)
* **해당 화면명**: **프로젝트 관리 (프로젝트 관리대장)**
* **화면 경로**: `/portal/project`

---

### [STEP 1] 원청사(고객사) 견적 제출 (수주 활동) ★

* **수행 주체**: 🏢 MPSI
* **주요 내용**:
  - 완성차/원청사(현대차, 기아, 현대모비스 등)의 RFQ를 접수하여 MPSI가 원청사에 제시할 금형비 및 제품 개발 견적서 작성·제출
  - 견적 승인 시 정식 프로젝트 수주 확정
* **해당 화면명**: **금형-견적관리 > 원청사 견적 (수주관리)**
* **화면 경로**: `/portal/quotation`

---

### [STEP 2] 금형 외주 견적 의뢰 및 체결 (MPSI ↔ 우성정공)

* **수행 주체**: 🏢 MPSI ➔ ⚙️ 우성정공
* **주요 내용**:
  1. **MPSI**: 금형 제작 외주 협력사(우성정공)에 금형 사양(사출기 톤수, 원판/코어 재질, Cavity 등)을 지정하여 견적 요청(RFQ) 발행 *(4대 금형비 항목은 빈칸 및 비활성화 상태로 의뢰)*
     - **MPSI 화면**: `금형-개발 관리 > 1. 금형 견적 관리` (`/portal/mold-dev/quotation`)
  2. **우성정공**: 접수된 RFQ를 확인하고, 4대 금형비(재료비+가공비+일반관리비/이윤+특수사양) 수기 입력 및 근거 엑셀 견적서를 첨부하여 MPSI로 제출 *(MPSI 수주 목표가는 보안 차단)*
     - **우성정공 화면**: `견적 관리` (`/portal/vendor-portal/mold/quotation`)
  3. **MPSI**: 우성정공 제출 견적서 및 엑셀 내역 심의 후 발주 승인(`수주확정`)
     - **MPSI 화면**: `금형-개발 관리 > 1. 금형 견적 관리` (`/portal/mold-dev/quotation`)

---

### [STEP 3] 제품 도면 접수 및 설계 검토 (DR) (MPSI ↔ 우성정공)

* **수행 주체**: 🏢 MPSI ↔ ⚙️ 우성정공
* **주요 내용**:
  1. **우성정공**: 도면/3D 모델링 접수 후 언더컷, 빼기구배, 살두께, 파팅라인 등 금형 성형성 검토 의견(DR 체크리스트) 등록
     - **우성정공 화면**: `제품 도면 접수 검토` (`/portal/vendor-portal/mold/design`)
  2. **MPSI**: 우성정공의 DR 검토의견 확인 및 설계 승인
     - **MPSI 화면**: `금형-개발 관리 > 2. 제품 도면 접수 검토(DR)` (`/portal/mold-dev/design`)

---

### [STEP 4] 금형 설계 및 가공 제작 (MPSI ↔ 우성정공)

* **수행 주체**: ⚙️ 우성정공 ➔ 🏢 MPSI
* **주요 내용**:
  1. **우성정공**: CAM 밀링, 열처리, 방전가공, 와이어컷팅, 조립 등 공정별 제작 진척률(%) 실시간 업데이트
     - **우성정공 화면**: `금형제작` (`/portal/vendor-portal/mold/manufacture`)
  2. **MPSI**: 외주 금형의 공정별 가공 진행률 및 납기 일정 실시간 관제
     - **MPSI 화면**: `금형-개발 관리 > 3. 금형설계 / 제작 진척` (`/portal/mold-dev/manufacture`)

---

### [STEP 5] 시사출 및 금형 육성 / 양산 이관 승인 (MPSI ↔ 우성정공)

* **수행 주체**: ⚙️ 우성정공 ➔ 🏢 MPSI
* **주요 내용**:
  1. **우성정공**: T1~T4 시사출 트라이얼 실시, 사출 조건표 및 수축/변형 등 치수 문제점 개선 내역 등록
     - **우성정공 화면**: `시사출/금형 육성` (`/portal/vendor-portal/mold/trial`)
  2. **MPSI**: T1 샘플 치수 검사 후 금형 최종 승인 및 양산처(뉴몰드)로의 금형 이관 결정
     - **MPSI 화면**: `금형-개발 관리 > 4. 시사출/금형 육성 및 승인` (`/portal/mold-dev/trial`)

---

### [STEP 6] 양산 단가 견적 의뢰 및 체결 (MPSI ↔ 뉴몰드)

* **수행 주체**: 🏢 MPSI ➔ 🏭 뉴몰드
* **주요 내용**:
  1. **MPSI**: 사출 전문 외주사((주)뉴몰드)에 양산 사출 단가 견적 요청(RFQ) 발행
     - **MPSI 화면**: `금형-양산 관리 > 1. 양산 견적 관리` (`/portal/mass-prod/quotation`)
  2. **뉴몰드**: 제품 단가, 원재료비, 사출 임가공비, 포장/물류비가 포함된 양산 견적서 제출
     - **뉴몰드 화면**: `견적 관리` (`/portal/vendor-portal/mass/quotation`)
  3. **MPSI**: 뉴몰드 양산 견적 심의 후 양산 단가 확정 및 발주 체결
     - **MPSI 화면**: `금형-양산 관리 > 1. 양산 견적 관리` (`/portal/mass-prod/quotation`)
  4. **금형 이관**: 우성정공에서 제작 완료된 금형을 뉴몰드 사출 공장으로 이관 및 인수 완료 확인

---

### [STEP 7] 양산 착수, 사출기 셋업 및 12H 시양산 검증 (MPSI ↔ 뉴몰드)

* **수행 주체**: 🏭 뉴몰드 ➔ 🏢 MPSI
* **주요 내용**:
  1. **뉴몰드**: 이관된 금형을 사출기에 안착하고 사출 조건 셋업 후, 12시간 연속 사출 검증 실시 (설비 가동률, Cpk 공정능력, 불량률 실적 입력)
     - **뉴몰드 화면**: `시양산 관리 (양산 착수 및 사출기 셋업)` (`/portal/vendor-portal/mass/validation`)
  2. **MPSI**: 12H 연속 사출 데이터 및 양산 적합성 모니터링 및 시양산 합격 판정
     - **MPSI 화면**: `금형-양산 관리 > 2. 시양산/12H 양산성 검증` (`/portal/mass-prod/validation`)

---

### [STEP 8] 초도품 검사 및 양산 승인 (PPAP) (MPSI ↔ 뉴몰드)

* **수행 주체**: 🏭 뉴몰드 ➔ 🏢 MPSI
* **주요 내용**:
  1. **뉴몰드**: ISIR(초도품검사성적서), 전수 치수 측정표, 검사기준서, 외관 합격증 등 PPAP 승인 필수 문서 등록 및 제출
     - **뉴몰드 화면**: `양산 승인(PPAP 승인)` (`/portal/vendor-portal/mass/ppap`)
  2. **MPSI**: 뉴몰드가 제출한 초도품 실적 및 성적서 심사 후 **최종 양산 승인(PPAP 승인)** 판정 완료 ➔ 본격 양산 개시
     - **MPSI 화면**: `금형-양산 관리 > 3. 양산 승인(PPAP)` (`/portal/mass-prod/ppap`)

---

## 4. 종합 화면 매핑 매트릭스 (요약표)

|     No     | 프로세스 단계             | 세부 업무 내용                           | 🏢 MPSI 화면 (본사)              | ⚙️ 우성정공 화면 (금형외주)              | 🏭 뉴몰드 화면 (양산외주)                 |
| :---------: | :------------------------ | :--------------------------------------- | :------------------------------- | :----------------------------------------- | :---------------------------------------- |
| **0** | **프로젝트 발의**   | 13단계 전체 공정 기준정보 생성 및 관제   | `/portal/project`              | `/portal/vendor-portal/mold/projects`    | `/portal/vendor-portal/mass/projects`   |
| **1** | **원청사 견적**     | 고객사(원청사) 대상 금형/개발 견적 제출  | `/portal/quotation`            | -                                          | -                                         |
| **2** | **금형 외주 견적**  | 외주 금형비 4대 원가 산출 및 발주 승인   | `/portal/mold-dev/quotation`   | `/portal/vendor-portal/mold/quotation`   | -                                         |
| **3** | **제품 도면(DR)**   | 도면 배포 및 금형 성형성(DR) 검토의견    | `/portal/mold-dev/design`      | `/portal/vendor-portal/mold/design`      | -                                         |
| **4** | **금형제작 진척**   | CAM 가공, 방전, 조립 공정별 실적 입력    | `/portal/mold-dev/manufacture` | `/portal/vendor-portal/mold/manufacture` | -                                         |
| **5** | **시사출/금형육성** | T1~T4 트라이얼, 문제점 개선 및 이관 승인 | `/portal/mold-dev/trial`       | `/portal/vendor-portal/mold/trial`       | -                                         |
| **6** | **양산 견적 관리**  | 사출 단가 RFQ 발행 및 양산 단가 확정     | `/portal/mass-prod/quotation`  | -                                          | `/portal/vendor-portal/mass/quotation`  |
| **7** | **시양산 검증**     | 사출기 셋업 및 12H 연속 사출(Cpk) 검증   | `/portal/mass-prod/validation` | -                                          | `/portal/vendor-portal/mass/validation` |
| **8** | **양산 승인(PPAP)** | 초도품 검사(ISIR) 제출 및 최종 PPAP 승인 | `/portal/mass-prod/ppap`       | -                                          | `/portal/vendor-portal/mass/ppap`       |

---

## 5. 시스템 핵심 운영 특징

1. **원청사 수주부터 외주 양산 승인까지 일원화**:
   - MPSI가 원청사에 제출하는 수주 견적 단계부터 우성정공(금형제작)과 뉴몰드(사출양산)로 이어지는 외주 프로세스가 하나의 플랫폼에서 유기적으로 연결됩니다.
2. **역할 기반 화면 격리 (Role-Based Isolation)**:
   - 좌측 상단 역할 전환기를 통해 MPSI 본사, 우성정공 포털, 뉴몰드 포털 간의 접근 권한 및 메뉴가 안전하게 분기됩니다.
3. **MPSI 수주 목표가 완벽 보안 차단**:
   - MPSI의 내부 목표예산(`targetBudgetWon`)은 우성정공 및 뉴몰드 외주사 화면 어디에도 노출되지 않도록 원천 차단되어 있습니다.
4. **실시간 양방향 데이터 동기화 (Real-time Sync)**:
   - 외주사가 입력한 견적서, 가공 진척도, 시사출 결과, PPAP 검사 데이터가 MPSI 담당자 화면에 실시간 반영되어 유선/메일 확인 없이 원클릭 검토 및 승인이 가능합니다.
