// src/lib/user-constants.ts
import { RoleType } from "./role-store";
import { DEFAULT_INITIAL_PASSWORD_HASH } from "./auth-crypto";

export interface UserAccountItem {
  id: number;
  userId: string;          // 로그인ID (newmold, woosung, mpsi, admin 등)
  userName: string;        // 사용자명
  passwordHash: string;    // 단방향 SHA-256 암호화된 비밀번호
  roleId: RoleType;        // 권한ID (ADMIN, MPSI, VENDOR_MOLD, VENDOR_MASS)
  roleName: string;        // 권한명 (시스템관리자, MPSI 본사, 금형 협력사, 양산 협력사)
  vendorCode: string;      // 협력사ID(업체코드) (NEWMOLD, WOOSUNG, 1 등)
  vendorName: string;      // 소속업체명
  department?: string;     // 부서명
  email?: string;          // 이메일
  tel?: string;            // 연락처
  isUsed?: boolean;        // 사용여부
  lastLogin?: string;      // 최종 접속일시
}

// 스크린샷과 100% 일치하는 4대 표준 계정 마스터 시드 (기본 비밀번호: Mpsi2026!@ 암호화 적용)
export const INITIAL_USER_ACCOUNTS: UserAccountItem[] = [
  {
    id: 1,
    userId: "newmold",
    userName: "뉴몰드",
    passwordHash: DEFAULT_INITIAL_PASSWORD_HASH,
    roleId: "VENDOR_MASS",
    roleName: "양산 협력사",
    vendorCode: "NEWMOLD",
    vendorName: "(주)뉴몰드",
    department: "사출품질팀",
    email: "jh.choi@newmold.co.kr",
    tel: "031-498-8888",
    isUsed: true,
    lastLogin: "2026-11-05 12:30",
  },
  {
    id: 2,
    userId: "woosung",
    userName: "배희섭 금형팀장",
    passwordHash: DEFAULT_INITIAL_PASSWORD_HASH,
    roleId: "VENDOR_MOLD",
    roleName: "금형 협력사",
    vendorCode: "WOOSUNG",
    vendorName: "우성정공(주)",
    department: "금형기술개발팀",
    email: "hs.bae@woosung.co.kr",
    tel: "031-492-1234",
    isUsed: true,
    lastLogin: "2026-11-05 13:40",
  },
  {
    id: 3,
    userId: "mpsi",
    userName: "관리자",
    passwordHash: DEFAULT_INITIAL_PASSWORD_HASH,
    roleId: "MPSI",
    roleName: "MPSI 본사",
    vendorCode: "",
    vendorName: "MPSI 본사",
    department: "SCM 총괄 관제본부",
    email: "minsu.kim@mpsi.co.kr",
    tel: "02-555-0101",
    isUsed: true,
    lastLogin: "2026-11-05 14:15",
  },
  {
    id: 4,
    userId: "admin",
    userName: "시스템 최고관리자",
    passwordHash: DEFAULT_INITIAL_PASSWORD_HASH,
    roleId: "ADMIN",
    roleName: "시스템관리자",
    vendorCode: "1",
    vendorName: "MPSI 기술본부",
    department: "SCM 시스템팀",
    email: "admin@impix.co.kr",
    tel: "02-555-0100",
    isUsed: true,
    lastLogin: "2026-11-05 14:20",
  },
];

