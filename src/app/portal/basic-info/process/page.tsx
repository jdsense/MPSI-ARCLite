"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, RefreshCw, Workflow, Plus, 
  Eye, X, Check, FileText, Download, 
  Wrench, ShieldCheck, Factory, Layers, Edit3, 
  Trash2, ArrowRight, Clock, Building2, Cpu, CheckCircle2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";

// 1. 공정 분류 타입 (사출 0~140 구간 및 금형 가공코드)
export type ProcessSectionType = 
  | "0~2 (수주/계획/발주)" 
  | "10~21 (자재입고/수입검사)" 
  | "30~41 (원재료보관/건조)" 
  | "50~62 (사출성형/설비보전)" 
  | "70~81 (자주/순회검사)" 
  | "90~102 (출하검사/선적서류)" 
  | "110~140 (바코드/출하운송)"
  | "우성 금형가공(GUN/CNC/ML)";

// 2. 공정 마스터 데이터 인터페이스
export interface ProcessMasterItem {
  id: number;
  processCode: string;       // 공정번호 (0, 10, 20 ... 140 또는 GUN, CNC)
  processName: string;       // 공정명
  section: ProcessSectionType; // 공정 구간
  actorRole: string;         // 누가 (생산관리, 품질관리, 생산팀, 검사원 등)
  methodTool: string;        // 방법 / 도구 (확정PO, 엑셀, 수기, 건조기, 사출기 등)
  workPlace: string;         // 장소 (사무실, 창고동, 건조실, 사출기, 측정실, 검사실 등)
  inputData: string;         // Input 데이터 (도면, 확정PO, 검사체크시트 등)
  outputData: string;        // Output 데이터 (작업지시, 합격통보, 현품표, OQC성적서 등)
  leadTimeHours?: number;    // 표준 리드타임(h)
  applicableCompany: "MPSI (자사)" | "우성정공 (금형)" | "뉴몰드 (사출)" | "공통";
  isActive: boolean;         // 사용여부
  updatedAt: string;
}

// 초기 샘플 데이터 (FF 사출성형 공정흐름도 0~140 및 우성 금형공정 완벽 매핑)
const initialProcesses: ProcessMasterItem[] = [
  // 0~2 구간
  {
    id: 1,
    processCode: "0",
    processName: "수주",
    section: "0~2 (수주/계획/발주)",
    actorRole: "생산관리 / 영업",
    methodTool: "확정PO, 이메일, 수주확인서",
    workPlace: "사무실",
    inputData: "고객사 확정 발주서(PO), 2D/3D 제품도면",
    outputData: "수주 등록 데이터, 프로젝트 관리번호 생성",
    leadTimeHours: 2,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 2,
    processCode: "1",
    processName: "생산 및 출하 계획 검토 및 배포",
    section: "0~2 (수주/계획/발주)",
    actorRole: "생산관리",
    methodTool: "엑셀, 사내 메신저",
    workPlace: "사무실",
    inputData: "수주 데이터, 고객 요구 납기일(D-day)",
    outputData: "월간/주간 생산계획표, 출하일정표",
    leadTimeHours: 4,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 3,
    processCode: "2",
    processName: "자재 소요 검토 및 발주",
    section: "0~2 (수주/계획/발주)",
    actorRole: "생산관리 / 구매",
    methodTool: "엑셀, 구매발주서(PO)",
    workPlace: "사무실",
    inputData: "BOM 기준 자재 소요량(MRP)",
    outputData: "원재료(레진)/부자재/부품 구매발주서(PO)",
    leadTimeHours: 2,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },

  // 10~21 구간
  {
    id: 4,
    processCode: "10",
    processName: "원재료 및 부자재 입고",
    section: "10~21 (자재입고/수입검사)",
    actorRole: "생산관리 / 자재",
    methodTool: "현물 확인, 엑셀 재고대장",
    workPlace: "창고동 (C/G구역)",
    inputData: "거래명세서, 납품 현물",
    outputData: "가입고 전표, 수입검사 의뢰서",
    leadTimeHours: 1,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 5,
    processCode: "20",
    processName: "수입 검사 (IQC)",
    section: "10~21 (자재입고/수입검사)",
    actorRole: "품질관리",
    methodTool: "현물, 원재료 규격서, 버니어캘리퍼스",
    workPlace: "수입검사실",
    inputData: "원부자재 입고 샘플, 밀시트(Mill Sheet)",
    outputData: "수입검사 성적서 (OK/NG)",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 6,
    processCode: "21",
    processName: "수입 검사 관리 대장 등록 및 합격 통보",
    section: "10~21 (자재입고/수입검사)",
    actorRole: "품질관리",
    methodTool: "엑셀 대장, 메신저",
    workPlace: "측정실",
    inputData: "수입검사 판정 결과",
    outputData: "합격 라벨 발행, 창고 본입고 승인 통보",
    leadTimeHours: 0.5,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-18",
  },

  // 30~41 구간
  {
    id: 7,
    processCode: "30",
    processName: "원재료 보관",
    section: "30~41 (원재료보관/건조)",
    actorRole: "생산팀 / 자재",
    methodTool: "지게차, 랙(Rack) 로케이션",
    workPlace: "원재료 창고 (C구역)",
    inputData: "수입검사 합격 원재료(레진 톤백/포대)",
    outputData: "창고 로케이션 배치 데이터",
    leadTimeHours: 1,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-17",
  },
  {
    id: 8,
    processCode: "31",
    processName: "원재료별 관리번호 부착",
    section: "30~41 (원재료보관/건조)",
    actorRole: "생산팀",
    methodTool: "엑셀, 바코드 라벨지",
    workPlace: "원재료 창고",
    inputData: "원재료 입고 Lot 정보",
    outputData: "원재료 식별표/관리번호 부착품",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-17",
  },
  {
    id: 9,
    processCode: "32",
    processName: "원재료 투입 및 투입일지 작성",
    section: "30~41 (원재료보관/건조)",
    actorRole: "생산팀",
    methodTool: "엑셀 투입일지",
    workPlace: "원재료 창고 / 호퍼실",
    inputData: "작업지시서(사출 오더)",
    outputData: "원재료 출고 수불 및 투입 실적",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-17",
  },
  {
    id: 10,
    processCode: "40",
    processName: "원재료 건조",
    section: "30~41 (원재료보관/건조)",
    actorRole: "생산팀",
    methodTool: "호퍼 드라이어, 제습건조기",
    workPlace: "건조실",
    inputData: "수지별 표준 건조 조건 (예: 80℃, 3h)",
    outputData: "건조 완료 수지",
    leadTimeHours: 3,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-17",
  },
  {
    id: 11,
    processCode: "41",
    processName: "건조기에 투입 원재료 정보 기입",
    section: "30~41 (원재료보관/건조)",
    actorRole: "생산팀",
    methodTool: "건조기 식별표, 엑셀",
    workPlace: "건조실",
    inputData: "투입 수지 Lot No, 건조 시작/종료 시각",
    outputData: "건조 설비 관리카드",
    leadTimeHours: 0.2,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-17",
  },

  // 50~62 구간
  {
    id: 12,
    processCode: "50",
    processName: "수분측정 및 수분측정 결과 대장에 기록/통보",
    section: "50~62 (사출성형/설비보전)",
    actorRole: "품질관리",
    methodTool: "수분측정기, 엑셀, 메신저",
    workPlace: "측정실",
    inputData: "건조 완료 수지 샘플",
    outputData: "수분율 측정 성적서 (0.02% 이하 합격 통보)",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-16",
  },
  {
    id: 13,
    processCode: "60",
    processName: "사출성형",
    section: "50~62 (사출성형/설비보전)",
    actorRole: "생산팀",
    methodTool: "플라스틱 사출성형기 (150T~650T), 취출로봇",
    workPlace: "사출기 현장",
    inputData: "승인 금형, 건조 수지, 표준 조건표",
    outputData: "성형 초물 및 연속 사출물",
    leadTimeHours: 8,
    applicableCompany: "뉴몰드 (사출)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 14,
    processCode: "61",
    processName: "사출조건, 생산일보 기록, 관리",
    section: "50~62 (사출성형/설비보전)",
    actorRole: "생산팀",
    methodTool: "엑셀 생산일보, 그룹웨어",
    workPlace: "사출사무실",
    inputData: "실제 C/T, 온도, 압력 파라미터, 생산량",
    outputData: "일일 사출 생산실적일보",
    leadTimeHours: 1,
    applicableCompany: "뉴몰드 (사출)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 15,
    processCode: "62",
    processName: "사출설비 및 금형 유지보수(PM) 기록 관리",
    section: "50~62 (사출성형/설비보전)",
    actorRole: "생산팀 / 공무",
    methodTool: "엑셀 설비이력카드, 그룹웨어",
    workPlace: "사출사무실 / 금형실",
    inputData: "금형 Shot 카운터, 정기 점검 체크리스트",
    outputData: "PM 완료 보고서, 금형 세척/반출입 이력",
    leadTimeHours: 2,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },

  // 70~81 구간
  {
    id: 16,
    processCode: "70",
    processName: "자주검사 (초·중·종물 검사실 검사)",
    section: "70~81 (자주/순회검사)",
    actorRole: "생산팀 검사원",
    methodTool: "육안, 한도견본, 2D 도면",
    workPlace: "검사실",
    inputData: "사출 성형품 (초·중·종물 2h 간격)",
    outputData: "자주검사 체크시트 (외관/치수)",
    leadTimeHours: 1,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 17,
    processCode: "71",
    processName: "검사일보 기록(양품/불량수량) 및 현품표 작성",
    section: "70~81 (자주/순회검사)",
    actorRole: "생산팀 검사원",
    methodTool: "수기 작성, 엑셀",
    workPlace: "검사실",
    inputData: "양품 및 불량(가스, 수축, 버 등) 수량 집계",
    outputData: "공정 검사일보, 박스 단위 현품표",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 18,
    processCode: "72",
    processName: "포장박스 현품표 부착",
    section: "70~81 (자주/순회검사)",
    actorRole: "생산팀 검사원",
    methodTool: "현품표 라벨, 테이핑기",
    workPlace: "검사실",
    inputData: "완포장 카톤박스, 발행 현품표",
    outputData: "식별표 부착 완료 포장박스",
    leadTimeHours: 0.2,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 19,
    processCode: "73",
    processName: "불량품 재검 후 양품 전환",
    section: "70~81 (자주/순회검사)",
    actorRole: "품질관리",
    methodTool: "선별 지그, 엑셀",
    workPlace: "검사실",
    inputData: "보류/선별 대상 불량품",
    outputData: "양품 전환 수량 등록 및 폐기 처리서",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 20,
    processCode: "80",
    processName: "공정순회검사 (IPQC)",
    section: "70~81 (자주/순회검사)",
    actorRole: "품질관리자",
    methodTool: "수기 점검표, 엑셀",
    workPlace: "사출기 / 검사실",
    inputData: "사출 라인 가동 상태, 검사원 작업 표준",
    outputData: "공정순회검사 일지, 부적합 시정요구서",
    leadTimeHours: 2,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 21,
    processCode: "81",
    processName: "공정검사 결과 기록",
    section: "70~81 (자주/순회검사)",
    actorRole: "품질관리자",
    methodTool: "엑셀 품질 통계",
    workPlace: "검사실",
    inputData: "순회검사 측정 데이터, 공정 불량률",
    outputData: "일일 공정품질 분석 리포트",
    leadTimeHours: 0.5,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-18",
  },

  // 90~102 구간
  {
    id: 22,
    processCode: "90",
    processName: "출하 검사 (OQC 샘플링 검사)",
    section: "90~102 (출하검사/선적서류)",
    actorRole: "품질관리",
    methodTool: "육안, 3차원 측정기, 광학측정기",
    workPlace: "측정실",
    inputData: "출하 대기 완제품 Lot (AQL 샘플링)",
    outputData: "출하검사 성적서 (OQC Report)",
    leadTimeHours: 1.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 23,
    processCode: "91",
    processName: "출하 합격 도장 박스에 날인",
    section: "90~102 (출하검사/선적서류)",
    actorRole: "품질관리",
    methodTool: "OQC Pass 스탬프",
    workPlace: "검사실 / 출하대기장",
    inputData: "OQC 합격 성적서",
    outputData: "합격 인장 날인 박스",
    leadTimeHours: 0.2,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 24,
    processCode: "100",
    processName: "포장 완료 박스 팔레트 적재",
    section: "90~102 (출하검사/선적서류)",
    actorRole: "생산팀",
    methodTool: "작업자 직접 적재, 적재패턴 기준서",
    workPlace: "검사실 / 포장장",
    inputData: "합격 날인 완료 박스",
    outputData: "팔레트 적재 완료품 (Pallet Unit)",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 25,
    processCode: "101",
    processName: "출하할 팔레트 확정 및 기록",
    section: "90~102 (출하검사/선적서류)",
    actorRole: "생산관리",
    methodTool: "엑셀 출하관리대장",
    workPlace: "검사실 / 사무실",
    inputData: "팔레트별 박스 수량 및 제품 수량",
    outputData: "출하 팔레트 식별표 및 확정 수량",
    leadTimeHours: 0.5,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 26,
    processCode: "102",
    processName: "선적서류 작성",
    section: "90~102 (출하검사/선적서류)",
    actorRole: "생산관리",
    methodTool: "엑셀, 이메일, ERP",
    workPlace: "사무실",
    inputData: "확정 출하 수량, 거래처 납품 PO",
    outputData: "거래명세서, 송장(Invoice), 패킹리스트",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },

  // 110~140 구간
  {
    id: 27,
    processCode: "110",
    processName: "팔레트 밴딩 후 이동",
    section: "110~140 (바코드/출하운송)",
    actorRole: "생산팀 / 물류",
    methodTool: "자동 밴딩기, 랩핑기, 핸드카",
    workPlace: "창고동 (A구역)",
    inputData: "적재 완료 팔레트",
    outputData: "완포장 밴딩 팔레트",
    leadTimeHours: 0.5,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 28,
    processCode: "120",
    processName: "고객사 바코드 생성, 리딩 확인 후 현품표와 교체 부착",
    section: "110~140 (바코드/출하운송)",
    actorRole: "생산관리",
    methodTool: "엑셀/바코드프린터, 2D 바코드스캐너",
    workPlace: "창고동 / 사무실",
    inputData: "고객사 지정 바코드 양식(20~21자리)",
    outputData: "바코드 부착 및 스캔 검증 완료품",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 29,
    processCode: "130",
    processName: "출하",
    section: "110~140 (바코드/출하운송)",
    actorRole: "생산관리 / 물류",
    methodTool: "지게차, 화물차량",
    workPlace: "창고동 출하도크",
    inputData: "선적서류, 출하 확정 팔레트",
    outputData: "차량 상차 및 출하 완료 전표",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 30,
    processCode: "140",
    processName: "운송 (국내 및 베트남 현지 납품)",
    section: "110~140 (바코드/출하운송)",
    actorRole: "생산관리 / 물류사",
    methodTool: "이메일, 화물운송망, 해상/항공",
    workPlace: "운송 중 / 고객사 공장",
    inputData: "출하 인수증, 거래명세서",
    outputData: "고객사 입고 확인증, 세금계산서 정산",
    leadTimeHours: 24,
    applicableCompany: "공통",
    isActive: true,
    updatedAt: "2026-08-19",
  },

  // 우성정공 금형 가공 공정코드 (GUN, CNC, ML, HT, PL, WR)
  {
    id: 31,
    processCode: "GUN",
    processName: "건드릴 가공 (냉각홀 딥홀 가공)",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 가공팀",
    methodTool: "건드릴 머신 (Gun Drill Machine)",
    workPlace: "우성 1공장 가공실",
    inputData: "금형 2D 냉각 유로 도면, 몰드베이스",
    outputData: "냉각홀 천공 완료 코어 강재",
    leadTimeHours: 8,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 32,
    processCode: "ML",
    processName: "황삭 밀링 가공",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 가공팀",
    methodTool: "범용/대형 밀링기",
    workPlace: "우성 1공장 가공실",
    inputData: "단조 강재(NAK80/SKD61)",
    outputData: "외곽 흑피 제거 및 1차 황삭품",
    leadTimeHours: 12,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 33,
    processCode: "HT",
    processName: "코어 열처리 (Heat Treatment)",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 협력사",
    methodTool: "진공 열처리로",
    workPlace: "열처리 외주 공장",
    inputData: "황삭 완료 코어 블럭",
    outputData: "경도(HRC 48~52) 열처리 완료재",
    leadTimeHours: 24,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 34,
    processCode: "CNC",
    processName: "CNC 고속 정밀가공",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 가공팀",
    methodTool: "5축/3축 고속 머시닝센터",
    workPlace: "우성 2공장 CNC실",
    inputData: "CAM 3D 툴패스(NC Data)",
    outputData: "정밀 3차원 코어/캐비티 형상 가공품",
    leadTimeHours: 20,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 35,
    processCode: "PL",
    processName: "방전 가공 (EDM)",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 가공팀",
    methodTool: "방전가공기, 구리/흑연 전극",
    workPlace: "우성 방전실",
    inputData: "전극 데이터, 미세 리브/코너 형상부",
    outputData: "방전 성형 완료 코어",
    leadTimeHours: 10,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 36,
    processCode: "WR",
    processName: "와이어 컷팅 (Wire EDM)",
    section: "우성 금형가공(GUN/CNC/ML)",
    actorRole: "우성정공 가공팀",
    methodTool: "와이어 컷팅기",
    workPlace: "우성 와이어실",
    inputData: "슬라이드 코어, 경사핀 분할선 도면",
    outputData: "정밀 슬릿 및 인서트 분할품",
    leadTimeHours: 8,
    applicableCompany: "우성정공 (금형)",
    isActive: true,
    updatedAt: "2026-08-19",
  }
];

export default function ProcessManagementPage() {
  const [data, setData] = useState<ProcessMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterSection, setFilterSection] = useState<string>("ALL");
  const [filterCompany, setFilterCompany] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  const fetchProcesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSection !== "ALL") params.set("section", filterSection);
      if (filterSearch) params.set("name", filterSearch);

      const res = await fetch(`/api/v1/basic-info/processes?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("공정 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterSection, filterSearch]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProcessMasterItem | null>(null);

  // 폼 상태
  const [formState, setFormState] = useState<Partial<ProcessMasterItem>>({
    processCode: "",
    processName: "",
    section: "0~2 (수주/계획/발주)",
    actorRole: "생산관리",
    methodTool: "엑셀, 시스템",
    workPlace: "사무실",
    inputData: "",
    outputData: "",
    leadTimeHours: 1,
    applicableCompany: "MPSI (자사)",
    isActive: true,
  });

  // 검색
  const handleSearch = () => {
    const filtered = initialProcesses.filter((item) => {
      const matchSection = filterSection !== "ALL" ? item.section === filterSection : true;
      const matchCompany = filterCompany !== "ALL" ? item.applicableCompany === filterCompany : true;
      const matchText = filterSearch
        ? item.processCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
          item.processName.includes(filterSearch) ||
          item.actorRole.includes(filterSearch) ||
          item.workPlace.includes(filterSearch)
        : true;
      const matchDate = isWithinDateRange(item.updatedAt, filterDateFrom, filterDateTo);
      return matchSection && matchCompany && matchText && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterSection("ALL");
    setFilterCompany("ALL");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialProcesses);
  };

  // 신규 등록 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    setFormState({
      processCode: "",
      processName: "",
      section: "0~2 (수주/계획/발주)",
      actorRole: "생산관리",
      methodTool: "엑셀, MES",
      workPlace: "사무실",
      inputData: "",
      outputData: "",
      leadTimeHours: 1,
      applicableCompany: "MPSI (자사)",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // 상세/수정 모달 열기
  const handleOpenDetail = (item: ProcessMasterItem) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 저장 처리
  const handleSaveForm = () => {
    if (!formState.processCode?.trim()) {
      alert("공정코드(번호)를 입력해주세요.");
      return;
    }
    if (!formState.processName?.trim()) {
      alert("공정명을 입력해주세요.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    if (isNewRegister) {
      const newItem: ProcessMasterItem = {
        id: data.length + 1,
        processCode: formState.processCode.trim(),
        processName: formState.processName.trim(),
        section: formState.section as ProcessSectionType || "0~2 (수주/계획/발주)",
        actorRole: formState.actorRole || "담당자",
        methodTool: formState.methodTool || "엑셀",
        workPlace: formState.workPlace || "현장",
        inputData: formState.inputData || "-",
        outputData: formState.outputData || "-",
        leadTimeHours: Number(formState.leadTimeHours || 1),
        applicableCompany: formState.applicableCompany || "공통",
        isActive: formState.isActive !== undefined ? formState.isActive : true,
        updatedAt: today,
      };
      setData([newItem, ...data]);
      alert(`[공정 ${newItem.processCode}: ${newItem.processName}] 공정 마스터가 등록되었습니다.`);
    } else if (selectedItem) {
      setData(data.map(item => item.id === selectedItem.id ? {
        ...item,
        ...formState,
        updatedAt: today,
      } as ProcessMasterItem : item));
      alert(`[공정 ${formState.processCode}] 정보가 수정되었습니다.`);
    }
    setIsModalOpen(false);
  };

  // 삭제 처리
  const handleDelete = (id: number) => {
    if (confirm("정말 이 공정 정보를 삭제(비활성화)하시겠습니까?")) {
      setData(data.filter(item => item.id !== id));
      alert("삭제되었습니다.");
    }
  };

  // 구간별 배지 스타일
  const getSectionBadge = (sec: ProcessSectionType) => {
    if (sec.startsWith("0~2")) return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    if (sec.startsWith("10~21")) return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
    if (sec.startsWith("30~41")) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
    if (sec.startsWith("50~62")) return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
    if (sec.startsWith("70~81")) return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300";
    if (sec.startsWith("90~102")) return "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300";
    if (sec.startsWith("110~140")) return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            label="조회 기간 (수정일)"
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onChange={(start, end, preset) => {
              setFilterDateFrom(start);
              setFilterDateTo(end);
              if (preset) setSelectedDatePreset(preset);
            }}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">공정 흐름 구간 (0~140 / 가공)</span>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 공정 구간</option>
              <option value="0~2 (수주/계획/발주)">0~2 : 수주 / 생산계획 / 자재발주</option>
              <option value="10~21 (자재입고/수입검사)">10~21 : 원부자재 입고 / 수입검사(IQC)</option>
              <option value="30~41 (원재료보관/건조)">30~41 : 원재료 보관 / 관리번호 / 건조</option>
              <option value="50~62 (사출성형/설비보전)">50~62 : 수분측정 / 사출성형 / 설비PM</option>
              <option value="70~81 (자주/순회검사)">70~81 : 자주검사 / 현품표 / 순회검사</option>
              <option value="90~102 (출하검사/선적서류)">90~102 : 출하검사(OQC) / 선적서류</option>
              <option value="110~140 (바코드/출하운송)">110~140 : 바코드 / 출하 / 베트남 운송</option>
              <option value="우성 금형가공(GUN/CNC/ML)">금형 정밀가공 (GUN/CNC/ML/HT/PL/WR)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">적용 대상 기업</span>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 기업 (공통/외주/자체)</option>
              <option value="MPSI (자사)">MPSI (원청/총괄)</option>
              <option value="우성정공 (금형)">금형제작처 (외주/자체)</option>
              <option value="뉴몰드 (사출)">사출양산처 (외주/자체)</option>
              <option value="공통">공통 적용</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">통합 검색어</span>
            <Input 
              value={filterSearch} 
              onChange={(e) => setFilterSearch(e.target.value)} 
              placeholder="공정코드, 공정명, 담당, 장소" 
              className="h-7 text-xs" 
            />
          </div>

          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
              <Search className="h-3.5 w-3.5" />
              검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 공정 목록 그리드 (FF 사출성형 공정흐름도 0~140 표 형식) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Workflow className="h-4 w-4 text-sky-600" />
            <span>기초정보관리 - 공정정보 관리대장 (FF 사출성형 공정흐름도 0~140)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{data.length}</b>개 표준공정)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => alert("공정흐름도 마스터 정의서가 Excel 파일로 다운로드되었습니다.")}
              variant="outline" 
              size="xs" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              신규 공정 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-center">공정번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">공정구간</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">공정명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">누가 (담당)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">방법 / 도구</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">작업 장소</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">Input 데이터</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px] text-sky-300">Output 데이터</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">적용 기업</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[65px] text-center">상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">최종수정일</th>
                <th className="p-1.5 min-w-[70px] text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 공정번호 (0, 10, 20 .. 140 / GUN, CNC) */}
                  <td className="p-1.5 border-r font-mono font-bold text-center text-sky-700 dark:text-sky-400">
                    {row.processCode}
                  </td>

                  {/* 공정 구간 */}
                  <td className="p-1.5 border-r">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSectionBadge(row.section)}`}>
                      {row.section}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]" title={row.processName}>
                    {row.processName}
                  </td>

                  <td className="p-1.5 border-r font-medium text-zinc-700 dark:text-zinc-300">{row.actorRole}</td>
                  <td className="p-1.5 border-r truncate max-w-[150px]" title={row.methodTool}>{row.methodTool}</td>
                  <td className="p-1.5 border-r truncate max-w-[120px]" title={row.workPlace}>{row.workPlace}</td>
                  
                  {/* Input / Output */}
                  <td className="p-1.5 border-r font-mono text-zinc-600 truncate max-w-[160px]" title={row.inputData}>{row.inputData}</td>
                  <td className="p-1.5 border-r font-mono font-medium text-sky-700 dark:text-sky-400 truncate max-w-[160px]" title={row.outputData}>{row.outputData}</td>

                  {/* 적용 대상 기업 */}
                  <td className="p-1.5 border-r text-center font-medium text-[10px] text-zinc-600">
                    {row.applicableCompany}
                  </td>

                  {/* 사용 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                      {row.isActive ? "사용" : "미사용"}
                    </span>
                  </td>

                  {/* 최종수정일 */}
                  <td className="p-1.5 border-r text-center font-mono text-zinc-500 dark:text-zinc-400">
                    {row.updatedAt}
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        onClick={() => handleOpenDetail(row)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-1.5 text-[10px] text-zinc-600 hover:bg-zinc-100"
                        title="수정"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(row.id)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 border-rose-200"
                        title="삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달] 공정 등록 및 입출력 정의 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {isNewRegister ? "신규 표준 공정 등록 (0~140 공정흐름도)" : `표준 공정 정보 수정 [공정 ${formState.processCode}]`}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 1. 기본 공정 식별 및 구간 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">공정 번호(코드) <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.processCode || ""} 
                    onChange={(e) => setFormState({ ...formState, processCode: e.target.value })}
                    placeholder="0, 10, 60, GUN, CNC 등"
                    className="h-7 text-xs bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">공정 흐름 구간 <span className="text-red-500">*</span></label>
                  <select
                    value={formState.section || "0~2 (수주/계획/발주)"}
                    onChange={(e) => setFormState({ ...formState, section: e.target.value as ProcessSectionType })}
                    className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                  >
                    <option value="0~2 (수주/계획/발주)">0~2 : 수주 / 생산계획 / 자재발주</option>
                    <option value="10~21 (자재입고/수입검사)">10~21 : 원부자재 입고 / 수입검사(IQC)</option>
                    <option value="30~41 (원재료보관/건조)">30~41 : 원재료 보관 / 관리번호 / 건조</option>
                    <option value="50~62 (사출성형/설비보전)">50~62 : 수분측정 / 사출성형 / 설비PM</option>
                    <option value="70~81 (자주/순회검사)">70~81 : 자주검사 / 현품표 / 순회검사</option>
                    <option value="90~102 (출하검사/선적서류)">90~102 : 출하검사(OQC) / 선적서류</option>
                    <option value="110~140 (바코드/출하운송)">110~140 : 바코드 / 출하 / 베트남 운송</option>
                    <option value="우성 금형가공(GUN/CNC/ML)">금형 정밀가공 (GUN/CNC/ML/HT/PL/WR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">적용 대상 기업</label>
                  <select
                    value={formState.applicableCompany || "공통"}
                    onChange={(e) => setFormState({ ...formState, applicableCompany: e.target.value as any })}
                    className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs"
                  >
                    <option value="MPSI (자사)">MPSI (원청/총괄)</option>
                    <option value="우성정공 (금형)">금형제작처 (외주/자체)</option>
                    <option value="뉴몰드 (사출)">사출양산처 (외주/자체)</option>
                    <option value="공통">공통 적용</option>
                  </select>
                </div>
              </div>

              {/* 2. 공정명 및 담당/도구/장소 */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Factory className="h-4 w-4 text-sky-600" />
                  공정 명칭 및 작업 표준 사양 (담당자/도구/장소)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="sm:col-span-2">
                    <label className="block text-zinc-500 mb-1">공정명 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.processName || ""} 
                      onChange={(e) => setFormState({ ...formState, processName: e.target.value })}
                      placeholder="예: 사출성형, 수입 검사, 원재료 건조"
                      className="h-7 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">누가 (담당 역할)</label>
                    <Input 
                      value={formState.actorRole || ""} 
                      onChange={(e) => setFormState({ ...formState, actorRole: e.target.value })}
                      placeholder="생산팀, 품질관리, 생산관리"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">표준 리드타임(시간)</label>
                    <Input 
                      type="number"
                      step="0.1"
                      value={formState.leadTimeHours || 1} 
                      onChange={(e) => setFormState({ ...formState, leadTimeHours: Number(e.target.value) })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">방법 / 도구 (설비 및 소프트웨어)</label>
                    <Input 
                      value={formState.methodTool || ""} 
                      onChange={(e) => setFormState({ ...formState, methodTool: e.target.value })}
                      placeholder="예: 엑셀, 사출성형기 450T, 건조기, 육안, 스탬프"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">작업 장소</label>
                    <Input 
                      value={formState.workPlace || ""} 
                      onChange={(e) => setFormState({ ...formState, workPlace: e.target.value })}
                      placeholder="사무실, 창고동(C구역), 사출기 현장, 측정실, 검사실"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SCM & MES 입출력(Input / Output) 데이터 연동 정의 */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-sky-600" />
                  SCM & 경량 MES 데이터 연계 (Input ↔ Output)
                </h4>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">Input 데이터 (전공정 산출물 및 기준서)</label>
                    <textarea 
                      value={formState.inputData || ""} 
                      onChange={(e) => setFormState({ ...formState, inputData: e.target.value })}
                      placeholder="예: 고객 확정PO, 2D/3D 도면, 수입검사 성적서, 건조 완료 수지"
                      className="w-full h-16 p-2 rounded border text-xs bg-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Output 데이터 (본공정 생성물 및 실적)</label>
                    <textarea 
                      value={formState.outputData || ""} 
                      onChange={(e) => setFormState({ ...formState, outputData: e.target.value })}
                      placeholder="예: 생산일보, 현품표 라벨, OQC 합격성적서, 거래명세서"
                      className="w-full h-16 p-2 rounded border text-xs bg-white resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveForm}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                공정 마스터 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}