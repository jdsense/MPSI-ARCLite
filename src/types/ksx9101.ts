/**
 * KS X 9101-1:2025 표준 기반 MPSI 제조·외주 SCM 데이터 모델 정의서
 * 
 * [표준 규격 원칙]
 * 1. 국가기술표준원 KS X 9101-1:2025 (제조분야 기업업무시스템 간 제조업무 데이터 교환 - 제1부: 데이터 모델) 준수
 * 2. 모든 테이블 및 컬럼 식별자는 첫 글자가 대문자인 PascalCase(UpperCamelCase)를 엄격히 보존함
 * 3. KS X 9101-1에 정의되지 않은 MPSI 14단계(Step 0~13) 실무 속성은 표준과 동일한 PascalCase 및 BaseAttributes 규칙을 준용하여 확장함
 */

// ============================================================================
// 1. KS X 9101-1 표준 공통 속성 (BaseAttributes)
// ============================================================================
export interface BaseAttributes {
  EnterpriseId: string;              // 회사식별자 (테넌트)
  SiteId: string;                    // 사업장식별자
  PlantId: string;                   // 공장식별자
  CreatorId?: string;                // 등록자식별자
  CreationDateTime?: string;         // 등록일시 (ISO 8601)
  ModifierId?: string;               // 수정자식별자
  ModificationDateTime?: string;     // 수정일시 (ISO 8601)
  Note?: string;                     // 비고사항
}

// ============================================================================
// 2. 프로젝트 마스터 (ProjectMaster) - KS X 9101-1 + MPSI 실무 확장
// ============================================================================
export interface ProjectMaster extends BaseAttributes {
  // KS X 9101-1 표준 속성
  ProjectId: string;                 // 프로젝트 고유 식별자 (PK)
  ProjectName: string;               // 프로젝트/차종 명칭
  ProjectStatusCode?: string;        // 프로젝트 상태코드
  ResponsibleDepartmentId?: string;  // 담당부서식별자
  PersonInChargeId?: string;         // 담당자식별자
  ProjectContractDate?: string;      // 수주/계약일자
  ExpectedStartDate?: string;        // 시작예정일
  ExpectedEndDate?: string;          // 종료예정일
  ActualStartDate?: string;          // 실제시작일
  ActualEndDate?: string;            // 실제종료일
  SalesDocumentNumber?: string;      // 수주문서번호
  ItemId?: string;                   // 품목식별자
  UseIndicator?: boolean;            // 사용여부
  DivisionId?: string;               // 사업부식별자

  // MPSI 실무 확장 속성 (PascalCase 규격 통일)
  ProjectNo: string;                 // 관리번호 (견적시: Q26001-01, 수주시: MI26001P0)
  OfficialProjectNo?: string;        // 수주 확정 시 승격된 정식 프로젝트 번호
  ChangeType: "N001" | "E001" | "E002" | string; // 신작(N001) / 설계변경(E001, E002)
  ParentProjectId?: string;          // 설계변경 시 원본 부모 프로젝트 식별자
  ProductName: string;               // 제품명
  PartNo?: string;                   // 부품번호 (품번)
  MoldNo?: string;                   // 금형번호 (예: MI26001M)
  MoldDegree?: string;               // 금형차수 (M1, M2...)
  
  CustomerId?: string;               // 고객사식별자
  CustomerName: string;              // 원청 고객사명
  MoldVendorId?: string;             // 금형제작사식별자
  MoldVendor: string;                // 금형제작처 (우성정공, 대한금형, MPSI 자체제작팀 등)
  MassVendorId?: string;             // 사출양산사식별자
  MassVendor: string;                // 사출양산처 (뉴몰드, 세원사출, MPSI 자체사출라인 등)
  MoldProductionType: "OUTSOURCING" | "IN_HOUSE" | "CUSTOMER_RENTAL";
  MassProductionType: "OUTSOURCING" | "IN_HOUSE";
  
  // 제품 및 금형 사양
  Cavity: string;                    // 캐비티 수 (예: 1*2 Cavity)
  Material: string;                  // 금형/제품 재질 (예: NAK80 / PP-EPDM)
  ResinSpec?: string;                // 수지 사양 (레진)
  PartWeightGram?: number;           // 제품 중량 (g)
  AnnualVolume?: number;             // 연간 양산 볼륨 (EA)
  MachineTonnage?: string;           // 추천 사출기 톤수 (예: 650T)
  HrsSpec?: string;                  // 핫러너(HRS) 사양
  WarrantyShots?: number;            // 금형 보증 수명 (타수)
  
  // 8대 핵심 일정
  RegisteredDate?: string;           // 1) 등록일
  QuoteSubmitDate?: string;          // 2) 견적제출일
  OrderDate?: string;                // 3) 수주일 (PO확정일)
  KickoffDate?: string;              // 4) 킥오프일 (3D데이터확정일)
  TargetMoldDays?: number;           // 5) 목표 금형제작일수
  TargetT1Date?: string;             // 6) 목표 T1 시사출일
  ActualT1Date?: string;             // 실제 T1 시사출일
  MoldDeliveryDate?: string;         // 금형 출고/이관 납기일
  TargetMassDate?: string;           // 7) 목표 양산승인일 (PPAP)
  MassStartDate?: string;            // 8) 목표 양산시작일
  
  // 14단계 공정 진척 및 설비 상태
  CurrentStep: number;               // 현재 공정 단계 (Step 0 ~ 13)
  StepStatus: "진행중" | "완료" | "Fail(수정중)" | "지연주의";
  StepNameCustom?: string;           // 사용자 지정 단계 상태명
  TrialDegree: string;               // 현재 차수 (T1, T2, 양산 등)
  TrialCompletionRate: number;       // 금형 완성률 (0 ~ 100%)
  FacilityEvent: string;             // 설비 이벤트 (양산중, PM중, 설계변경중, 가동대기)
  IsContractConfirmed: boolean;      // 수주확정 여부
  IsQuotePending: boolean;           // 수주미성사/견적대기 여부
  QuotationStatus?: string;          // 견적 진행 상태
  
  OrderQuantity: number;             // 발주 수량
  DeliveredQuantity: number;         // 누적 납품 수량

  // 단계별 영구 보존 첨부파일 및 공정 실무 메모
  StepAttachments?: Record<number, MpsiProjectStepAttachment[]>;
  StepMemos?: Record<number, string>;
}

// ============================================================================
// 3. 공정 단계별 첨부파일 및 메모 (StepAttachments / StepMemos)
// ============================================================================
export interface MpsiProjectStepAttachment {
  AttachmentId?: string;
  ProjectId: string;
  StepNumber: number;                // 0 ~ 13
  FileName: string;                  // 첨부 파일명
  FileSize?: string;                 // 파일 크기 (예: 1.4 MB)
  FileExtension: string;             // 파일 확장자 (pdf, stp, dwg, xlsx 등)
  FileUrl: string;                   // 다운로드 URL
  UploaderId?: string;
  UploaderName?: string;
  UploadDateTime: string;
}

export interface MpsiProjectStepMemo extends BaseAttributes {
  MemoId: string;
  ProjectId: string;
  StepNumber: number;                // 0 ~ 13
  AuthorId?: string;
  AuthorName: string;
  AuthorCompany: string;
  Content: string;
  AttachedFileName?: string;
}

// ============================================================================
// 3.1 수주 및 고객 도면 접수 (SalesOrder - KS X 9101-1 표준 및 도면 확장)
// ============================================================================
export interface SalesOrder extends BaseAttributes {
  SalesOrderId: string;
  SalesOrderSeq?: number;
  SalesDocumentNumber?: string;
  SalesDocumentSequence?: number;
  SalesOrderType?: string;
  CustomerId: string;
  CustomerName?: string;
  CustomerPoNumber?: string;
  CustomerManager?: string;
  SalesDate: string;
  RequestedDeliveryDate?: string;
  SalesStatus: "수주등록" | "도면/사양검토" | "수주확정" | "외주개발의뢰" | "수주취소" | string;
  ShipmentTermsCode?: string;
  TransactionType?: string;
  ReturnIndicator?: boolean;
  ExportIndicator?: boolean;
  SalesAutomaticApprovalIndicator?: boolean;
  ItemId?: string;
  ItemName?: string;
  ItemQuantity: number;
  ItemUomCode?: string;
  SellingUomCode?: string;
  ConversionUnitQuantity?: number;
  ItemUnitQuantity?: number;
  ProjectId?: string;
  ProjectName?: string;
  CurrencyCode?: string;
  // MPSI 도면 및 상업 수주 확장 속성
  PartNo?: string;
  Spec?: string;
  UnitPriceWon?: number;
  SupplyAmountWon?: number;
  VatAmountWon?: number;
  TotalAmountWon?: number;
  Drawing2dFileName?: string;
  Drawing2dFileUrl?: string;
  Drawing3dFileName?: string;
  Drawing3dFileUrl?: string;
  SpecDocFileName?: string;
  SpecDocFileUrl?: string;
  CadRevision?: string;
  DrawingReceivedDate?: string;
  PaymentTerms?: string;
  Incoterms?: string;
  DeliveryPlace?: string;
  SalesManagerName?: string;
  Note?: string;
}

// ============================================================================
// 4. 원청사 견적 (MpsiPrimeQuotation - Step 0)
// ============================================================================
export interface MpsiPrimeQuotationPartPrice {
  PartPriceId: string;
  QuotationId: string;
  Side: "LH" | "RH" | "공용" | "기타";
  PartName: string;
  PartNo?: string;
  UnitPriceWon: number;
}

export interface MpsiPrimeQuotation extends BaseAttributes {
  QuotationId: string;
  ProjectId: string;
  QuotationNumber: string;           // Q26001-01
  OfficialProjectNo?: string;        // MI26001P0
  CustomerId: string;
  CustomerName: string;
  CustomerDepartment?: string;
  CustomerManager?: string;
  CustomerContact?: string;
  CustomerEmail?: string;
  ProductionVolumeText?: string;
  MoldEstimateWon: number;           // 금형 견적가
  PartUnitPriceWon: number;          // 개당 부품 견적가
  PartPrices: MpsiPrimeQuotationPartPrice[];
  SubmissionDeadline?: string;
  SubmittedDate?: string;
  QuotationStatusCode: "견적요청접수" | "견적서작성중" | "고객사제출완료" | "원청사협의중" | "고객 답변 대기" | "수주확정" | "실주/미체결";
  AuthorName?: string;
}

// ============================================================================
// 5. 금형 외주 견적 (MpsiMoldQuotation - Step 0)
// ============================================================================
export interface MpsiMoldVendorQuoteSubmission {
  SubmissionId: string;
  MoldQuotationId: string;
  VendorId: string;
  VendorName: string;
  RevisionNumber: number;
  SubmittedDate: string;
  MaterialCostWon: number;
  ProcessingCostWon: number;
  OverheadProfitWon: number;
  SpecialSpecWon: number;
  TotalAmountWon: number;
  AvailableManufacturingDays?: number;
  QuotationFileName?: string;
  QuotationFileUrl?: string;
  VendorNotes?: string;
  StatusCode: "제출완료" | "검토협의" | "수주확정" | "반려/미성사";
}

export interface MpsiMoldQuotation extends BaseAttributes {
  MoldQuotationId: string;
  ProjectId: string;
  EstimateNumber: string;
  TargetBudgetWon: number;           // MPSI 목표예산 (우성 비노출)
  TargetManufacturingDays: number;
  SelectedVendorId?: string;
  SelectedVendorName?: string;
  FinalAmountWon?: number;
  QuotationStatusCode: "견적요청" | "자체진행" | "외주견적제출" | "견적검토중" | "수주확정" | "수주미성사";
  Submissions: MpsiMoldVendorQuoteSubmission[];
}

// ============================================================================
// 6. 사출 양산 견적 (MpsiMassQuotation - Step 0)
// ============================================================================
export interface MpsiMassVendorQuoteSubmission {
  SubmissionId: string;
  MassQuotationId: string;
  VendorId: string;
  VendorName: string;
  RevisionNumber: number;
  MaterialCost: number;
  ProcessingCost: number;
  OverheadCost?: number;
  ProfitCost?: number;
  PackagingCost: number;
  LogisticsCost: number;
  UnitPrice: number;
  TargetCycleTime?: number;
  QuotationFileName?: string;
  QuotationFileUrl?: string;
  VendorNotes?: string;
  StatusCode: "제출완료" | "검토협의" | "수주확정" | "반려/미성사";
}

export interface MpsiMassQuotation extends BaseAttributes {
  MassQuotationId: string;
  ProjectId: string;
  EstimateNumber: string;
  ResinSpec: string;
  ResinPricePerKg: number;
  PartWeightGram: number;
  RunnerWeightGram: number;
  Sph: number;                       // Shot Per Hour
  MonthlyVolume: number;
  SelectedVendorId?: string;
  SelectedVendorName?: string;
  QuotationStatusCode: "견적요청" | "자체진행" | "외주견적제출" | "원가검토중" | "단가합의완료" | "양산계약확정";
  Submissions: MpsiMassVendorQuoteSubmission[];
}

// ============================================================================
// 7. 금형 설계 및 DR (MpsiMoldDesign - Step 1~5)
// ============================================================================
export interface MpsiMoldDesign extends BaseAttributes {
  MoldDesignId: string;
  ProjectId: string;
  DrStatusCode: "검토 대기" | "검토요청" | "수정요청" | "검토완료" | "최종검토완료";
  Product3dFileUrl?: string;
  MoldMeetingReportUrl?: string;
  CaeReportFileUrl?: string;
  
  // Step 4: 금형 발주 (PO)
  MoldPoNumber?: string;
  MoldPoAmount?: number;
  MoldPoDays?: number;
  MoldPoApproved: boolean;
  MoldPoApprovedDate?: string;
  
  // Step 5: 금형 3D 설계
  MoldDesignStatusCode: "검토 대기" | "검토요청" | "수정요청" | "검토완료";
  Mold3dDataFileUrl?: string;
  
  // Step 6: 소재 선발주 승인
  MaterialOrderStatus: "미승인" | "승인완료";
  MaterialOrderApprover?: string;
  MaterialOrderApprovedDate?: string;
}

// ============================================================================
// 8. 금형 가공 7대 공정 (MpsiMoldManufacture - Step 6)
// ============================================================================
export interface MpsiMoldProcessExecution {
  ProcessExecutionId: string;
  ManufactureId: string;
  ProcessCode: "GUN" | "CNC" | "ML" | "HT" | "PL" | "WR" | "ASSY";
  ProcessName: string;
  PlanDate: string;
  ActualDate: string;
  ProgressRate: number;              // 0 ~ 100%
  StatusCode: "대기" | "진행중" | "완료" | "지연";
  MachineId?: string;
  OperatorName?: string;
}

export interface MpsiMoldManufacture extends BaseAttributes {
  ManufactureId: string;
  ProjectId: string;
  ManufactureStatusCode: "미입력" | "금형 설계 중" | "가공 중" | "습합 중" | "금형 육성 중";
  OverallProgressRate: number;
  CoreProgressRate: number;
  AssyProgressRate: number;
  ScheduleStatusCode: "정상" | "단축" | "지연주의" | "지연";
  WeeklyScheduleFileUrl?: string;
  WeeklyScheduleFileName?: string;
  Processes: MpsiMoldProcessExecution[];
}

// ============================================================================
// 9. 시사출 육성 및 5대 승인 서류 (MpsiMoldTrial - Step 7~10)
// ============================================================================
export interface MpsiTrialRecord {
  TrialRecordId: string;
  TrialId: string;
  TrialDegree: string;               // T1, T2, T3...
  PlanDate?: string;
  TrialDate: string;
  InspectorName: string;
  DimensionResult: "OK" | "NG";
  DimensionReportUrl?: string;
  AppearanceResult: "OK" | "NG";
  AppearanceReportUrl?: string;
  SpecificationResult: "OK" | "NG";
  SpecificationReportUrl?: string;
  MeasuredCycleTime: number;
  TargetCycleTime: number;
  ConditionSheetReportUrl?: string;  // 사출조건표
  TrialStatusCode: "Pass (양산승인)" | "Fail (금형수정)" | "육성 진행중";
  MpsiDecisionCode?: "승인" | "미승인(수정요청)" | "검토중";
  Opinion?: string;
}

export interface MpsiFinalDeliveryDoc {
  DocumentId: string;
  TrialId: string;
  DocumentKey: "approvalCertificate" | "caeReport" | "trialReportWithCond" | "moldSpecification" | "moldChecklist";
  DocumentLabel: string;
  FileUrl?: string;
  FileName?: string;
  FileSize?: string;
  IsVerified: boolean;
  VerifiedBy?: string;
  VerifiedDateTime?: string;
  IsRejected?: boolean;
  RejectReason?: string;
}

export interface MpsiMoldTrial extends BaseAttributes {
  TrialId: string;
  ProjectId: string;
  CurrentTrial: string;              // T1, T2, 금형 승인
  IsMoldApproved: boolean;
  ApprovalCertificateNumber?: string;
  ApprovalCertificateDate?: string;
  ApprovedByName?: string;
  TransferPlanDate?: string;
  TransferActualDate?: string;
  Trials: MpsiTrialRecord[];
  FinalDocuments: MpsiFinalDeliveryDoc[];
}

// ============================================================================
// 10. 시양산 및 양산성 검증 (MpsiMassProductionValidation - Step 11)
// ============================================================================
export interface MpsiUrgentMoldRevision {
  RevisionId: string;
  ValidationId: string;
  RevisionNumber: string;
  DefectPoint: string;
  DefectType: string;
  DefectDescription: string;
  UrgencyLevel: string;
  WoosungAction?: string;
  WoosungEngineer?: string;
  StatusCode: "우성수정요청" | "우성엔지니어조치중" | "금형수정완료(재사출대기)";
  RequestDate: string;
  CompletedDate?: string;
}

export interface MpsiMassValidationRecord {
  RecordId: string;
  ValidationId: string;
  TrialDegree: string;
  TestDate: string;
  MachineNumber: string;
  ContinuousHours: number;
  TotalShotCount: number;
  TotalProducedQuantity: number;
  DefectQuantity: number;
  DefectRate: number;
  MeasuredCpk: number;
  TargetCpk: number;
  MeasuredCycleTime: number;
  TargetCycleTime: number;
  DailyCapacity: number;
  TargetDailyCapacity: number;
  ValidationStatusCode: "양산승인(내부)" | "보완요청(금형수정)" | "시양산 진행중";
  Opinion?: string;
}

export interface MpsiMassProductionValidation extends BaseAttributes {
  ValidationId: string;
  ProjectId: string;
  MoldTransferConfirmed: boolean;
  MoldTransferDate?: string;
  CurrentTrial: string;
  OverallStatusCode: "시양산 대기" | "시양산 진행중" | "12H 연속사출중" | "CPK 검증완료" | "양산승인 완료" | "검증완료";
  Trials: MpsiMassValidationRecord[];
  UrgentRevision?: MpsiUrgentMoldRevision;
}

// ============================================================================
// 11. PPAP 양산 품질 승인 (MpsiPpapDocument - Step 12)
// ============================================================================
export interface MpsiPpapPackageSubmission {
  SubmissionId: string;
  PpapId: string;
  RoundNumber: number;
  PackageFileName: string;
  PackageFileSize?: string;
  PackageFileUrl: string;
  SubmittedDateTime: string;
  AuthorName: string;
  Memo?: string;
  ReviewStatusCode: "승인" | "반려" | "심사진행중" | "검토 대기";
  ReviewComment?: string;
  ReviewedDateTime?: string;
}

export interface MpsiPpapDocument extends BaseAttributes {
  PpapId: string;
  ProjectId: string;
  PpapNumber: string;
  PpapStatusCode: "검토 대기" | "검토 진행 중" | "승인완료" | "수정요청 (Fail)";
  PartPurchaseOrderNumber?: string;
  PartPurchaseOrderDate?: string;
  ApprovalOfficerName?: string;
  MpsiOpinion?: string;
  PackageSubmissions: MpsiPpapPackageSubmission[];
}

// ============================================================================
// 12. 양산 납품, PM 및 설계변경 (MpsiPmRevisionMaster - Step 13)
// ============================================================================
export interface MpsiPmRound {
  PmRoundId: string;
  PmMasterId: string;
  RoundNumber: number;               // 1 ~ 30차
  CurrentShots: number;
  PmReason: string;
  LastPmDate: string;
  PlanStartDate: string;
  PlanEndDate: string;
  PlanMassStartDate: string;
  ActualStartDate: string;
  ActualEndDate: string;
  ActualMassStartDate: string;
  ActiveProcess: string;
}

export interface MpsiRevisionHistory {
  HistoryId: string;
  PmMasterId: string;
  RevisionCode: string;              // N001, E001, E002
  RevisionDate: string;
  Title: string;
  ModelReviewContent?: string;
  MoldCostQuoteContent?: string;
  MoldTrialReportContent?: string;
  MassValidationReportContent?: string;
  Memo?: string;
  AuthorName?: string;
}

export interface MpsiPmRevisionMaster extends BaseAttributes {
  PmMasterId: string;
  ProjectId: string;
  CurrentState: "양산 중" | "PM 중" | "설변 중";
  CurrentRound: number;
  CurrentShots: number;
  PmCycleShots: number;              // 기본 40,000샷
  WarrantyShots: number;             // 기본 300,000샷
  ActiveProcess: string;
  RoundsData?: Record<number, MpsiPmRound>;
  RevisionHistories: MpsiRevisionHistory[];
}

// ============================================================================
// 13. 전사 업무 메모 알림 (MpsiNotification)
// ============================================================================
export interface MpsiNotification {
  NotificationId: string;
  MenuName: string;
  MenuPath: string;
  SenderCompany: string;
  SenderName: string;
  Content: string;
  ProjectNo?: string;
  TargetRole: "MPSI" | "VENDOR_MOLD" | "VENDOR_MASS" | "ALL";
  TargetVendorName?: string;
  IsConfirmed: boolean;
  CreatedDateTime: string;
  ConfirmedDateTime?: string;
}

// ============================================================================
// 14. SCM 배송 현황 관제 (MpsiDeliveryTracking)
// ============================================================================
export interface MpsiDeliveryStep {
  StepId: string;
  DeliveryId: string;
  StepName: string;
  Location: string;
  StepTime: string;
  IsCompleted: boolean;
  Note?: string;
}

export interface MpsiDeliveryTracking extends BaseAttributes {
  DeliveryId: string;
  TrackingNumber: string;
  ProjectNo: string;
  CustomerName: string;
  Destination: string;
  ProductName: string;
  PartNo: string;
  Quantity: number;
  Unit: string;
  DeliveryStatus: "출하준비" | "배송중" | "배송완료";
  CarrierName: string;
  VehicleNumber: string;
  VehicleType: string;
  DriverName: string;
  DriverPhone: string;
  DepartureDateTime: string;
  EstimatedArrivalDateTime: string;
  ActualArrivalDateTime?: string;
  CurrentLocation: string;
  ApiSource: string;
  TransitSteps: MpsiDeliveryStep[];
}

// ============================================================================
// 15. 레거시(camelCase) <-> KS X 9101-1 (PascalCase) 양방향 어댑터 함수
// ============================================================================

/**
 * 프론트엔드 ProjectItem -> KS X 9101-1 표준 ProjectMaster 변환
 */
export function toKsxProject(item: any): ProjectMaster {
  return {
    EnterpriseId: "MPSI",
    SiteId: "SITE_KR_01",
    PlantId: "PLANT_MAIN",
    ProjectId: String(item.id || item.projectNo),
    ProjectNo: item.projectNo,
    OfficialProjectNo: item.officialProjectNo || item.projectNo,
    ChangeType: item.changeType || "N001",
    ProjectName: item.projectName,
    ProductName: item.productName,
    PartNo: item.partNo,
    MoldNo: item.moldNo,
    MoldDegree: item.moldDegree || "M1",
    CustomerName: item.customerName,
    MoldVendor: item.moldVendor,
    MassVendor: item.massVendor,
    MoldProductionType: item.moldProductionType || "OUTSOURCING",
    MassProductionType: item.massProductionType || "OUTSOURCING",
    Cavity: item.cavity || "1*2",
    Material: item.material || "",
    ResinSpec: item.resinSpec,
    PartWeightGram: typeof item.partWeight === "number" ? item.partWeight : undefined,
    AnnualVolume: typeof item.annualVolume === "number" ? item.annualVolume : undefined,
    MachineTonnage: item.machineTon ? String(item.machineTon) : undefined,
    HrsSpec: item.hrsSpec,
    WarrantyShots: typeof item.warrantyShots === "number" ? item.warrantyShots : undefined,
    RegisteredDate: item.registeredDate,
    QuoteSubmitDate: item.quoteSubmitDate,
    OrderDate: item.orderDate,
    KickoffDate: item.kickoffDate,
    TargetMoldDays: typeof item.targetMoldDays === "number" ? item.targetMoldDays : undefined,
    TargetT1Date: item.targetT1Date,
    ActualT1Date: item.actualT1Date,
    MoldDeliveryDate: item.moldDeliveryDate,
    TargetMassDate: item.targetMassDate,
    MassStartDate: item.massStartDate,
    CurrentStep: item.currentStep ?? 0,
    StepStatus: item.stepStatus || "진행중",
    StepNameCustom: item.stepNameCustom,
    TrialDegree: item.trialDegree || "T1",
    TrialCompletionRate: item.trialCompletionRate || 0,
    FacilityEvent: item.facilityEvent || "가동대기",
    IsContractConfirmed: Boolean(item.isContractConfirmed),
    IsQuotePending: Boolean(item.isQuotePending),
    QuotationStatus: item.quotationStatus,
    OrderQuantity: item.orderQty || 0,
    DeliveredQuantity: item.deliveredQty || 0,
    CreationDateTime: item.registeredDate,
    ModificationDateTime: item.updatedAt,
    Note: item.notes,
    StepAttachments: item.stepAttachments,
    StepMemos: item.stepMemos,
  };
}

/**
 * KS X 9101-1 표준 ProjectMaster -> 프론트엔드 ProjectItem 변환
 */
export function fromKsxProject(pm: ProjectMaster): any {
  return {
    id: isNaN(Number(pm.ProjectId)) ? 1 : Number(pm.ProjectId),
    projectNo: pm.ProjectNo,
    officialProjectNo: pm.OfficialProjectNo,
    changeType: pm.ChangeType,
    projectName: pm.ProjectName,
    productName: pm.ProductName,
    partNo: pm.PartNo,
    moldNo: pm.MoldNo,
    moldDegree: pm.MoldDegree,
    customerName: pm.CustomerName,
    moldVendor: pm.MoldVendor,
    massVendor: pm.MassVendor,
    moldProductionType: pm.MoldProductionType,
    massProductionType: pm.MassProductionType,
    cavity: pm.Cavity,
    material: pm.Material,
    resinSpec: pm.ResinSpec,
    partWeight: pm.PartWeightGram,
    annualVolume: pm.AnnualVolume,
    machineTon: pm.MachineTonnage,
    hrsSpec: pm.HrsSpec,
    warrantyShots: pm.WarrantyShots,
    registeredDate: pm.RegisteredDate,
    quoteSubmitDate: pm.QuoteSubmitDate,
    orderDate: pm.OrderDate,
    kickoffDate: pm.KickoffDate,
    targetMoldDays: pm.TargetMoldDays,
    targetT1Date: pm.TargetT1Date || "",
    actualT1Date: pm.ActualT1Date,
    moldDeliveryDate: pm.MoldDeliveryDate,
    targetMassDate: pm.TargetMassDate || "",
    massStartDate: pm.MassStartDate,
    currentStep: pm.CurrentStep,
    stepStatus: pm.StepStatus,
    stepNameCustom: pm.StepNameCustom,
    trialDegree: pm.TrialDegree,
    trialCompletionRate: pm.TrialCompletionRate,
    facilityEvent: pm.FacilityEvent,
    isContractConfirmed: pm.IsContractConfirmed,
    isQuotePending: pm.IsQuotePending,
    quotationStatus: pm.QuotationStatus,
    orderQty: pm.OrderQuantity,
    deliveredQty: pm.DeliveredQuantity,
    updatedAt: pm.ModificationDateTime || pm.CreationDateTime || "",
    notes: pm.Note,
    stepAttachments: pm.StepAttachments,
    stepMemos: pm.StepMemos,
  };
}

