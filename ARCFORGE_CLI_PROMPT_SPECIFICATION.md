# [MPSI × ArcForge] CLI 화면별/단계별 직접 수정용 종합 프롬프트 명세서 (5차 완결판)

> **문서 목적:** 아크위저드(웹 GUI)의 프로세스 연계 한계를 극복하고 11월 9일 현장교육을 성공시키기 위해, **이인배 소장님과 아크포지 AI 엔진이 원본 소스를 참조하고 결과값까지 직접 검증할 수 있도록 규격화한 정밀 프롬프트 패키지**  
> **작성자:** 김태훈 (MPSI 총괄 PL)  
> **수신/실행자:** 이인배 소장님, 문경용 연구원, 아크포지 AI 변환 엔진  
> **환경:** ArcForge CLI / PostgreSQL 15+ (`mpsi_scm_v2`) / Single Codebase 3-Node Architecture  
> **최종 갱신일:** 2026-11-04  

---

## 📌 목차
1. [최우선 순위: "프로젝트 생성"이 모든 프로세스의 시작](#1-최우선-순위-프로젝트-생성이-모든-프로세스의-시작)
2. [핵심 UI 원칙: 단일 커스텀 페이지 내 shadcn 모달 직접 내장(Embedded Modal)](#2-핵심-ui-원칙-단일-커스텀-페이지-내-shadcn-모달-직접-내장embedded-modal)
3. [DB 구축 원칙: KS X 9101-1:2025 표준 1순위 신규 생성 규칙](#3-db-구축-원칙-ks-x-9101-12025-표준-1순위-신규-생성-규칙)
4. [전 공정 MPSI ⇄ 외주 협력사 간 양방향 데이터 동기화 매트릭스](#4-전-공정-mpsi--외주-협력사-간-양방향-데이터-동기화-매트릭스)
5. [⭐ CLI 프롬프트 표준 4단계 규격 (참조 소스 ➔ 구현 지침 ➔ 동기화 ➔ 결과값 검증 SQL)](#5--cli-프롬프트-표준-4단계-규격)
6. [【화면별 CLI 프롬프트】 MPSI 본사 화면 11종 (완전 검증판)](#6-화면별-cli-프롬프트-mpsi-본사-화면-11종-완전-검증판)
7. [【화면별 CLI 프롬프트】 우성정공 (금형제작사) 화면 5종 (완전 검증판)](#7-화면별-cli-프롬프트-우성정공-금형제작사-화면-5종-완전-검증판)
8. [【화면별 CLI 프롬프트】 (주)뉴몰드 (사출양산사) 화면 5종 (완전 검증판)](#8-화면별-cli-프롬프트-주뉴몰드-사출양산사-화면-5종-완전-검증판)
9. [【화면별 CLI 프롬프트】 공통 부가 기능 (알림 센터 & 소프트러시 배송)](#9-화면별-cli-프롬프트-공통-부가-기능-알림-센터--소프트러시-배송)
10. [CLI 작업 절차 및 태훈 님의 최종 검증 체크리스트](#10-cli-작업-절차-및-태훈-님의-최종-검증-체크리스트)

---

## 1. 최우선 순위: "프로젝트 생성"이 모든 프로세스의 시작

```mermaid
flowchart LR
    START["[최우선 0순위]<br/>프로젝트 생성 및 자동채번<br/>(/portal/project)"] --> STEP0["Step 0. 원청 견적/수주<br/>(/portal/quotation)"]
    STEP0 --> STEP1["Step 1. 도면 접수<br/>(/sales-order)"]
    STEP1 --> STEP_REST["Step 2~13. 금형개발 및 양산<br/>(우성정공 / 뉴몰드 연계)"]
    
    style START fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
```

* **신작(N001)**: `MI26001P0`, 가견적 `Q26001-01`, 금형 `MI26001M` 자동 채번
* **설변(E001)**: 모 프로젝트(`VIEW_PROJECT_LOOKUP`) 선택 시 하위 차수 자동 증분 (`MI26001P0-E001`, `Q26001-02`)

---

## 2. 핵심 UI 원칙: 단일 커스텀 페이지 내 shadcn 모달 직접 내장(Embedded Modal)

* **아크포지 분리 모달 위젯 금지**: 모달을 별도 화면 번호(`Dialog_C100000_REG`)로 쪼개지 말고, **해당 커스텀 페이지 코드 내에 shadcn `<Dialog>`를 직접 내장(Embedded)**하여 단일 화면 번호로 구현.
* **장점**: 화면 번호 불일치로 인한 파라미터 유실 원천 차단 + 원본 shadcn 디자인 100% 보존.

---

## 3. DB 구축 원칙: KS X 9101-1:2025 표준 1순위 신규 생성 규칙

1. **[1순위] KS X 9101-1:2025 국가 표준 테이블 준용**: `"ItemMaster"`, `"SalesOrderHeader"`, `"ProductionOrder"` 등 76개 표준 엔티티 및 표준 컬럼(`EnterpriseID`, `CreationDateTime` 등) 우선 매핑.
2. **[2순위] 사출 실무 확장**: 표준에 없는 엔티티는 `"Mpsi..."` 접두사, PascalCase, 큰따옴표(`"..."`) 인용 식별자, `BaseAttributes`를 적용하여 DDL 자동 실행 생성.

---

## 4. 전 공정 MPSI ⇄ 외주 협력사 간 양방향 데이터 동기화 매트릭스

| 프로세스 단계 | MPSI 본사 액션 / 발신 | ⇄ | 협력사 수신 및 액션 / 발신 | 연계 테이블 / 이벤트 |
| :--- | :--- | :---: | :--- | :--- |
| **0. 프로젝트 생성** | `ProjectID` 생성 (MI26001P0) | ➔ | *(협력사 노출 차단: 보안 격리)* | `"ProjectMaster"` |
| **Step 0. 원청 견적**| 가견적 확정 및 수주 승격 | ➔ | Step 1 도면 접수로 자동 전이 | `"MpsiPrimeQuotation"` |
| **Step 4. 금형 발주**| `[외주 발주 승인]` 클릭 | ➔ | 우성정공 포털 관리대장에 프로젝트 신규 노출 | `MOLD_ORDER_DISPATCHED` |
| **Step 4. 금형 견적**| 견적 심사 및 계약 | ◀ | 우성정공 4대 금형비 견적서 제출 | `"MpsiMoldQuotation"` |
| **Step 5. 금형 설계**| `[금형 설계 승인]` 클릭 | ◀ | 우성정공 DR체크리스트 & 3D 조립도 제출 | `"MpsiMoldDesignMaster"` |
| **Step 6. 7대 가공** | 가공 진척률 모니터링 | ◀ | 우성정공 7대 공정률(%) & 사진 실시간 등록 | `"MpsiMoldManufacturingProgress"` |
| **Step 7~10. 시사출**| 6대 서류 검증 후 `[이관 승인]` | ➔ | 뉴몰드 포털에 '금형 입고 예정' 상태 동기화 | `"MpsiMoldTransfer"` |
| **Step 11. 양산 견적**| `[양산 단가 승인]` (PO 체결)| ◀ | 뉴몰드 EA당 사출 단가 견적서 제출 | `"MpsiMassProductionQuotation"` |
| **Step 11. 12H 시양산**| `[시양산 합격 승인]` | ◀ | 뉴몰드 12H 실적 & $Cpk \ge 1.33$ 산출 보고 | `"MpsiMassValidation"` |
| **Step 12. PPAP 승인** | `[PSW 최종 직인 승인]` | ⇄ | 뉴몰드 18대 서류 제출 ➔ 직인 날인본 수신 | `"MpsiPpapMaster"` |
| **Step 13. 양산 PM** | 금형 수명 주기 관제 | ◀ | 뉴몰드 Shot수 누적 및 PM 점검 일지 등록 | `"MpsiPmRevisionMaster"` |

---

## 5. ⭐ CLI 프롬프트 표준 4단계 규격

아크포지 AI 변환 엔진과 소장님께 제공되는 모든 화면별 프롬프트는 아래 4단계 구조를 엄격히 준수합니다:

```
[1. 참조 원본 소스 및 DDL (Context)] ➔ AI가 읽어야 할 기존 소스 파일 및 DB 스키마 위치
[2. 구현 및 UI 수정 지침 (Task)]   ➔ shadcn 내장 모달 및 화면별 핵심 기능 구현 지침
[3. 양방향 데이터 동기화 (Data Sync)]  ➔ MPSI ⇄ 외주사 간 상태 및 이벤트 전달 규칙
[4. 결과값 검증 및 테스트 SQL (Verify)]➔ 작업 성공 여부를 즉시 검증하는 SQL 쿼리 및 기대값
```

---

## 6. 【화면별 CLI 프롬프트】 MPSI 본사 화면 11종 (완전 검증판)

---

### [화면 01 - 최우선 0순위] 프로젝트 관리대장 (`/portal/project` 또는 `/C100000`)

```markdown
[CLI-TASK] MPSI 본사 프로젝트 관리대장 (/portal/project) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/project/page.tsx`
   - 스토어/타입: `src/lib/project-store.ts`, `src/types/ksx9101.ts`
   - DB DDL: `Readme/mpsi_schema_ddl.sql`의 "ProjectMaster" 테이블 및 "PROC_PROJECTMASTER_SAVE" 프로시저

2. 구현 및 UI 수정 지침:
   - UI 원칙: 아크포지의 별도 화면 번호 분리 모달을 절대 사용하지 마십시오.
   - 본 커스텀 페이지 파일 내부에 shadcn UI의 <Dialog> 컴포넌트를 직접 내장(Embedded)하여 동일 컴포넌트 트리(useState) 내에서 프로젝트 등록 모달을 구현하십시오.
   - 신작(N001, 코드 D335001) 저장 시: PROC_PROJECTMASTER_SAVE를 호출하여 "ProjectID"('MI26009P0' 형태), "EstimateNumber"('Q26009-01' 형태), "MoldNumber"('MI26009M' 형태) 자동 채번.
   - 설변(E001, 코드 D335002) 저장 시: VIEW_PROJECT_LOOKUP에서 선택된 모 프로젝트의 다음 차수('-E001', '-E002') 자동 채번.
   - 테이블/프로시저 부재 시: DDL을 참조하여 즉시 PostgreSQL에 생성하십시오.

3. 양방향 데이터 동기화:
   - 모달 저장 완료 즉시 모달을 닫고 그리드 데이터를 자동 리로드하여 신규 생성된 행을 첫 번째로 포커싱하십시오.
   - 본 단계에서는 외주사(우성정공/뉴몰드)로 데이터가 노출되지 않도록 보안 격리(RLS)를 유지하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 시나리오]: 신작 모달에서 프로젝트명 '테스트 부품', 고객사 '현대자동차' 입력 후 저장.
   - [검증 쿼리]:
     SELECT "ProjectID", "OfficialProjectID", "EstimateNumber", "MoldNumber", "StatusCode", "FLAG"
     FROM "ProjectMaster"
     ORDER BY "CreationDateTime" DESC LIMIT 1;
   - [기대 결과값]:
     * "ProjectID": 'MI26...'로 시작하는 9자리 코드 (NOT NULL)
     * "EstimateNumber": 'Q26...'로 시작하는 견적번호 (NOT NULL)
     * "StatusCode": 'REGISTERED' 또는 'STEP_00_READY'
     * "FLAG": 'Y'
```

---

### [화면 02] 원청사 견적 관리 (`/portal/quotation`)

```markdown
[CLI-TASK] 원청사 견적 관리 (/portal/quotation) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/quotation/page.tsx`
   - 스토어/타입: `src/lib/project-store.ts` (isQuoteItem, convertQuoteToOfficial)
   - DB DDL: `Readme/mpsi_schema_ddl.sql`의 "MpsiPrimeQuotation" 테이블 및 "PROC_C110000_Save" 프로시저

2. 구현 및 UI 수정 지침:
   - 라우팅 파라미터(?projectId=...)를 수신하여 프로젝트 기본정보를 상단 요약 카드에 바인딩하십시오.
   - 가견적 작성/수정 모달은 본 페이지 내에 shadcn <Dialog>로 직접 내장하십시오.
   - 목표 금형비, 판가 입력 후 PROC_C110000_Save를 호출하여 저장하십시오.

3. 양방향 데이터 동기화:
   - [수주 확정] 버튼 클릭 시 견적 상태를 'AWARDED'로 변경하고, "ProjectMaster"의 StatusCode를 'STEP_00_COMPLETED'로 승격시켜 Step 1(도면 접수)으로 자동 전이하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT q."PrimeQuotationID", q."ProjectID", q."MoldEstimateAmount", q."PrimeQuotationStatus", p."StatusCode"
     FROM "MpsiPrimeQuotation" q
     JOIN "ProjectMaster" p ON q."ProjectID" = p."ProjectID"
     WHERE q."ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * q."PrimeQuotationStatus": 'AWARDED'
     * p."StatusCode": 'STEP_00_COMPLETED'
```

---

### [화면 03] 수주 및 도면 접수 (`/portal/sales-order/drawing-reception`)

```markdown
[CLI-TASK] 수주 및 도면 접수 (/portal/sales-order/drawing-reception) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/sales-order/drawing-reception/page.tsx`
   - DB DDL: `Readme/mpsi_schema_ddl.sql`의 "SalesOrderHeader", "SalesOrderLine" (도면 확장 컬럼)

2. 구현 및 UI 수정 지침:
   - 2D 도면(DWG/PDF), 3D 모델(STEP), 사양서 파일 업로더를 구현하십시오.
   - 업로드된 파일의 S3/스토리지 URL을 "SalesOrderHeader"의 "Drawing2dFileUrl", "Drawing3dFileUrl", "CadRevision"에 저장하십시오.

3. 양방향 데이터 동기화:
   - [도면 접수 완료] 클릭 시 프로젝트 상태를 'STEP_01_COMPLETED'로 갱신하십시오.
   - 저장된 3D STEP 도면 URL은 Step 4(외주 발주) 완료 시 우성정공 금형설계 화면(/vendor-portal/mold/design)으로 자동 연계됩니다.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "SalesOrderNumber", "Drawing2dFileUrl", "Drawing3dFileUrl", "CadRevision"
     FROM "SalesOrderHeader"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "Drawing3dFileUrl": '.stp' 또는 '.step' 파일 URL 존재 (IS NOT NULL)
```

---

### [화면 04] 제품검토 및 금형설계 승인 (`/portal/mold-dev/design`)

```markdown
[CLI-TASK] 제품검토 및 금형설계 승인 (/portal/mold-dev/design) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mold-dev/design/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mold/design/page.tsx`
   - DB DDL: "MpsiMoldDesignMaster"

2. 구현 및 UI 수정 지침:
   - 성형성 DR 4대 검토 항목(언더컷, 구배 1.5도 이상, 수축, 게이트) 체크리스트 입력 폼을 제공하십시오.
   - 우성정공이 업로드한 금형 3D 조립도(STP) 파일의 뷰어/다운로드 링크를 제공하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 우성정공이 등록한 DR체크리스트와 3D 조립도 파일이 '승인 요청' 상태로 본 화면에 실시간 표시되어야 합니다.
   - [발신]: MPSI가 [설계 승인] 버튼 클릭 시 ApprovalStatusCode를 'APPROVED'로 갱신하여, 우성정공 가공화면(/vendor-portal/mold/manufacture)의 7대 가공 착수 상태를 동기화하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "DesignMasterSeq", "ProjectID", "ApprovalStatusCode", "MoldAssemblyStepFileUrl"
     FROM "MpsiMoldDesignMaster"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "ApprovalStatusCode": 'APPROVED'
     * "MoldAssemblyStepFileUrl": IS NOT NULL
```

---

### [화면 05] 금형 외주 견적 및 발주 (`/portal/mold-dev/quotation`)

```markdown
[CLI-TASK] 금형 외주 견적 관리 (/portal/mold-dev/quotation) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mold-dev/quotation/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mold/quotation/page.tsx`
   - DB DDL: "MpsiMoldQuotation", "MpsiSyncOutbox"

2. 구현 및 UI 수정 지침:
   - 우성정공이 제출한 4대 금형비(재료비, 가공비, 경비, 특수비) 상세 내역을 그리드에 바인딩하십시오.
   - 발주 확정 확인 모달은 본 페이지 내 shadcn <Dialog>로 직접 내장하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 우성정공이 견적서를 제출하면 본 화면 그리드에 즉시 견적 금액이 표시됩니다.
   - [발신]: MPSI가 [외주 발주 승인] 클릭 시 QuotationStatus를 'CONTRACTED'로 변경하고, "MpsiSyncOutbox"에 eventType='MOLD_ORDER_DISPATCHED'를 적재하여 우성정공 프로젝트 관리대장(/vendor-portal/mold/projects)에 프로젝트를 즉시 노출하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT q."QuotationStatus", o."eventType", o."status"
     FROM "MpsiMoldQuotation" q
     LEFT JOIN "MpsiSyncOutbox" o ON o."payload"->>'ProjectID' = q."ProjectID"
     WHERE q."ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * q."QuotationStatus": 'CONTRACTED'
     * o."eventType": 'MOLD_ORDER_DISPATCHED'
```

---

### [화면 06] 금형 7대 가공 모니터링 (`/portal/mold-dev/manufacture`)

```markdown
[CLI-TASK] 금형제작 모니터링 (/portal/mold-dev/manufacture) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mold-dev/manufacture/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mold/manufacture/page.tsx`
   - DB DDL: "MpsiMoldManufacturingProgress"

2. 구현 및 UI 수정 지침:
   - 7대 가공 공정(건드릴, 1차밀링, 열처리, 고속CNC, 방전, 와이어, 조립)별 최신 진척률(%)과 총 진행률을 도넛/프로그레스 바 차트로 렌더링하십시오.
   - 협력사 현장 사진 클릭 시 shadcn <Dialog>로 원본 확대 모달을 렌더링하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 우성정공이 /vendor-portal/mold/manufacture에서 공정률과 현장 사진을 등록하는 즉시 본 화면에 실시간 동기화되어야 합니다.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "ProcessCode", "ProgressRate", "PhotoFileUrl", "LastUpdateDateTime"
     FROM "MpsiMoldManufacturingProgress"
     WHERE "ProjectID" = 'MI26001P0'
     ORDER BY "ProcessCode" ASC;
   - [기대 결과값]:
     * 7개 공정 행 조회 성공, ProgressRate 값이 0~100 사이 숫자로 저장됨.
```

---

### [화면 07] 시사출 육성 및 금형 이관 승인 (`/portal/mold-dev/trial`)

```markdown
[CLI-TASK] 시사출 및 금형이관 (/portal/mold-dev/trial) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mold-dev/trial/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mold/trial/page.tsx`
   - DB DDL: "MpsiMoldTrial", "MpsiMoldTransfer"

2. 구현 및 UI 수정 지침:
   - CMM 25개 치수 측정 검사 성적서 결과(OK/NG)를 조회 테이블로 렌더링하십시오.
   - 6대 필수서류 게이트: 6개 필수 서류(최종도면, 사양서, 조건표, 성적서, 체크리스트, 승인원) 체크박스가 모두 true일 때만 [금형 이관 승인] 버튼이 활성화되도록 제어하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 우성정공이 제출한 T1 성형조건표 및 치수성적서가 본 화면에 바인딩됩니다.
   - [발신]: [금형 이관 승인] 클릭 시 "MpsiMoldTransfer".AllSixDocumentsConfirmed=true로 저장하고 (주)뉴몰드 포털에 '금형 입고 예정' 상태를 동기화하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "TransferSeq", "ProjectID", "AllSixDocumentsConfirmed", "TransferStatusCode"
     FROM "MpsiMoldTransfer"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "AllSixDocumentsConfirmed": true
     * "TransferStatusCode": 'TRANSFERRED'
```

---

### [화면 08] 양산 단가 견적 승인 (`/portal/mass-prod/quotation`)

```markdown
[CLI-TASK] 양산 견적 관리 (/portal/mass-prod/quotation) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mass-prod/quotation/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mass/quotation/page.tsx`
   - DB DDL: "MpsiMassProductionQuotation"

2. 구현 및 UI 수정 지침:
   - 뉴몰드가 제출한 EA당 수지비, 임가공비, 포장비 원가 세부 내역을 그리드에 바인딩하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 뉴몰드가 제출한 양산 단가 견적서가 본 화면 그리드에 즉시 노출됩니다.
   - [발신]: MPSI가 [양산 단가 승인] 클릭 시 Status='APPROVED'로 갱신하고 뉴몰드로 양산 PO 확정 통보를 동기화하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "MassQuotationID", "ProjectID", "UnitPriceWon", "Status"
     FROM "MpsiMassProductionQuotation"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "Status": 'APPROVED'
```

---

### [화면 09] 시양산 및 $Cpk$ 품질 검증 (`/portal/mass-prod/validation`)

```markdown
[CLI-TASK] 시양산 검증 (/portal/mass-prod/validation) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mass-prod/validation/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mass/validation/page.tsx`
   - DB DDL: "MpsiMassValidation"

2. 구현 및 UI 수정 지침:
   - 12H 연속사출 가동 실적(샷수, 양품/불량)과 자동 계산된 Cpk 지표를 카드로 표시하십시오.
   - Cpk >= 1.33 달성 시 녹색 합격 배지를 표시하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 뉴몰드가 등록한 12H 실적 및 Cpk 값이 본 화면에 실시간 표시됩니다.
   - [발신]: [시양산 합격 승인] 클릭 시 Step 12(PPAP)로 전이시키고 뉴몰드의 PPAP 서류 제출을 활성화하십시오.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "ValidationSeq", "ProjectID", "TotalShots", "CpkValue", "ValidationStatus"
     FROM "MpsiMassValidation"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "CpkValue": 1.33 이상의 실수값 (numeric)
     * "ValidationStatus": 'PASSED'
```

---

### [화면 10] 양산 승인 PPAP (`/portal/mass-prod/ppap`)

```markdown
[CLI-TASK] 양산 승인 PPAP (/portal/mass-prod/ppap) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/mass-prod/ppap/page.tsx`
   - 협력사 소스: `src/app/portal/vendor-portal/mass/ppap/page.tsx`
   - DB DDL: "MpsiPpapMaster", "MpsiPpapDocument"

2. 구현 및 UI 수정 지침:
   - 뉴몰드가 업로드한 18대 서류 목록과 상태를 매트릭스 테이블로 렌더링하십시오.
   - [PSW 최종 양산 승인] 클릭 시 공식 직인이 날인된 최종 승인서 PDF를 생성/오버레이하십시오.

3. 양방향 데이터 동기화:
   - [수신]: 뉴몰드의 18대 서류 제출 상태가 실시간으로 동기화됩니다.
   - [발신]: MPSI 최종 승인 시 직인 날인된 PDF 승인서가 뉴몰드 화면의 다운로드 버튼으로 즉시 동기화됩니다.

4. 결과값 검증 및 테스트 SQL:
   - [검증 쿼리]:
     SELECT "PpapMasterSeq", "ProjectID", "PswStatusCode", "ApprovedPswPdfUrl"
     FROM "MpsiPpapMaster"
     WHERE "ProjectID" = 'MI26001P0';
   - [기대 결과값]:
     * "PswStatusCode": 'APPROVED'
     * "ApprovedPswPdfUrl": IS NOT NULL
```

---

### [화면 11] SCM 배송현황 (`/portal/delivery-status`)

```markdown
[CLI-TASK] SCM 배송현황 (/portal/delivery-status) 수정

1. 참조 원본 소스 및 DDL:
   - 프론트 소스: `src/app/portal/delivery-status/page.tsx`
   - 연동 규격서: `Readme/MPSI_DELIVERY_API_SPEC.md`
   - DB DDL: "MpsiDeliveryTracking" (또는 소프트러시 API Pull 핸들러)

2. 구현 및 UI 수정 지침:
   - Pull 방식 연동: 환경변수 SOFTRUSH_API_BASE_URL, API_KEY를 참조하여 GET /api/v1/logistics/deliveries 호출.
   - 운송장 번호, 출발지, 도착지, 상태(상차/운송중/배송완료) 그리드 바인딩 및 상세 타임라인 shadcn <Dialog> 내장.

3. 결과값 검증 및 테스트:
   - [검증 시나리오]: /portal/delivery-status 진입 시 소프트러시 API 응답 데이터가 그리드에 렌더링되는지 확인.
   - [기대 결과값]: 최소 1건 이상의 운송장 번호(예: 'TRK-260101')와 배송 타임라인이 화면에 표시됨.
```

---

## 7. 【화면별 CLI 프롬프트】 우성정공 (금형제작사) 화면 5종 (완전 검증판)

> **적용 권한:** `role === 'VENDOR_MOLD'` (본사 및 뉴몰드 메뉴 원천 차단)  
> **모달 UI 방침:** 모든 모달은 커스텀 페이지 내에 shadcn `<Dialog>`를 직접 내장(Embedded).

### [우성 01] 프로젝트 관리 (`/portal/vendor-portal/mold/projects`)
```markdown
[CLI-TASK] 우성정공 프로젝트 관리 (/portal/vendor-portal/mold/projects)
1. 참조 소스: `src/app/portal/vendor-portal/mold/projects/page.tsx` / DDL: "ProjectMaster"
2. RLS 격리: MPSI 본사가 우성정공(VendorId)에 발주한 프로젝트만 WHERE "VendorId" = 'WOOSUNG' 조건으로 조회하십시오.
3. 검증 쿼리: SELECT COUNT(*) FROM "ProjectMaster" WHERE "VendorId" = 'WOOSUNG'; (1건 이상 조회 확인)
```

### [우성 02] 외주 견적 관리 (`/portal/vendor-portal/mold/quotation`)
```markdown
[CLI-TASK] 우성정공 금형 견적 관리 (/portal/vendor-portal/mold/quotation)
1. 참조 소스: `src/app/portal/vendor-portal/mold/quotation/page.tsx` / DDL: "MpsiMoldQuotation"
2. UI 및 동기화: 4대 금형비 입력 폼을 본 페이지 내 shadcn <Dialog>로 내장하고, [견적 제출] 클릭 시 MPSI 본사 견적 승인 화면으로 즉시 동기화하십시오.
3. 검증 쿼리: SELECT "EstimatedMoldCost", "QuotationStatus" FROM "MpsiMoldQuotation" WHERE "ProjectID" = 'MI26001P0'; (Status='SUBMITTED')
```

### [우성 03] 제품검토 및 금형설계 (`/portal/vendor-portal/mold/design`)
```markdown
[CLI-TASK] 우성정공 금형설계 (/portal/vendor-portal/mold/design)
1. 참조 소스: `src/app/portal/vendor-portal/mold/design/page.tsx` / DDL: "MpsiMoldDesignMaster"
2. 기능: MPSI 3D STEP 도면 다운로드, DR체크리스트 작성 및 3D 조립도(STP) 업로드 후 [설계 승인 요청]을 MPSI로 전송하십시오.
3. 검증 쿼리: SELECT "ApprovalStatusCode" FROM "MpsiMoldDesignMaster" WHERE "ProjectID" = 'MI26001P0'; (Status='REQUESTED')
```

### [우성 04] 금형제작 7대 가공 (`/portal/vendor-portal/mold/manufacture`)
```markdown
[CLI-TASK] 우성정공 7대 가공 진척 (/portal/vendor-portal/mold/manufacture)
1. 참조 소스: `src/app/portal/vendor-portal/mold/manufacture/page.tsx` / DDL: "MpsiMoldManufacturingProgress"
2. 기능: 7대 공정별 진행률(%)과 사진 업로더를 shadcn <Dialog>로 내장하고 저장 시 MPSI 본사로 실시간 동기화하십시오.
3. 검증 쿼리: SELECT AVG("ProgressRate") FROM "MpsiMoldManufacturingProgress" WHERE "ProjectID" = 'MI26001P0'; (공정률 정상 저장 확인)
```

### [우성 05] 시사출 / 금형 육성 (`/portal/vendor-portal/mold/trial`)
```markdown
[CLI-TASK] 우성정공 시사출/육성 (/portal/vendor-portal/mold/trial)
1. 참조 소스: `src/app/portal/vendor-portal/mold/trial/page.tsx` / DDL: "MpsiMoldTrial"
2. 기능: T1 성형조건표 및 25개 CMM 치수 성적서 제출 시 MPSI 본사 검사 화면에 심사 대기 상태로 동기화하십시오.
3. 검증 쿼리: SELECT "TrialNo", "TrialStatus" FROM "MpsiMoldTrial" WHERE "ProjectID" = 'MI26001P0'; (TrialNo='T1', Status='SUBMITTED')
```

---

## 8. 【화면별 CLI 프롬프트】 (주)뉴몰드 (사출양산사) 화면 5종 (완전 검증판)

> **적용 권한:** `role === 'VENDOR_MASS'` (본사 및 우성정공 메뉴 원천 차단)  
> **모달 UI 방침:** 모든 모달은 커스텀 페이지 내에 shadcn `<Dialog>`를 직접 내장(Embedded).

### [뉴몰드 01] 프로젝트 관리 (`/portal/vendor-portal/mass/projects`)
```markdown
[CLI-TASK] 뉴몰드 프로젝트 관리 (/portal/vendor-portal/mass/projects)
1. 참조 소스: `src/app/portal/vendor-portal/mass/projects/page.tsx`
2. 기능: MPSI 본사가 금형 이관을 승인한 건을 '금형 입고 확인' 상태로 조회하십시오.
3. 검증: 그리드에 양산 배정 프로젝트 및 입고 상태가 정상 노출되는지 확인.
```

### [뉴몰드 02] 양산 견적 관리 (`/portal/vendor-portal/mass/quotation`)
```markdown
[CLI-TASK] 뉴몰드 양산 단가 견적 (/portal/vendor-portal/mass/quotation)
1. 참조 소스: `src/app/portal/vendor-portal/mass/quotation/page.tsx` / DDL: "MpsiMassProductionQuotation"
2. 기능: 수지비, 임가공비, 포장비를 입력받아 [양산 견적 제출] 시 MPSI 본사 화면으로 즉시 동기화하십시오.
3. 검증 쿼리: SELECT "UnitPriceWon", "Status" FROM "MpsiMassProductionQuotation" WHERE "ProjectID" = 'MI26001P0'; (Status='SUBMITTED')
```

### [뉴몰드 03] 시양산 관리 12H (`/portal/vendor-portal/mass/validation`)
```markdown
[CLI-TASK] 뉴몰드 12H 시양산 (/portal/vendor-portal/mass/validation)
1. 참조 소스: `src/app/portal/vendor-portal/mass/validation/page.tsx` / DDL: "MpsiMassValidation"
2. 기능: 25개 샘플 치수 입력 시 Cpk를 자동 계산하고 1.33 이상 시 [12H 실적 보고] 클릭 시 MPSI 본사로 동기화하십시오.
3. 검증 쿼리: SELECT "CpkValue", "ValidationStatus" FROM "MpsiMassValidation" WHERE "ProjectID" = 'MI26001P0'; (Cpk >= 1.33 확인)
```

### [뉴몰드 04] 설변 PM 관리 (`/portal/vendor-portal/mass/revision`)
```markdown
[CLI-TASK] 뉴몰드 설변 PM 관리 (/portal/vendor-portal/mass/revision)
1. 참조 소스: `src/app/portal/vendor-portal/mass/revision/page.tsx` / DDL: "MpsiPmRevisionMaster"
2. 기능: 타발 Shot수 누적 및 1만~30만회 PM 점검 일지 등록 시 MPSI 본사 대시보드와 동기화하십시오.
3. 검증 쿼리: SELECT "CumulativeShotCount" FROM "MpsiPmRevisionMaster" WHERE "ProjectID" = 'MI26001P0'; (Shot수 증가 확인)
```

### [뉴몰드 05] 양산 승인 PPAP (`/portal/vendor-portal/mass/ppap`)
```markdown
[CLI-TASK] 뉴몰드 양산 승인 PPAP (/portal/vendor-portal/mass/ppap)
1. 참조 소스: `src/app/portal/vendor-portal/mass/ppap/page.tsx` / DDL: "MpsiPpapMaster"
2. 기능: 18대 서류 업로드 및 PSW 승인 요청을 전송하고, MPSI 최종 승인 시 공식 직인 날인본 PDF 다운로드 버튼을 활성화하십시오.
3. 검증: 직인 날인본 다운로드 클릭 시 정상 파일 수신 확인.
```

---

## 9. 【화면별 CLI 프롬프트】 공통 부가 기능 (알림 센터 & 소프트러시 배송)

### [알림 센터] 업무 알림 컴포넌트 (`components/layout/notification-center.tsx`)
```markdown
[CLI-TASK] 알림 센터 컴포넌트 수정
1. 참조 소스: `src/components/layout/notification-center.tsx`, `src/lib/notification-store.ts`
2. 기능: 알림의 isConfirmed 플래그가 기본 false이며, 사용자가 직접 [확인] 버튼을 클릭하기 전까지는 새로고침을 하거나 다른 메뉴로 이동해도 사라지지 않도록 영구 보존하십시오.
3. 검증: 알림 수신 후 브라우저 새로고침(F5) 시에도 상단 벨 배지 숫자와 알림 목록이 유지되는지 확인.
```

---

## 10. CLI 작업 절차 및 태훈 님의 최종 검증 체크리스트

### 10.1 소장님 권장 작업 순서
1. **0순위**: MPSI 본사 `프로젝트 관리대장(/portal/project)` - 신작/설변 자동채번 및 단일 커스텀 페이지 내 shadcn Dialog 내장.
2. **1단계**: MPSI 본사 `Step 0 원청 견적(/portal/quotation)` 및 `Step 4 외주 발주(/portal/mold-dev/quotation)` ⇄ 우성정공 포털 연계.
3. **2단계**: 우성정공 전용 5개 화면 및 10단계 금형 이관 6대 서류 체크박스 게이트 ⇄ 뉴몰드 포털 연계.
4. **3단계**: 뉴몰드 전용 5개 화면 및 Step 11 Cpk 계산, Step 12 PPAP 승인.
5. **4단계**: 알림 센터 및 소프트러시 배송현황 API Pull 연동.

### 10.2 김태훈 님 최종 검증 체크리스트
- [ ] 관리대장에서 신작(N001) 등록 시 `MI26001P0`, 견적 `Q26001-01` 정상 채번되는가?
- [ ] 설변(E001) 등록 시 모 프로젝트 선택 후 차수(`-E001`)가 자동 증가하는가?
- [ ] 신규 등록 모달이 화면 번호 분리 없이 shadcn 원본 다이얼로그 디자인 그대로 깔끔하게 뜨는가?
- [ ] MPSI에서 금형 외주 발주 시 우성정공 포털에 프로젝트가 즉시 나타나는가?
- [ ] 우성정공이 7대 가공 공정률 입력 시 MPSI 본사 대시보드 그래프가 실시간으로 바뀌는가?
- [ ] 10단계에서 6대 필수 서류가 모두 체크되어야만 이관 승인이 되고, 뉴몰드에 '입고 예정'이 뜨는가?
- [ ] 뉴몰드 12H 시양산에서 치수 입력 시 Cpk 수치가 자동 계산되고 MPSI에 합격 심사가 뜨는가?
- [ ] 알림 확인 버튼을 누르기 전까지 알림 목록이 계속 유지되는가?
- [ ] 소프트러시 배송현황 화면에서 배송 목록과 타임라인이 정상 조회되는가?

