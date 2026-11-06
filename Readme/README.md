# MPSI 데이터베이스 구축 가이드 및 주요사항/주의사항 지침서

> **부제: KS X 9101-1:2025 최신 온톨로지 표준 테이블 정의서 기반 PostgreSQL 세팅 및 실무 운영 종합 가이드**  
> **기준 원본 문서:**  
> 1. `KSX9101-1_2025_온톨로지용v1.0.docx` (온톨로지 데이터 모델 및 표준 공통 코드 정의서)  
> 2. `KSX9101-1_2025_온톨로지용v1.0_공통코드_워크시트.xlsx` (KS X 9101-1 공통코드 워크시트)  
> 3. `KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx` (KS X 9101-1:2025 최신 온톨로지 DDL & 테이블정의서 76개)  
> **대상 DBMS:** PostgreSQL 14 / 15 / 16 / 17  
> **최신 갱신일자:** 2026-10-22  
> **공식 Git 저장소:** `https://gitlab.a2lab.co.kr/jd/mpsi-dev.git`  
> **문서 위치:** [`Readme/README.md`](file:///d:/PROJECT/IMPIX_2026/MPSI/Readme/README.md) (루트 문서: [`README.md`](file:///d:/PROJECT/IMPIX_2026/MPSI/README.md))  

---

## 📑 목차

1. [시스템 개요 및 14단계(Step 0~13) 표준 비즈니스 프로세스](#1-시스템-개요-및-14단계step-013-표준-비즈니스-프로세스)
2. [디렉터리 내 핵심 산출물 맵](#2-디렉터리-내-핵심-산출물-맵)
3. [⭐ PostgreSQL 세팅 시 필수 주의사항 (Critical Precautions)](#3--postgresql-세팅-시-필수-주의사항-critical-precautions)
   - 3.1 [대소문자 보존을 위한 인용 식별자(Quoted Identifiers) 필수 규칙](#31-대소문자-보존을-위한-인용-식별자quoted-identifiers-필수-규칙)
   - 3.2 [테이블 및 컬럼 주석(COMMENT)과 표준/비표준 구분 정책](#32-테이블-및-컬럼-주석comment과-표준비표준-구분-정책)
   - 3.3 [다자간 협업 및 외주 협력사 견적/원가 데이터 격리 (Vendor Isolation & RLS)](#33-다자간-협업-및-외주-협력사-견적원가-데이터-격리-vendor-isolation--rls)
   - 3.4 [MPSI 14단계 워크플로우 상태 머신 및 전이 무결성 통제](#34-mpsi-14단계-워크플로우-상태-머신-및-전이-무결성-통제)
   - 3.5 [SalesOrder 3대 도면 파일 및 대용량 3D CAD/CAE 스토리지 분리](#35-salesorder-3대-도면-파일-및-대용량-3d-cadcae-스토리지-분리)
   - 3.6 [비정형 품질 데이터(치수/PPAP)의 JSONB 및 GIN 인덱스 활용](#36-비정형-품질-데이터치수ppap의-jsonb-및-gin-인덱스-활용)
4. [PostgreSQL 단계별 세팅 및 즉시 구축 절차 (Step-by-Step)](#4-postgresql-단계별-세팅-및-즉시-구축-절차-step-by-step)
5. [주요 프레임워크/ORM 연동 설정 가이드](#5-주요-프레임워크orm-연동-설정-가이드)
6. [운영 검증 체크리스트 (Go-Live Checklist)](#6-운영-검증-체크리스트-go-live-checklist)

---

## 1. 시스템 개요 및 14단계(Step 0~13) 표준 비즈니스 프로세스

본 프로젝트는 산업통상자원부 국가기술표준원 고시 **KS X 9101-1:2025 (제조분야 기업업무시스템 간 제조업무 데이터 교환 — 제1부: 데이터 모델)**과 한국산업단지공단(KICOX)의 최신 온톨로지 정의서(**`KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx`**, `공통코드_워크시트.xlsx`, `온톨로지용v1.0.docx`)를 기준 원본으로 삼아, 사출 금형 개발부터 양산 납품까지 전 과정을 통합 관리하는 차세대 스마트 제조 협업 포털(MPSI) 데이터베이스를 구축하는 것을 목적으로 합니다.

### 핵심 설계 지침 준수

1. **대문자, 소문자, 언더스코어(_) 변환 없는 원본 100% 반영:**  
   최신 온톨로지 엑셀 정의서의 영문 테이블명(`ItemMaster`, `SalesOrderHeader`, `SalesOrderLine`, `ProductionOrder`, `Plant` 등)과 영문 컬럼명(`EnterpriseID`, `SiteSequenceNo`, `ItemID`, `ItemName`, `ItemUOMCode`, `CreationDateTime` 등)을 단 한 글자의 대소문자 변경이나 임의 언더스코어 삽입 없이 원본 그대로 보존합니다.
2. **[조건 1 충족] 표준/비표준 명확한 주석(Comment) 구분 표기:**  
   정부과제 심사 및 공인 인증 시 즉각 검증할 수 있도록 모든 테이블과 컬럼의 DDL 및 `COMMENT ON`에 다음 구분을 필수 접두어로 반영하였습니다:
   - **`[KS X 9101 표준]`**: 국가기술표준원 및 온톨로지 표준 정의서 원본 테이블 76개 및 산하 표준 컬럼
   - **`[MPSI 실무 확장]`**: 사출/금형 14단계 전주기 실무 협업용 신규 엔티티 20개 및 SalesOrder 도면 연계 확장 컬럼
   - **`[MPSI 분산 연계]`**: MPSI 본사, 우성정공, 뉴몰드 3대 독립 인스턴스 간 트랜잭셔널 아웃박스 연계 메타 테이블 3개
3. **MPSI 14단계(Step 0~13) 전 공정 동일 규칙 확장:**  
   KS X 9101 표준에 정의되지 않은 원청 견적 배포(Step 0), 금형 개발(Step 1~10), 사출 양산(Step 11~13) 실무 엔티티(`MpsiMoldQuotation`, `MpsiMassProductionQuotation`, `MpsiMoldTrial`, `MpsiMoldTransfer`, `MpsiPpapMaster`, `MpsiPmRevisionMaster` 등)는 KS X 9101의 명명 규칙(PascalCase, `ID`/`Name`/`DateTime` 접미사 및 `BaseAttributes` 기본 속성)을 100% 동일하게 준용하여 확장하였습니다.
4. **SalesOrder 도면 파일 확장:**  
   원청 수주 계약 및 도면 접수를 일원화하기 위해 `SalesOrder` 테이블에 2D 도면, 3D 모델, 사양서, CAD Rev 등 20개 신규 컬럼을 DDL 레벨에 완전 반영하였습니다.
5. **AAS(자산관리쉘) 모델 프로젝트 범위 제외:**  
   본 시스템은 자동차/전자 사출 부품 14단계 SCM 실무 협업에 집중하며, 디지털 트윈 AAS 전용 테이블(`aasmodels`, `submodels` 등)은 제외되었습니다.
6. **분산 독립 DB 간 API 연계 (Transactional Outbox Pattern):**  
   MPSI 본사, 우성정공, 뉴몰드에 단일 소스코드로 배포되는 3대 독립 인스턴스 간 데이터 연계를 위해 `MpsiSyncOutbox`, `MpsiSyncInbox`, `MpsiSyncNodeRegistry` 3대 연계 메타 테이블이 스키마에 포함되어 멱등성과 무결성이 보장됩니다.

---

## 2. 디렉터리 내 핵심 산출물 맵

| 산출물 파일명 | 유형 | 역할 및 주요 내용 |
| :--- | :---: | :--- |
| **[`MPSI_DATABASE_DESIGN.md`](./MPSI_DATABASE_DESIGN.md)** | **DB 설계서** | 최신 온톨로지 76개 표준 + MPSI 특화 20개 + 분산 연계 3개 테이블 상세 명세서 (주석 완비, 대소문자 원본 보존, 도메인별 Mermaid ERD 포함) |
| **[`mpsi_schema_ddl.sql`](./mpsi_schema_ddl.sql)** | **실행 DDL** | PostgreSQL 즉시 실행 가능한 DDL 스크립트 (총 99개 테이블, 큰따옴표 인용 식별자, `[KS X 9101 표준]` vs `[MPSI 실무 확장]` vs `[MPSI 분산 연계]` 주석 완비, 외래키 인덱스, 초기 시드 데이터 포함) |
| **[`권한설정.md`](./권한설정.md)** | **RBAC 명세서** | MPSI 본사, 우성정공, 뉴몰드 역할별 메뉴 완전 격리 및 권한 설정 명세서 |
| **[`ARCFORGE_CONVERSION_SPEC.md`](./ARCFORGE_CONVERSION_SPEC.md)** | **AI 컨버팅 명세** | 아크포지(ArcForge) 플랫폼 AI 자동 변환용 아키텍처 매핑 지침 및 전용 프롬프트 |
| **[`README.md`](./README.md)** | **운영 지침서** | 본 문서. PostgreSQL 세팅 시 필수 주의사항, 쿼리 작성법, 보안 및 워크플로우 통제 가이드 |
| **[`KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx`](./KSX9101-1_2025_온톨로지용v1.0_테이블정의서.xlsx)** | **최신 엑셀 원본** | 한국산업단지공단(KICOX) 스마트 제조 표준 데이터 교환 테이블 정의서 및 DDL 원본 (76개 표준 테이블) |
| **[`KSX9101-1_2025_온톨로지용v1.0_공통코드_워크시트.xlsx`](./KSX9101-1_2025_온톨로지용v1.0_공통코드_워크시트.xlsx)** | **표준 공통코드** | KS X 9101-1 표준 코드체계 워크시트 |
| **[`KSX9101-1_2025_온톨로지용v1.0.docx`](./KSX9101-1_2025_온톨로지용v1.0.docx)** | **온톨로지 규격서** | 국가기술표준원 KS X 9101-1:2025 표준 온톨로지 데이터 모델 규격서 |
| **[`KSX9101-1_20250926.pdf`](./KSX9101-1_20250926.pdf)** | **표준 원안** | 국가기술표준원 KS X 9101-1:2025 제1부 표준 원문 |

---

## 3. ⭐ PostgreSQL 세팅 시 필수 주의사항 (Critical Precautions)

### 3.1 대소문자 보존을 위한 인용 식별자(Quoted Identifiers) 필수 규칙

> [!CAUTION]
> **PostgreSQL의 대소문자 폴딩(Lowercase Folding) 동작 원리**  
> PostgreSQL은 SQL 표준에 따라 따옴표(`"`)가 없는 식별자를 **모두 소문자로 자동 변환**하여 처리합니다.  
> 본 설계서는 최신 온톨로지 정의서의 PascalCase(`ItemMaster`, `EnterpriseID`, `SiteSequenceNo` 등)를 그대로 유지하므로, **큰따옴표를 생략하면 테이블이나 컬럼을 찾을 수 없다는 에러(`relation "itemmaster" does not exist`)가 발생합니다!**

#### ❌ 잘못된 쿼리 작성 (소문자로 자동 폴딩되어 런타임 오류 발생)

```sql
-- 테이블명과 컬럼명에 따옴표를 생략한 경우:
SELECT ItemID, ItemName FROM ItemMaster WHERE EnterpriseID = 'MPSI';
-- 실제 PostgreSQL 엔진 해석:
-- SELECT itemid, itemname FROM itemmaster WHERE enterpriseid = 'MPSI';
-- 결과: ERROR: relation "itemmaster" does not exist
```

#### ✅ 올바른 쿼리 작성 (큰따옴표를 사용하여 대소문자 엄격 보존)

```sql
-- 모든 테이블명과 컬럼명을 큰따옴표로 감싸서 작성:
SELECT "ItemID", "ItemName", "ItemUOMCode" 
FROM "ItemMaster" 
WHERE "EnterpriseID" = 'MPSI';

-- 조인 쿼리 작성 예시:
SELECT 
    p."ProjectNo", 
    p."ProjectName", 
    p."CurrentStageStep", 
    p."CurrentStageStatus"
FROM "ProjectMaster" p
WHERE p."EnterpriseId" = 'MPSI'
ORDER BY p."ProjectNo" ASC;
```

---

### 3.2 테이블 및 컬럼 주석(COMMENT)과 표준/비표준 구분 정책

> [!IMPORTANT]
> **한글 주석 영구 보존 및 [조건 1] 표준 구분 식별자**  
> 데이터베이스 생성 시 반드시 `UTF-8` 인코딩을 지정해야 한글 주석이 손상되지 않습니다.  
> 모든 DDL 스크립트는 `COMMENT ON TABLE` 및 `COMMENT ON COLUMN` 문을 포함하며, 각 주석의 서두에 `[KS X 9101 표준]`, `[MPSI 실무 확장]`, `[MPSI 분산 연계]` 태그가 영구 포함되어 있습니다.

```sql
-- 1. 데이터베이스 인코딩 확인
CREATE DATABASE mpsi_db WITH ENCODING 'UTF8' LC_COLLATE 'Korean_Korea.949' LC_CTYPE 'Korean_Korea.949';
-- (Linux/Docker 환경 권장: LC_COLLATE 'ko_KR.UTF-8' LC_CTYPE 'ko_KR.UTF-8')

-- 2. DDL 내 코멘트 문법 예시 (큰따옴표 및 표준 구분 태그 필수)
-- [KS X 9101 표준] 예시:
COMMENT ON TABLE "ItemMaster" IS '[KS X 9101 표준] 품목마스터 - 품목 정보를 관리하는 표준 테이블';
COMMENT ON COLUMN "ItemMaster"."ItemID" IS '[KS X 9101 표준] 품목식별자: 품목을 고유하게 식별하는 코드';
COMMENT ON COLUMN "ItemMaster"."ItemUOMCode" IS '[KS X 9101 표준] 품목단위코드: 품목의 기준 단위 코드 (UOM)';

-- [MPSI 실무 확장] 예시:
COMMENT ON TABLE "MpsiMoldQuotation" IS '[MPSI 실무 확장] Step 0 외주 금형 견적서 관리';
COMMENT ON COLUMN "MpsiMoldQuotation"."EstimatedMoldCost" IS '[MPSI 실무 확장] 금형 견적 금액 (외주 협력사 제출)';

-- [MPSI 분산 연계] 예시:
COMMENT ON TABLE "MpsiSyncOutbox" IS '[MPSI 분산 연계] 트랜잭셔널 아웃박스 이벤트 발행 큐';

-- 3. 표준 구분 주석 조회 쿼리 예시
SELECT 
    cols.table_name,
    cols.column_name, 
    cols.data_type, 
    pg_desc.description AS comment
FROM information_schema.columns cols
LEFT JOIN pg_catalog.pg_statio_all_tables st 
    ON cols.table_schema = st.schemaname AND cols.table_name = st.relname
LEFT JOIN pg_catalog.pg_description pg_desc 
    ON pg_desc.objoid = st.relid AND pg_desc.objsubid = cols.ordinal_position
WHERE cols.table_name IN ('ItemMaster', 'MpsiMoldQuotation', 'MpsiSyncOutbox')
ORDER BY cols.table_name, cols.ordinal_position;
```

---

### 3.3 다자간 협업 및 외주 협력사 데이터 격리 (Row-Level Security)

> [!CAUTION]
> **영업 비밀 및 외주사 간 데이터 유출 방지**
> MPSI 시스템은 **MPSI 본사, 금형제작 협력사(우성정공 등), 사출양산 협력사(뉴몰드 등)**가 하나의 포털을 공유합니다.
> 금형사(A)가 경쟁 금형사(B)의 금형 견적 금액(`EstimatedMoldCost`), 제작 단가, 도면을 열람하면 심각한 영업비밀 유출 사고가 발생합니다.

#### RLS(Row-Level Security) 정책 적용 예시

```sql
-- 1. 견적 테이블 RLS 활성화
ALTER TABLE "MpsiMoldQuotation" ENABLE ROW LEVEL SECURITY;

-- 2. MPSI 본사 관리자: 모든 협력사 견적 데이터 조회 가능
CREATE POLICY policy_mpsi_quotation_admin ON "MpsiMoldQuotation"
    FOR ALL
    TO application_user
    USING (
        current_setting('app.current_user_role', true) IN ('MPSI', 'ADMIN')
    );

-- 3. 외주 협력사: 본인 회사(VendorId)에 배정된 견적만 조회 가능
CREATE POLICY policy_mpsi_quotation_vendor ON "MpsiMoldQuotation"
    FOR ALL
    TO application_user
    USING (
        "VendorId" = current_setting('app.current_user_vendor_id', true)
    );
```

---

### 3.4 MPSI 13단계 워크플로우 상태 머신 및 전이 무결성 통제

MPSI 13단계 프로세스는 사출 금형 개발 및 양산의 품질 게이트(Quality Gate)입니다:

* **도면/수주 그룹:** 1. 도면접수 -> 2. 3D검토/DR -> 3. 최종data수신 -> 4. 금형발주
* **금형개발 그룹:** 5. 금형설계 -> 6. 소재발주/제작 -> 7. 금형완료/시사출(T1)
* **시사출육성 그룹:** 8. 치수/외관확인 -> 9. 금형육성완료 -> 10. 금형승인 및 이관(6대 서류)
* **사출양산 그룹:** 11. 양산승인사출(시양산) -> 12. 양산품질검증(PPAP) -> 13. 양산납품/정산

> [!WARNING]
> **단계별 전이 조건(Gate Condition) 필수 준수:**
>
> 1. **선행 단계 잠금:** 4단계(금형발주)가 `APPROVED` 되지 않으면 5단계(금형설계)로 진행할 수 없도록 백엔드 트랜잭션에서 검증해야 합니다.
> 2. **10단계 금형 이관 6대 서류 필수 확인:**`MpsiMoldTransfer` 테이블의 `AllSixDocumentsConfirmed` 플래그가 `true`여야만 11단계(양산승인사출)로의 단계 전이가 승인됩니다.
>    - 1) 2D/3D 최종도면 (`DocDrawing2d3dIndicator`)
>    - 2) 금형제작사양서 (`DocMoldSpecIndicator`)
>    - 3) 표준성형조건표 (`DocConditionSheetIndicator`)
>    - 4) 치수/외관검사성적서 (`DocInspectionSheetIndicator`)
>    - 5) 금형육성체크리스트 (`DocChecklistIndicator`)
>    - 6) 날인된 금형승인원 (`DocApprovalSheetIndicator`)
> 3. **12단계 PPAP 검증 통과:** `MpsiPpapDocument.PswStatusCode`가 `APPROVED` 상태여야 최종 13단계(정산마감)로 완료 처리됩니다.

---

### 3.5 대용량 3D CAD/CAE 도면 및 미디어 객체 스토리지(S3) 분리

> [!WARNING]
> **대용량 바이너리(BLOB)의 PostgreSQL 직접 저장 금지**
> 2D 도면(DWG/PDF), 3D 모델링 파일(STEP/IGES/CATPart, 수십~수백 MB), CAE 유동해석 시뮬레이션 영상, 고화질 시사출 사진 등은 **절대로 데이터베이스 테이블의 `bytea` 컬럼에 직접 저장해서는 안 됩니다.**
> DB 크기 급증으로 인한 백업/복구 지연, 버퍼 풀 오염, 커넥션 타임아웃의 원인이 됩니다.

* **권장 아키텍처:**
  1. 클라이언트는 백엔드로부터 **S3 / MinIO Pre-signed Upload URL**을 발급받아 스토리지에 직접 업로드합니다.
  2. 업로드 완료 후, 파일의 스토리지 엔드포인트 URL(`CadFileUrl`, `CaeReportUrl`, `ReportFileUrl`)과 파일 해시값(SHA-256)을 테이블의 `text` 컬럼에 저장합니다.

---

### 3.6 비정형 품질 데이터(치수/PPAP)의 JSONB 및 GIN 인덱스 활용

MPSI 프로세스 중 제품 치수 검사(`DimensionCheckData`), 외관 결함 체크리스트(`AppearanceCheckData`), PPAP 18대 요건 상태(`PpapChecklistData`)는 고객사나 제품군마다 측정 포인트와 검사 항목이 상이합니다.

* **설계 정책:** 고정 컬럼 대신 PostgreSQL의 `jsonb` 타입을 사용합니다.
* **성능 최적화:** 특정 검사항목(예: `shrinkage_defect` 여부) 검색이 빈번할 경우 `GIN` 인덱스를 생성하십시오:

```sql
-- JSONB 내부 속성 고속 검색을 위한 GIN 인덱스
CREATE INDEX "IDX_MpsiInspectionReport_DimensionData" 
ON "MpsiInspectionReport" USING gin ("DimensionCheckData" jsonb_path_ops);
```

---

## 4. PostgreSQL 단계별 세팅 및 즉시 구축 절차 (Step-by-Step)

### 1단계: PostgreSQL 클라이언트 접속 및 데이터베이스 준비

```bash
# PostgreSQL CLI 접속
psql -U postgres -h localhost -p 5432
```

```sql
-- 전용 데이터베이스 생성
CREATE DATABASE mpsi_db 
    WITH ENCODING = 'UTF8' 
    LC_COLLATE = 'C' 
    LC_CTYPE = 'C';

-- 데이터베이스 접속
\c mpsi_db;
```

### 2단계: DDL 스크립트 실행

본 저장소의 `Readme/mpsi_schema_ddl.sql` 파일을 실행합니다:

```bash
# bash / powershell 환경에서 원클릭 일괄 적용
psql -U postgres -d mpsi_db -f "d:/PROJECT/IMPIX_2026/MPSI/Readme/mpsi_schema_ddl.sql"
```

### 3단계: 기본 테넌트 및 초기 마스터 시드 데이터 확인

DDL 실행 완료 후 다음 쿼리를 통해 테이블 및 기초 데이터가 정상 적재되었는지 확인합니다:

```sql
-- 1. 생성된 전체 테이블 개수 확인 (총 99개: 표준 76 + 특화 20 + 연계 3)
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- 2. 협력사 마스터 등록 확인 (VendorPartyMaster 또는 PartnerMaster)
SELECT "PartnerID", "PartnerName", "PartnerType" 
FROM "PartnerMaster" 
ORDER BY "PartnerType", "PartnerName";

-- 3. 품목 마스터 표준 컬럼 조회 (대소문자 보존 확인)
SELECT "EnterpriseID", "ItemID", "ItemName", "ItemUOMCode" 
FROM "ItemMaster" 
LIMIT 10;
```

---

## 5. 주요 프레임워크/ORM 연동 설정 가이드

본 데이터베이스는 대소문자가 보존된 PascalCase 식별자를 사용하므로, 각 백엔드 프레임워크나 ORM에서 다음과 같이 매핑을 설정해야 합니다:

### 5.1 Prisma (`schema.prisma`)

```prisma
model ItemMaster {
  ItemSequenceNo   BigInt    @id @default(autoincrement()) @map("ItemSequenceNo")
  EnterpriseID     String    @map("EnterpriseID") @db.VarChar(50)
  PlantID          String    @map("PlantID") @db.VarChar(50)
  ItemID           String    @map("ItemID") @db.VarChar(50)
  ItemName         String    @map("ItemName") @db.VarChar(200)
  ItemUOMCode      String?   @map("ItemUOMCode") @db.VarChar(50)
  CreationDateTime DateTime? @default(now()) @map("CreationDateTime") @db.Timestamp

  @@unique([EnterpriseID, PlantID, ItemID])
  @@map("ItemMaster")
}
```

### 5.2 TypeORM / NestJS (`Entity`)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "ItemMaster" }) // 큰따옴표 매핑
@Unique(["enterpriseID", "plantID", "itemID"])
export class ItemMaster {
  @PrimaryGeneratedColumn({ name: "ItemSequenceNo", type: "bigint" })
  itemSequenceNo: number;

  @Column({ name: "EnterpriseID", type: "varchar", length: 50 })
  enterpriseID: string;

  @Column({ name: "PlantID", type: "varchar", length: 50 })
  plantID: string;

  @Column({ name: "ItemID", type: "varchar", length: 50 })
  itemID: string;

  @Column({ name: "ItemName", type: "varchar", length: 200 })
  itemName: string;

  @Column({ name: "ItemUOMCode", type: "varchar", length: 50, nullable: true })
  itemUOMCode: string;
}
```

### 5.3 MyBatis (`XML Mapper`)

```xml
<select id="selectItemById" resultType="com.mpsi.model.ItemMaster">
    SELECT 
        "ItemSequenceNo",
        "EnterpriseID", 
        "ItemID", 
        "ItemName", 
        "ItemUOMCode"
    FROM "ItemMaster"
    WHERE "EnterpriseID" = #{enterpriseID}
      AND "PlantID" = #{plantID}
      AND "ItemID" = #{itemID}
</select>
```

---

## 6. 운영 검증 체크리스트 (Go-Live Checklist)

| No | 점검 영역 | 점검 항목 | 통과 기준 | 상태 |
| :-: | :--- | :--- | :--- | :--: |
| 1 | **명명 규칙** | 테이블명 및 컬럼명 대소문자 보존 여부 | 원본 최신 온톨로지 정의서와 100% 동일 (`"ItemMaster"`, `"EnterpriseID"`, `"ItemID"`) | [x] |
| 2 | **주석 영구화** | `COMMENT ON TABLE/COLUMN` 주석 적용 여부 | `pg_description` 딕셔너리에서 `[KS X 9101 표준]`, `[MPSI 실무 확장]`, `[MPSI 분산 연계]` 정상 조회 | [x] |
| 3 | **데이터 인코딩** | PostgreSQL 데이터베이스 문자셋 | `UTF-8` 인코딩 설정 완료 | [x] |
| 4 | **테넌트 격리** | 협력사별 데이터 격리(RLS) 정책 | 타 협력사 견적/단가 데이터 접근 차단 검증 | [x] |
| 5 | **14단계 무결성** | `ProjectMaster` 상태 전이 유효성 검사 | 선행 단계 미완료 시 차기 단계 전이 차단 | [x] |
| 6 | **6대 서류 검증** | 10단계 금형 이관 시 6대 서류 완비 여부 | `AllSixDocumentsConfirmed = true` 시에만 이관 승인 | [x] |
| 7 | **대용량 파일** | 3D CAD/CAE 도면 스토리지 분리 | DB 내 BLOB 저장 금지, S3 객체스토리지 URL 보관 | [x] |
| 8 | **분산 연계 보장** | 3대 독립 인스턴스 간 트랜잭셔널 아웃박스 | `MpsiSyncOutbox` 및 `MpsiSyncInbox` 멱등성 보장 | [x] |

---

*본 가이드는 KS X 9101-1:2025 최신 온톨로지 표준 규격과 MPSI 제조 협업 시스템의 운영 안정성을 보장하기 위해 작성되었습니다.*

