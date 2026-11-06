# MPSI 데이터베이스 설계서 (Database Design Specification)
> **부제: KS X 9101-1:2025 최신 온톨로지 표준 테이블 정의서 원본 기반 MPSI 스마트 제조 데이터베이스 설계**  
> **기준 원본 문서:**  
> 1. `KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx` (국가기술표준원 스마트제조 데이터 교환 표준 모델)  
> 2. `KSX9101-1_2025_온톨로지용v1.0_공통코드_워크시트.xlsx` (공통코드 및 단위코드 표준 매핑집)  
> 3. `KSX9101-1_2025_온톨로지용v1.0.docx` (온톨로지 데이터 모델 공식 기술 규격서)  
> **대상 DBMS:** PostgreSQL 15+ (권장: PostgreSQL 16 / 17)  
> **핵심 원칙:** **대문자, 소문자, "_" 변환 없이 원본 100% 동일 적용 (Exact Case Preservation)**  
> **표준 구분 원칙:** 모든 테이블과 컬럼에 **`[KS X 9101 표준]`**, **`[MPSI 실무 확장]`**, **`[MPSI 분산 연계]`** 식별 주석 명시  
> **확장 원칙:** KS X 9101 표준에 부재한 MPSI 14단계 프로세스 워크플로우는 **KS X 9101의 명명 및 설계 규칙(PascalCase 식별자, SequenceNo, IDREF 규격)**과 동일하게 확장  
> **최종 갱신일자:** 2026-10-22  
> **산출 위치:** `Readme/MPSI_DATABASE_DESIGN.md`

---

## 📑 목차
1. [설계 개요 및 핵심 원칙](#1-설계-개요-및-핵심-원칙)
2. [PostgreSQL 물리 데이터베이스 아키텍처 및 세팅 지침](#2-postgresql-물리-데이터베이스-아키텍처-및-세팅-지침)
3. [도메인별 ERD 및 워크플로우 상태 다이어그램](#3-도메인별-erd-및-워크플로우-상태-다이어그램)
4. [도메인별 테이블 상세 정의서 (표준 구분 주석 완비)](#4-도메인별-테이블-상세-정의서)
   - 4.1 [파트 1: KS X 9101-1:2025 표준 온톨로지 테이블 (76개)](#41-파트-1-ks-x-9101-12025-표준-온톨로지-테이블-76개)
   - 4.2 [파트 2: MPSI 금형/사출 14단계 실무 특화 확장 테이블 (20개)](#42-파트-2-mpsi-금형사출-14단계-실무-특화-확장-테이블-20개)
   - 4.3 [파트 3: MPSI 분산 노드 간 API 동기화 메타 테이블 (3개)](#43-파트-3-mpsi-분산-노드-간-api-동기화-메타-테이블-3개)
5. [데이터 사전 (Data Dictionary) 요약 통계](#5-데이터-사전-요약-통계)

---

## 1. 설계 개요 및 핵심 원칙

### 1.1 배경 및 목적
본 문서는 **MPSI(Manufacturing Product/Process Smart Integration)** 스마트 제조 포털 시스템을 구축하기 위한 공식 데이터베이스 설계서입니다.
국가산업표준인 **KS X 9101-1:2025 (제조분야 기업업무시스템 간 제조업무 데이터 교환 — 제1부: 데이터 모델)** 및 한국산업단지공단(KICOX)의 **`KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx`** 원본 명세를 단 1자의 대소문자나 구분자 변경 없이 100% 충실하게 수용하였습니다.

### 1.2 핵심 설계 원칙 (Core Rules)
1. **대문자, 소문자, "_" 변환 없이 원본 100% 동일 적용 (Exact Case Preservation)**
   - 최신 온톨로지 정의서에 명시된 테이블명(예: `Site`, `Personnel`, `CustomerPartyMaster`, `ItemMaster`, `BOMHeader`, `ProjectMaster`, `ProductionOrder` 등)과 컬럼명(예: `EnterpriseID`, `SiteSequenceNo`, `CreationDateTime`, `FullCapacity`, `ItemUOMCode` 등)의 영문 대소문자를 **임의로 snake_case나 소문자로 변환하지 않고 원본 그대로 적용**합니다.
   - 포스트그리(PostgreSQL)의 네이밍 규칙상 대소문자를 보존하기 위해 **큰따옴표(`"Table"`, `"Column"`) 인용 식별자**를 표준으로 사용합니다.
2. **표준 구분 주석(Comment) 100% 완전 표기**
   - 각 테이블과 컬럼마다 스키마 레벨 주석(`COMMENT ON TABLE`, `COMMENT ON COLUMN`)에 **`[KS X 9101 표준]`**, **`[MPSI 실무 확장]`**, **`[MPSI 분산 연계]`** 구분을 명확히 기재하여 정부과제 심사 및 향후 아크포지(ArcForge) AI 자동 컨버팅 시 표준 호환성을 즉시 판정할 수 있도록 보장합니다.
3. **MPSI 실무 워크플로우의 동일 규칙 확장 (Similar Rule Extension)**
   - KS X 9101 표준에 정의되지 않은 **원청 견적(0단계), 금형 개발(1~10단계), 사출 양산(11~13단계) 특화 엔티티**는 KS X 9101의 온톨로지 설계 패턴(PascalCase 명명, `ID`, `Name`, `DateTime`, `SequenceNo`, `BaseAttributes` 공통 속성)을 정확히 준용하여 확장하였습니다.
4. **분산 독립 DB 간 API 연계 프로토콜 지원 (Transactional Outbox)**
   - MPSI 본사, 우성정공, 뉴몰드 3개사에 분산 설치되는 독립 DB 간 비동기 연계를 위해 `MpsiSyncOutbox`, `MpsiSyncInbox`, `MpsiSyncNodeRegistry` 3대 메타 테이블을 표준 배치하여 멱등성과 데이터 무결성을 보장합니다.

---

## 2. PostgreSQL 물리 데이터베이스 아키텍처 및 세팅 지침

### 2.1 대소문자 보존을 위한 큰따옴표(Quoted Identifiers) 세팅 원칙
PostgreSQL은 SQL 표준에 따라 따옴표로 감싸지 않은 식별자(Unquoted Identifiers)를 모두 **소문자(lowercase)**로 자동 변환(folding)합니다.
본 설계서는 원본 엑셀 정의서의 대소문자를 엄격히 보존하므로, PostgreSQL 세팅 및 DML/DDL 작성 시 다음 규칙을 준수해야 합니다:

```sql
-- [올바른 세팅 및 쿼리 방식] 반드시 큰따옴표("")로 감싸야 대소문자가 정확히 보존됩니다.
CREATE TABLE "ItemMaster" (
    "ItemId"            varchar(50)     NOT NULL,
    "ItemName"          varchar(200)    NOT NULL,
    "EnterpriseId"      varchar(50)     NOT NULL,
    "CreationDateTime"  timestamp       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ItemMaster" PRIMARY KEY ("ItemId")
);

-- 조회 쿼리 예시
SELECT "ItemId", "ItemName" FROM "ItemMaster" WHERE "EnterpriseId" = 'MPSI';

-- [주의: 잘못된 쿼리] 따옴표를 생략하면 소문자(itemmaster, itemid)로 변환되어 relation not found 오류가 발생합니다!
-- SELECT ItemId, ItemName FROM ItemMaster; -- (X) 오류 발생!
```

### 2.2 표준 공통 기본 속성 (BaseAttributes 규격)
KS X 9101-1 표준 및 엑셀 정의서의 `BaseAttributes` 테이블에 따라, 대부분의 비즈니스 마스터 및 트랜잭션 테이블은 아래 8대 공통 컬럼을 포함합니다:
```sql
"EnterpriseId"          varchar(50)     NOT NULL,                         -- 회사식별자 (테넌트)
"SiteId"                varchar(50)     NOT NULL,                         -- 사업장식별자
"PlantId"               varchar(50)     NOT NULL,                         -- 공장식별자
"CreatorId"             varchar(50),                                      -- 등록자식별자
"CreationDateTime"      timestamp       DEFAULT CURRENT_TIMESTAMP,        -- 등록일시 (ISO 8601)
"ModifierId"            varchar(50),                                      -- 수정자식별자
"ModificationDateTime"  timestamp       DEFAULT CURRENT_TIMESTAMP,        -- 수정일시 (ISO 8601)
"Note"                  text                                              -- 비고사항
```

### 2.3 데이터 타입 매핑 표
| 원본 정의서 타입 | PostgreSQL 물리 타입 | 권장 용도 및 설명 |
| :--- | :--- | :--- |
| **varchar(50)** | `varchar(50)` | 식별자(ID), 코드값, 유형 구분 |
| **varchar(200) / (255)** | `varchar(200)` / `varchar(255)` | 품목명, 프로젝트명, 거래처명, 이메일 |
| **text** | `text` | 장문 설명, 도면/파일 URL, 사양서, 비고 |
| **integer** | `integer` | 순번, 캐비티수, 수량(정수), 단계번호 |
| **bigint** | `bigint` | 시퀀스 번호, 대규모 일련번호 |
| **numeric(18,4) / (15,3)** | `numeric(18,4)` | 정밀 단위 수량, 계량치 |
| **numeric(18,2)** | `numeric(18,2)` | 금액 (공급가, 견적가, 정산금액, 부가세) |
| **numeric(8,4)** | `numeric(8,4)` | Cpk 공정능력지수, 정밀 품질 측정값 |
| **numeric(5,2)** | `numeric(5,2)` | 진척률(%), 수율(%) (0.00 ~ 100.00) |
| **boolean** | `boolean` | 여부 플래그 (true/false) |
| **date** | `date` | 발주일자, 납기일, 검사일자 (YYYY-MM-DD) |
| **timestamp** | `timestamp` | 표준 일시 (YYYY-MM-DD HH24:MI:SS) |
| **jsonb** | `jsonb` | 동적 체크리스트, 측정 데이터, 첨부 문서 메타데이터 |
| **uuid** | `uuid` | 테넌트 고유 UUID 식별자 |

---

## 3. 도메인별 ERD 및 워크플로우 상태 다이어그램

### 3.1 MPSI 13단계 프로세스 워크플로우 전이도 (State Transition)
```mermaid
flowchart TD
    subgraph G1 ["1. 도면 및 수주 그룹"]
        S1["1단계: 제품 data 접수 (2D/3D Data, 견적조건)"] --> S2["2단계: 제품 3D data 검토 (금형구현성, CAE)"]
        S2 --> S3["3단계: 최종 제품 3D data 수신 (발주서 작성)"]
        S3 --> S4["4단계: 금형 발주 (금형사 발송, T1 목표일정)"]
    end

    subgraph G2 ["2. 금형 개발 그룹"]
        S4 --> S5["5단계: 금형 설계 (DR자료, CAE보고서, 사양서 컨펌)"]
        S5 --> S6["6단계: 소재발주 및 제작 (강재발주, 가공일정)"]
        S6 --> S7["7단계: 금형완료 / 시사출 (T1 시사출, 성형조건표)"]
    end

    subgraph G3 ["3. 시사출 육성 그룹"]
        S7 --> S8["8단계: 치수/외관 확인 및 검사 (MPSI 참관)"]
        S8 --> S9["9단계: 금형 육성 완료 (승인원, 최종샘플)"]
        S9 --> S10["10단계: 금형 승인 후 이관 (6대 서류 이관)"]
    end

    subgraph G4 ["4. 사출 양산 그룹"]
        S10 --> S11["11단계: 양산승인 사출 (시양산, Cpk 검증)"]
        S11 --> S12["12단계: 양산품질 검증 (PPAP 18대 요건, PSW)"]
        S12 --> S13["13단계: 양산 납품 / 정산 마감"]
    end

    style G1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style G2 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style G3 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style G4 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

### 3.2 핵심 비즈니스 도메인 및 MPSI 워크플로우 ERD
```mermaid
erDiagram
    Enterprise ||--o{ Site : "has"
    Site ||--o{ Plant : "has"
    Enterprise ||--o{ CustomerPartyMaster : "manages"
    Enterprise ||--o{ VendorPartyMaster : "manages"
    
    CustomerPartyMaster ||--o{ ProjectMaster : "orders"
    ProjectMaster ||--o{ SalesOrder : "links"
    ProjectMaster ||--o{ MpsiProjectStage : "tracks 13 steps"
    ProjectMaster ||--o{ MpsiMoldDesign : "contains"
    ProjectMaster ||--o{ MpsiMoldTrial : "executes T1..Tn"
    ProjectMaster ||--o{ MpsiInspectionReport : "verifies"
    ProjectMaster ||--o{ MpsiMoldTransfer : "transfers with 6 docs"
    ProjectMaster ||--o{ MpsiMassProductionValidation : "validates Cpk"
    ProjectMaster ||--o{ MpsiPpapDocument : "submits PPAP"
    ProjectMaster ||--o{ MpsiMassSettlement : "settles"
    ProjectMaster ||--o{ MpsiArcTalkMessage : "discusses"
    
    VendorPartyMaster ||--o{ MpsiMoldQuotation : "quotes"
    VendorPartyMaster ||--o{ PurchaseOrder : "receives"
    VendorPartyMaster ||--o{ MpsiMoldTransfer : "involved in"
    
    ItemMaster ||--o{ Bom : "defines"
    ItemMaster ||--o{ Routing : "routes"
    ProductionOrder ||--o{ OperationStart : "starts"
    ProductionOrder ||--o{ OperationEnd : "completes"
    ProductionOrder ||--o{ ProductionPerformance : "reports"
    Equipment ||--o{ EquipmentParameter : "configures"
    Equipment ||--o{ TraceParameter : "logs"
```

---

## 4. 도메인별 테이블 상세 정의서

본 장에서는 `KSX9101테이블정의서.xlsx`의 원본 명세 121개 테이블과 MPSI 13단계 프로세스 특화 12개 테이블의 전체 물리 설계를 도메인별로 기술합니다.  
**테이블명과 컬럼명의 대문자, 소문자, 언더스코어(_)는 단 1글자의 변형도 없이 원본 그대로 보존되었습니다.**


### 4.1 도메인 1: 조직 및 기준정보 마스터 (Enterprise & Org Master)
> 기업, 사업장, 공장, 부서, 사원, 거래처(고객사/공급사), 공통코드 등 스마트 제조 시스템의 근간이 되는 기준정보

#### 4.1.1 "Enterprise"
- **테이블 물리명:** `"Enterprise"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 기업대표정보 관리 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EnterpriseSeq`** | - | `integer` | NO | UNIQUE | - |
| 2 | **`EnterpriseSeq`** | - | `integer` | NO | PRIMARY KEY | - |
| 3 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | - |
| 4 | **`EnterpriseName`** | - | `varchar(200)` | NO | - | - |
| 5 | **`DialNumber`** | - | `varchar(20)` | YES | - | - |
| 6 | **`CountryId`** | - | `varchar(50)` | YES | - | - |
| 7 | **`PostalCode`** | - | `varchar(10)` | YES | - | - |
| 8 | **`BaseAddress`** | - | `varchar(200)` | YES | - | - |
| 9 | **`DetailAddress`** | - | `varchar(200)` | YES | - | - |
| 10 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | - |
| 11 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | - |
| 12 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | - |
| 13 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | - |
| 14 | **`Note`** | 비고 | `text` | YES | - | - |
| 15 | **`Flag`** | - | `boolean` | NO | - | - |

---

#### 4.1.2 "Site"
- **테이블 물리명:** `"Site"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사업장 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | PRIMARY KEY | 사업장의 고유식별값 |
| 2 | **`SiteName`** | 사업장명 | `varchar(200)` | NO | - | 사업장의 명칭 |
| 3 | **`BusinessRegistrationNumber`** | 사업자등록번호 | `varchar(20)` | YES | - | 사업장의 사업자등록번호 |
| 4 | **`DialNumber`** | 전화번호 | `varchar(20)` | YES | - | 사업장의 전화번호 |
| 5 | **`PostalCode`** | 우편번호 | `varchar(10)` | YES | - | 사업장의 우편번호 |
| 6 | **`BaseAddress`** | 기본주소 | `varchar(200)` | YES | - | 우편번호로 검색되는 사업장 주소 |
| 7 | **`DetailAddress`** | 상세주소 | `varchar(200)` | YES | - | 기본주소에 추가되는 사업장의 상세주소 |
| 8 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 사업장의 사용 여부 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.3 "Plant"
- **테이블 물리명:** `"Plant"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공장 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | PRIMARY KEY | 공장의 고유식별값 |
| 2 | **`PlantName`** | 공장명 | `varchar(200)` | NO | - | 공장의 명칭 |
| 3 | **`DialNumber`** | 전화번호 | `varchar(20)` | YES | - | 공장의 대표전화번호 |
| 4 | **`CountryId`** | 국가식별자 | `varchar(50)` | YES | - | 공장의 국가를 식별하기 위한 고유값 |
| 5 | **`PostalCode`** | 우편번호 | `varchar(10)` | YES | - | 공장의 우편번호 |
| 6 | **`BaseAddress`** | 기본주소 | `varchar(200)` | YES | - | 우편번호 검색을 통해 찾는 공장 주소 |
| 7 | **`DetailAddress`** | 상세주소 | `varchar(200)` | YES | - | 기본주소에 추가되는 공장의 상세주소 |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.4 "Department"
- **테이블 물리명:** `"Department"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 부서 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 11개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`DepartmentId`** | 부서식별자 | `varchar(50)` | NO | PRIMARY KEY | 인사조직 중 부서를 식별하기 위한 고유값 |
| 2 | **`DepartmentName`** | 부서명 | `varchar(200)` | NO | - | 부서 명칭 |
| 3 | **`ParentDepartmentId`** | 상위부서식별자 | `varchar(50)` | YES | - | 해당 부서의 상위부서 |
| 4 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 5 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 6 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 7 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 8 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 9 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 10 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 11 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.5 "Personnel"
- **테이블 물리명:** `"Personnel"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사원 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PersonnelId`** | 사원식별자 | `varchar(50)` | NO | UNIQUE | 인사조직 내 사원을 식별하기 위한 고유값 |
| 2 | **`PersonnelName`** | 사원명 | `varchar(100)` | NO | - | 사원 성명 |
| 3 | **`DepartmentId`** | 부서식별자 | `varchar(50)` | YES | - | 인사조직 중 부서를 식별하기 위한 고유값 |
| 4 | **`EmploymentStatusType`** | 재직유형 | `varchar(20)` | YES | - | 사원의 재직상태 |
| 5 | **`PersonInChargeEmail`** | 담당자이메일명 | `varchar(100)` | YES | - | 사원의 이메일 |
| 6 | **`PersonInChargeDialNumber`** | 담당자전화번호 | `varchar(20)` | YES | - | 사원의 전화번호 |
| 7 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 8 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 9 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 10 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 11 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 15 | **`EnterpriseSeq`** | 기업(시스템용키) | `integer` | YES | - | 기업(시스템용키) |
| 16 | **`PersonnelSeq`** | 사원(시스템용키) | `integer` | NO | PRIMARY KEY | 사원(시스템용키) |

---

#### 4.1.6 "CustomerPartyMaster"
- **테이블 물리명:** `"CustomerPartyMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 고객사 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 22개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 2 | **`CustomerName`** | 고객사명 | `varchar(200)` | NO | - | 고객사의 명칭 |
| 3 | **`BusinessRegistrationNumber`** | 사업자등록번호 | `varchar(20)` | YES | - | 고객사의 사업자등록증에 기재된 고유번호 |
| 4 | **`RepresentativeName`** | 대표자명 | `varchar(100)` | YES | - | 고객사의 대표자 성명 |
| 5 | **`CountryId`** | 국가식별자 | `varchar(50)` | YES | - | 고객사의 국가를 식별하기 위한 고유값 |
| 6 | **`PostalCode`** | 우편번호 | `varchar(10)` | YES | - | 고객사의 우편번호 |
| 7 | **`BaseAddress`** | 기본주소 | `varchar(200)` | YES | - | 우편번호 검색을 통해 찾는 고객사 주소 |
| 8 | **`DetailAddress`** | 상세주소 | `varchar(200)` | YES | - | 기본주소에 추가되는 고객사의 상세주소 |
| 9 | **`DialNumber`** | 전화번호 | `varchar(20)` | YES | - | 고객사의 대표전화번호 |
| 10 | **`FaxNumber`** | 팩스번호 | `varchar(20)` | YES | - | 고객사의 팩스번호 |
| 11 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 고객사 정보의 사용 여부 |
| 12 | **`PersonInChargeName`** | 담당자명 | `varchar(100)` | YES | - | 고객사 담당자의 성명 |
| 13 | **`PersonInChargeEmail`** | 담당자이메일명 | `varchar(100)` | YES | - | 고객사 담당자의 이메일 |
| 14 | **`PersonInChargeDialNumber`** | 담당자전화번호 | `varchar(20)` | YES | - | 고객사 담당자의 전화번호 |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 16 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 18 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 19 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 20 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 21 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 22 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.7 "VendorPartyMaster"
- **테이블 물리명:** `"VendorPartyMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공급사 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 22개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`VendorName`** | 공급사명 | `varchar(200)` | NO | - | 공급사의 명칭 |
| 3 | **`BusinessRegistrationNumber`** | 사업자등록번호 | `varchar(20)` | YES | - | 공급사의 사업자등록증에 기재된 고유번호 |
| 4 | **`RepresentativeName`** | 대표자명 | `varchar(100)` | YES | - | 공급사의 대표자 성명 |
| 5 | **`CountryId`** | 국가식별자 | `varchar(50)` | YES | - | 공급사의 국가를 식별하기 위한 고유값 |
| 6 | **`PostalCode`** | 우편번호 | `varchar(10)` | YES | - | 공급사의 우편번호 |
| 7 | **`BaseAddress`** | 기본주소 | `varchar(200)` | YES | - | 우편번호 검색을 통해 찾는 공급사 주소 |
| 8 | **`DetailAddress`** | 상세주소 | `varchar(200)` | YES | - | 기본주소에 추가되는 공급사의 상세주소 |
| 9 | **`DialNumber`** | 전화번호 | `varchar(20)` | YES | - | 공급사의 대표전화번호 |
| 10 | **`FaxNumber`** | 팩스번호 | `varchar(20)` | YES | - | 공급사의 팩스번호 |
| 11 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 공급사 정보의 사용 여부 |
| 12 | **`PersonInChargeName`** | 담당자명 | `varchar(100)` | YES | - | 공급사 담당자의 성명 |
| 13 | **`PersonInChargeEmail`** | 담당자이메일명 | `varchar(100)` | YES | - | 공급사 담당자의 이메일 |
| 14 | **`PersonInChargeDialNumber`** | 담당자전화번호 | `varchar(20)` | YES | - | 공급사 담당자의 전화번호 |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 16 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 18 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 19 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 20 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 21 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 22 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.8 "CommonCodeMaster"
- **테이블 물리명:** `"CommonCodeMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공통코드정보 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 13개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`CommonCodeId`** | 공통코드식별자 | `varchar(50)` | NO | PRIMARY KEY | 기준정보 외 시스템에서 공통적으로 사용되는 코드 |
| 2 | **`CommonCodeName`** | 공통코드명 | `varchar(200)` | NO | - | 공통코드 명칭 |
| 3 | **`CommonCodeGroup`** | 공통코드그룹 | `varchar(50)` | YES | - | 공통코드의 집합 |
| 4 | **`CommonCodeSequence`** | 표시순번 | `integer` | YES | - | 공통코드가 화면에 표시되는 순서 |
| 5 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 공통코드의 사용 여부 |
| 6 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 7 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 8 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 9 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 10 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.9 "MasterCodes"
- **테이블 물리명:** `"MasterCodes"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 마스터코드
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`CodeId`** | - | `integer` | NO | PRIMARY KEY | - |
| 2 | **`CodeCategory`** | - | `varchar(50)` | NO | - | - |
| 3 | **`CodeValue`** | - | `varchar(100)` | NO | - | - |
| 4 | **`CodeName`** | - | `varchar(200)` | NO | - | - |
| 5 | **`CodeDescription`** | - | `text` | YES | - | - |
| 6 | **`SortOrder`** | - | `integer` | YES | - | - |
| 7 | **`IsActive`** | - | `boolean` | YES | - | - |
| 8 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | - |
| 9 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | - |
| 10 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | - |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | - |
| 12 | **`CreationDateTime`** | - | `timestamp` | YES | - | - |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | - |
| 14 | **`ModificationDateTime`** | - | `timestamp` | YES | - | - |
| 15 | **`Note`** | 비고 | `text` | YES | - | - |

---

#### 4.1.10 "UomGroup"
- **테이블 물리명:** `"UomGroup"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 단위그룹 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 13개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`UomGroupId`** | 단위그룹식별자 | `varchar(50)` | NO | PRIMARY KEY | 중량/부피/길이/면적/시간/수량 등의 측정 단위의 그룹을 식별하기 위한 고유값 |
| 2 | **`UomGroupName`** | 단위그룹명 | `varchar(200)` | NO | - | 중량/부피/길이/면적/시간/수량 등의 측정 단위의 그룹 명칭 |
| 3 | **`UomCode`** | 단위코드 | `varchar(20)` | YES | - | 측정 단위를 식별하기 위한 고유값 |
| 4 | **`UomCodeName`** | 단위코드명 | `varchar(100)` | YES | - | 단위의 명칭 |
| 5 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 단위의 사용 여부 |
| 6 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 7 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 8 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 9 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 10 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.11 "WorkCalendar"
- **테이블 물리명:** `"WorkCalendar"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 달력 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`CalendarId`** | 달력식별자 | `varchar(50)` | NO | PRIMARY KEY | 달력의 고유식별값 |
| 2 | **`CalendarType`** | 달력유형 | `varchar(20)` | YES | - | 달력 유형 |
| 3 | **`CalendarDate`** | 달력일자 | `date` | YES | - | 달력의 일자(KS X ISO 8601을 따른다) |
| 4 | **`DayOfWeek`** | 요일 | `varchar(10)` | YES | - | 달력의 요일 |
| 5 | **`WeekOfYear`** | 주수 | `integer` | YES | - | 해당 연도의 주 차 |
| 6 | **`DayOfYear`** | 총누계일수 | `integer` | YES | - | 달력상 해당 연도 1월 1일부터 해당 일자까지의 누계 일수 |
| 7 | **`ScheduleType`** | 근무일유형 | `varchar(20)` | YES | - | 해당일의 근무유형 |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.1.12 "BaseAttributes"
- **테이블 물리명:** `"BaseAttributes"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 기본속성
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | UNIQUE | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 2 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | UNIQUE | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 3 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | UNIQUE | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 4 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값(일반적으로 사원번호) |
| 5 | **`CreationDateTime`** | 정보를 처음으로 등록한 날짜 (KS X ISO 8601) | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 (KS X ISO 8601) |
| 6 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값(일반적으로 사원번호) |
| 7 | **`ModificationDateTime`** | 정보를 마지막으로 수정한 날짜 (KS X ISO 8601) | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 (KS X ISO 8601) |
| 8 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |

---


### 4.2 도메인 2: 품목 및 BOM/라우팅 마스터 (Item, BOM & Routing)
> 부품/원자재/금형 품목 정보, 자재명세서(BOM), 제조 공정 라우팅 및 설계변경지시(ECO)

#### 4.2.1 "ItemMaster"
- **테이블 물리명:** `"ItemMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 품목마스터 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 48개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 |
| 2 | **`ItemName`** | 품목명 | `varchar(200)` | NO | - | 품목의 명칭 |
| 3 | **`ItemType`** | 품목유형 | `varchar(20)` | YES | - | 품목의 유형(상품/제품/원자재/반제품 등) |
| 4 | **`PhantomIndicator`** | 가상품목여부 | `boolean` | YES | - | 가상 품목으로 지정여부 |
| 5 | **`ItemLargeClass`** | 품목대분류 | `varchar(50)` | YES | - | 품목이 속한 품목대분류 |
| 6 | **`ItemMediumClass`** | 품목중분류 | `varchar(50)` | YES | - | 품목이 속한 품목중분류 |
| 7 | **`ItemSmallClass`** | 품목소분류 | `varchar(50)` | YES | - | 품목이 속한 품목소분류 |
| 8 | **`ModelName`** | 모델명 | `varchar(100)` | YES | - | 제품의 모델명 |
| 9 | **`ItemSpecification`** | 품목사양 | `text` | YES | - | 품목의 사양 또는 규격 |
| 10 | **`ItemDetailSpecification`** | 품목상세사양 | `text` | YES | - | 품목의 상세사양 또는 상세규격 |
| 11 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 품목의 사용 여부 |
| 12 | **`CountryOfOrigin`** | 원산국가 | `varchar(50)` | YES | - | 품목의 원산 국가 |
| 13 | **`PlaceOfOrigin`** | 원산지역 | `varchar(100)` | YES | - | 품목의 원산 지역 |
| 14 | **`ItemUomCode`** | 기준단위코드 | `varchar(20)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 15 | **`Weight`** | 중량 | `numeric(15,3)` | YES | - | 포장까지 완료된 품목의 중량 |
| 16 | **`NetWeight`** | 순중량 | `numeric(15,3)` | YES | - | 품목의 순중량 |
| 17 | **`WeightUomCode`** | 중량단위코드 | `varchar(20)` | YES | - | 품목의 중량을 측정하는 단위의 코드 |
| 18 | **`Volume`** | 부피 | `numeric(15,3)` | YES | - | 품목의 부피 |
| 19 | **`VolumeUomCode`** | 부피단위코드 | `varchar(20)` | YES | - | 품목의 부피를 측정하는 단위의 코드 |
| 20 | **`Length`** | 길이 | `numeric(15,3)` | YES | - | 품목의 길이 |
| 21 | **`Width`** | 너비 | `numeric(15,3)` | YES | - | 품목의 너비 |
| 22 | **`Height`** | 높이 | `numeric(15,3)` | YES | - | 품목의 높이 |
| 23 | **`DimensionUomCode`** | 치수단위코드 | `varchar(20)` | YES | - | 품목의 길이/너비/높이를 측정하는 단위의 코드 |
| 24 | **`ValidEndDate`** | 유효종료일 | `date` | YES | - | 품목사용이 유효한 기한 |
| 25 | **`DrawingNumber`** | 도면번호 | `varchar(50)` | YES | - | 품목의 도면 식별번호 |
| 26 | **`LotControlIndicator`** | 로트사용여부 | `boolean` | YES | - | 품목의 로트 단위로 관리 여부 |
| 27 | **`PurchaseLeadTime`** | 구매리드타임 | `interval` | YES | - | 구매에 소요되는 총 소요일수 |
| 28 | **`ProductionLeadTime`** | 생산리드타임 | `interval` | YES | - | 생산에 소요되는 총 소요일수 |
| 29 | **`LotSize`** | 로트사이즈 | `numeric(15,3)` | YES | - | 품목의 물류 이동 단위 |
| 30 | **`MainCustomerId`** | 주요고객사식별자 | `varchar(50)` | YES | - | 품목과 연관된 주요 매출처 |
| 31 | **`MainVendorId`** | 주요공급사식별자 | `varchar(50)` | YES | - | 품목과 연관된 주요 매입처 |
| 32 | **`SafetyStock`** | 안전재고 | `numeric(15,3)` | YES | - | 예측 잘못이나 잦은 계획 변경에서 비롯된 문제점을 방지하기 위한 안전재고 |
| 33 | **`MaximumStockLevel`** | 최대재고수준 | `numeric(15,3)` | YES | - | 품목의 재고수량 상한치 |
| 34 | **`ReceiptWarehouseId`** | 입고창고식별자 | `varchar(50)` | YES | - | 품목의 기본 입고 창고(저장위치) |
| 35 | **`IssueWarehouseId`** | 출고창고식별자 | `varchar(50)` | YES | - | 품목의 기본 출고 창고(저장위치) |
| 36 | **`AbcClass`** | 에이비씨분류 | `varchar(1)` | YES | - | 품목의 재고관리를 위해 A/B/C의 세 종류로 분류 |
| 37 | **`ReplacementItemId`** | 대체품목식별자 | `varchar(50)` | YES | - | 품목 대신 사용할 수 있는 대체품목의 고유식별값 |
| 38 | **`IncomingInspectionIndicator`** | 수입검사여부 | `boolean` | YES | - | 구매품목을 입고하기 전 검사 여부 |
| 39 | **`FinalInspectionIndicator`** | 생산입고(최종)검사여부 | `boolean` | YES | - | 생산품목의 제조과정 중 마지막 공정까지 완료한 상태에서 창고에 입고 전 검사 여부 |
| 40 | **`OutgoingInspectionIndicator`** | 출하검사여부 | `boolean` | YES | - | 고객에게 제품 또는 상품이 출하(출고)되기 전 검사 여부 |
| 41 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 42 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 43 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 44 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 45 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 46 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 47 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 48 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.2 "BasePrice"
- **테이블 물리명:** `"BasePrice"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 기준가격 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 13개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 |
| 2 | **`CurrencyCode`** | 환종코드 | `varchar(50)` | NO | PRIMARY KEY | 환종코드(예: KRW/USD/JPY 등) |
| 3 | **`UnitPrice`** | 단가 | `numeric(15,3)` | YES | - | 단가(금액의 단위는 환종코드로 함) |
| 4 | **`PaymentTermsCode`** | 결제조건코드 | `varchar(50)` | YES | - | 구매거래처에 대한 대금결제조건 |
| 5 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 기준가격의 사용 여부 |
| 6 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 7 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 8 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 9 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 10 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.3 "Bom"
- **테이블 물리명:** `"Bom"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 자재명세서 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 22개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`BomId`** | 자재명세서를 식별하기 위한 고유값 | `varchar(50)` | NO | PRIMARY KEY | 자재명세서를 식별하기 위한 고유값 |
| 2 | **`BomType`** | 자재명세서유형 | `varchar(20)` | YES | - | 자재명세서의 유형 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 4 | **`BomQuantity`** | 품목기준수량 | `numeric(15,3)` | YES | - | 자재명세서를 구성하는 품목의 기준수량 |
| 5 | **`ItemUomCode`** | 기준단위코드 | `varchar(20)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 6 | **`ChildItemId`** | 자품목식별자 | `varchar(50)` | YES | - | 대상 품목을 생산하기 위해 투입되는 품목 |
| 7 | **`ChildItemUomCode`** | 자품목기준단위코드 | `varchar(20)` | YES | - | 대상 품목을 생산하기 위해 투입되는 품목의 기준단위 |
| 8 | **`ActualRequirementQuantity`** | 실소요수량 | `numeric(15,3)` | YES | - | 대상 품목을 생산하기 위해 투입되는 품목의 소요량 |
| 9 | **`BomRevisionNumber`** | 자재명세서버전 | `integer` | YES | - | 자재명세서의 버전 |
| 10 | **`ValidStartDatetime`** | 자재명세서 적용이 시작되는 일시 | `timestamp` | YES | - | 자재명세서 적용이 시작되는 일시 |
| 11 | **`ValidEndDatetime`** | 자재명세서 적용이 종료되는 일시 | `timestamp` | YES | - | 자재명세서 적용이 종료되는 일시 |
| 12 | **`RoutingId`** | 공정경로식별자 | `varchar(50)` | YES | - | 공정경로의 고유식별값 |
| 13 | **`OperationSequence`** | 공정순번 | `integer` | YES | - | 공정경로를 구성하는 공정의 순서 |
| 14 | **`BackFlushedIndicator`** | 백플러시여부 | `boolean` | YES | - | 생산 완료 시점에 모품목을 만들기 위해 소요되는 자품목의 생산투입 수량 일괄 처리 여부산국가 |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 16 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 18 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 19 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 20 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 21 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 22 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.4 "Routing"
- **테이블 물리명:** `"Routing"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공정경로 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 18개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`RoutingId`** | 공정경로식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정경로를 식별하기 위한 고유값 |
| 2 | **`RoutingName`** | 공정경로명 | `varchar(200)` | NO | - | 공정경로의 명칭 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 4 | **`OperationId`** | 공정식별자 | `varchar(50)` | YES | - | 공정을 식별하기 위한 고유값 |
| 5 | **`OperationSequence`** | 공정순번 | `integer` | YES | - | 공정경로를 구성하는 공정의 순서 |
| 6 | **`LastOperationIndicator`** | 최종공정여부 | `boolean` | YES | - | 공정경로상 마지막 공정 |
| 7 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 공정경로의 사용 여부 |
| 8 | **`SetupTime`** | 준비시간 | `interval` | YES | - | 공정의 작업 준비시간 |
| 9 | **`RunTime`** | 작업시간 | `interval` | YES | - | 공정의 작업 실행시간 |
| 10 | **`MoveTime`** | 이동시간 | `interval` | YES | - | 공정 작업 후 재공품이 다음 공정으로 이동하는 데 걸리는 시간 |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 12 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 14 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 15 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 16 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 17 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 18 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.5 "Operation"
- **테이블 물리명:** `"Operation"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공정 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`OperationId`** | 공정식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 2 | **`OperationName`** | 공정명 | `varchar(200)` | NO | - | 공정의 명칭 |
| 3 | **`OperationType`** | 공정유형 | `varchar(20)` | YES | - | 생산공정/외주공정/계측공정/검사공정 등 공정의 유형 |
| 4 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 공정의 사용 여부 |
| 5 | **`OperationLargeClass`** | 공정대분류 | `varchar(50)` | YES | - | 공정이 속한 공정대분류 |
| 6 | **`OperationMediumClass`** | 공정중분류 | `varchar(50)` | YES | - | 공정이 속한 공정중분류(공정대분류 하위에 속함) |
| 7 | **`OperationSmallClass`** | 공정소분류 | `varchar(50)` | YES | - | 공정이 속한 공정소분류(공정중분류 하위에 속함) |
| 8 | **`BackFlushedIndicator`** | 백플러시여부 | `boolean` | YES | - | 생산 완료 시점에 모품목을 만들기 위해 소요되는 자품목의 생산투입 수량 일괄 처리 여부 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.6 "OperationEquipment"
- **테이블 물리명:** `"OperationEquipment"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공정설비 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 12개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`OperationId`** | 공정식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 2 | **`OperationName`** | 공정명 | `varchar(200)` | YES | - | 공정의 명칭 |
| 3 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 4 | **`EquipmentName`** | 설비명 | `varchar(200)` | YES | - | 설비의 명칭 |
| 5 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 6 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 7 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 8 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 9 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 10 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 11 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 12 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.2.7 "EngineeringChangeOrder"
- **테이블 물리명:** `"EngineeringChangeOrder"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설계변경지시 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 19개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EngineeringChangeOrderId`** | 설계변경지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 설계변경지시를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 3 | **`ValidStartDate`** | 유효시작일 | `date` | YES | - | 설계변경지시의 유효시작일(KS X ISO 8601을 따른다) |
| 4 | **`ValidEndDate`** | 유효종료일 | `date` | YES | - | 설계변경지시의 유효종료일(KS X ISO 8601을 따른다) |
| 5 | **`ExpectedExecutionDate`** | 적용예정일 | `date` | YES | - | 설계변경의 적용이 예정된 일자(KS X ISO 8601을 따른다) |
| 6 | **`ExecutionDate`** | 적용이행일 | `date` | YES | - | 설계변경의 적용을 이행한 일자(KS X ISO 8601을 따른다) |
| 7 | **`BomType`** | 자재명세서유형 | `varchar(50)` | YES | - | 자재명세서의 유형 |
| 8 | **`BomRevisionNumber`** | 자재명세서버전 | `integer` | YES | - | 자재명세서의 버전 |
| 9 | **`ChildItemId`** | 설계변경지시 자품목을 의미 | `varchar(50)` | YES | - | 설계변경지시 자품목을 의미 |
| 10 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 11 | **`ActualRequirementQuantity`** | 실소요수량 | `numeric(15,3)` | YES | - | 대상 품목을 생산하기 위해 투입되는 품목의 소요량(예: EA/DZ/HD 등) |
| 12 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 13 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 14 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 15 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 16 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 17 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 18 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 19 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---


### 4.3 도메인 3: 프로젝트 및 수주/구매 관리 (Project, Sales & Purchase)
> 고객사 프로젝트 및 개발 마스터, 판매계획 및 수주오더, 구매요청 및 공급사 구매발주

#### 4.3.1 "ProjectMaster"
- **테이블 물리명:** `"ProjectMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 프로젝트마스터 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 29개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | - | 프로젝트를 식별하기 위한 고유값 |
| 2 | **`ProjectName`** | 프로젝트명 | `varchar(200)` | YES | - | 프로젝트의 명칭 |
| 3 | **`ProjectStatusCode`** | 프로젝트상태코드 | `varchar(50)` | YES | - | 프로젝트의 상태 |
| 4 | **`ResponsibleDepartmentId`** | 프로젝트담당부서식별자 | `varchar(50)` | YES | - | 프로젝트 담당 부서를 식별하기 위한 고유값 |
| 5 | **`PersonInChargeId`** | 프로젝트담당자식별자 | `varchar(50)` | YES | - | 프로젝트 담당자를 식별하기 위한 고유값 |
| 6 | **`ProjectContractDate`** | 프로젝트계약일 | `date` | YES | - | 프로젝트 계약일자(KS X ISO 8601을 따른다) |
| 7 | **`ExpectedStartDate`** | 시작예정일 | `date` | YES | - | 예상되는 프로젝트 시작일자(KS X ISO 8601을 따른다) |
| 8 | **`ExpectedEndDate`** | 종료예정일 | `date` | YES | - | 예상되는 프로젝트 종료일자(KS X ISO 8601을 따른다) |
| 9 | **`ActualStartDate`** | 실제시작일 | `date` | YES | - | 실제 프로젝트 시작일자(KS X ISO 8601을 따른다) |
| 10 | **`ActualEndDate`** | 실제종료일 | `date` | YES | - | 실제 프로젝트 종료일자(KS X ISO 8601을 따른다) |
| 11 | **`SalesDocumentNumber`** | 수주문서번호 | `varchar(50)` | YES | - | 수주문서번호 |
| 12 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 13 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 프로젝트의 사용 여부 |
| 14 | **`DivisionId`** | 사업부식별자 | `varchar(50)` | YES | - | 프로젝트 담당사업부 |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 16 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 18 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 19 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 20 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 21 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 22 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 23 | **`ProjectMasterSeq`** | 시스템PK | `integer` | NO | PRIMARY KEY | 시스템PK |
| 24 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |
| 25 | **`ProjectProcess`** | [UD]공정 | `varchar(50)` | YES | - | [UD]공정 |
| 26 | **`Client`** | [UD]발주사 | `varchar(50)` | YES | - | [UD]발주사 |
| 27 | **`ProjectType`** | [UD]유형 | `varchar(50)` | YES | - | [UD]유형 |
| 28 | **`ProcessExpectedStartDate`** | [UD]공정 예정 시작일 | `varchar(50)` | YES | - | [UD]공정 예정 시작일 |
| 29 | **`ProcessExpectedEndDate`** | [UD]공정 예정 종료일 | `varchar(50)` | YES | - | [UD]공정 예정 종료일 |

---

#### 4.3.2 "SalesPlan"
- **테이블 물리명:** `"SalesPlan"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 판매계획 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 14개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SalesPlanId`** | 판매계획식별자 | `varchar(50)` | NO | PRIMARY KEY | 판매계획을 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 3 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 4 | **`SalesProjection`** | 판매추정치 | `numeric(15,3)` | YES | - | 판매추정치 |
| 5 | **`ProjectionStartDate`** | 예측시작일 | `date` | YES | - | 판매추정치를 산정하기 위한 시작일(KS X ISO 8601을 따른다) |
| 6 | **`ProjectionEndDate`** | 예측종료일 | `date` | YES | - | 판매추정치를 산정하기 위한 종료일(KS X ISO 8601을 따른다) |
| 7 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 8 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 9 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 10 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 11 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.3.3 "SalesOrder"
- **테이블 물리명:** `"SalesOrder"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 수주오더 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 54개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SalesOrderId`** | 수주오더식별자 | `varchar(50)` | NO | - | 수주오더를 식별하기 위한 고유값 |
| 2 | **`SalesDocumentNumber`** | 수주문서번호 | `varchar(200)` | YES | - | 수주문서번호 |
| 3 | **`SalesDocumentSequence`** | 수주문서순번 | `integer` | YES | - | 수주문서순번 |
| 4 | **`SalesOrderType`** | 수주유형 | `varchar(50)` | YES | - | 수주유형을 의미 |
| 5 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | YES | - | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 6 | **`SalesDate`** | 수주일 | `date` | YES | - | 수주일(KS X ISO 8601을 따른다) |
| 7 | **`RequestedDeliveryDate`** | 요청납기일 | `date` | YES | - | 요청납기일(KS X ISO 8601을 따른다) |
| 8 | **`SalesStatus`** | 수주상태 | `varchar(50)` | YES | - | 수주상태 |
| 9 | **`ShipmentTermsCode`** | 출하조건코드 | `varchar(50)` | YES | - | 출하조건코드 |
| 10 | **`TransactionType`** | 거래유형 | `varchar(50)` | YES | - | 거래유형 |
| 11 | **`ReturnIndicator`** | 반품여부 | `boolean` | YES | - | 반품여부 |
| 12 | **`ExportIndicator`** | 수출여부 | `boolean` | YES | - | 수출여부 |
| 13 | **`SalesAutomaticApprovalIndicator`** | 수주자동승인여부 | `boolean` | YES | - | 수주자동승인여부 |
| 14 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 15 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 16 | **`ItemQuantity`** | 품목수량 | `numeric(15,3)` | YES | - | 품목수량(수량의 단위는 기준단위코드로 함) |
| 17 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 18 | **`SellingUomCode`** | 판매단위코드 | `varchar(50)` | YES | - | 판매단위코드 |
| 19 | **`ConversionUnitQuantity`** | 단위환산수량 | `numeric(15,3)` | YES | - | 단위환산수량(환산수량의 단위는 판매단위코드로 함) |
| 20 | **`ItemUnitQuantity`** | 기준수량 | `numeric(15,3)` | YES | - | 기준수량(수량의 단위는 기준단위코드로 함) |
| 21 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 생성자 아이디 |
| 22 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 23 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 24 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 25 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 26 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 27 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 28 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 29 | **`SalesOrderSeq`** | [UD]시스템PK | `integer` | NO | PRIMARY KEY | [UD]시스템PK |
| 30 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | YES | - | MPSI 프로젝트 ID 매핑 |
| 31 | **`ProjectName`** | 프로젝트명 | `varchar(200)` | YES | - | 프로젝트 및 차종명 |
| 32 | **`PurchasePersonnelId`** | 구매담당자식별자 | `varchar(50)` | YES | - | 구매/발주 담당자 식별자 |
| 33 | **`SalesRecipientId`** | 수주수령자식별자 | `varchar(50)` | YES | - | 수주 접수자 식별자 |
| 34 | **`CurrencyCode`** | 통화코드 | `varchar(50)` | YES | - | KRW, USD 등 통화 |
| 35 | **`CustomerPoNumber`** | 고객발주번호 | `varchar(100)` | YES | - | 원청 고객사 발주번호 (Customer PO) |
| 36 | **`CustomerManager`** | 고객담당자 | `varchar(100)` | YES | - | 고객사 담당자 성명 및 연락처 |
| 37 | **`PartNo`** | 부품번호 | `varchar(50)` | YES | - | 원청 부품 식별번호 (Part No) |
| 38 | **`Spec`** | 재질규격사양 | `varchar(200)` | YES | - | 수주 품목의 재질 및 사양 |
| 39 | **`UnitPriceWon`** | 수주단가 | `numeric(15,2)` | YES | - | 품목 개당 수주 단가 (@원) |
| 40 | **`SupplyAmountWon`** | 공급가액 | `numeric(15,2)` | YES | - | 수량 x 단가 공급가액 (원) |
| 41 | **`VatAmountWon`** | 부가세 | `numeric(15,2)` | YES | - | 공급가액의 10% 부가세 (원) |
| 42 | **`TotalAmountWon`** | 수주총액 | `numeric(15,2)` | YES | - | 공급가액 + 부가세 합계 (원) |
| 43 | **`Drawing2dFileName`** | 2D도면파일명 | `varchar(150)` | YES | - | 고객 2D 설계도면 파일명 (DWG/PDF) |
| 44 | **`Drawing2dFileUrl`** | 2D도면파일URL | `text` | YES | - | 고객 2D 설계도면 스토리지 다운로드 링크 |
| 45 | **`Drawing3dFileName`** | 3D도면파일명 | `varchar(150)` | YES | - | 고객 3D CAD 솔리드 모델 파일명 (STP/STEP/X_T) |
| 46 | **`Drawing3dFileUrl`** | 3D도면파일URL | `text` | YES | - | 고객 3D CAD 모델링 스토리지 링크 |
| 47 | **`SpecDocFileName`** | 기술사양서파일명 | `varchar(150)` | YES | - | 고객 기술사양서 및 RFQ 문서 파일명 |
| 48 | **`SpecDocFileUrl`** | 기술사양서파일URL | `text` | YES | - | 고객 기술사양서 및 RFQ 스토리지 링크 |
| 49 | **`CadRevision`** | 도면리비전 | `varchar(50)` | YES | - | 고객 도면 리비전 (Rev.0, Rev.1 등) |
| 50 | **`DrawingReceivedDate`** | 도면접수일자 | `date` | YES | - | 원청 도면 및 사양서 최종 접수일자 |
| 51 | **`PaymentTerms`** | 결제조건 | `varchar(100)` | YES | - | 마감 후 익월 25일 현금 등 결제 조건 |
| 52 | **`Incoterms`** | 인도조건 | `varchar(50)` | YES | - | EXW 공장도, DAP 도착도 등 무역인도조건 |
| 53 | **`DeliveryPlace`** | 납품장소 | `varchar(200)` | YES | - | 고객사 하차 장소 및 공장 라인 |
| 54 | **`SalesManagerName`** | 영업담당자성명 | `varchar(100)` | YES | - | MPSI 영업/수주 담당자 성명 |

---

#### 4.3.4 "PurchaseRequisition"
- **테이블 물리명:** `"PurchaseRequisition"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 구매요청 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 21개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PurchaseRequisitionId`** | 구매요청식별자 | `varchar(50)` | NO | PRIMARY KEY | 구매요청을 식별하기 위한 고유값 |
| 2 | **`PurchaseRequisitionRevisionNumber`** | 구매요청버전 | `integer` | YES | - | 구매요청버전 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 4 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 5 | **`DemandQuantity`** | 구매요청수량 | `numeric(15,3)` | YES | - | 구매요청수량(수량의 단위는 기준단위코드로 함) |
| 6 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 7 | **`PurchaseRequisitionUnitPrice`** | 구매요청단가 | `numeric(15,3)` | YES | - | 구매요청단가(단가의 단위는 환종코드로 함) |
| 8 | **`CurrencyCode`** | 환종코드 | `varchar(50)` | YES | - | 환종코드(예: KRW/USD/JPY 등) |
| 9 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 10 | **`VendorName`** | 공급사명 | `varchar(200)` | YES | - | 공급사의 명칭 |
| 11 | **`RequestedDeliveryDate`** | 요청납기일 | `date` | YES | - | 요청납기일(KS X ISO 8601을 따른다) |
| 12 | **`RequesterDepartmentId`** | 구매요청부서 | `varchar(50)` | YES | - | 구매요청부서 |
| 13 | **`PersonnelSeq`** | 구매요청자식별자 | `varchar(50)` | YES | - | 구매요청자식별자 |
| 14 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 15 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 16 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 17 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 18 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 19 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 20 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 21 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.3.5 "PurchaseOrder"
- **테이블 물리명:** `"PurchaseOrder"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 구매발주 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 49개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PurchaseOrderId`** | 구매발주식별자 | `varchar(50)` | YES | - | 구매발주를 식별하기 위한 고유값 |
| 2 | **`PurchaseDocumentNumber`** | 구매문서번호 | `varchar(200)` | YES | - | 구매문서번호 |
| 3 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 4 | **`PaymentTermsCode`** | 결제조건코드 | `varchar(50)` | YES | - | 구매거래처에 대한 대금결제 조건 |
| 5 | **`PurchaseGroupCode`** | 구매그룹코드 | `varchar(50)` | YES | - | 구매그룹코드 |
| 6 | **`CurrencyCode`** | 환종코드 | `varchar(50)` | YES | - | 환종코드(예: KRW/USD/JPY 등) |
| 7 | **`ExchangeRate`** | 환율 | `numeric(15,3)` | YES | - | 환율 |
| 8 | **`PurchaseApprovalDate`** | 승인일 | `date` | YES | - | 구매요청에 대한 구매승인일(KS X ISO 8601을 따른다) |
| 9 | **`PurchaseOrderDate`** | 구매발주일 | `date` | YES | - | 구매발주일(KS X ISO 8601을 따른다) |
| 10 | **`PurchaseOrderTypeCode`** | 발주유형코드 | `varchar(50)` | YES | - | 구매유형/구매형태/성격 등을 관리 |
| 11 | **`PurchaseTransactionType`** | 거래유형 | `varchar(50)` | YES | - | 거래유형 |
| 12 | **`PurchaseOrderStartDate`** | 시작일 | `date` | YES | - | 구매발주에 대한 실 구매시작일(KS X ISO 8601을 따른다) |
| 13 | **`PurchaseOrderValidDate`** | 유효일 | `date` | YES | - | 구매발주 유효일(KS X ISO 8601을 따른다) |
| 14 | **`PersonnelId`** | 사원식별자 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값 구매 및 발주 담당자의 식별정보 |
| 15 | **`PurchaseOrderClosingIndicator`** | 발주마감여부 | `boolean` | YES | - | 발주마감여부 |
| 16 | **`PurchaseOrderClosingDate`** | 발주마감일 | `date` | YES | - | 발주마감일(KS X ISO 8601을 따른다) |
| 17 | **`PurchaseDocumentSequence`** | 구매문서순번 | `integer` | YES | - | 구매문서순번 |
| 18 | **`ItemPurchaseType`** | 구매라인유형 | `varchar(50)` | YES | - | 구매라인유형/품목별 구매유형을 관리 |
| 19 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/반제품/상품/원자재/부자재/저장품/소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 20 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 21 | **`PurchaseOrderLineStatusCode`** | 발주라인상태코드 | `varchar(50)` | YES | - | 발주라인상태코드 |
| 22 | **`TaxCode`** | 세무코드 | `varchar(50)` | YES | - | 세무코드 |
| 23 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 24 | **`PurchaseOrderUomCode`** | 발주단위코드 | `varchar(50)` | YES | - | 발주단위코드 |
| 25 | **`ConversionUnitQuantity`** | 단위환산수량 | `numeric(15,3)` | YES | - | 단위환산수량/구매발주에서 사용된 단위를 기준단위로 환산한 수량을 관리 |
| 26 | **`ItemUnitQuantity`** | 기준수량 | `numeric(15,3)` | YES | - | 기준수량(수량의 단위는 기준단위코드로 함) |
| 27 | **`PurchaseOrderQuantity`** | 구매발주수량 | `numeric(15,3)` | YES | - | 구매발주수량(수량의 단위는 기준단위코드로 함) |
| 28 | **`PurchaseGoodsReceiptQuantity`** | 구매입고수량 | `numeric(15,3)` | YES | - | 구매입고수량(수량의 단위는 기준단위코드로 함) |
| 29 | **`PurchaseTransactionUnitPrice`** | 구매거래단가 | `numeric(15,3)` | YES | - | 구매거래단가(금액의 단위는 환종코드로 함) |
| 30 | **`PurchaseTransactionPrice`** | 구매거래금액 | `numeric(15,3)` | YES | - | 구매거래금액(금액의 단위는 환종코드로 함) |
| 31 | **`PurchaseOrderUnitPrice`** | 발주단가 | `numeric(15,3)` | YES | - | 발주단가(금액의 단위는 환종코드로 함) |
| 32 | **`PurchaseOrderPrice`** | 발주금액 | `numeric(15,3)` | YES | - | 발주금액(금액의 단위는 환종코드로 함) |
| 33 | **`VatPrice`** | 부가세금액 | `numeric(15,3)` | YES | - | 부가세금액(금액의 단위는 환종코드로 함) |
| 34 | **`ExpectedDeliveryDate`** | 납기예정일 | `date` | YES | - | 납기예정일(KS X ISO 8601을 따른다) |
| 35 | **`IncomingQualityControlIndicator`** | 수입검사여부 | `boolean` | YES | - | 수입검사여부 |
| 36 | **`AccountCode`** | 계정코드 | `varchar(50)` | YES | - | 계정코드 |
| 37 | **`VatTransactionUnitPrice`** | 부가세포함거래단가 | `numeric(15,3)` | YES | - | 부가세포함거래단가(금액의 단위는 환종코드로 함) |
| 38 | **`VatTransactionPrice`** | 부가세포함거래금액 | `numeric(15,3)` | YES | - | 부가세포함거래금액(금액의 단위는 환종코드로 함) |
| 39 | **`VatCarryingAmount`** | 부가세포함장부금액 | `numeric(15,3)` | YES | - | 부가세포함장부금액(금액의 단위는 환종코드로 함) |
| 40 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 생성자 아이디 |
| 41 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 42 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 43 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 44 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 45 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 46 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 47 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 48 | **`PurchaseOrderSeq`** | [UD]구매발주 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]구매발주 시스템 PK |
| 49 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |

---


### 4.4 도메인 4: 생산 계획, 공정 실적 및 설비 관리 (Production & Execution)
> 생산계획, 작업지시(생산지시), 착공/완공, 실적투입(자재/인력/설비/품질), 사출 설비 파라미터 및 가동상태 이력

#### 4.4.1 "ProductionPlanning"
- **테이블 물리명:** `"ProductionPlanning"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산계획(ProductionPlanning) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 13개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPlanId`** | 생산계획식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산계획을 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값&lt;br&gt;제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 3 | **`ProductionPlanQuantity`** | 생산계획수량 | `integer` | YES | - | 생산품목의 생산계획수량 |
| 4 | **`ScheduleStartDateTime`** | 생산계획시작일시 | `timestamp` | YES | - | 생산계획상의 예상 생산시작일(KS X ISO 8601을 따름) |
| 5 | **`ScheduleEndDateTime`** | 생산계획종료일시 | `timestamp` | YES | - | 생산계획상의 예상 생산종료일(KS X ISO 8601을 따름) |
| 6 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 7 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 8 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 9 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 10 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.2 "ProductionOrder"
- **테이블 물리명:** `"ProductionOrder"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산지시(ProductionOrder) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 21개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산지시를 식별하기 위한 고유값 |
| 2 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값/ 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 4 | **`LineId`** | 라인식별자 | `varchar(50)` | YES | - | 라인을 식별하기 위한 고유값 |
| 5 | **`RoutingId`** | 공정경로식별자 | `varchar(50)` | YES | - | 공정경로를 식별하기 위한 고유값 |
| 6 | **`BomId`** | 자재명세서를 식별하기 위한 고유값 | `varchar(50)` | YES | - | 자재명세서를 식별하기 위한 고유값 |
| 7 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 8 | **`ProductionOrderQuantity`** | 생산지시수량 | `integer` | YES | - | 생산지시에 따라 생산할 품목의 수량(수량의 단위는 기준단위코드로 함) |
| 9 | **`ProductionDueDateTime`** | 생산종료일시 | `timestamp` | YES | - | 생산지시에 따라 계획한 작업의 생산종료일(KS X ISO 8601을 따른다) |
| 10 | **`ScheduleStartDateTime`** | 생산계획시작일시 | `timestamp` | YES | - | 생산계획상의 예상 생산시작일(KS X ISO 8601을 따른다) |
| 11 | **`ScheduleEndDateTime`** | 생산계획종료일시 | `timestamp` | YES | - | 생산계획상의 예상 생산종료일(KS X ISO 8601을 따른다) |
| 12 | **`SalesDocumentNumber`** | 수주문서번호 | `varchar(200)` | YES | - | 수주문서번호 |
| 13 | **`SalesDocumentSequence`** | 수주문서순번 | `integer` | YES | - | 수주문서순번 |
| 14 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 15 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 16 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 17 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 18 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 19 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 20 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 21 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.3 "OperationStart"
- **테이블 물리명:** `"OperationStart"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 착공(OperaionStart) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`LotId`** | 로트를 식별하기 위한 고유값 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 2 | **`LotName`** | 로트의 명칭 | `varchar(200)` | YES | - | 로트의 명칭 |
| 3 | **`LotDescription`** | 로트 설명 정보 | `text` | YES | - | 로트 설명 정보 |
| 4 | **`LotCreatedQuantity`** | 처음 생성 시 로트 수량 | `numeric(15,3)` | YES | - | 처음 생성 시 로트 수량 |
| 5 | **`OperationId`** | 공정을 식별하기 위한 고유값 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 6 | **`EquipmentId`** | 설비를 식별하기 위한 고유값 | `varchar(50)` | YES | - | 설비를 식별하기 위한 고유값 |
| 7 | **`OperationStartTime`** | 로트를 생산하기 위한 공정 투입 시간 | `timestamp` | YES | - | 로트를 생산하기 위한 공정 투입 시간 |
| 8 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값해당 공정에서 로트를 생산하는 작업자의 식별정보 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값해당 공정에서 로트를 생산하는 작업자의 식별정보 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.4 "OperationEnd"
- **테이블 물리명:** `"OperationEnd"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 완공(OperationEnd) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 19개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 2 | **`LotName`** | 로트명 | `varchar(200)` | YES | - | 로트의 명칭 |
| 3 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 4 | **`LotCreatedQuantity`** | 로트수량 | `numeric(15,3)` | YES | - | 처음 생성시 로트 수량 |
| 5 | **`OperationId`** | 공정식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 6 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | YES | - | 설비를 식별하기 위한 고유값 |
| 7 | **`OperationEndTime`** | 완공시간 | `timestamp` | YES | - | 로트를 생산한 공정 완료 시간 |
| 8 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값해당 공정에서 로트 생산을 완료하는 작업자의 식별정보 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값해당 공정에서 로트 생산을 완료하는 작업자의 식별정보 |
| 9 | **`ProducedQuantity`** | 생산수량 | `numeric(15,3)` | YES | - | 해당 공정에서 생산된 로트의 전체 수량 |
| 10 | **`DefectQuantity`** | 불량수량 | `numeric(15,3)` | YES | - | 해당 공정에서 생산된 로트의 전체 수량 중 불량수량 |
| 11 | **`ReworkCount`** | 재작업횟수 | `integer` | YES | - | 해당 공정의 재작업 횟수 |
| 12 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 13 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 14 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 15 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 16 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 17 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 18 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 19 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.5 "ProductionPerformance"
- **테이블 물리명:** `"ProductionPerformance"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산실적(ProductionPerformance) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 23개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPerformanceId`** | 생산실적식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적을 식별하기 위한 고유값 |
| 2 | **`ProductionPerformanceSequence`** | 생산실적순번 | `integer` | YES | - | 생산실적이 발생한 순서 |
| 3 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값 (생산실적을 생성한 생산지시의 ID를 입력) |
| 4 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서 (생산실적을 생성한 생산지시의 순번을 입력) |
| 5 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 6 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 7 | **`ProducedQuantity`** | 생산수량 | `integer` | YES | - | 생산된 품목의 전체 수량(수량의 단위는 기준단위코드로 함) |
| 8 | **`DefectQuantity`** | 불량수량 | `integer` | YES | - | 생산된 품목의 전체 수량 중 불량수량(수량의 단위는 기준단위코드로 함) |
| 9 | **`ReworkQuantity`** | 재작업수량 | `integer` | YES | - | 불량수량 중 재작업을 수행한 수량 |
| 10 | **`OperationId`** | 공정식별자 | `varchar(50)` | YES | - | 공정을 식별하기 위한 고유값 |
| 11 | **`OperationSequence`** | 공정순번 | `integer` | YES | - | 공정경로를 구성하는 공정의 순서 |
| 12 | **`PersonnelSeq`** | 생산실적을 취합 관리하는 담당자의 식별정보 | `varchar(50)` | YES | - | 생산실적을 취합 관리하는 담당자의 식별정보 |
| 13 | **`ProductionPerformanceDate`** | 생산실적일자 | `date` | YES | - | 생산실적이 발생한 일자 |
| 14 | **`ExecutionStartDateTime`** | 생산시작일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 시작된 실제 생산시작일(KS X ISO 8601을 따른다) |
| 15 | **`ExecutionEndDateTime`** | 생산종료일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 끝난 실제 생산종료일(KS X ISO 8601을 따른다) |
| 16 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 17 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 18 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 19 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 20 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 21 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 22 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 23 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.6 "ProductionPerformanceEquipment"
- **테이블 물리명:** `"ProductionPerformanceEquipment"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설비활용실적(ProductionPerformanceEquipment) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 26개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPerformanceId`** | 생산실적식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적을 식별하기 위한 고유값 |
| 2 | **`ProductionPerformanceSequence`** | 생산실적순번 | `integer` | YES | - | 생산실적이 발생한 순서 |
| 3 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값 (생산실적을 생성한 생산지시의 ID를 입력) |
| 4 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서 (생산실적을 생성한 생산지시의 순번을 입력) |
| 5 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 6 | **`ProducedQuantity`** | 생산수량 | `integer` | YES | - | 생산된 품목의 전체 수량(수량의 단위는 기준단위코드로 함) |
| 7 | **`DefectQuantity`** | 불량수량 | `integer` | YES | - | 생산된 품목의 전체 수량 중 불량수량(수량의 단위는 기준단위코드로 함) |
| 8 | **`OperationId`** | 공정식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 9 | **`OperationSequence`** | 공정순번 | `integer` | YES | - | 공정경로를 구성하는 공정의 순서 |
| 10 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값 설비를 활용한 작업자의 식별정보 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값 설비를 활용한 작업자의 식별정보 |
| 11 | **`ExecutionStartDateTime`** | 생산시작일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 시작된 실제 생산시작일(KS X ISO 8601을 따른다) |
| 12 | **`ExecutionEndDateTime`** | 생산종료일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 끝난 실제 생산종료일(KS X ISO 8601을 따른다) |
| 13 | **`CancelIndicator`** | 취소여부 | `boolean` | YES | - | 생산실적 무효화 여부 |
| 14 | **`CancelDateTime`** | 취소일시 | `timestamp` | YES | - | 생산실적을 무효화할 경우 무효화한 일자(KS X ISO 8601을 따른다) |
| 15 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 16 | **`SetupTime`** | 준비시간 | `interval` | YES | - | 생산설비의 준비시간 |
| 17 | **`RunTime`** | 가동시간 | `interval` | YES | - | 생산설비의 가동시간 |
| 18 | **`InspectionFinishedIndicator`** | 공정검사여부 | `boolean` | YES | - | 생산실적이 발생한 공정의 검사완료 여부 |
| 19 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 20 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 21 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 22 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 23 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 24 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 25 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 26 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.7 "ProductionPerformanceItem"
- **테이블 물리명:** `"ProductionPerformanceItem"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산실적투입품목(ProductionPerformanceItem) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 23개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPerformanceId`** | 생산실적식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적을 식별하기 위한 고유값 |
| 2 | **`ProductionPerformanceSequence`** | 생산실적순번 | `integer` | YES | - | 생산실적이 발생한 순서 |
| 3 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값 (생산실적을 생성한 생산지시의 ID를 입력) |
| 4 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서 (생산실적을 생성한 생산지시의 순번을 입력) |
| 5 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 / 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 6 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 7 | **`LineId`** | 라인식별자 | `varchar(50)` | YES | - | 라인을 식별하기 위한 고유값 |
| 8 | **`OperationId`** | 공정식별자 | `varchar(50)` | YES | - | 공정을 식별하기 위한 고유값 |
| 9 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적에 포함된 로트의 고유식별값 |
| 10 | **`ReplacementChildItemId`** | 대체자재식별자 | `varchar(50)` | YES | - | 품목의 품질 등의 사유로 생산에 투입될 수 없을 때 대체할 수 있는 품목 |
| 11 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 12 | **`WarehouseSection`** | 창고섹션 | `varchar(50)` | YES | - | 창고 내 저장 셀셀(창고 하위 개념) |
| 13 | **`RequiredQuantity`** | 소요수량 | `integer` | YES | - | 투입된 품목의 소요수량(수량의 단위는 기준단위코드로 함) 소요수량은 생산지시에 의해 설정된 계획수량 개념을 의미함 |
| 14 | **`IssuedQuantity`** | 출고수량 | `integer` | YES | - | 출고수량(수량의 단위는 기준단위코드로 함) |
| 15 | **`IssuedIndicator`** | 출고완료여부 | `boolean` | YES | - | 투입된 품목의 실제 수량이 모두 투입되었는지 여부 |
| 16 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 17 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 18 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 19 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 20 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 21 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 22 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 23 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.8 "ProductionPerformancePersonnel"
- **테이블 물리명:** `"ProductionPerformancePersonnel"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산실적투입인력(ProductionPerformancePersonnel) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 20개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPerformanceId`** | 생산실적식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적을 식별하기 위한 고유값 |
| 2 | **`ProductionPerformanceSequence`** | 생산실적순번 | `integer` | YES | - | 생산실적이 발생한 순서 |
| 3 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값(생산실적을 생성한 생산지시의 ID를 입력) |
| 4 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서(생산실적을 생성한 생산지시의 순번을 입력) |
| 5 | **`OperationId`** | 공정식별자 | `varchar(50)` | NO | PRIMARY KEY | 공정을 식별하기 위한 고유값 |
| 6 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값 생산실적투입인력을 취합/ 관리하는 담당자의 식별정보 | `varchar(50)` | NO | PRIMARY KEY | 인사조직 내 사원을 식별하기 위한 고유값 생산실적투입인력을 취합/ 관리하는 담당자의 식별정보 |
| 7 | **`ExecutionStartDateTime`** | 생산시작일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 시작된 실제 생산시작일(KS X ISO 8601을 따른다) |
| 8 | **`ExecutionEndDateTime`** | 생산종료일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 끝난 실제 생산종료일(KS X ISO 8601을 따른다) |
| 9 | **`TaskGroupCode`** | 근무조코드 | `varchar(50)` | YES | - | 작업자가 속한 근무조 |
| 10 | **`ActualLaborDateTime`** | 투입일시 | `timestamp` | YES | - | 작업자가 작업에 투입된 일자(KS X ISO 8601을 따른다) |
| 11 | **`ActualLaborTime`** | 투입시간 | `interval` | YES | - | 작업자가 투입된 시간 |
| 12 | **`ActualLaborTimeUomCode`** | 투입시간단위코드 | `varchar(50)` | YES | - | 작업자가 투입된 시간의 단위 |
| 13 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 14 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 15 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 16 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 17 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 18 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 19 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 20 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.9 "ProductionPerformanceQuality"
- **테이블 물리명:** `"ProductionPerformanceQuality"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 생산품질실적(ProductionPerformanceQuality) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 23개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductionPerformanceId`** | 생산실적식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적을 식별하기 위한 고유값 |
| 2 | **`ProductionPerformanceSequence`** | 생산실적순번 | `integer` | YES | - | 생산실적이 발생한 순서 |
| 3 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값 (생산실적을 생성한 생산지시의 ID를 입력) |
| 4 | **`ProductionOrderSequence`** | 생산지시순번 | `integer` | YES | - | 생산지시식별자 내 순서 (생산실적을 생성한 생산지시의 순번을 입력) |
| 5 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 6 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 7 | **`OperationId`** | 공정식별자 | `varchar(50)` | YES | - | 공정을 식별하기 위한 고유값 |
| 8 | **`OperationSequence`** | 공정순번 | `integer` | YES | - | 공정 경로를 구성하는 공정의 순서 |
| 9 | **`ExecutionStartDateTime`** | 생산시작일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 시작된 실제 생산시작일(KS X ISO 8601을 따른다) |
| 10 | **`ExecutionEndDateTime`** | 생산종료일시 | `timestamp` | YES | - | 생산지시에 따라 작업이 끝난 실제 생산종료일(KS X ISO 8601을 따른다) |
| 11 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 생산실적에 포함된 로트의 고유식별값 |
| 12 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 생산실적에 포함된 배치의 고유식별값 |
| 13 | **`DefectTypeQuantity`** | 불량유형별수량 | `integer` | YES | - | 불량유형별 수량(수량의 단위는 기준단위 코드로 함) |
| 14 | **`DefectTypeCode`** | 불량유형코드 | `varchar(50)` | NO | PRIMARY KEY | 불량의 유형을 나타내는 코드값 공통코드에 등록하여 관리하며 회사 기준 분류체계에 의해 정해짐 |
| 15 | **`DefectTypeDetailCode`** | 불량유형상세코드 | `varchar(50)` | YES | - | 불량의 상세한 유형을 나타내는 코드값 불량내역코드는 공통코드에 등록하여 관리하며 회사 기준 분류체계에 의해 정해짐(불량유형 하위에 속함) |
| 16 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 17 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 18 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 19 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 20 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 21 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 22 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 23 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.10 "Equipment"
- **테이블 물리명:** `"Equipment"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설비 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 27개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 2 | **`EquipmentName`** | 설비명 | `varchar(200)` | NO | - | 설비의 명칭 |
| 3 | **`ParentEquipmentId`** | 상위설비식별자 | `varchar(50)` | YES | - | 해당 설비의 상위설비 |
| 4 | **`EquipmentType`** | 설비유형 | `varchar(20)` | YES | - | 설비의 유형 |
| 5 | **`EquipmentLargeClass`** | 설비대분류 | `varchar(50)` | YES | - | 설비가 속한 설비대분류 |
| 6 | **`EquipmentMediumClass`** | 설비중분류 | `varchar(50)` | YES | - | 설비가 속한 설비중분류(설비대분류 하위에 속함) |
| 7 | **`EquipmentSmallClass`** | 설비소분류 | `varchar(50)` | YES | - | 설비가 속한 설비소분류(설비중분류 하위에 속함) |
| 8 | **`DepartmentInChargeId`** | 관리부서식별자 | `varchar(50)` | YES | - | 설비를 관리하는 부서 |
| 9 | **`PersonnelSeq`** | 설비를 관리하는 인력 | `varchar(50)` | YES | - | 설비를 관리하는 인력 |
| 10 | **`OperationId`** | 공정식별자 | `varchar(50)` | YES | - | 공정을 식별하기 위한 고유값 |
| 11 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 설비의 사용 여부 |
| 12 | **`DaqDevice`** | 데이터수집장치 | `varchar(100)` | YES | - | 설비에서 데이터를 수집하는 장치의 고유번호 |
| 13 | **`FixedAssetId`** | 고정자산식별자 | `varchar(50)` | YES | - | 설비의 회계적 자산으로서의 고유번호 |
| 14 | **`ModelNumber`** | 모델번호 | `varchar(100)` | YES | - | 설비의 모델번호 |
| 15 | **`SerialNumber`** | 일련번호 | `varchar(100)` | YES | - | 설비의 일련번호 |
| 16 | **`CountryOfOrigin`** | 제조국가 | `varchar(50)` | YES | - | 설비의 제조국가 |
| 17 | **`Manufacturer`** | 제조업체 | `varchar(200)` | YES | - | 설비의 제조업체 |
| 18 | **`AcquisitionDate`** | 취득일 | `date` | YES | - | 설비 실물을 취득한 일자(KS X ISO 8601을 따른다) |
| 19 | **`Location`** | 위치 | `varchar(200)` | YES | - | 설비가 배치되어 있는 장소 |
| 20 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 21 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 22 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 23 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 24 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 25 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 26 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 27 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.11 "EquipmentParameter"
- **테이블 물리명:** `"EquipmentParameter"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설비파라미터(EquipmentParameter) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 18개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ParameterId`** | 파라미터식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비에서 수집하는 파라미터 식별을 위한 고유값 |
| 2 | **`ParameterName`** | 파라미터명 | `varchar(200)` | YES | - | 설비에서 수집하는 파라미터의 명징 |
| 3 | **`ParameterType`** | 파라미터유형 | `varchar(50)` | YES | - | 설비에서 수집하는 파라미터의 유형 |
| 4 | **`ParameterGrade`** | 파라미터등급 | `varchar(50)` | YES | - | 파라미터의 중요도와 위험성에 따라 분류된 등급 |
| 5 | **`ParameterUomCode`** | 파라미터단위코드 | `varchar(50)` | YES | - | 설비에서 수집하는 파라미터 데이터의 단위(℃/ mV/ RH/ PCT 등) |
| 6 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | YES | - | 설비를 식별하기 위한 고유값 |
| 7 | **`Lsl`** | 규격하한 | `numeric(15,3)` | YES | - | 설비에서 수집하는 파라미터의 허용하한치 |
| 8 | **`Usl`** | 규격상한 | `numeric(15,3)` | YES | - | 설비에서 수집하는 파라미터의 허용상한치 |
| 9 | **`PeriodicDataCollectionIndicator`** | 주기적수집여부 | `boolean` | YES | - | 파라미터의 주기적 수집 여부 |
| 10 | **`DataCollectionPeriod`** | 수집주기 | `interval` | YES | - | 파라미터 데이터의 수집주기(주기적 수집여부의 값이 주기적일 때만 값을 가짐) |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 12 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 14 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 15 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 16 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 17 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 18 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.4.12 "EquipmentState"
- **테이블 물리명:** `"EquipmentState"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설비의 상태 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 17개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 2 | **`EquipmentState`** | 설비상태 | `varchar(20)` | YES | - | 설비 상태 값(예: Run, Idle, Down) |
| 3 | **`EquipmentControlMode`** | 설비제어모드 | `varchar(20)` | YES | - | 설비 제어모드 값(예: Online, Local, Offline) |
| 4 | **`EquipmentOperationMode`** | 설비운영모드 | `varchar(20)` | YES | - | 설비 운영모드 값(예: Full-Auto, Semi-Auto, Manual) |
| 5 | **`ProcessedLotQuantity`** | 진행로트수량 | `double precision` | YES | - | 생산이 진행된 로트 수량 |
| 6 | **`LastProcessedLotId`** | 최종진행로트식별자 | `varchar(50)` | YES | - | 마지막 진행된 로트를 식별하기 위한 고유값 |
| 7 | **`LastProcessedOperationId`** | 최종진행공정식별자 | `varchar(50)` | YES | - | 마지막 진행된 공정을 식별하기 위한 고유값 |
| 8 | **`ErrorCode`** | 오류코드 | `varchar(50)` | YES | - | 알람 발생 시 해당 오류코드 값 |
| 9 | **`ErrorMessage`** | 오류메시지 | `text` | YES | - | 알람 발생 시 오류 설명 정보 |
| 10 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | - |
| 11 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | - |
| 12 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 13 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | - |
| 14 | **`CreationDateTime`** | - | `timestamp` | YES | - | - |
| 15 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | - |
| 16 | **`ModificationDateTime`** | - | `timestamp` | YES | - | - |
| 17 | **`Note`** | 비고 | `text` | YES | - | - |

---

#### 4.4.13 "TraceParameter"
- **테이블 물리명:** `"TraceParameter"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설비파라미터이력(TraceParameter) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 14개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 2 | **`ParameterId`** | 파라미터식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비에서 수집하는 파라미터 식별을 위한 고유값 |
| 3 | **`EventDateTime`** | 이벤트발생시간 | `timestamp` | NO | PRIMARY KEY | 설비에서 파라미터 수집된 일시(KS X ISO 8601을 따른다) |
| 4 | **`ParameterUomCode`** | 파라미터단위코드 | `varchar(50)` | YES | - | 설비에서 수집하는 파라미터 데이터의 단위(℃/ mV/ RH/ PCT 등) |
| 5 | **`ParameterValue`** | 파라미터값 | `numeric(15,3)` | YES | - | 이벤트가 발생하여 수집된 파라미터 데이터의 값(파라미터값의 단위는 파라미터단위코드로 함) |
| 6 | **`ValidationResultCode`** | 검증결과코드 | `varchar(50)` | YES | - | 수집된 파라미터 데이터가 정상범위 안에 들어가는지/ 아니면 허용상한치를 초과하거나 허용하한치에 미달하는지를 의미 |
| 7 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 8 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 9 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 10 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 11 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---


### 4.5 도메인 5: 재고, 자재/완제품 물류 및 출하 관리 (Inventory & Logistics)
> 원자재 입고 및 불출, 재고 및 가용재고, 재고실사/이동, 완제품 입고/포장/출고의뢰/출하, 로트(Lot) 및 운송 추적

#### 4.5.1 "Inventory"
- **테이블 물리명:** `"Inventory"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 재고(Inventory) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 12개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | NO | PRIMARY KEY | 창고를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값/ 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 3 | **`InventoryQuantity`** | 현재고수량 | `numeric(15,3)` | YES | - | 전산시스템 상에 조회되는 현재 재고수량(수량의 단위는 기준단위코드로 함) |
| 4 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 5 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 6 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 7 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 8 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 9 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 10 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 11 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 12 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.2 "AvailableInventory"
- **테이블 물리명:** `"AvailableInventory"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 가용재고(AvailableInventory) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`AvailableInventoryId`** | 가용재고식별자 | `varchar(50)` | NO | PRIMARY KEY | 가용재고를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 3 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 4 | **`AvailableInventoryQuantity`** | 가용재고량 | `numeric(15,3)` | YES | - | 가용재고량(재고량의 단위는 기준단위코드로 함) |
| 5 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 6 | **`DemandPriority`** | 요청우선순위 | `numeric(15,3)` | YES | - | 요청우선순위 |
| 7 | **`PriorDemandQuantity`** | 요청우선수량 | `numeric(15,3)` | YES | - | 요청우선수량(수량의 단위는 기준단위코드로 함) |
| 8 | **`DeliveryDate`** | 납기일 | `date` | YES | - | 납기일(KS X ISO 8601을 따른다) |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.3 "StockerInventory"
- **테이블 물리명:** `"StockerInventory"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 저장소재공정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`StockerId`** | 저장소식별자 | `varchar(50)` | NO | PRIMARY KEY | 해당 장비와 공정의 물류를 적재하는 저장소를 식별하기 위한 고유값 |
| 2 | **`ZoneId`** | 구역식별자 | `varchar(50)` | YES | - | 저장소가 위치한 영역을 식별하기 위한 고유값 |
| 3 | **`FullCapacity`** | 최대용량 | `integer` | YES | - | 저장소에 로트를 최대 적재할 수 있는 수량 |
| 4 | **`CurrentCapacity`** | 현재용량 | `integer` | YES | - | 현재 저장소에 적재되어 있는 로트 수량 |
| 5 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 로트를 식별하기 위한 고유값 |
| 6 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 7 | **`AlternateStockerId`** | 대체저장소식별자 | `varchar(50)` | YES | - | 지정된 저장소가 만재되었을 때 대체할 수 있는 저장소를 식별하기 위한 고유값 |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.4 "InventoryCount"
- **테이블 물리명:** `"InventoryCount"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 재고실사(InventoryCount) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`InventoryCountDocumentNumber`** | 수불문서번호 | `varchar(200)` | NO | PRIMARY KEY | 재고실사 문서번호 |
| 2 | **`InventoryCountDateTime`** | 재고실사일시 | `timestamp` | YES | - | 재고실사 일시 |
| 3 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 4 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 |
| 5 | **`InventoryQuantity`** | 현재고수량 | `numeric(15,3)` | YES | - | 전산상 현재고수량 |
| 6 | **`InventoryCountQuantity`** | 실사수량 | `numeric(15,3)` | YES | - | 재고실사 후 수량 |
| 7 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.5 "StockTransfer"
- **테이블 물리명:** `"StockTransfer"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 재고이동(StockTransfer) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`InventoryCountDocumentNumber`** | 수불문서번호 | `varchar(200)` | NO | PRIMARY KEY | 재고실사 문서번호 |
| 2 | **`InventoryCountDateTime`** | 재고실사일시 | `timestamp` | YES | - | 재고실사 일시 |
| 3 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 4 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 |
| 5 | **`InventoryQuantity`** | 현재고수량 | `numeric(15,3)` | YES | - | 전산상 현재고수량 |
| 6 | **`InventoryCountQuantity`** | 실사수량 | `numeric(15,3)` | YES | - | 재고실사 후 수량 |
| 7 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.6 "GoodsReceipt"
- **테이블 물리명:** `"GoodsReceipt"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 입고 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 42개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`GoodsReceiptId`** | 입고식별자 | `varchar(50)` | NO | PRIMARY KEY | 입고를 식별하기 위한 고유값 |
| 2 | **`PurchaseDocumentNumber`** | 구매문서번호 | `varchar(200)` | YES | - | 구매문서번호 |
| 3 | **`PurchaseDocumentSequence`** | 구매문서순번 | `integer` | YES | - | 구매문서순번 |
| 4 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 5 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값 입고를 처리한 작업자의 식별정보 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값 입고를 처리한 작업자의 식별정보 |
| 6 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/반제품/상품/원자재/부자재/저장품/소모품 등 회사내 시스템으로 관리되는 모든 품목을 포함 |
| 7 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 8 | **`InventoryTransactionDocumentNumber`** | 수불문서번호 | `varchar(200)` | YES | - | 수불문서번호 |
| 9 | **`InventoryTransactionDocumentSequence`** | 수불문서순번 | `integer` | YES | - | 수불문서순번 |
| 10 | **`InventoryTransactionTypeCode`** | 수불유형코드 | `varchar(50)` | YES | - | 수불유형코드 |
| 11 | **`InvoiceNumber`** | 송장번호 | `varchar(200)` | YES | - | 구매송장번호/구매송장 처리 후 업데이트되는 항목 |
| 12 | **`InvoiceSequence`** | 송장라인순번 | `integer` | YES | - | 구매송장순번/구매송장 처리 후 업데이트되는 항목 |
| 13 | **`InvoiceProcessingIndicator`** | 송장처리여부 | `boolean` | YES | - | 구매송장 처리여부/구매송장 처리 후 업데이트되는 항목 |
| 14 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 15 | **`VendorName`** | 공급사명 | `varchar(200)` | YES | - | 공급사의 명칭 |
| 16 | **`PurchaseOrderUomCode`** | 발주단위코드 | `varchar(50)` | YES | - | 발주단위코드 |
| 17 | **`ItemUnitQuantity`** | 기준수량 | `numeric(15,3)` | YES | - | 기준수량(수량의 단위는 기준단위코드로 함) |
| 18 | **`GoodsReceiptQuantity`** | 처리수량 | `numeric(15,3)` | YES | - | 처리수량 |
| 19 | **`IncomingInspectionAcceptedQuantity`** | 수입검사합격수량 | `numeric(15,3)` | YES | - | 수입검사합격수량 |
| 20 | **`IncomingInspectionRejectedQuantity`** | 수입검사불합격수량 | `numeric(15,3)` | YES | - | 수입검사불합격수량 |
| 21 | **`PurchaseGroupCode`** | 구매그룹코드 | `varchar(50)` | YES | - | 구매그룹코드 |
| 22 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/DZ/HD 등) |
| 23 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 입고에 포함된 로트의 고유식별값 |
| 24 | **`GoodsReceiptDateTime`** | 입고처리일시 | `timestamp` | YES | - | 입고처리일시(KS X ISO 8601을 따른다) |
| 25 | **`PurchaseTransactionUnitPrice`** | 구매거래단가 | `numeric(15,3)` | YES | - | 구매거래단가(금액의 단위는 환종코드로 함) |
| 26 | **`PurchaseTransactionPrice`** | 구매거래금액 | `numeric(15,3)` | YES | - | 구매거래금액(금액의 단위는 환종코드로 함) |
| 27 | **`PurchaseOrderUnitPrice`** | 발주단가 | `numeric(15,3)` | YES | - | 발주단가(금액의 단위는 환종코드로 함) |
| 28 | **`PurchaseOrderPrice`** | 발주금액 | `numeric(15,3)` | YES | - | 발주금액(금액의 단위는 환종코드로 함) |
| 29 | **`VatPrice`** | 부가세금액 | `numeric(15,3)` | YES | - | 부가세금액(금액의 단위는 환종코드로 함) |
| 30 | **`CurrencyCode`** | 환종코드 | `varchar(50)` | YES | - | 환종코드(예: KRW/USD/JPY 등) |
| 31 | **`AccountCode`** | 계정코드 | `varchar(50)` | YES | - | 계정코드 |
| 32 | **`VatTransactionUnitPrice`** | 부가세포함거래단가 | `numeric(15,3)` | YES | - | 부가세포함거래단가(금액의 단위는 환종코드로 함) |
| 33 | **`VatTransactionPrice`** | 부가세포함거래금액 | `numeric(15,3)` | YES | - | 부가세포함거래금액(금액의 단위는 환종코드로 함) |
| 34 | **`VatCarryingAmount`** | 부가세포함장부금액 | `numeric(15,3)` | YES | - | 부가세포함장부금액(금액의 단위는 환종코드로 함) |
| 35 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 36 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 37 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 38 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 39 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 40 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 41 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 42 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.7 "GoodsIssue"
- **테이블 물리명:** `"GoodsIssue"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 자재불출(GoodsIssue) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 24개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`GoodsIssueId`** | 자재불출식별자 | `varchar(50)` | NO | PRIMARY KEY | 자재불출을 식별하기 위한 고유값 |
| 2 | **`InventoryTransactionDocumentNumber`** | 수불문서번호 | `varchar(200)` | YES | - | 수불문서번호 |
| 3 | **`InventoryTransactionDocumentSequence`** | 수불문서순번 | `integer` | YES | - | 수불문서순번 |
| 4 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 5 | **`InventoryTransactionTypeCode`** | 수불유형코드 | `varchar(50)` | YES | - | 수불유형코드 |
| 6 | **`InventoryTransferType`** | 입출고유형 | `varchar(50)` | YES | - | 입출고유형 |
| 7 | **`InventoryVariationType`** | 재고증감유형 | `varchar(50)` | YES | - | 재고증감유형 |
| 8 | **`InventoryTransactionType`** | 수불유형 | `varchar(50)` | YES | - | 수불유형 |
| 9 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 자재불출에 포함된 로트의 고유식별값 |
| 10 | **`SerialUseIndicator`** | 시리얼사용여부 | `boolean` | YES | - | 시리얼사용여부 |
| 11 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 12 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 13 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 14 | **`ItemUnitQuantity`** | 기준단위수량 | `numeric(15,3)` | YES | - | 기준단위수량(수량의 단위는 기준단위코드로 함) |
| 15 | **`OrderUomCode`** | 오더단위코드 | `varchar(50)` | YES | - | 오더단위코드(예: EA/ DZ/ HD 등) |
| 16 | **`OrderQuantity`** | 오더수량 | `numeric(15,3)` | YES | - | 오더수량(수량의 단위는 오더단위코드로 함) |
| 17 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 18 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 19 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 20 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 21 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 22 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 23 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 24 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.8 "MaterialArrival"
- **테이블 물리명:** `"MaterialArrival"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 자재도착 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PurchaseDocumentNumber`** | 구매문서번호 | `varchar(200)` | NO | PRIMARY KEY | 구매문서번호 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 제품/반제품/상품/원자재/부자재/저장품/소모품 등 회사내 시스템으로 관리되는 모든 품목을 포함 |
| 3 | **`PurchaseGoodsReceiptQuantity`** | 구매입고수량 | `numeric(15,3)` | YES | - | 구매입고수량(수량의 단위는 기준단위코드로 함) |
| 4 | **`ReceiptWarehouseId`** | 입고창고식별자 | `varchar(50)` | YES | - | 품목의 기본 입고 창고(저장위치) |
| 5 | **`GoodsReceiptDate`** | 입고처리일 | `date` | YES | - | 입고처리일 |
| 6 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 자재도착에 포함된 로트의 고유식별값 |
| 7 | **`ItemQuantity`** | 품목수량 | `numeric(15,3)` | YES | - | 품목수량(수량의 단위는 기준단위코드로 함) |
| 8 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.9 "ProductIncoming"
- **테이블 물리명:** `"ProductIncoming"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 제품입고(ProductIncoming) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 26개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductIncomingId`** | 제품입고식별자 | `varchar(50)` | NO | PRIMARY KEY | 제품입고량을 식별하기 위한 고유값 |
| 2 | **`InventoryTransactionDocumentNumber`** | 수불문서번호 | `varchar(200)` | YES | - | 수불문서번호 |
| 3 | **`InventoryTransactionDocumentSequence`** | 수불문서순번 | `integer` | YES | - | 수불문서순번 |
| 4 | **`InventoryTransactionDate`** | 수불일 | `date` | YES | - | 수불일(KS X ISO 8601을 따른다) |
| 5 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 6 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | YES | - | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 7 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 8 | **`InventoryTransactionTypeCode`** | 수불유형코드 | `varchar(50)` | YES | - | 수불유형코드 |
| 9 | **`SerialUseIndicator`** | 시리얼사용여부 | `boolean` | YES | - | 시리얼사용여부 |
| 10 | **`InventoryTransferType`** | 입출고유형 | `varchar(50)` | YES | - | 입출고유형 |
| 11 | **`InventoryVariationType`** | 재고증감유형 | `varchar(50)` | YES | - | 재고증감유형 |
| 12 | **`InventoryTransactionType`** | 수불유형 | `varchar(50)` | YES | - | 수불유형 |
| 13 | **`LotControlIndicator`** | 로트사용여부 | `boolean` | YES | - | 품목의 로트 단위로 관리여부 |
| 14 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 제품입고에 포함된 로트의 고유식별값 |
| 15 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 16 | **`ItemUnitQuantity`** | 기준단위수량 | `numeric(15,3)` | YES | - | 기준단위수량(수량의 단위는 기준단위코드로 함) |
| 17 | **`OrderUomCode`** | 오더단위코드 | `varchar(50)` | YES | - | 오더단위코드(예: EA/ DZ/ HD 등) |
| 18 | **`OrderQuantity`** | 오더수량 | `numeric(15,3)` | YES | - | 오더수량(수량의 단위는 오더단위코드로 함) |
| 19 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 20 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 21 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 22 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 23 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 24 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 25 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 26 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.10 "ProductPacking"
- **테이블 물리명:** `"ProductPacking"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 제품포장(ProductPacking) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PackingType`** | 포장유형 | `varchar(50)` | YES | - | 포장유형 |
| 2 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 3 | **`SerialNumber`** | 원번번호 | `varchar(200)` | YES | - | 원번번호 |
| 4 | **`BoxNumber`** | 포장박스번호 | `varchar(200)` | YES | - | 포장박스번호 |
| 5 | **`PalletNumber`** | 포장파렛트번호 | `varchar(200)` | YES | - | 포장된 파렛트번호 |
| 6 | **`ItemId`** | 품목식별자 | `varchar(50)` | NO | PRIMARY KEY | 품목을 식별하기 위한 고유값 -제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 7 | **`PackingSequence`** | 포장순번 | `integer` | NO | PRIMARY KEY | 포장된 순번 |
| 8 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 제품포장에 포함된 로트의 고유식별값 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.11 "ProductRelease"
- **테이블 물리명:** `"ProductRelease"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 제품출고(ProductRelease) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 28개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductReleaseId`** | 출고식별자 | `varchar(50)` | NO | PRIMARY KEY | 출고를 식별하기 위한 고유값 |
| 2 | **`ProductReleaseSequence`** | 출고순번 | `integer` | YES | - | 출고순번 |
| 3 | **`ProductReleaseRequestId`** | 출하요청식별자 | `varchar(50)` | YES | - | 출하요청을 식별하기 위한 고유값 |
| 4 | **`SalesDocumentNumber`** | 주문문서번호 | `varchar(200)` | YES | - | 주문문서번호 |
| 5 | **`InventoryTransactionDate`** | 수불일 | `date` | YES | - | 수불일(KS X ISO 8601을 따른다) |
| 6 | **`LineId`** | 라인식별자 | `varchar(50)` | YES | - | 라인을 식별하기 위한 고유값 |
| 7 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 8 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 9 | **`OrderUomCode`** | 오더단위코드 | `varchar(50)` | YES | - | 오더단위코드(예: EA/ DZ/ HD 등) |
| 10 | **`OrderQuantity`** | 오더수량 | `numeric(15,3)` | YES | - | 오더수량(수량의 단위는 오더단위코드로 함) |
| 11 | **`SalesQuantity`** | 매출수량 | `numeric(15,3)` | YES | - | 매출수량(수량의 단위는 판매단위코드로 함) |
| 12 | **`ReturnIndicator`** | 반품여부 | `boolean` | YES | - | 반품여부 |
| 13 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 14 | **`ItemUnitQuantity`** | 기준단위수량 | `numeric(15,3)` | YES | - | 기준단위수량(수량의 단위는 기준단위코드로 함) |
| 15 | **`SalesUnitQuantity`** | 기준매출수량 | `numeric(15,3)` | YES | - | 기준매출수량(수량의 단위는 기준단위코드로 함) |
| 16 | **`ReturnUnitQuantity`** | 기준반품수량 | `numeric(15,3)` | YES | - | 기준반품수량(수량의 단위는 기준단위코드로 함) |
| 17 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | YES | - | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 18 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 제품출고에 포함된 로트의 고유식별값 |
| 19 | **`SerialUseIndicator`** | 시리얼사용여부 | `boolean` | YES | - | 시리얼사용여부 |
| 20 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 21 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 22 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 23 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 24 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 25 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 26 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 27 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 28 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.12 "ProductReleaseRequest"
- **테이블 물리명:** `"ProductReleaseRequest"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 출하의뢰(ProductReleaseRequest) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 31개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProductReleaseRequestId`** | 출하요청식별자 | `varchar(50)` | NO | PRIMARY KEY | 출하요청을 식별하기 위한 고유값 |
| 2 | **`ProductReleaseRequestDocumentNumber`** | 납품문서번호 | `varchar(200)` | YES | - | 납품문서번호 |
| 3 | **`ProductReleaseRequestType`** | 납품구분유형 | `varchar(50)` | YES | - | 납품구분유형 |
| 4 | **`ProductReleaseRequestDate`** | 납품지시일 | `date` | YES | - | 납품지시일(KS X ISO 8601을 따른다) |
| 5 | **`ProductReleaseRequestSequence`** | 납품순번 | `integer` | YES | - | 납품순번 |
| 6 | **`LineId`** | 라인식별자 | `varchar(50)` | YES | - | 라인을 식별하기 위한 고유값 |
| 7 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 8 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 9 | **`ProductReleaseRequestQuantity`** | 납품수량 | `numeric(15,3)` | YES | - | 납품수량(수량의 단위는 판매단위코드로 함) |
| 10 | **`ProductReleaseQuantity`** | 출고수량 | `numeric(15,3)` | YES | - | 출고수량(수량의 단위는 판매단위코드로 함) |
| 11 | **`SalesQuantity`** | 매출수량 | `numeric(15,3)` | YES | - | 매출수량(수량의 단위는 판매단위코드로 함) |
| 12 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 13 | **`SellingUomCode`** | 판매단위코드 | `varchar(50)` | YES | - | 판매단위코드(예: EA/ DZ/ HD 등) |
| 14 | **`ItemUnitQuantity`** | 단위수량 | `numeric(15,3)` | YES | - | 단위수량(수량의 단위는 기준단위코드로 함) |
| 15 | **`ProductReleaseUnitQuantity`** | 기준출고수량 | `numeric(15,3)` | YES | - | 기준출고수량(수량의 단위는 기준단위코드로 함) |
| 16 | **`SalesUnitQuantity`** | 기준매출수량 | `numeric(15,3)` | YES | - | 기준매출수량(수량의 단위는 기준단위코드로 함) |
| 17 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 18 | **`RequestedDeliveryDate`** | 요청납기일 | `date` | YES | - | 요청납기일(KS X ISO 8601을 따른다) |
| 19 | **`SalesDocumentNumber`** | 주문문서번호 | `varchar(200)` | YES | - | 주문문서번호 |
| 20 | **`SalesDocumentSequence`** | 주문문서순번 | `integer` | YES | - | 주문문서순번 |
| 21 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | YES | - | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 22 | **`ProductReleaseDate`** | 출고일 | `date` | YES | - | 출고일(KS X ISO 8601을 따른다) |
| 23 | **`DeliveryDate`** | 납품일 | `date` | YES | - | 납품일(KS X ISO 8601을 따른다) |
| 24 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 25 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 26 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 27 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 28 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 29 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 30 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 31 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.13 "Carrier"
- **테이블 물리명:** `"Carrier"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 캐리어 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 14개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | NO | PRIMARY KEY | 캐리어를 식별하기 위한 고유값 |
| 2 | **`CarrierType`** | 캐리어유형 | `varchar(50)` | YES | - | 캐리어의 유형(종류)(예: FOUP/Cassette/Magazine/Tray 등) |
| 3 | **`ItemType`** | 품목유형 | `varchar(50)` | YES | - | 캐리어에 적재할 품목의 유형 |
| 4 | **`LoadState`** | 적재상태 | `varchar(50)` | YES | - | 적재 상태(예: Empty/Full/Partial) |
| 5 | **`CarrierState`** | 캐리어상태 | `varchar(50)` | YES | - | 캐리어의 상태(예: Available/NotAvailable/InUse) |
| 6 | **`CurrentQuantity`** | 적재수량 | `numeric(15,3)` | YES | - | 적재된 자재의 수량 |
| 7 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 8 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 9 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 10 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 11 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.14 "WarehouseLocation"
- **테이블 물리명:** `"WarehouseLocation"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 창고 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 14개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | NO | PRIMARY KEY | 창고를 식별하기 위한 고유값 |
| 2 | **`WarehouseName`** | 창고명 | `varchar(200)` | YES | - | 창고의 명칭 |
| 3 | **`WarehouseType`** | 창고유형 | `varchar(50)` | YES | - | 창고의 유형 |
| 4 | **`UseIndicator`** | 사용여부 | `boolean` | YES | - | 창고의 사용 여부 |
| 5 | **`NegativeInventoryIndicator`** | 음수재고허용여부 | `boolean` | YES | - | 창고재고관리 시 음수재고 허용 여부 |
| 6 | **`WarehouseSectionList`** | 창고섹션목록 | `text` | YES | - | 창고 내 저장 섹션 |
| 7 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 8 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 9 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 10 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 11 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.15 "InTransitLocation"
- **테이블 물리명:** `"InTransitLocation"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 운송위치(InTransitLocation) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`TransferCommandId`** | 이동지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 이동 유형에 따른 이동지시를 식별하기 위한 고유값 |
| 2 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 3 | **`LotName`** | 로트명 | `varchar(200)` | YES | - | 로트 명칭 |
| 4 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 5 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 6 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 7 | **`CurrentLocation`** | 현재위치 | `text` | YES | - | 현재 로트가 위치하는 정보OperationID(공정식별자)/ EquipmentID(설비식별자)/ StockerInventoryID(저장소재공정보식별자)/ 그 외 각 공장 특성에 따라 EVENT 처리를 위해 지정한 특정 LocationID |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.16 "TransferCommand"
- **테이블 물리명:** `"TransferCommand"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 이동지시(TransferCommand) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 18개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`TransferCommandId`** | 이동지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 이동 유형에 따른 이동지시를 식별하기 위한 고유값 |
| 2 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 로트를 식별하기 위한 고유값 |
| 3 | **`LotName`** | 로트명 | `varchar(200)` | YES | - | 로트의 명칭 |
| 4 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 5 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 6 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 7 | **`SourceId`** | 출발지식별자 | `varchar(50)` | YES | - | 로트의 현재 위치 정보의 고유값OperationID(공정식별자)/ EquipmentID(설비식별자)/ StockerInventoryID(자장소재공정보식별자)/ 그 외 각 공장 특성에 따라 EVENT 처리를 위해 지정한 특정 LocationID |
| 8 | **`SourceName`** | 출발지명 | `varchar(200)` | YES | - | 로트의 현재 위치의 명칭 |
| 9 | **`DestinationId`** | 목적지식별자 | `varchar(50)` | YES | - | 로트가 이동하여 도착할 목적지 정보의 고유값OperationID(공정식별자)/ EquipmentID(설비식별자)/ StockerInventoryID(저장소재공정보식별자)/ 그 외 각 공장 특성에 따라 EVENT 처리를 위해 지정한 특정 LocationID |
| 10 | **`DestinationName`** | 목적지명 | `varchar(200)` | YES | - | 로트가 이동하여 도착할 목적지의 명칭 |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 12 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 14 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 15 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 16 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 17 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 18 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.17 "TransferStart"
- **테이블 물리명:** `"TransferStart"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 운행시작(TransferStart) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 20개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`TransferCommandId`** | 이동지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 이동 유형에 따른 이동지시를 식별하기 위한 고유값 |
| 2 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 3 | **`LotName`** | 로트명 | `varchar(200)` | YES | - | 로트 명칭 |
| 4 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 5 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 6 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 7 | **`TransferStartDateTime`** | 운행시작일시 | `timestamp` | YES | - | 운행을 시작한 일시 |
| 8 | **`CurrentLocation`** | 현재위치 | `text` | YES | - | 현재 로트가 위치하는 정보 |
| 9 | **`DestinationId`** | 목적지식별자 | `varchar(50)` | YES | - | 로트가 이동하여 도착할 목적지 정보의 고유값OperationID(공정식별자)/ EquipmentID(설비식별자)/ StockerInventoryID(저장소재공정보식별자)/ 그 외 각 공장 특성에 따라 EVENT 처리를 위해 지정한 특정 LocationID |
| 10 | **`DestinationName`** | 목적지명 | `varchar(200)` | YES | - | 로트가 이동하여 도착할 목적지의 명칭 |
| 11 | **`ErrorCode`** | 오류코드 | `varchar(50)` | YES | - | 오류 발생 시 해당 오류 코드 값 |
| 12 | **`ErrorMessage`** | 오류메시지 | `text` | YES | - | 오류 발생 시 해당 메시지 |
| 13 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 14 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 15 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 16 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 17 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 18 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 19 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 20 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.18 "TransferEnd"
- **테이블 물리명:** `"TransferEnd"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 운행완료(TransferEnd) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 17개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`TransferCommandId`** | 이동지시식별자 | `varchar(50)` | NO | PRIMARY KEY | 이동 유형에 따른 이동지시를 식별하기 위한 고유값 |
| 2 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 3 | **`LotName`** | 로트명 | `varchar(200)` | YES | - | 로트 명칭 |
| 4 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 5 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 6 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 7 | **`TransferEndDateTime`** | 운행완료일시 | `timestamp` | YES | - | 운행을 완료한 일시 |
| 8 | **`DestinationId`** | 목적지식별자 | `varchar(50)` | YES | - | 로트가 이동하여 도착할 목적지 정보의 고유값OperationID(공정식별자)/ EquipmentID(설비식별자)/ StockerInventoryID(저장소재공정보식별자)/ 그 외 각 공장 특성에 따라 EVENT 처리를 위해 지정한 특정 LocationID |
| 9 | **`DestinationName`** | 목적지명 | `varchar(200)` | YES | - | 로트가 이동하여 도착할 목적지의 명칭 |
| 10 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 11 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 12 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 13 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 14 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 15 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 16 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 17 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.19 "Lot"
- **테이블 물리명:** `"Lot"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 로트 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 34개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`LotId`** | 로트식별자 | `varchar(50)` | NO | PRIMARY KEY | 로트를 식별하기 위한 고유값 |
| 2 | **`LotName`** | 로트명 | `varchar(200)` | NO | - | 로트의 명칭 |
| 3 | **`LotDescription`** | 로트설명 | `text` | YES | - | 로트 설명 정보 |
| 4 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 5 | **`ParentLotId`** | 모로트식별자 | `varchar(50)` | YES | - | Split/Merge/Transfer 등을 통하여 파생된 자 ID일 경우 이전 부모 로트 식별자 |
| 6 | **`ChildLotId`** | 자로트식별자 | `varchar(50)` | YES | - | Split/Merge/Transfer 등을 통하여 파생한 자 로트 식별자 |
| 7 | **`LotType`** | 로트유형 | `varchar(20)` | YES | - | 로트 유형(예: Production/Development/Engineering 등) |
| 8 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 9 | **`CarrierId`** | 캐리어식별자 | `varchar(50)` | YES | - | 캐리어를 식별하기 위한 고유값 |
| 10 | **`ProductionOrderId`** | 생산지시식별자 | `varchar(50)` | YES | - | 생산지시를 식별하기 위한 고유값 |
| 11 | **`ScheduledDueDate`** | 생산마감기한 | `date` | YES | - | 로트의 생산을 완료하는 마감일 |
| 12 | **`LotPriority`** | 로트우선순위 | `integer` | YES | - | 로트의 생산 투입 및 공정을 진행하는 순위 |
| 13 | **`CurrentOperationId`** | 현재공정식별자 | `varchar(50)` | YES | - | 현재 진행중인 공정을 식별하기 위한 고유값 |
| 14 | **`NextOperationId`** | 다음공정식별자 | `varchar(50)` | YES | - | 다음 번째 진행할 공정을 식별하기 위한 고유값 |
| 15 | **`LotState`** | 로트상태 | `varchar(20)` | YES | - | 로트의 상태(예: Open(등록)/Release(발행)/Start(시작)/Closing(마감 또는 종료)) |
| 16 | **`HoldIndicator`** | 보류여부 | `boolean` | YES | - | 공정 작업 보류 여부 |
| 17 | **`HotIndicator`** | 긴급여부 | `boolean` | YES | - | 긴급 작업 여부 |
| 18 | **`ReworkIndicator`** | 재작업여부 | `boolean` | YES | - | 재작업 진행 여부 |
| 19 | **`LotCreatedQuantity`** | 로트수량 | `numeric(15,3)` | YES | - | 처음 생성시 로트 수량 |
| 20 | **`ProducedQuantity`** | 생산수량 | `numeric(15,3)` | YES | - | 해당 공정에서 생산된 로트의 전체 수량 |
| 21 | **`DefectQuantity`** | 불량수량 | `numeric(15,3)` | YES | - | 해당 공정에서 생산된 로트의 전체 수량 중 불량수량 |
| 22 | **`ReworkQuantity`** | 재작업수량 | `integer` | YES | - | 해당 공정의 불량수량 중 재작업을 수행한 수량 |
| 23 | **`ReworkCount`** | 재작업횟수 | `integer` | YES | - | 해당 공정의 재작업 횟수 |
| 24 | **`TotalReworkCount`** | 총재작업횟수 | `integer` | YES | - | 총 재작업 횟수 |
| 25 | **`LotStartedDatetime`** | 로트를 공정에 투입한 일시 | `timestamp` | YES | - | 로트를 공정에 투입한 일시 |
| 26 | **`PersonnelSeq`** | 인사조직 내 사원을 식별하기 위한 고유값/로트를 공정에 투입한 작업자의 식별정보 | `varchar(50)` | YES | - | 인사조직 내 사원을 식별하기 위한 고유값/로트를 공정에 투입한 작업자의 식별정보 |
| 27 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 정보를 처음으로 등록한 사람을 구분할 수 있는 고유식별값 |
| 28 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 정보를 처음으로 등록한 날짜 |
| 29 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 정보를 마지막으로 수정한 사람을 구분할 수 있는 고유식별값 |
| 30 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 정보를 마지막으로 수정한 날짜 |
| 31 | **`Note`** | 비고 | `text` | YES | - | 비고사항 |
| 32 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 33 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 34 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.5.20 "Return"
- **테이블 물리명:** `"Return"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 반품(Return) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 21개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ReturnId`** | 반품식별자 | `varchar(50)` | NO | PRIMARY KEY | 반품처리를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 그 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사내 시스템으로 관리되는 모든 품목을 포함 |
| 3 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 반품에 포함된 로트의 고유식별값 |
| 4 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 반품에 포함된 배치의 고유식별값 |
| 5 | **`WarehouseId`** | 창고식별자 | `varchar(50)` | YES | - | 창고를 식별하기 위한 고유값 |
| 6 | **`ReturnSequence`** | 반품순서 | `integer` | YES | - | 반품 순서 |
| 7 | **`ReturnNumber`** | 반품번호 | `varchar(200)` | YES | - | 반품 번호 |
| 8 | **`ProductReturnDocumentNumber`** | 반품문서번호 | `varchar(200)` | YES | - | 제품반품 문서번호 |
| 9 | **`ReturnDateTime`** | 반품일시 | `timestamp` | YES | - | 반품일시 |
| 10 | **`CustomerId`** | 고객사식별자 | `varchar(50)` | YES | - | 품목을 구매해가는 거래처를 식별하기 위한 고유값 |
| 11 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 12 | **`ReturnQuantity`** | 반품수량 | `numeric(15,3)` | YES | - | 반품 수량 |
| 13 | **`ReturnType`** | 반품유형 | `varchar(50)` | YES | - | 반품 유형(구매/ 제품 반품 등) |
| 14 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 15 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 16 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 17 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 18 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 19 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 20 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 21 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---


### 4.6 도메인 6: 품질 검사, 시정조치 및 사후 서비스 (Quality & Inspection)
> 협력업체 수입/공정 검사 계획/신청/결과, 품질 부적합 시정조치(CAR/CAP), 알람, 사후서비스(A/S)

#### 4.6.1 "SupplierInspectionPlan"
- **테이블 물리명:** `"SupplierInspectionPlan"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 협력업체품질검사계획(SupplierInspectionPlan) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 36개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | YES | - | 프로젝트를 식별하기 위한 고유값 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값/제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 4 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 5 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 6 | **`PurchaseOrderId`** | 구매발주식별자 | `varchar(50)` | YES | - | 구매발주를 식별하기 위한 고유값 |
| 7 | **`PurchaseOrderQuantity`** | 구매발주수량 | `numeric(15,3)` | YES | - | 구매발주수량(수량의 단위는 기준단위코드로 함) |
| 8 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 품질검사계획에 포함된 로트의 고유식별값 |
| 9 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 품질검사계획에 포함된 배치의 고유식별값 |
| 10 | **`ExpectedDeliveryDate`** | 납기예정일 | `date` | YES | - | 자재의 납기 예정일자(KS X ISO 8601을 따른다) |
| 11 | **`InspectionPlanId`** | 검사계획식별자 | `varchar(50)` | YES | - | 검사계획을 식별하기 위한 고유값 |
| 12 | **`InspectionId`** | 검사식별자 | `varchar(50)` | YES | - | 검사를 식별하기 위한 고유값 |
| 13 | **`InspectionName`** | 검사명 | `varchar(200)` | YES | - | 검사의 명칭 |
| 14 | **`Inspector`** | 검사자 | `text` | YES | - | 검사계획에 따라 배정된 검사원 |
| 15 | **`InspectionLocation`** | 검사위치 | `text` | YES | - | 검사를 진행하는 위치(장소) |
| 16 | **`ExpectedInspectionDate`** | 검사예정일 | `date` | YES | - | 검사가 진행될 일자(KS X ISO 8601을 따른다) |
| 17 | **`ExpectedInspectionTimePeriod`** | 검사예정기간 | `varchar(50)` | YES | - | 검사시작일과 검사종료일 사이의 예정일 수 |
| 18 | **`InspectionMethod`** | 검사방법 | `varchar(50)` | YES | - | 검사의 방법(예: 육안검사/ 비파괴검사/ 치수검사 등) |
| 19 | **`InspectionPlanQuantity`** | 검사계획수량 | `numeric(15,3)` | YES | - | 검사 대상이 되는 검사계획수량 |
| 20 | **`InspectionCheckSheet`** | 검사체크시트 | `text` | YES | - | 반주처에서 정한 품질 수준을 점검하기 위한 프로젝트 검사방법/ 점검내용 등 온라인 문서의 URI(Uniform Resource Identifier) |
| 21 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 생성자 아이디 |
| 22 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 23 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 24 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 25 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 26 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 27 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 28 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 29 | **`SupplierInspectionPlanSeq`** | [UD]협력업체품질검사계획 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]협력업체품질검사계획 시스템 PK |
| 30 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |
| 31 | **`SupplierContactPerson`** | 업체담당자(협력사) | `varchar(50)` | YES | - | 업체담당자(협력사) |
| 32 | **`AttendanceSdqm`** | Attendance - SD QM | `varchar(50)` | YES | - | Attendance - SD QM |
| 33 | **`AttendanceYard`** | Attendance - Yard | `varchar(50)` | YES | - | Attendance - Yard |
| 34 | **`AttendanceClass`** | Attendance - Class | `varchar(50)` | YES | - | Attendance - Class |
| 35 | **`AttendanceOwner`** | Attendance - Owner | `varchar(50)` | YES | - | Attendance - Owner |
| 36 | **`ReapplicationFlag`** | 재신청여부 | `varchar(50)` | YES | - | 재신청여부 |

---

#### 4.6.2 "SupplierInspectionApplication"
- **테이블 물리명:** `"SupplierInspectionApplication"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 협력업체품질검사신청(SupplierInspectionApplication) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 33개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | YES | - | 프로젝트를 식별하기 위한 고유값 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템으로 관리되는 모든 품목을 포함 |
| 4 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 5 | **`ItemUomCode`** | 기준단위코드 | `varchar(50)` | YES | - | 기준단위코드(예: EA/ DZ/ HD 등) |
| 6 | **`PurchaseOrderId`** | 구매발주식별자 | `varchar(50)` | YES | - | 구매발주를 식별하기 위한 고유값 |
| 7 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 품질검사신청에 포함된 로트의 고유식별값 |
| 8 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 품질검사신청에 포함된 배치의 고유식별값 |
| 9 | **`InspectionPlanId`** | 검사계획식별자 | `varchar(50)` | YES | - | 검사계획을 식별하기 위한 고유값 |
| 10 | **`InspectionId`** | 검사식별자 | `varchar(50)` | YES | - | 검사를 식별하기 위한 고유값 |
| 11 | **`InspectionApplicationId`** | 검사신청식별자 | `varchar(50)` | YES | - | 검사신청을 식별하기 위한 고유값 |
| 12 | **`PersonnelSeq`** | 검사신청자를 식별하기 위한 고유값 | `varchar(50)` | YES | - | 검사신청자를 식별하기 위한 고유값 |
| 13 | **`InspectionName`** | 검사명 | `varchar(200)` | YES | - | 검사의 명칭 |
| 14 | **`InspectionLocation`** | 검사위치 | `text` | YES | - | 검사를 진행하는 위치(장소) |
| 15 | **`InspectionMethod`** | 검사방법 | `varchar(50)` | YES | - | 검사의 방법(예: 육안검사/ 비파괴검사/ 치수검사 등) |
| 16 | **`ExpectedInspectionDate`** | 검사예정일 | `date` | YES | - | 검사가 진행될 예정일자(KS X ISO 8601을 따른다) |
| 17 | **`InspectionDate`** | 검사일 | `date` | YES | - | 검사를 진행한 실제 검사일자(KS X ISO 8601을 따른다) |
| 18 | **`InspectionTimePeriod`** | 검사기간 | `varchar(50)` | YES | - | 검사시작일과 검사종료일 사이의 일 수 |
| 19 | **`InspectionQuantity`** | 검사수량 | `numeric(15,3)` | YES | - | 검사의 대상이 되는 것체의 수량 |
| 20 | **`SelfCheckInspectionResultSheet`** | 자체점검결과시트 | `text` | YES | - | 공급사에서 자체적으로 진행한 셀프검사 결과 시트로서 온라인 문서의 URI(Uniform Resource Identifier) |
| 21 | **`InspectionStatusCode`** | 검사상태코드 | `varchar(50)` | YES | - | 검사 진행 상태(예: 합격/ 불합격/ 취소/ 신청대기 등) |
| 22 | **`ReasonForApplication`** | 검사신청사유 | `text` | YES | - | 검사를 신청한 사유 |
| 23 | **`InspectionCancelReason`** | 검사취소사유 | `text` | YES | - | 검사 취소시/ 취소되거나 확정이 불가한 사유 |
| 24 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 생성자 아이디 |
| 25 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 26 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 27 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 28 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 29 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 30 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 31 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 32 | **`InspectionApplicationSeq`** | [UD]협력업체품질검사신청시스템PK | `integer` | NO | PRIMARY KEY | [UD]협력업체품질검사신청시스템PK |
| 33 | **`Client`** | - | `varchar(50)` | YES | - | - |

---

#### 4.6.3 "SupplierInspectionResult"
- **테이블 물리명:** `"SupplierInspectionResult"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 협력업체품질검사결과(SupplierInspectionResult) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 39개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | YES | - | 프로젝트를 식별하기 위한 고유값 |
| 3 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 4 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 5 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 품질검사결과에 포함된 로트의 고유식별값 |
| 6 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 품질검사결과에 포함된 배치의 고유식별값 |
| 7 | **`InspectionPlanId`** | 검사계획식별자 | `varchar(50)` | YES | - | 검사계획을 식별하기 위한 고유값 |
| 8 | **`InspectionId`** | 검사식별자 | `varchar(50)` | YES | - | 검사를 식별하기 위한 고유값 |
| 9 | **`InspectionApplicationId`** | 검사신청식별자 | `varchar(50)` | YES | - | 검사신청을 식별하기 위한 고유값 |
| 10 | **`Inspector`** | 검사자 | `text` | YES | - | 검사를 진행한 담당자 |
| 11 | **`InspectionLocation`** | 검사위치 | `text` | YES | - | 검사를 진행하는 위치(장소) |
| 12 | **`InspectionDate`** | 검사일 | `date` | YES | - | 검사를 진행한 실제 검사일자 |
| 13 | **`InspectionQuantity`** | 검사수량 | `numeric(15,3)` | YES | - | 검사의 대상이 되는 자재의 수량 |
| 14 | **`InspectionResult`** | 검사결과 | `varchar(50)` | YES | - | 검사를 진행한 결과 |
| 15 | **`InspectionResultSheet`** | 검사결과시트 | `text` | YES | - | 발주처의 검사체크시트를 기준으로 검사한 결과시트로서 온라인 문서의 URI |
| 16 | **`InspectionStatusCode`** | 검사상태코드 | `varchar(50)` | YES | - | 검사 진행 상태(예: 합격/ 불합격/ 취소/ 신청대기 등) |
| 17 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 생성자 아이디 |
| 18 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 19 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 20 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 21 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 22 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 23 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 24 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 25 | **`SupplierInspectionResultSeq`** | [UD]협력업체품질검사결과 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]협력업체품질검사결과 시스템 PK |
| 26 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |
| 27 | **`SupplierContactPerson`** | 업체담당자(협력사) | `varchar(50)` | YES | - | 업체담당자(협력사) |
| 28 | **`AttendanceSdqm`** | Attendance - SD QM | `varchar(50)` | YES | - | Attendance - SD QM |
| 29 | **`AttendanceYard`** | Attendance - Yard | `varchar(50)` | YES | - | Attendance - Yard |
| 30 | **`AttendanceClass`** | Attendance - Class | `varchar(50)` | YES | - | Attendance - Class |
| 31 | **`AttendanceOwner`** | Attendance - Owner | `varchar(50)` | YES | - | Attendance - Owner |
| 32 | **`ReapplicationFlag`** | 재신청여부 | `varchar(50)` | YES | - | 재신청여부 |
| 33 | **`ShipNumberId`** | 호선 | `varchar(50)` | YES | - | 호선 |
| 34 | **`RequestedQuantity`** | 검사요청수량 | `numeric(15,3)` | YES | - | 검사요청수량 |
| 35 | **`InspectionRemainingQuantity`** | 검사잔량 | `numeric(15,3)` | YES | - | 검사잔량 |
| 36 | **`ApplicationStatus`** | 신청상태 | `varchar(50)` | YES | - | 신청상태 |
| 37 | **`InspectionRequestDate`** | 검사요청일 | `date` | YES | - | 검사요청일 |
| 38 | **`InspectionRequestHour`** | 검사요청일시 | `integer` | YES | - | 검사요청일시 |
| 39 | **`InspectionRequestMinute`** | 검사요청일분 | `integer` | YES | - | 검사요청일분 |

---

#### 4.6.4 "CorrectiveActionRequest"
- **테이블 물리명:** `"CorrectiveActionRequest"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 시정조치요청 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 21개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 3 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 4 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 시정조치요청에 포함된 로트의 고유식별값 |
| 5 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 시정조치요청에 포함된 배치의 고유식별값 |
| 6 | **`InspectionApplicationId`** | 검사신청식별자 | `varchar(50)` | YES | - | 검사신청을 식별하기 위한 고유값 |
| 7 | **`CorrectiveActionRequestId`** | 시정조치요청식별자 | `varchar(50)` | NO | - | 시정조치요청을 식별하기 위한 고유값 |
| 8 | **`CorrectiveActionRequestIssuerId`** | 시정조치요청발행자식별자 | `varchar(50)` | YES | - | 시정조치요청 발행자를 식별하기 위한 고유값 |
| 9 | **`CorrectiveActionRequestRecipientId`** | 시정조치요청접수자식별자 | `varchar(50)` | YES | - | 시정조치요청 접수자를 식별하기 위한 고유값 |
| 10 | **`CorrectiveActionRequestLocation`** | 시정조치요청위치 | `text` | YES | - | 시정조치 항목의 위치(예: 1번방 상단) |
| 11 | **`CorrectiveActionRequestDocumentReference`** | 시정조치요청첨부자료 | `text` | YES | - | 시정조치요청을 설명하기 위한 사진, 문서 등에 대한 온라인 URI |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | - |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | - |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | - |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | - |
| 16 | **`CreationDateTime`** | - | `timestamp` | YES | - | - |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | - |
| 18 | **`ModificationDateTime`** | - | `timestamp` | YES | - | - |
| 19 | **`Note`** | 비고 | `text` | YES | - | - |
| 20 | **`CorrectiveActionRequestSeq`** | [UD]시정조치요청 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]시정조치요청 시스템 PK |
| 21 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |

---

#### 4.6.5 "CorrectiveActionPlan"
- **테이블 물리명:** `"CorrectiveActionPlan"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 시정조치계획(CorrectiveActionPlan) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 25개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 |
| 3 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 4 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 시정조치계획에 포함된 로트의 고유식별값 |
| 5 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 시정조치계획에 포함된 배치의 고유식별값 |
| 6 | **`CorrectiveActionRequestId`** | 시정조치요청식별자 | `varchar(50)` | YES | - | 시정조치요청을 식별하기 위한 고유값 |
| 7 | **`CorrectiveActionPlanId`** | 시정조치계획식별자 | `varchar(50)` | NO | - | 시정조치계획을 식별하기 위한 고유값 |
| 8 | **`PersonnelId`** | 시정조치요청을 처리할 담당자를 식별하기 위한 고유값 | `varchar(50)` | YES | - | 시정조치요청을 처리할 담당자를 식별하기 위한 고유값 |
| 9 | **`PersonInChargeEmail`** | 시정조치담당자이메일명 | `text` | YES | - | 시정조치담당자의 이메일 |
| 10 | **`PersonInChargeDialNumber`** | 시정조치담당자전화번호 | `text` | YES | - | 시정조치담당자의 전화번호 |
| 11 | **`ExpectedCorrectiveActionDate`** | 시정조치예정일 | `date` | YES | - | 시정조치 처리 예정일시(KS X ISO 8601을 따른다) |
| 12 | **`CorrectiveActionRequestDocumentReference`** | 시정조치요청참부자료 | `text` | YES | - | 시정조치요청을 설명하기 위한 사진/ 문서 등에 대한 온라인 URI |
| 13 | **`CorrectiveActionApprovalIndicator`** | 시정조치접수여부 | `boolean` | YES | - | 시정조치 접수 여부 |
| 14 | **`CorrectiveActionStatusCode`** | 시정조치상태코드 | `varchar(50)` | YES | - | 시정조치 진행 상태(예: 발행/ 접수/ 진행/ 반려/ 완료/ 종결 등) |
| 15 | **`ReasonForRejection`** | 반려사유 | `text` | YES | - | 시정조치 반려 사유 |
| 16 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 17 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 18 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 19 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 20 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 21 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 22 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 23 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 24 | **`CorrectiveActionPlanSeq`** | [UD]시정조치계획 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]시정조치계획 시스템 PK |
| 25 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |

---

#### 4.6.6 "CorrectiveActionResult"
- **테이블 물리명:** `"CorrectiveActionResult"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 시정조치결과(CorrectiveActionResult) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 28개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`VendorId`** | 공급사식별자 | `varchar(50)` | YES | - | 품목을 구입해오는 거래처를 식별하기 위한 고유값 |
| 2 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 품목을 식별하기 위한 고유값 제품/ 반제품/ 상품/ 원자재/ 부자재/ 저장품/ 소모품 등 회사 내 시스템을 관리되는 모든 품목을 포함 |
| 3 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 품목의 명칭 |
| 4 | **`LotId`** | 로트식별자 | `varchar(50)` | YES | - | 시정조치결과에 포함된 로트의 고유식별값 |
| 5 | **`BatchId`** | 배치식별자 | `varchar(50)` | YES | - | 시정조치결과에 포함된 배치의 고유식별값 |
| 6 | **`CorrectiveActionRequestId`** | 시정조치요청식별자 | `varchar(50)` | YES | - | 시정조치요청을 식별하기 위한 고유값 |
| 7 | **`CorrectiveActionPlanId`** | 시정조치계획식별자 | `varchar(50)` | YES | - | 시정조치계획을 식별하기 위한 고유값 |
| 8 | **`CorrectiveActionResultId`** | 시정조치결과식별자 | `varchar(50)` | NO | - | 시정조치결과를 식별하기 위한 고유값 |
| 9 | **`PersonnelId`** | 시정조치요청을 처리할 담당자를 식별하기 위한 고유값 | `varchar(50)` | YES | - | 시정조치요청을 처리할 담당자를 식별하기 위한 고유값 |
| 10 | **`PersonInChargeEmail`** | 시정조치담당자이메일명 | `text` | YES | - | 시정조치담당자의 이메일 |
| 11 | **`PersonInChargeDialNumber`** | 시정조치담당자전화번호 | `text` | YES | - | 시정조치담당자의 전화번호 |
| 12 | **`CorrectiveActionConfirmorId`** | 시정조치확인자식별자 | `varchar(50)` | YES | - | 시정조치결과를 확인한 담당자를 식별하기 위한 고유값 |
| 13 | **`CorrectiveActionConfirmorEmail`** | 시정조치확인자이메일명 | `text` | YES | - | 시정조치확인자의 이메일 |
| 14 | **`CorrectiveActionConfirmorDialNumber`** | 시정조치확인자전화번호 | `text` | YES | - | 시정조치확인의 전화번호 |
| 15 | **`CorrectiveActionDateTime`** | 시정조치일시 | `timestamp` | YES | - | 시정조치 처리 완료일시(KS X ISO 8601을 따른다) |
| 16 | **`CorrectiveActionResultDescription`** | 시정조치결과내용 | `text` | YES | - | 시정조치 처리 완료 결과 내용 |
| 17 | **`CorrectiveActionStatusCode`** | 시정조치상태코드 | `varchar(50)` | YES | - | 시정조치 진행 상태(예: 발행/ 접수/ 진행/ 반려/ 완료/ 종결 등) |
| 18 | **`ReasonForRejection`** | 반려사유 | `text` | YES | - | 시정조치 반려 사유 |
| 19 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 20 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 21 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 22 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 23 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 24 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 25 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 26 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |
| 27 | **`CorrectiveActionResultSeq`** | [UD]시정조치결과 시스템 PK | `integer` | NO | PRIMARY KEY | [UD]시정조치결과 시스템 PK |
| 28 | **`Flag`** | 레코드상태 false = 휴지통 | `boolean` | NO | - | 레코드상태 false = 휴지통 |

---

#### 4.6.7 "ProductTraceParameterOnCustomer"
- **테이블 물리명:** `"ProductTraceParameterOnCustomer"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 고객 제품의 파라미터 이력 데이터를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 데이터를 발생시키는 장치(제품, 노드, IoT 장비 등)를 식별하는 고유값 |
| 2 | **`SerialNumber`** | 제조번호 | `varchar(200)` | YES | - | 데이터 발생 장치를 포함하는 제품의 고유 제조번호 |
| 3 | **`Location`** | 위치 | `text` | YES | - | 데이터 발생 장치가 설치된 위치 |
| 4 | **`ItemType`** | 품목유형 | `varchar(50)` | YES | - | 데이터 발생 장치의 유형 |
| 5 | **`ParameterName`** | 파라미터명 | `varchar(200)` | YES | - | 수집하고자 하는 파라미터의 이름 |
| 6 | **`ParameterValue`** | 파라미터값 | `double precision` | YES | - | 수집된 파라미터 데이터의 값 |
| 7 | **`CollectionDateTime`** | 수집일시 | `timestamp` | YES | - | 데이터를 수집한 일시 |
| 8 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | - |
| 9 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | - |
| 10 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | - |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | - |
| 12 | **`CreationDateTime`** | - | `timestamp` | YES | - | - |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | - |
| 14 | **`ModificationDateTime`** | - | `timestamp` | YES | - | - |
| 15 | **`Note`** | 비고 | `text` | YES | - | - |

---

#### 4.6.8 "Alarm"
- **테이블 물리명:** `"Alarm"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 알람(Alarm) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`EquipmentId`** | 설비식별자 | `varchar(50)` | NO | PRIMARY KEY | 설비를 식별하기 위한 고유값 |
| 2 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 공장의 고유 식별값 |
| 3 | **`AlarmState`** | 알람상태 | `varchar(50)` | YES | - | 알람상태(예: Alarm/ No Alarm/ Maintenance/ Normal) |
| 4 | **`ErrorCode`** | 오류코드 | `varchar(50)` | YES | - | 알람 발생 시 해당 오류 코드 값 |
| 5 | **`ErrorMessage`** | 오류메시지 | `text` | YES | - | 알람 발생 시 오류 설명 정보 |
| 6 | **`EventDateTime`** | 이벤트발생일시 | `timestamp` | NO | PRIMARY KEY | 알람 발생 일시 |
| 7 | **`CurrentLocation`** | 현재위치 | `text` | YES | - | 현재 설비의 위치정보(예: EquipmentID(설비식별자)/ StockerInventoryID(저장소재공정보식별자)/ CarrierID(캐리어식별자)) |
| 8 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 9 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 10 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 11 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 12 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.6.9 "AfterSalesServiceRequest"
- **테이블 물리명:** `"AfterSalesServiceRequest"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사후서비스신청(AfterSalesServiceRequest) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 사후서비스 처리 제품을 식별하기 위한 고유값 |
| 2 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 사후서비스 처리 제품의 명칭 |
| 3 | **`RequestNumber`** | 신청번호 | `varchar(200)` | NO | PRIMARY KEY | 사후서비스접수 번호 |
| 4 | **`TransferSequence`** | 이관순번 | `integer` | YES | - | 내리첨 혹은 관련 부서 등에 이관한 순번 |
| 5 | **`BasicAcceptProcessCode`** | 접수내용단순처리코드 | `varchar(50)` | YES | - | 이관 없이 단순처리 시 해당 사유에 해당하는 코드 |
| 6 | **`PromisedVisitDateTime`** | 약속방문일시 | `timestamp` | YES | - | 설치형 제품(보일러/ 에어컨 등)과 같이 사후서비스 제공 시 고객 방문이 필요한 경우 약속 방문 일자 |
| 7 | **`TransferRegistrationCode`** | 이관등록코드 | `varchar(50)` | YES | - | 사후서비스 접수 후 실제 사후서비스를 이관받아 수행할 주체를 식별하기 위한 코드(예: 기사/ 본사/ 대리점 등) |
| 8 | **`SerialNumber`** | 제조번호 | `varchar(200)` | YES | - | 데이터 발생 장치를 포함하는 제품의 고유 제조번호 |
| 9 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 10 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 11 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 12 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 13 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---

#### 4.6.10 "AfterSalesServiceRequestResult"
- **테이블 물리명:** `"AfterSalesServiceRequestResult"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사후서비스결과(AfterSalesServiceRequestResult) 정보를 관리하는 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 26개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ItemId`** | 품목식별자 | `varchar(50)` | YES | - | 사후서비스 처리 제품을 식별하기 위한 고유값 |
| 2 | **`ItemName`** | 품목명 | `varchar(200)` | YES | - | 사후서비스 처리 제품의 명칭 |
| 3 | **`RequestNumber`** | 신청번호 | `varchar(200)` | NO | PRIMARY KEY | 사후서비스접수 번호 |
| 4 | **`TransferSequence`** | 이관순번 | `integer` | YES | - | 대리점 혹은 관련 부서 등에 이관한 순번 |
| 5 | **`RegisterSequence`** | 등록순번 | `integer` | NO | PRIMARY KEY | 사후서비스가 접수 등록된 순번 |
| 6 | **`RepairSequence`** | 수리순번 | `integer` | NO | PRIMARY KEY | 사후서비스가 이루어진 순번 |
| 7 | **`SerialNumber`** | 제조번호 | `varchar(200)` | YES | - | 데이터 발생 경치를 포함하는 제품의 고유 제조번호 |
| 8 | **`FaultLargeClass`** | 하자원인대분류 | `varchar(50)` | YES | - | 제품고장이 속한 원상대분류. 하자원인대분류는 공통코드에 등록하여 관리하며 회사 기준 분류체계에 의해 정해짐 |
| 9 | **`FaultSmallClass`** | 하자원인소분류 | `varchar(50)` | YES | - | 제품고장이 속한 원상소분류. 하자원인소분류는 공통코드에 등록하여 관리하며 회사 기준 분류체계에 의해 정해짐 |
| 10 | **`ErrorCode`** | 오류코드 | `varchar(50)` | YES | - | 제품이 자체적으로 가지고 있거나 조치 결과에 의해 분류된 고장 식별 코드. 에러코드는 공통코드에 등록하여 관리하며 회사 기준 분류 체계에 의해 정해짐 |
| 11 | **`InstallationDate`** | 설치일 | `date` | YES | - | 설치된 제품의 경우 고객에 제품이 설치된 일자 |
| 12 | **`ProcessingDate`** | 처리일 | `date` | YES | - | 사후서비스가 처리된 일자 |
| 13 | **`EndIndicator`** | 종료여부 | `boolean` | YES | - | 사후서비스처리가 완전히 종료되었는지 여부를 확인하기 위한 여부 |
| 14 | **`WorkType`** | 작업유형 | `varchar(50)` | YES | - | 교환/ 수리/ 점검 등 사후서비스 처리 내용 |
| 15 | **`ChildItemCode`** | 자품목코드 | `varchar(50)` | YES | - | 사후서비스가 이루어진 대상 자품목(부품)코드 |
| 16 | **`ChildItemName`** | 자품목명 | `varchar(200)` | YES | - | 사후서비스가 이루어진 대상 자품목(부품)명 |
| 17 | **`ItemSpecification`** | 품목규격 | `text` | YES | - | 품목의 사양 또는 규격 |
| 18 | **`RepairType`** | 수리유형 | `varchar(50)` | YES | - | 사후서비스 부품별로 어떤 현상으로 교체하였는지 관리하기 위한 유형. 수리유형은 공통코드에 등록하여 관리하며 회사 기준 분류 체계에 의해 정해짐 |
| 19 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | NO | - | 생성자 아이디 |
| 20 | **`CreationDatetime`** | 등록일시 | `timestamp` | YES | - | 생성일시 |
| 21 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 아이디 |
| 22 | **`ModificationDatetime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 23 | **`Note`** | 비고 | `text` | YES | - | 비고노트 |
| 24 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | YES | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 25 | **`SiteId`** | 사업장식별자 | `varchar(50)` | YES | - | 회사 내에서 사업장을 구분할 수 있는 고유식별자 |
| 26 | **`PlantId`** | 공장식별자 | `varchar(50)` | YES | - | 회사 내에서 공장을 구분할 수 있는 고유식별자 |

---


### 4.7 도메인 7: 보안, 사용자 및 접근 권한 (Security & RBAC)
> 시스템 사용자, RBAC 역할 및 권한 매핑, OAuth 계정, 테넌트 및 화면 권한

#### 4.7.1 "User"
- **테이블 물리명:** `"User"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** User 테이블 (패스워드/OAuth2.0 계정 모두 지원)
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`UserId`** | 사용자 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | 사용자 고유 식별자 (PK) |
| 2 | **`Email`** | 사용자 이메일(로그인 ID) | `varchar(255)` | NO | UNIQUE | 사용자 이메일(로그인 ID) |
| 3 | **`PasswordHash`** | 비밀번호 해시값 | `varchar(255)` | YES | - | 비밀번호 해시값 |
| 4 | **`IsActive`** | 계정 활성화 여부 | `boolean` | YES | - | 계정 활성화 여부 |
| 5 | **`CreatedAt`** | 계정 생성일시 | `timestamp` | YES | - | 계정 생성일시 |
| 6 | **`UpdatedAt`** | 계정 수정일시 | `timestamp` | YES | - | 계정 수정일시 |
| 7 | **`PersonnelSeq`** | 사원(PERSONNEL) 테이블의 PK (외래키) | `integer` | YES | - | 사원(PERSONNEL) 테이블의 PK (외래키) |
| 8 | **`EnterpriseSeq`** | 기업(ENTERPRISE) 테이블의 PK (외래키) | `integer` | YES | - | 기업(ENTERPRISE) 테이블의 PK (외래키) |

---

#### 4.7.2 "Role"
- **테이블 물리명:** `"Role"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** Role 테이블 (RBAC)
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 3개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`RoleId`** | 역할 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | 역할 고유 식별자 (PK) |
| 2 | **`RoleName`** | 역할명 (예: admin, user 등) | `varchar(100)` | NO | UNIQUE | 역할명 (예: admin, user 등) |
| 3 | **`Description`** | 역할 설명 | `text` | YES | - | 역할 설명 |

---

#### 4.7.3 "Permission"
- **테이블 물리명:** `"Permission"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 세분화된 권한 관리 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 3개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PermissionId`** | 권한 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | 권한 고유 식별자 (PK) |
| 2 | **`PermissionName`** | 권한명 (예: read, write 등) | `varchar(100)` | NO | UNIQUE | 권한명 (예: read, write 등) |
| 3 | **`Description`** | 권한 설명 | `text` | YES | - | 권한 설명 |

---

#### 4.7.4 "RolePermission"
- **테이블 물리명:** `"RolePermission"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** RolePermission 테이블 (Role별 Permission 매핑)
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 3개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`RolePermissionId`** | Role-Permission 매핑 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | Role-Permission 매핑 고유 식별자 (PK) |
| 2 | **`RoleId`** | Role 테이블의 PK (외래키) | `integer` | YES | - | Role 테이블의 PK (외래키) |
| 3 | **`PermissionId`** | Permission 테이블의 PK (외래키) | `integer` | YES | - | Permission 테이블의 PK (외래키) |

---

#### 4.7.5 "UserRole"
- **테이블 물리명:** `"UserRole"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** UserRole 테이블 (N:M 매핑)
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 3개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`UserRoleId`** | User-Role 매핑 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | User-Role 매핑 고유 식별자 (PK) |
| 2 | **`UserId`** | User 테이블의 PK (외래키) | `integer` | YES | - | User 테이블의 PK (외래키) |
| 3 | **`RoleId`** | Role 테이블의 PK (외래키) | `integer` | YES | - | Role 테이블의 PK (외래키) |

---

#### 4.7.6 "OAuthAccount"
- **테이블 물리명:** `"OAuthAccount"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** OAuth2.0 계정 관리 테이블
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 7개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`OAuthAccountId`** | OAuth 계정 고유 식별자 (PK) | `integer` | NO | PRIMARY KEY | OAuth 계정 고유 식별자 (PK) |
| 2 | **`UserId`** | User 테이블의 PK (외래키) | `integer` | YES | - | User 테이블의 PK (외래키) |
| 3 | **`Provider`** | OAuth 제공자 (예: google) | `varchar(50)` | NO | UNIQUE | OAuth 제공자 (예: google) |
| 4 | **`ProviderUserId`** | OAuth 제공자 내 사용자 식별자 | `varchar(255)` | NO | UNIQUE | OAuth 제공자 내 사용자 식별자 |
| 5 | **`AccessToken`** | OAuth Access Token | `text` | YES | - | OAuth Access Token |
| 6 | **`RefreshToken`** | OAuth Refresh Token | `text` | YES | - | OAuth Refresh Token |
| 7 | **`TokenExpiry`** | 토큰 만료일시 | `timestamp` | YES | - | 토큰 만료일시 |

---

#### 4.7.7 "tenants"
- **테이블 물리명:** `"tenants"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 설명 없음
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`Id`** | - | `uuid` | NO | PRIMARY KEY | - |
| 2 | **`Name`** | - | `text` | YES | - | - |
| 3 | **`ExternalId`** | - | `text` | YES | - | - |
| 4 | **`JwtSecret`** | - | `text` | YES | - | - |
| 5 | **`MaxConcurrentUsers`** | - | `integer` | NO | - | - |
| 6 | **`InsertedAt`** | - | `timestamp` | NO | - | - |
| 7 | **`UpdatedAt`** | - | `timestamp` | NO | - | - |
| 8 | **`MaxEventsPerSecond`** | - | `integer` | NO | - | - |
| 9 | **`PostgresCdcDefault`** | - | `text` | YES | - | - |
| 10 | **`MaxBytesPerSecond`** | - | `integer` | NO | - | - |
| 11 | **`MaxChannelsPerClient`** | - | `integer` | NO | - | - |
| 12 | **`MaxJoinsPerSecond`** | - | `integer` | NO | - | - |
| 13 | **`Suspend`** | - | `boolean` | YES | - | - |
| 14 | **`JwtJwks`** | - | `jsonb` | YES | - | - |
| 15 | **`NotifyPrivateAlpha`** | - | `boolean` | YES | - | - |

---

#### 4.7.8 "users"
- **테이블 물리명:** `"users"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** Auth: Stores user login data within a secure schema.
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 35개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`InstanceId`** | - | `uuid` | YES | - | - |
| 2 | **`Id`** | - | `uuid` | NO | PRIMARY KEY | - |
| 3 | **`Aud`** | - | `varchar(255)` | YES | - | - |
| 4 | **`Role`** | - | `varchar(255)` | YES | - | - |
| 5 | **`Email`** | - | `varchar(255)` | YES | - | - |
| 6 | **`EncryptedPassword`** | - | `varchar(255)` | YES | - | - |
| 7 | **`EmailConfirmedAt`** | - | `timestamp with time zone` | YES | - | - |
| 8 | **`InvitedAt`** | - | `timestamp with time zone` | YES | - | - |
| 9 | **`ConfirmationToken`** | - | `varchar(255)` | YES | - | - |
| 10 | **`ConfirmationSentAt`** | - | `timestamp with time zone` | YES | - | - |
| 11 | **`RecoveryToken`** | - | `varchar(255)` | YES | - | - |
| 12 | **`RecoverySentAt`** | - | `timestamp with time zone` | YES | - | - |
| 13 | **`EmailChangeTokenNew`** | - | `varchar(255)` | YES | - | - |
| 14 | **`EmailChange`** | - | `varchar(255)` | YES | - | - |
| 15 | **`EmailChangeSentAt`** | - | `timestamp with time zone` | YES | - | - |
| 16 | **`LastSignInAt`** | - | `timestamp with time zone` | YES | - | - |
| 17 | **`RawAppMetaData`** | - | `jsonb` | YES | - | - |
| 18 | **`RawUserMetaData`** | - | `jsonb` | YES | - | - |
| 19 | **`IsSuperAdmin`** | - | `boolean` | YES | - | - |
| 20 | **`CreatedAt`** | - | `timestamp with time zone` | YES | - | - |
| 21 | **`UpdatedAt`** | - | `timestamp with time zone` | YES | - | - |
| 22 | **`Phone`** | - | `text` | YES | UNIQUE | - |
| 23 | **`PhoneConfirmedAt`** | - | `timestamp with time zone` | YES | - | - |
| 24 | **`PhoneChange`** | - | `text` | YES | - | - |
| 25 | **`PhoneChangeToken`** | - | `varchar(255)` | YES | - | - |
| 26 | **`PhoneChangeSentAt`** | - | `timestamp with time zone` | YES | - | - |
| 27 | **`ConfirmedAt`** | - | `timestamp with time zone` | YES | - | - |
| 28 | **`EmailChangeTokenCurrent`** | - | `varchar(255)` | YES | - | - |
| 29 | **`EmailChangeConfirmStatus`** | - | `smallint` | YES | - | - |
| 30 | **`BannedUntil`** | - | `timestamp with time zone` | YES | - | - |
| 31 | **`ReauthenticationToken`** | - | `varchar(255)` | YES | - | - |
| 32 | **`ReauthenticationSentAt`** | - | `timestamp with time zone` | YES | - | - |
| 33 | **`IsSsoUser`** | Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails. | `boolean` | NO | - | Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails. |
| 34 | **`DeletedAt`** | - | `timestamp with time zone` | YES | - | - |
| 35 | **`IsAnonymous`** | - | `boolean` | NO | - | - |

---

#### 4.7.9 "groups"
- **테이블 물리명:** `"groups"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 그룹
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`GroupSeq`** | 그룹시퀀스 | `integer` | NO | PRIMARY KEY | 그룹시퀀스 |
| 2 | **`GroupName`** | 그룹명 | `varchar` | NO | - | 그룹명 |
| 3 | **`Description`** | 비고 | `text` | YES | - | 비고 |
| 4 | **`Status`** | Y=활성,N=비활성 | `char(1)` | NO | - | Y=활성,N=비활성 |
| 5 | **`CreateUserSeq`** | 최초생성자 | `integer` | NO | - | 최초생성자 |
| 6 | **`CreateDate`** | 최초등록일시 | `timestamp with time zone` | YES | - | 최초등록일시 |
| 7 | **`LastModUserSeq`** | 마지막수정자 | `integer` | YES | - | 마지막수정자 |
| 8 | **`LastModDate`** | 마지막수정일시 | `timestamp with time zone` | YES | - | 마지막수정일시 |

---

#### 4.7.10 "users_group"
- **테이블 물리명:** `"users_group"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사용자-그룹
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 2개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`UserSeq`** | 사용자 | `integer` | NO | - | 사용자 |
| 2 | **`GroupSeq`** | 그룹 | `integer` | NO | - | 그룹 |

---

#### 4.7.11 "screens"
- **테이블 물리명:** `"screens"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 스크린
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ScreenSeq`** | 스크린시퀀스 | `integer` | NO | PRIMARY KEY | 스크린시퀀스 |
| 2 | **`ScreenName`** | 스크린명 | `varchar` | NO | - | 스크린명 |
| 3 | **`Description`** | 비고 | `text` | YES | - | 비고 |
| 4 | **`Status`** | Y=활성,N=비활성 | `char(1)` | NO | - | Y=활성,N=비활성 |
| 5 | **`CreateUserSeq`** | 최초생성자 | `integer` | NO | - | 최초생성자 |
| 6 | **`CreateDate`** | 최초등록일시 | `timestamp with time zone` | YES | - | 최초등록일시 |
| 7 | **`LastModUserSeq`** | 마지막수정자 | `integer` | YES | - | 마지막수정자 |
| 8 | **`LastModDate`** | 마지막수정일시 | `timestamp with time zone` | YES | - | 마지막수정일시 |

---

#### 4.7.12 "user_screen_access"
- **테이블 물리명:** `"user_screen_access"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 사용자-스크린권한
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 5개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`AccessSeq`** | 접근시퀀스 | `integer` | NO | PRIMARY KEY | 접근시퀀스 |
| 2 | **`UserSeq`** | 사용자시퀀스 | `integer` | NO | - | 사용자시퀀스 |
| 3 | **`ScreenSeq`** | 스크린시퀀스 | `integer` | NO | - | 스크린시퀀스 |
| 4 | **`Cud`** | 생성수정삭제권한 | `char(1)` | YES | - | 생성수정삭제권한 |
| 5 | **`Vie`** | 보기권한 | `char(1)` | YES | - | 보기권한 |

---

#### 4.7.13 "logs"
- **테이블 물리명:** `"logs"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** CRUD기록
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 5개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`LogSeq`** | 로그시퀀스 | `bigint` | NO | PRIMARY KEY | 로그시퀀스 |
| 2 | **`LogType`** | C,R,U,D | `char(1)` | NO | - | C,R,U,D |
| 3 | **`LogMsg`** | 로그메시지 | `varchar` | YES | - | 로그메시지 |
| 4 | **`UserSeq`** | 사용자시퀀스(기록자) | `integer` | NO | - | 사용자시퀀스(기록자) |
| 5 | **`CreateDate`** | 기록타임스탬프 | `timestamp with time zone` | YES | - | 기록타임스탬프 |

---

#### 4.7.14 "socialaccounts"
- **테이블 물리명:** `"socialaccounts"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 소셜어카운트
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 13개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SocialaccountSeq`** | 소셜어카운트시퀀스 | `integer` | NO | PRIMARY KEY | 소셜어카운트시퀀스 |
| 2 | **`SocialproviderSeq`** | - | `integer` | NO | - | - |
| 3 | **`SocialId`** | 소셜아이디(이메일) | `varchar` | NO | - | 소셜아이디(이메일) |
| 4 | **`SocialInId`** | 소셜아이디(내부ID) | `varchar` | NO | - | 소셜아이디(내부ID) |
| 5 | **`UserSeq`** | 사용자시퀀스(참조키) | `integer` | NO | - | 사용자시퀀스(참조키) |
| 6 | **`AccessToken`** | 소셜엑세스토큰 | `varchar` | NO | - | 소셜엑세스토큰 |
| 7 | **`RefreshToken`** | 소셜갱신토큰 | `varchar` | NO | - | 소셜갱신토큰 |
| 8 | **`Description`** | 비고 | `text` | YES | - | 비고 |
| 9 | **`Status`** | Y=활성,N=비활성 | `char(1)` | NO | - | Y=활성,N=비활성 |
| 10 | **`CreateUserSeq`** | 최초생성자 | `integer` | NO | - | 최초생성자 |
| 11 | **`CreateDate`** | 최초등록일시 | `timestamp with time zone` | YES | - | 최초등록일시 |
| 12 | **`LastModUserSeq`** | 마지막수정자 | `integer` | YES | - | 마지막수정자 |
| 13 | **`LastModDate`** | 마지막수정일시 | `timestamp with time zone` | YES | - | 마지막수정일시 |

---

#### 4.7.15 "socialproviders"
- **테이블 물리명:** `"socialproviders"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 소셜프로바이더(소셜로그인)
- **관리 시스템:** `KICOX` | **작성/관리자:** `이인배` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SocialproviderSeq`** | 소셜시퀀스 | `bigint` | NO | PRIMARY KEY | 소셜시퀀스 |
| 2 | **`SocialproviderName`** | 소셜프로바이더명 | `varchar` | NO | - | 소셜프로바이더명 |
| 3 | **`Description`** | 비고 | `text` | YES | - | 비고 |
| 4 | **`Status`** | Y=활성,N=비활성 | `char(1)` | NO | - | Y=활성,N=비활성 |
| 5 | **`CreateUserSeq`** | 최초생성자 | `integer` | NO | - | 최초생성자 |
| 6 | **`CreateDate`** | 최초등록일시 | `timestamp with time zone` | YES | - | 최초등록일시 |
| 7 | **`LastModUserSeq`** | 마지막수정자 | `integer` | YES | - | 마지막수정자 |
| 8 | **`LastModDate`** | 마지막수정일시 | `timestamp with time zone` | YES | - | 마지막수정일시 |

---


### 4.8 도메인 8: AAS 모델 (프로젝트 범위 제외 안내)
> **[안내]** 본 MPSI 시스템은 자동차/전자 사출 플라스틱 부품 제조 및 금형 개발·사출 양산 14단계(Step 0~13) 실무 협업 SCM 플랫폼에 집중하며, 인더스트리 4.0 디지털 트윈 자산관리쉘(AAS) 전용 엔티티(`aasmodels`, `submodels`, `aasmodel_category`, `categories`, `validations`)는 **본 프로젝트 범위에서 제외**되었습니다. (DDL 스키마 및 TypeScript 타입 정의에서도 완전 삭제 처리됨)

---


### 4.9 도메인 9: MPSI 금형/사출 13단계 프로세스 특화 테이블 (MPSI 13-Step Workflow)
> KS X 9101-1에 부재한 금형 개발부터 사출 양산에 이르는 13단계 워크플로우 상태 머신, T1/T2 시사출 성형조건, 6대 서류 이관, Cpk/PPAP 품질 검증 및 실시간 아크톡 협업 피드 (KSX9101 명명규칙 및 BaseAttributes 완전 준용)

#### 4.9.1 "MpsiProjectStage"
- **테이블 물리명:** `"MpsiProjectStage"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형/사출 13단계 프로세스 워크플로우 진행 상태 머신 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 22개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ProjectStageId`** | 프로젝트단계식별자 | `varchar(50)` | NO | PRIMARY KEY | 단계 고유 식별자 (예: STG-PRJ2026-01) |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 외래키 |
| 3 | **`StageStepNumber`** | 단계번호 | `integer` | NO | - | 1~13단계 순번 (1:도면접수 ~ 13:양산납품) |
| 4 | **`StageName`** | 단계명 | `varchar(100)` | NO | - | 단계 명칭 (예: 제품 data 접수, 금형 발주 등) |
| 5 | **`StageGroup`** | 단계그룹 | `varchar(50)` | NO | - | 도면/수주, 금형개발, 시사출육성, 사출양산 |
| 6 | **`ActorRole`** | 주관역할 | `varchar(50)` | NO | - | MPSI, VENDOR_MOLD, VENDOR_MASS, ADMIN |
| 7 | **`ActorVendorId`** | 담당협력사식별자 | `varchar(50)` | YES | - | 담당 금형사/양산사 식별자 (VendorPartyMaster 연계) |
| 8 | **`StageStatusCode`** | 단계상태코드 | `varchar(50)` | NO | - | LOCKED, READY, IN_PROGRESS, REVIEWING, APPROVED, REJECTED |
| 9 | **`PlannedStartDate`** | 계획시작일 | `date` | YES | - | 단계 계획 착수일자 |
| 10 | **`PlannedEndDate`** | 계획완료일 | `date` | YES | - | 단계 계획 완료일자 |
| 11 | **`ActualStartDate`** | 실제착수일시 | `timestamp` | YES | - | 실제 착수 타임스탬프 |
| 12 | **`ActualEndDate`** | 실제완료일시 | `timestamp` | YES | - | 실제 승인/완료 타임스탬프 |
| 13 | **`StageProgressRate`** | 진척률 | `numeric(5,2)` | YES | - | 단계 진척 백분율 (0.00 ~ 100.00) |
| 14 | **`StageData`** | 단계상세데이터 | `jsonb` | YES | - | 체크리스트, 동적 서식, 첨부 메타데이터 JSONB |
| 15 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사를 유일하게 구분할 수 있는 고유식별자 |
| 16 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장 고유식별자 |
| 17 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장 고유식별자 |
| 18 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 최초 등록자 사번/아이디 |
| 19 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 최초 등록일시 (ISO 8601) |
| 20 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 최종 수정자 사번/아이디 |
| 21 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 최종 수정일시 (ISO 8601) |
| 22 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.2 "MpsiMoldQuotation"
- **테이블 물리명:** `"MpsiMoldQuotation"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형 견적 및 발주(4단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 17개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`QuotationId`** | 견적식별자 | `varchar(50)` | NO | PRIMARY KEY | 견적 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`VendorId`** | 금형제작사식별자 | `varchar(50)` | NO | FOREIGN KEY | VendorPartyMaster 참조 |
| 4 | **`QuotationVersion`** | 견적차수 | `integer` | NO | - | 견적 제출 차수 |
| 5 | **`EstimatedMoldCost`** | 견적금형금액 | `numeric(18,2)` | NO | - | 금형 제작 견적가 (KRW) |
| 6 | **`TargetT1Date`** | 목표T1시사출일 | `date` | YES | - | 1차 시사출 목표일정 |
| 7 | **`TargetDeliveryDate`** | 목표납기일 | `date` | YES | - | 최종 납품 목표일정 |
| 8 | **`QuotationStatusCode`** | 견적상태코드 | `varchar(50)` | NO | - | DRAFT, SUBMITTED, CONFIRMED, REJECTED, ORDER_PLACED |
| 9 | **`PurchaseOrderId`** | 발주식별자 | `varchar(50)` | YES | FOREIGN KEY | PurchaseOrder 참조 |
| 10 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 11 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 12 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 13 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 14 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 15 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 16 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 17 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.3 "MpsiMoldDesign"
- **테이블 물리명:** `"MpsiMoldDesign"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형 설계, DR(도면검토), CAE 유동해석(2, 3, 5단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 20개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`MoldDesignId`** | 금형설계식별자 | `varchar(50)` | NO | PRIMARY KEY | 금형 설계 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`DesignVersion`** | 설계버전 | `varchar(50)` | NO | - | 설계 버전 (예: Rev 1.0) |
| 4 | **`CadFileUrl`** | CAD도면URL | `text` | YES | - | 2D/3D CAD 파일 S3/스토리지 링크 |
| 5 | **`CaeReportUrl`** | CAE보고서URL | `text` | YES | - | 유동해석 시뮬레이션 보고서 링크 |
| 6 | **`DrDocumentUrl`** | DR도면검토문서URL | `text` | YES | - | Design Review 검토서 링크 |
| 7 | **`CavityCount`** | 캐비티수 | `integer` | YES | - | 금형 캐비티 수량 (1, 2, 4, 8 등) |
| 8 | **`GateType`** | 게이트유형 | `varchar(50)` | YES | - | 게이트 방식 (Side, Pin, Submarine, Hot-runner 등) |
| 9 | **`MoldSteelType`** | 금형강재종류 | `varchar(100)` | YES | - | 코어/캐비티 강재 사양 (NAK80, KP4M 등) |
| 10 | **`DesignStatusCode`** | 설계상태코드 | `varchar(50)` | NO | - | SUBMITTED, UNDER_REVIEW, MODIFICATION_REQUESTED, APPROVED |
| 11 | **`ApprovedBy`** | 승인자 | `varchar(50)` | YES | - | MPSI 검토 승인자 사번 |
| 12 | **`ApprovalDateTime`** | 승인일시 | `timestamp` | YES | - | 승인 타임스탬프 |
| 13 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 14 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 15 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 16 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 17 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 18 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 19 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 20 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.4 "MpsiMoldManufacture"
- **테이블 물리명:** `"MpsiMoldManufacture"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형 강재발주 및 가공일정(6단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ManufactureId`** | 가공제작식별자 | `varchar(50)` | NO | PRIMARY KEY | 가공제작 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`SteelOrderDate`** | 강재발주일자 | `date` | YES | - | 소재 발주일자 |
| 4 | **`SteelArrivalDate`** | 강재입고일자 | `date` | YES | - | 소재 입고일자 |
| 5 | **`MachiningStartDate`** | 가공착수일자 | `date` | YES | - | CNC/밀링/방전 가공 착수일 |
| 6 | **`WeeklyScheduleUrl`** | 주간공정일정표URL | `text` | YES | - | 매주 업데이트되는 공정표 파일 링크 |
| 7 | **`AssemblyCompleteDate`** | 조립완료일자 | `date` | YES | - | 금형 조립 완료 예정/실제일 |
| 8 | **`ManufactureProgressRate`** | 가공진척률 | `numeric(5,2)` | YES | - | 가공 진척률(%) |
| 9 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 10 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 11 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 12 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 13 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 14 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 15 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 16 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.5 "MpsiMoldTrial"
- **테이블 물리명:** `"MpsiMoldTrial"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 시사출(T1/T2) 성형조건 및 육성 기록(7단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 22개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`MoldTrialId`** | 시사출식별자 | `varchar(50)` | NO | PRIMARY KEY | 시사출 고유식별자 (예: TRL-2026-T1) |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`TrialNumber`** | 시사출차수 | `varchar(20)` | NO | - | T1, T2, T3, T-Final 등 |
| 4 | **`TrialDateTime`** | 시사출일시 | `timestamp` | NO | - | 시사출 실시 일시 |
| 5 | **`EquipmentId`** | 사출기식별자 | `varchar(50)` | YES | FOREIGN KEY | 실시 사출성형기 (Equipment 참조) |
| 6 | **`ResinGrade`** | 수지원료그레이드 | `varchar(100)` | YES | - | 사용 수지명 및 제조사 (예: ABS HF-380) |
| 7 | **`InjectionPressure`** | 사출압력 | `numeric(10,2)` | YES | - | 사출 압력 (bar / MPa) |
| 8 | **`HoldingPressure`** | 보압 | `numeric(10,2)` | YES | - | 보압 수치 (bar / MPa) |
| 9 | **`CylinderTemperature`** | 실린더온도 | `numeric(10,2)` | YES | - | 노즐/실린더 온도 (℃) |
| 10 | **`MoldTemperature`** | 금형온도 | `numeric(10,2)` | YES | - | 금형 냉각수 온도 (℃) |
| 11 | **`CycleTime`** | 사이클타임 | `numeric(8,2)` | YES | - | 1회 성형 사이클 타임 (초) |
| 12 | **`TrialResultCode`** | 시사출판정코드 | `varchar(50)` | NO | - | PASS, CONDITIONAL_PASS, FAIL, RE_TRIAL_REQUIRED |
| 13 | **`TrialReportUrl`** | 시사출보고서URL | `text` | YES | - | 시사출 성형보고서 링크 |
| 14 | **`DefectDescription`** | 결함내용 | `text` | YES | - | 수축, 웰드라인, 플래시(바리), 미성형 등 |
| 15 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 16 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 17 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 18 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 19 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 20 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 21 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 22 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.6 "MpsiInspectionReport"
- **테이블 물리명:** `"MpsiInspectionReport"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 제품 치수 및 외관 검사, 품질 보고서(8단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 19개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`InspectionReportId`** | 검사성적서식별자 | `varchar(50)` | NO | PRIMARY KEY | 검사성적서 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`MoldTrialId`** | 시사출식별자 | `varchar(50)` | YES | FOREIGN KEY | MpsiMoldTrial 연계 |
| 4 | **`InspectionDate`** | 검사실시일자 | `date` | NO | - | 검사 실시일자 |
| 5 | **`InspectorName`** | 검사자성명 | `varchar(100)` | YES | - | 검사자 명칭 |
| 6 | **`MpsiWitnessIndicator`** | MPSI참관여부 | `boolean` | NO | - | MPSI 엔지니어 입회 검사 여부 |
| 7 | **`DimensionCheckData`** | 치수측정데이터 | `jsonb` | YES | - | 3차원 측정 포인트별 스펙 및 실측치 JSONB |
| 8 | **`AppearanceCheckData`** | 외관검사데이터 | `jsonb` | YES | - | 외관, 광택, 웰드라인, 수축 체크리스트 |
| 9 | **`InspectionJudgementCode`** | 검사판정코드 | `varchar(50)` | NO | - | OK, NG, CONDITIONAL_PASS |
| 10 | **`CorrectionActionRequired`** | 금형수정요구사항 | `text` | YES | - | 금형 보완 및 수정 요구 내역 |
| 11 | **`ReportFileUrl`** | 성적서파일URL | `text` | YES | - | 공인 검사성적서 첨부파일 URL |
| 12 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 13 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 14 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 15 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 16 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 17 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 18 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 19 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.7 "MpsiMoldApproval"
- **테이블 물리명:** `"MpsiMoldApproval"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형 육성 완료 및 최종 승인원(9단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 15개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ApprovalId`** | 승인원식별자 | `varchar(50)` | NO | PRIMARY KEY | 승인원 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`ApprovalDocumentNo`** | 승인원문서번호 | `varchar(100)` | NO | - | 금형 최종 승인원 공식 문서번호 |
| 4 | **`FinalSampleConfirmation`** | 최종샘플확인여부 | `boolean` | NO | - | 금형사-MPSI 최종 샘플 합격 확인 |
| 5 | **`ApprovalStatusCode`** | 승인상태코드 | `varchar(50)` | NO | - | SUBMITTED, APPROVED, CONDITIONAL_APPROVED |
| 6 | **`ApprovedDate`** | 승인일자 | `date` | YES | - | MPSI 최종 승인일자 |
| 7 | **`ApprovalDocumentUrl`** | 승인원문서URL | `text` | YES | - | 날인된 승인원 스캔본 URL |
| 8 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 9 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 10 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 11 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 12 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 13 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 14 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 15 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.8 "MpsiMoldTransfer"
- **테이블 물리명:** `"MpsiMoldTransfer"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 금형 및 6대 핵심 서류 양산처 이관(10단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 21개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`TransferId`** | 이관식별자 | `varchar(50)` | NO | PRIMARY KEY | 이관 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`FromVendorId`** | 인출처(금형사) | `varchar(50)` | NO | FOREIGN KEY | 금형제작사 (VendorPartyMaster) |
| 4 | **`ToVendorId`** | 인수처(양산사) | `varchar(50)` | NO | FOREIGN KEY | 사출양산사 (VendorPartyMaster) |
| 5 | **`TransferDate`** | 실제이관일자 | `date` | NO | - | 금형 실물 입고/이관 완료일 |
| 6 | **`DocDrawing2d3dIndicator`** | 1_도면제출여부 | `boolean` | NO | - | 2D/3D 최종 완성도면 인계 여부 |
| 7 | **`DocMoldSpecIndicator`** | 2_제작사양서여부 | `boolean` | NO | - | 금형제작사양서/부품명세서 인계 여부 |
| 8 | **`DocConditionSheetIndicator`** | 3_성형조건표여부 | `boolean` | NO | - | 표준 성형조건표(T-Final) 인계 여부 |
| 9 | **`DocInspectionSheetIndicator`** | 4_검사성적서여부 | `boolean` | NO | - | 치수/외관 공인 검사성적서 인계 여부 |
| 10 | **`DocChecklistIndicator`** | 5_체크리스트여부 | `boolean` | NO | - | 금형 육성 점검 체크리스트 인계 여부 |
| 11 | **`DocApprovalSheetIndicator`** | 6_승인원여부 | `boolean` | NO | - | 최종 서명 금형승인원 인계 여부 |
| 12 | **`AllSixDocumentsConfirmed`** | 6대서류완비여부 | `boolean` | NO | - | 6대 서류 전체 검증 및 수령 완료 여부 |
| 13 | **`TransferReceiptFileUrl`** | 인수증파일URL | `text` | YES | - | 양산처 인수증 날인본 파일 링크 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 17 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 18 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 19 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 20 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 21 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.9 "MpsiMassProductionValidation"
- **테이블 물리명:** `"MpsiMassProductionValidation"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 양산승인 사출/시양산 검증, Cpk, 수율(11단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 18개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`ValidationId`** | 시양산검증식별자 | `varchar(50)` | NO | PRIMARY KEY | 시양산 검증 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`TrialProductionDate`** | 시양산실시일자 | `date` | NO | - | 양산 설비에서의 시양산 일자 |
| 4 | **`ProductionShotCount`** | 연속사출쇼트수 | `integer` | NO | - | 연속 사출 검증 Shot 수 (예: 300 shot) |
| 5 | **`ActualCycleTime`** | 실측사이클타임 | `numeric(8,2)` | YES | - | 양산기 실측 초단위 Cycle Time |
| 6 | **`TargetCycleTime`** | 목표사이클타임 | `numeric(8,2)` | YES | - | 견적/계약 기준 목표 Cycle Time |
| 7 | **`CpkScore`** | 공정능력지수Cpk | `numeric(8,4)` | YES | - | 주요 치수 공정능력지수 (목표 1.33 또는 1.67 이상) |
| 8 | **`YieldRate`** | 수율 | `numeric(5,2)` | YES | - | 양품 생산 수율(%) |
| 9 | **`DailyCapacity`** | 일일양산능력 | `integer` | YES | - | 일일 Capa 수량 |
| 10 | **`ValidationStatusCode`** | 검증상태코드 | `varchar(50)` | NO | - | TESTING, QUALIFIED, DISQUALIFIED |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 14 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 15 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 16 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 17 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 18 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.10 "MpsiPpapDocument"
- **테이블 물리명:** `"MpsiPpapDocument"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 양산품질 검증 (PPAP 18대 요건, PSW 제출/승인)(12단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PpapId`** | PPAP식별자 | `varchar(50)` | NO | PRIMARY KEY | PPAP 패키지 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`PpapSubmissionLevel`** | PPAP제출레벨 | `varchar(20)` | NO | - | Level 1 ~ Level 5 (기본: Level 3) |
| 4 | **`PswStatusCode`** | 보증서(PSW)상태코드 | `varchar(50)` | NO | - | DRAFT, SUBMITTED, APPROVED, INTERIM_APPROVED, REJECTED |
| 5 | **`CustomerApprovalDate`** | 고객사승인일자 | `date` | YES | - | 원청 완성차/고객사 최종 서명일자 |
| 6 | **`PpapChecklistData`** | PPAP18대요건체크데이터 | `jsonb` | YES | - | 도면, DFMEA, PFMEA, Control Plan, MSA, Cpk, 초품검사 등 18대 항목 상태 JSONB |
| 7 | **`MasterSampleConfirmation`** | 한도견본확인여부 | `boolean` | NO | - | 골든/마스터 샘플 고객사 제출 및 보관 확인 |
| 8 | **`PswFileUrl`** | PSW보증서파일URL | `text` | YES | - | 서명된 PSW(Part Submission Warrant) PDF 링크 |
| 9 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 10 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 11 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 12 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 13 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 14 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 15 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 16 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.11 "MpsiMassSettlement"
- **테이블 물리명:** `"MpsiMassSettlement"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 양산 납품 및 정산 마감(13단계) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 17개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`SettlementId`** | 정산마감식별자 | `varchar(50)` | NO | PRIMARY KEY | 정산 마감 고유식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`SettlementYearMonth`** | 정산년월 | `varchar(7)` | NO | - | 정산 대상 월 (예: 2026-10) |
| 4 | **`TotalDeliveredQuantity`** | 총납품수량 | `numeric(18,4)` | NO | - | 해당월 누적 정상 납품 수량 |
| 5 | **`TotalClaimQuantity`** | 클레임/불량수량 | `numeric(18,4)` | YES | - | 고객사 반품/공정 불량 수량 |
| 6 | **`TotalSettlementAmount`** | 총정산금액 | `numeric(18,2)` | NO | - | 공급가액 합계 (KRW) |
| 7 | **`TaxAmount`** | 부가세액 | `numeric(18,2)` | NO | - | 부가가치세 (KRW) |
| 8 | **`SettlementStatusCode`** | 정산상태코드 | `varchar(50)` | NO | - | CALCULATED, CONFIRMED, INVOICED, PAID |
| 9 | **`TaxInvoiceNumber`** | 전자세금계산서승인번호 | `varchar(100)` | YES | - | 국세청 전자세금계산서 승인번호 |
| 10 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 11 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 12 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 13 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 14 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 15 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 16 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 17 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.12 "MpsiArcTalkMessage"
- **테이블 물리명:** `"MpsiArcTalkMessage"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 본사-협력사 간 도면/공정별 실시간 기술 협업 피드(아크톡) 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 18개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`MessageId`** | 메시지식별자 | `varchar(50)` | NO | PRIMARY KEY | 메시지 고유식별자 (UUID 등) |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`StageStepNumber`** | 연관단계순번 | `integer` | YES | - | 연관된 13단계 프로세스 순번 (1~13) |
| 4 | **`SenderUserId`** | 발신자사용자식별자 | `varchar(50)` | NO | FOREIGN KEY | User 참조 |
| 5 | **`SenderRole`** | 발신자역할 | `varchar(50)` | NO | - | MPSI, VENDOR_MOLD, VENDOR_MASS, ADMIN |
| 6 | **`SenderVendorId`** | 발신자소속사식별자 | `varchar(50)` | YES | FOREIGN KEY | VendorPartyMaster 참조 |
| 7 | **`MessageContent`** | 메시지내용 | `text` | NO | - | 기술 질의, 피드백, 지시 내용 |
| 8 | **`AttachmentFileUrls`** | 첨부파일URL목록 | `jsonb` | YES | - | 도면 마크업 이미지, 사진, 문서 링크 JSONB |
| 9 | **`MentionedRoles`** | 멘션역할목록 | `varchar(200)` | YES | - | @MPSI, @VENDOR_MOLD 등 알림 대상 |
| 10 | **`ReadStatusData`** | 읽음확인상태 | `jsonb` | YES | - | 역할/사용자별 수신 및 열람 일시 JSONB |
| 11 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 12 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 13 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 14 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 15 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 16 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 17 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 18 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.13 "MpsiPmRevisionMaster"
- **테이블 물리명:** `"MpsiPmRevisionMaster"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 양산 납품, PM 및 설계변경(Step 13) 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 16개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PmMasterId`** | PM마스터식별자 | `varchar(50)` | NO | PRIMARY KEY | PM 및 설변 고유 식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`CurrentState`** | 현재상태 | `varchar(20)` | NO | - | 양산 중, PM 중, 설변 중 |
| 4 | **`CurrentRound`** | 현재PM차수 | `integer` | NO | - | 1 ~ 30차 |
| 5 | **`CurrentShots`** | 현재누적타수 | `integer` | NO | - | 누적 사출 타수 |
| 6 | **`PmCycleShots`** | PM주기타수 | `integer` | NO | - | 정기 분해점검 주기 (기본 40,000샷) |
| 7 | **`WarrantyShots`** | 보증수명타수 | `integer` | NO | - | 금형 보증 수명 샷 (기본 300,000샷) |
| 8 | **`ActiveProcess`** | 현재진행공정 | `varchar(100)` | YES | - | 금형 분해 점검 중, 코어 세척 등 |
| 9 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 10 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 11 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 12 | **`CreatorId`** | 등록자식별자 | `varchar(50)` | YES | - | 등록자 |
| 13 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |
| 14 | **`ModifierId`** | 수정자식별자 | `varchar(50)` | YES | - | 수정자 |
| 15 | **`ModificationDateTime`** | 수정일시 | `timestamp` | YES | - | 수정일시 |
| 16 | **`Note`** | 비고사항 | `text` | YES | - | 비고사항 |

---

#### 4.9.14 "MpsiPmRound"
- **테이블 물리명:** `"MpsiPmRound"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 1차~30차 PM 회차별 개별 저장 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 17개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`PmRoundId`** | PM회차식별자 | `varchar(50)` | NO | PRIMARY KEY | PM 회차 고유 식별자 |
| 2 | **`PmMasterId`** | PM마스터식별자 | `varchar(50)` | NO | FOREIGN KEY | MpsiPmRevisionMaster 참조 |
| 3 | **`RoundNumber`** | 회차번호 | `integer` | NO | - | 1 ~ 30차 순번 |
| 4 | **`CurrentShots`** | 당시누적타수 | `integer` | YES | - | 점검 당시 누적 타수 |
| 5 | **`PmReason`** | PM사유 | `varchar(100)` | YES | - | 정기점검, 불량개선, 긴급보수 |
| 6 | **`LastPmDate`** | 직전PM일자 | `date` | YES | - | 직전 점검 일자 |
| 7 | **`PlanStartDate`** | 계획시작일자 | `date` | YES | - | 점검 시작 계획일 |
| 8 | **`PlanEndDate`** | 계획종료일자 | `date` | YES | - | 점검 종료 계획일 |
| 9 | **`PlanMassStartDate`** | 계획양산재개일자 | `date` | YES | - | 양산 재개 계획일 |
| 10 | **`ActualStartDate`** | 실제시작일자 | `date` | YES | - | 점검 시작 실제일 |
| 11 | **`ActualEndDate`** | 실제종료일자 | `date` | YES | - | 점검 종료 실제일 |
| 12 | **`ActualMassStartDate`** | 실제양산재개일자 | `date` | YES | - | 양산 재개 실제일 |
| 13 | **`ActiveProcess`** | 점검공정 | `varchar(100)` | YES | - | 진행 공정 |
| 14 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 15 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 16 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |
| 17 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |

---

#### 4.9.15 "MpsiRevisionHistory"
- **테이블 물리명:** `"MpsiRevisionHistory"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 신작/설변(N001, E001, E002) 이력 관리 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 12개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`HistoryId`** | 변경이력식별자 | `varchar(50)` | NO | PRIMARY KEY | 변경이력 고유 식별자 |
| 2 | **`PmMasterId`** | PM마스터식별자 | `varchar(50)` | NO | FOREIGN KEY | MpsiPmRevisionMaster 참조 |
| 3 | **`RevisionCode`** | 차수코드 | `varchar(20)` | NO | - | N001, E001, E002 등 |
| 4 | **`RevisionDate`** | 변경일자 | `date` | NO | - | 설계변경 발의 일자 |
| 5 | **`Title`** | 제목 | `varchar(150)` | NO | - | 1차 설계변경 (E001) 등 |
| 6 | **`ModelReviewContent`** | 3D모델검토내용 | `text` | YES | - | 3D 제품 모델 검토 승인 내역 |
| 7 | **`MoldCostQuoteContent`** | 금형견적검토내용 | `text` | YES | - | 설변 금형 수정비 견적 내역 |
| 8 | **`MoldTrialReportContent`** | 시사출보고내용 | `text` | YES | - | 금형처 시사출 결과 |
| 9 | **`MassValidationReportContent`** | 시양산보고내용 | `text` | YES | - | 양산처 시양산 결과 |
| 10 | **`AuthorName`** | 발의자성명 | `varchar(50)` | YES | - | 발의자 명칭 |
| 11 | **`Memo`** | 변경사유메모 | `text` | YES | - | 상세 변경 사유 |
| 12 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 등록일시 |

---

#### 4.9.16 "MpsiNotification"
- **테이블 물리명:** `"MpsiNotification"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** MPSI 전사 공통 업무 메모 알림 및 확인 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 12개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`NotificationId`** | 알림식별자 | `varchar(50)` | NO | PRIMARY KEY | 알림 고유 식별자 |
| 2 | **`MenuName`** | 메뉴명 | `varchar(100)` | NO | - | 양산외주 - PM 및 설변관리 등 |
| 3 | **`MenuPath`** | 메뉴이동경로 | `varchar(255)` | NO | - | /portal/vendor-portal/mass/revision 등 |
| 4 | **`SenderCompany`** | 발신회사명 | `varchar(100)` | NO | - | MPSI 본사, (주)뉴몰드, 우성정공(주) |
| 5 | **`SenderName`** | 발신자성명 | `varchar(50)` | NO | - | 작성자 |
| 6 | **`Content`** | 알림내용 | `text` | NO | - | 알림 메모 전문 |
| 7 | **`ProjectNo`** | 프로젝트관리번호 | `varchar(50)` | YES | - | MI26001P0 등 |
| 8 | **`TargetRole`** | 대상권한 | `varchar(30)` | NO | - | MPSI, VENDOR_MOLD, VENDOR_MASS, ALL |
| 9 | **`TargetVendorName`** | 대상협력사명 | `varchar(100)` | YES | - | 특정 협력사 대상 필터링 |
| 10 | **`IsConfirmed`** | 확인완료여부 | `boolean` | NO | - | 확인 누르기 전까지 영구 보존 |
| 11 | **`CreatedDateTime`** | 등록일시 | `timestamp` | YES | - | 알림 발생 일시 |
| 12 | **`ConfirmedDateTime`** | 확인일시 | `timestamp` | YES | - | 사용자가 확인 클릭한 일시 |

---

#### 4.9.17 "MpsiDeliveryTracking"
- **테이블 물리명:** `"MpsiDeliveryTracking"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** SCM 배송현황 및 차량 관제 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 23개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`DeliveryId`** | 배송식별자 | `varchar(50)` | NO | PRIMARY KEY | 배송 고유 식별자 |
| 2 | **`TrackingNumber`** | 운송장번호 | `varchar(100)` | NO | - | CJ-20261018-001 등 |
| 3 | **`ProjectNo`** | 프로젝트관리번호 | `varchar(50)` | NO | - | 프로젝트 관리번호 |
| 4 | **`CustomerName`** | 납품고객사명 | `varchar(100)` | NO | - | 현대자동차(아산공장) 등 |
| 5 | **`Destination`** | 하차지상세 | `varchar(150)` | YES | - | 아산공장 1라인 부품하차장 B구역 |
| 6 | **`ProductName`** | 품목명 | `varchar(100)` | YES | - | Front Door Upper Cover |
| 7 | **`PartNo`** | 품번 | `varchar(50)` | YES | - | 84710-NT500-LH |
| 8 | **`Quantity`** | 출하수량 | `integer` | NO | - | 출하/배송 수량 |
| 9 | **`Unit`** | 단위 | `varchar(10)` | NO | - | EA, BOX 등 |
| 10 | **`DeliveryStatus`** | 배송상태 | `varchar(20)` | NO | - | 출하준비, 배송중, 배송완료 |
| 11 | **`CarrierName`** | 운송사명 | `varchar(50)` | YES | - | CJ대한통운 등 |
| 12 | **`VehicleNumber`** | 차량번호 | `varchar(30)` | YES | - | 경기 88바 1234 |
| 13 | **`VehicleType`** | 차량종류 | `varchar(50)` | YES | - | 11톤 윙바디 등 |
| 14 | **`DriverName`** | 기사성명 | `varchar(50)` | YES | - | 운전 기사명 |
| 15 | **`DriverPhone`** | 기사연락처 | `varchar(30)` | YES | - | 연락처 |
| 16 | **`DepartureDateTime`** | 출발일시 | `timestamp` | YES | - | 출발 일시 |
| 17 | **`EstimatedArrivalDateTime`** | 도착예정일시 | `timestamp` | YES | - | 도착 예정 일시 |
| 18 | **`ActualArrivalDateTime`** | 실제도착일시 | `timestamp` | YES | - | 실제 도착 일시 |
| 19 | **`CurrentLocation`** | 현재위치 | `varchar(100)` | YES | - | 경기도 평택 배송거점 등 |
| 20 | **`ApiSource`** | 연동API제공처 | `varchar(50)` | YES | - | CJ_LOGISTICS_API 등 |
| 21 | **`EnterpriseId`** | 회사식별자 | `varchar(50)` | NO | - | 회사식별자 |
| 22 | **`SiteId`** | 사업장식별자 | `varchar(50)` | NO | - | 사업장식별자 |
| 23 | **`PlantId`** | 공장식별자 | `varchar(50)` | NO | - | 공장식별자 |

---

#### 4.9.18 "MpsiProjectStepAttachment"
- **테이블 물리명:** `"MpsiProjectStepAttachment"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공정 단계별(Step 0~13) 실무 첨부파일 저장 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 9개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`AttachmentId`** | 첨부파일식별자 | `varchar(50)` | NO | PRIMARY KEY | 첨부파일 고유 식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`StepNumber`** | 공정단계번호 | `integer` | NO | - | 0 ~ 13 단계 순번 |
| 4 | **`FileName`** | 첨부파일명 | `varchar(150)` | NO | - | [3D_CATIA]_Rev01.stp 등 |
| 5 | **`FileSize`** | 파일크기 | `varchar(30)` | YES | - | 38.2 MB 등 |
| 6 | **`FileExtension`** | 파일확장자 | `varchar(10)` | YES | - | stp, dwg, pdf, xlsx, zip |
| 7 | **`FileUrl`** | 파일다운로드URL | `text` | NO | - | S3/오브젝트 스토리지 링크 |
| 8 | **`UploaderId`** | 업로더식별자 | `varchar(50)` | YES | - | 등록자 사번 |
| 9 | **`UploadDateTime`** | 업로드일시 | `timestamp` | YES | - | 업로드 일시 |

---

#### 4.9.19 "MpsiProjectStepMemo"
- **테이블 물리명:** `"MpsiProjectStepMemo"` (대소문자 보존)
- **테이블 한글 설명 (Comment):** 공정 단계별(Step 0~13) 실무 메모 및 특이사항 테이블
- **관리 시스템:** `MPSI` | **작성/관리자:** `MPSI_ARCH` | **총 컬럼 수:** 8개

| No | Column명 | 한글명 | 자료형 | NULL | Key | Comment |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **`MemoId`** | 실무메모식별자 | `varchar(50)` | NO | PRIMARY KEY | 실무 메모 고유 식별자 |
| 2 | **`ProjectId`** | 프로젝트식별자 | `varchar(50)` | NO | FOREIGN KEY | ProjectMaster 참조 |
| 3 | **`StepNumber`** | 공정단계번호 | `integer` | NO | - | 0 ~ 13 단계 순번 |
| 4 | **`AuthorId`** | 작성자식별자 | `varchar(50)` | YES | - | 작성자 사번 |
| 5 | **`AuthorName`** | 작성자성명 | `varchar(50)` | NO | - | 작성자 명칭 |
| 6 | **`AuthorCompany`** | 소속회사명 | `varchar(100)` | NO | - | MPSI 본사, 우성정공, 뉴몰드 |
| 7 | **`Content`** | 메모내용 | `text` | NO | - | 공정 진행 특이사항 및 메모 |
| 8 | **`CreationDateTime`** | 등록일시 | `timestamp` | YES | - | 작성 일시 |

---

### 4.10 도메인 10: 분산 노드 간 API 동기화 메타 테이블 (Distributed Sync Meta)
> MPSI 본사, 우성정공, 뉴몰드에 각각 독립 DB를 구축하고 단일 소스코드로 설치할 때, 노드 간 데이터 유실 방지와 멱등성 보장을 위해 트랜잭셔널 아웃박스(Transactional Outbox) 및 인박스(Inbox) 패턴을 적용한 연계 메타 테이블입니다.

#### 1) `MpsiSyncOutbox` (발송 대기 비동기 이벤트 큐)
- **테이블 설명:** 타 노드로 전송할 비동기 이벤트 큐 테이블
- **주요 컬럼:** `OutboxId`(PK), `EventType`, `SourceNodeId`, `TargetNodeId`, `EntityName`, `EntityId`, `PayloadJson`, `IdempotencyKey`(UQ), `Status`, `RetryCount`, `LastError`, `CreationDateTime`, `SentDateTime`

#### 2) `MpsiSyncInbox` (수신 이벤트 이력 및 멱등성 보장)
- **테이블 설명:** 타 노드로부터 수신된 이벤트 이력 및 중복 수신 방지 테이블
- **주요 컬럼:** `InboxId`(PK), `SourceNodeId`, `EventType`, `IdempotencyKey`(UQ), `PayloadJson`, `Status`, `ReceivedDateTime`

#### 3) `MpsiSyncNodeRegistry` (분산 연계 노드 등록 정보)
- **테이블 설명:** 분산 설치 노드(MPSI본사, 우성정공, 뉴몰드) 등록 및 접속 엔드포인트/보안키 메타 테이블
- **주요 컬럼:** `NodeId`(PK), `NodeName`, `NodeType`, `EndpointUrl`, `ApiKey`, `IsActive`, `LastHeartbeatDateTime`, `CreationDateTime`

---

## 5. 데이터 사전 (Data Dictionary) 요약 통계

### 5.1 파트별 테이블 구성 통계 (KS X 9101 표준 준용 및 MPSI 확장)
| 구분 | 업무 영역 / 도메인 | 테이블 수 | 주요 테이블 예시 및 표준 구분 |
| :---: | :--- | :---: | :--- |
| **PART 1** | **기준정보 마스터** | 26 | `Site`, `Plant`, `Department`, `Personnel`, `CustomerPartyMaster`, `VendorPartyMaster`, `ItemMaster`, `BOMHeader`, `BOMLine`, `Lot`, `RoutingHeader`, `Operation`, `Equipment`, `Carrier`, `WarehouseLocationHeader`, `Enterprise` 등 <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **프로젝트 관리** | 2 | `ProjectMaster`, `EngineeringChangeOrder` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **판매 관리** | 3 | `SalesOrderHeader`, `SalesOrderLine`, `SalesPlan` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **구매 관리** | 4 | `BasePrice`, `PurchaseRequisition`, `PurchaseOrderHeader`, `PurchaseOrderLine` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **자재 관리** | 3 | `MaterialArrival`, `GoodsReceipt`, `GoodsIssue` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **생산 관리 및 품질실적** | 24 | `ProductionPlanning`, `ProductionOrder`, `OperationStart`, `OperationEnd`, `EquipmentState`, `Alarm`, `SupplierInspectionPlan/Result`, `CorrectiveActionRequest/Plan/Result`, `ProductionPerformance` 계열 5종 등 <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **재고 관리** | 4 | `Inventory`, `AvailableInventory`, `StockTransfer`, `InventoryCount` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **창고 관리 및 배송** | 6 | `ProductIncoming`, `ProductReleaseRequestHeader/Line`, `ProductRelease`, `DeliveryHeader`, `DeliveryLine` <br/>*(표준 구분: [KS X 9101 표준])* |
| **PART 1** | **서비스 관리** | 4 | `Return`, `ProductTraceParameterOnCustomer`, `AfterSalesServiceRequest/Result` <br/>*(표준 구분: [KS X 9101 표준])* |
| **소계** | **[KS X 9101-1:2025 최신 온톨로지 표준 원본 테이블]** | **76개** | **국가기술표준원 공식 명세서 DDL 및 정의서 100% 충실 반영** |
| **PART 2** | **[MPSI 실무 특화 확장] 사출 금형 14단계 프로세스** | **20개** | `MpsiProjectStage`, `MpsiMoldQuotation`, `MpsiMoldDesign`, `MpsiMoldManufacture`, `MpsiMoldTrial`, `MpsiInspectionReport`, `MpsiMoldApproval`, `MpsiMoldTransfer`, `MpsiMassProductionValidation`, `MpsiPpapDocument`, `MpsiMassSettlement`, `MpsiArcTalkMessage`, `MpsiPmRevisionMaster`, `MpsiPmRound`, `MpsiRevisionHistory`, `MpsiNotification`, `MpsiDeliveryTracking`, `MpsiDeliveryStep`, `MpsiProjectStepAttachment`, `MpsiProjectStepMemo` |
| **PART 3** | **[MPSI 분산 연계 특화] 독립 DB 간 API 동기화 메타** | **3개** | `MpsiSyncOutbox`, `MpsiSyncInbox`, `MpsiSyncNodeRegistry` |
| **총계** | **MPSI 전체 실무 및 표준 관리 테이블 합계** | **99개** | **총 1,650+ 개 컬럼 정의 및 표준 구분 주석 100% 완비** |

---

### 5.2 PostgreSQL 세팅 시 체크리스트
1. [ ] **데이터베이스 생성:** `CREATE DATABASE mpsi_db ENCODING 'UTF8';`
2. [ ] **인용 식별자 준수:** 모든 DDL 및 DML에서 `"TableName"`, `"ColumnName"` 형태의 큰따옴표 사용 확인
3. [ ] **주석(COMMENT) 적용:** `COMMENT ON TABLE "..." IS '...'` 및 `COMMENT ON COLUMN "..."."..." IS '...'` 자동 반영
4. [ ] **외래키(FK) 및 인덱스 생성:** 성능 병목 방지를 위한 `ProjectId`, `ItemId`, `VendorId` 인덱스 적용
5. [ ] **13단계 워크플로우 무결성 트리거:** `MpsiProjectStage` 상태 전이 제어 로직 확인

---
*본 문서는 KS X 9101-1:2025 표준 및 MPSI 스마트 제조 포털 실무 요건을 기준으로 엄격히 작성되었습니다.*
