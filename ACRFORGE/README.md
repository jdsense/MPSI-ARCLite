# [ACRFORGE] 아크포지(ArcForge) 플랫폼 구성 및 DB 명세 종합 안내

> **문서 목적:** `ACRFORGE` 폴더 내 백업 파일의 성격 안내 및 AI(Claude 등)와 개발자를 위한 텍스트 기반 시스템/DB 구성 요약  
> **최종 갱신:** 2026-11-02  
> **대상 환경:** PostgreSQL 15+ (스키마: `mpsi_scm_v2`, 테넌트 URL: `mpsi-scm-v2.a2lab.co.kr`)

---

## 1. 백업 파일(`*.sql.gz`, `*.zip`)의 성격 안내

`ACRFORGE` 폴더 내의 두 파일은 일반 gzip/zip 압축 파일이 아니라, **아크포지(ArcForge) 플랫폼 엔진 전용 암호화 백업 덤프(`ARCBKv01`)**입니다:
* `db_backup_20261101_184817.sql.gz`: 아크포지 플랫폼 전용 DB 스키마/데이터 백업 파일
* `mpsi_scm_v2_backup_20261101_184815.zip`: 아크포지 화면/폼/그리드 설정 메타데이터 백업 파일

> [!NOTE]  
> 위 파일들은 아크포지 웹 콘솔의 `[백업 복원]` 메뉴를 통해서만 복원할 수 있는 파일입니다.  
> 따라서 **AI(클로드 등) 분석 및 개발 참조는 아래의 일반 텍스트 문서 및 SQL 파일들을 참조**하십시오.

---

## 2. 참조 필수 텍스트 산출물 목록 (저장소 내 위치)

| 문서/산출물 파일 | 형식 | 내용 요약 |
| :--- | :---: | :--- |
| **[`Readme/mpsi_schema_ddl.sql`](../Readme/mpsi_schema_ddl.sql)** | SQL (DDL) | **PostgreSQL 112개 전체 관리 테이블 DDL** (KS X 9101-1:2025 표준 준수, 인용 식별자 `"..."`) |
| **[`Readme/MPSI_DATABASE_DESIGN.md`](../Readme/MPSI_DATABASE_DESIGN.md)** | Markdown | **전체 데이터베이스 설계서 및 데이터 사전** (테이블 목록, 컬럼명, 타입, 외래키 관계) |
| **[`Readme/MPSI_ARCFORGE_ENDUSER_GUIDE.md`](../Readme/MPSI_ARCFORGE_ENDUSER_GUIDE.md)** | Markdown | **아크포지 전 공정(0~13단계) CRUD 운영 가이드** (화면별 조작법, 프로시저 연계 로직, 3대 역할 체계) |
| **[`Readme/ARCFORGE_CONVERSION_SPEC.md`](../Readme/ARCFORGE_CONVERSION_SPEC.md)** | Markdown | **아크포지 플랫폼 자동 변환 명세서** (노드별 토폴로지, 트랜잭셔널 아웃박스 연계) |
| **[`src/config/arcforge-manifest.json`](../src/config/arcforge-manifest.json)** | JSON | 아크포지 프로젝트 루트 메타데이터 및 메뉴 트리 |

---

## 3. 핵심 아크포지 라이브 DB 및 화면 구성 요약

### 3.1 대상 데이터베이스 환경
* **DBMS**: PostgreSQL 15+
* **운영 스키마**: `mpsi_scm_v2`
* **식별자 규칙**: 대소문자 보존 인용 식별자(`"..."`) 필수

### 3.2 핵심 운영 테이블
1. **`"ProjectMaster"` (프로젝트 관리대장)**:
   * PK: `"ProjectMasterSeq"` (bigint)
   * 핵심 식별자: `"ProjectID"` (개별 행 유일키), `"OfficialProjectID"` (부모-자식 그룹핑 공식 번호)
   * 채번/분기: `"ChangeTypeCode"` (`D335001`=신작 N001, `D335002`=설변 E001)
   * 연동 컬럼: `"EstimateNumber"`, `"MoldNumber"`, `"CustomerID"`, `"ProjectName"`, `"ProductName"`, `"FLAG"`
2. **`"MpsiPrimeQuotation"` (원청사 견적 관리)**:
   * PK: `"MpsiPrimeQuotationSeq"` (bigint)
   * 관리키: `"PrimeQuotationID"`, `"ProjectID"`, `"QuotationNumber"`, `"OfficialProjectID"`
   * 프로젝트 파생 정보: `"CustomerID"`, `"ProjectName"`, `"ProductName"` (조인 파생 및 보완)
   * 견적 정보: `"MoldEstimateAmount"`, `"RepresentativeUnitPrice"`, `"SubmissionDeadlineDate"`, `"SubmissionDate"`, `"PrimeQuotationStatus"`

### 3.3 핵심 프로시저/함수 및 뷰
1. **`"PROC_PROJECTMASTER_SAVE"` (FUNCTION ... RETURNS bigint)**:
   * 화면 `C100000` (프로젝트 관리대장) 신규/수정 통합 저장 프로시저
   * 신작(N001) 선택 시 연도별 순번 채번 (`MI26009P0`, `Q26009-01`, `MI26009M`)
   * 설변(E001) 선택 시 부모 하위 최대 차수 자동 증분 채번 (`MI26001P0-E001` ➔ `-E002` ➔ `-E003`...)
2. **`"PROC_C110000_Save"` (FUNCTION ... RETURNS bigint / PROCEDURE)**:
   * 화면 `C110000` (원청사 견적 등록) 저장 프로시저
   * 폼에서 선택된 `"ProjectID"`를 입력받아 `"ProjectMaster"`를 조회, 원청사/견적번호/정식번호/프로젝트명/제품명 자동 보완
   * 20개 파라미터 전부 `text DEFAULT NULL`로 수신 ➔ 내부에서 `NULLIF(값, '')::타입`으로 안전 캐스팅
3. **`"VIEW_PROJECT_LOOKUP"` (VIEW)**:
   * `"ProjectMaster"`의 유효 데이터(`FLAG='Y'`)를 조회하여 드롭다운 선택용으로 합성한 뷰
   * `DisplayName`: `'[' || "OfficialProjectID" || '] ' || "ProjectName"`

