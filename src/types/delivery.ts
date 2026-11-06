/**
 * SCM 배송현황 외부 연동 API 및 내부 데이터 모델 인터페이스 정의
 * 파일 경로: src/types/delivery.ts
 */

export type DeliveryStatusType = "출하준비" | "배송중" | "배송완료";

export interface TransitStep {
  step: string;          // 배송 단계명 (예: "출하 등록 & 상차 완료", "물류 터미널 통과", "간선 수송 및 배송 중", "납품처 도착 & 하차/입고")
  location: string;      // 발생 위치 또는 거점명 (예: "(주)뉴몰드 사출 1공장", "평택 스마트 물류허브")
  time: string;          // 통과 또는 도착 예정 일시 (예: "2026-10-18 09:30")
  isCompleted: boolean;  // 완료 여부
  note?: string;         // 부가 메모/검수 결과
}

export interface DeliveryItem {
  id?: string;               // 시스템 내부 식별자
  trackingNo: string;        // 운송장 번호 (필수 고유 키)
  projectNo: string;         // 프로젝트 관리번호 (예: "MI26001P0")
  customerName: string;      // 납품 고객사명
  destination?: string;      // 하차지 / 상세 입고처
  productName: string;       // 품목명
  partNo?: string;           // 품번 (고객사 품번)
  qty: number;               // 출하/배송 수량
  unit: string;              // 단위 (예: "EA", "BOX")
  status: DeliveryStatusType;// 배송 상태
  carrierName?: string;      // 운송사명 (예: "CJ대한통운", "롯데글로벌로지스")
  vehicleNo?: string;        // 차량번호 (예: "경기 88바 1234")
  vehicleType?: string;      // 차종 (예: "11톤 윙바디", "5톤")
  driverName?: string;       // 운전 기사명
  driverPhone?: string;      // 기사 연락처
  departureTime?: string;    // 출발일시
  estimatedArrival?: string; // 도착 예정일시
  actualArrival?: string;    // 실제 도착일시 (배송완료 시 권장)
  currentLocation?: string;  // 현재 위치 (GPS / 거점)
  apiSource?: string;        // 연동 데이터 제공처 (예: "외부 물류 API")
  transitSteps?: TransitStep[]; // 배송 이력 타임라인 목록
}

export interface DeliveryApiResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    trackingNo: string;
    status: DeliveryStatusType;
    updatedAt: string;
  };
  error?: string;
}

