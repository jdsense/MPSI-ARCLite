// src/lib/permission-store.ts
"use client";

import { useState, useEffect } from "react";

export interface RoleItem {
  id: string; // "ADMIN" | "MPSI" | "VENDOR_MOLD" | "VENDOR_MASS"
  name: string;
  isUsed: boolean;
  system: string;
  startPage: string;
}

export interface PermissionFlags {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface MenuPermissionItem {
  id: number;
  groupNm: string;
  screenId: string;
  screenName: string;
  url: string;
  permissions: Record<string, PermissionFlags>;
}

export const INITIAL_ROLES: RoleItem[] = [
  { id: "ADMIN", name: "시스템관리자", isUsed: true, system: "MPSI SCM", startPage: "C010000" },
  { id: "MPSI", name: "MPSI 본사", isUsed: true, system: "MPSI SCM", startPage: "C010000" },
  { id: "VENDOR_MOLD", name: "금형 협력사", isUsed: true, system: "MPSI SCM", startPage: "C650000" },
  { id: "VENDOR_MASS", name: "양산 협력사", isUsed: true, system: "MPSI SCM", startPage: "C850000" },
];

// MPSI 시스템 전체 23개 실제 화면 마스터 및 초기 권한 매핑
export const INITIAL_MENU_PERMISSIONS: MenuPermissionItem[] = [
  {
    id: 1,
    groupNm: "프로젝트",
    screenId: "C010000",
    screenName: "프로젝트 관리대장",
    url: "/portal/project",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: false, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: true, canCreate: false, canUpdate: true, canDelete: false },
    },
  },
  {
    id: 2,
    groupNm: "대시보드",
    screenId: "C020000",
    screenName: "통합 관제 대시보드",
    url: "/portal/dashboard",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 3,
    groupNm: "수주/견적",
    screenId: "C110000",
    screenName: "원청사 견적 (수주관리)",
    url: "/portal/quotation",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 4,
    groupNm: "수주/견적",
    screenId: "C120000",
    screenName: "도면 접수 및 검토",
    url: "/portal/sales-order/drawing-reception",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: false, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 5,
    groupNm: "금형개발",
    screenId: "C210000",
    screenName: "1. 금형 견적 관리",
    url: "/portal/mold-dev/quotation",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 6,
    groupNm: "금형개발",
    screenId: "C220000",
    screenName: "2. 제품검토 및 금형설계",
    url: "/portal/mold-dev/design",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 7,
    groupNm: "금형개발",
    screenId: "C230000",
    screenName: "3. 금형제작",
    url: "/portal/mold-dev/manufacture",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 8,
    groupNm: "금형개발",
    screenId: "C240000",
    screenName: "4. 시사출/금형 육성 및 승인",
    url: "/portal/mold-dev/trial",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 9,
    groupNm: "사출양산",
    screenId: "C310000",
    screenName: "1. 양산 견적 관리",
    url: "/portal/mass-prod/quotation",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    },
  },
  {
    id: 10,
    groupNm: "사출양산",
    screenId: "C320000",
    screenName: "2. 양산성 검증/시양산",
    url: "/portal/mass-prod/validation",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    },
  },
  {
    id: 11,
    groupNm: "사출양산",
    screenId: "C330000",
    screenName: "3. 양산 승인 (PPAP)",
    url: "/portal/mass-prod/ppap",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
    },
  },
  {
    id: 12,
    groupNm: "물류배송",
    screenId: "C400000",
    screenName: "배송현황",
    url: "/portal/delivery-status",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 13,
    groupNm: "물류배송",
    screenId: "C410000",
    screenName: "완제품 납품/마감 관리",
    url: "/portal/delivery-close",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 14,
    groupNm: "협력사포털",
    screenId: "C650000",
    screenName: "금형 협력사 전용 포털",
    url: "/portal/vendor-portal/mold/projects",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: false, canCreate: false, canUpdate: false, canDelete: false }, // MPSI 본사 숨김!
      VENDOR_MOLD: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 15,
    groupNm: "협력사포털",
    screenId: "C850000",
    screenName: "양산 협력사 전용 포털",
    url: "/portal/vendor-portal/mass/projects",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: false, canCreate: false, canUpdate: false, canDelete: false }, // MPSI 본사 숨김!
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    },
  },
  {
    id: 16,
    groupNm: "기초정보",
    screenId: "C810000",
    screenName: "사원정보",
    url: "/portal/basic-info/employee",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 17,
    groupNm: "기초정보",
    screenId: "C820000",
    screenName: "고객정보",
    url: "/portal/basic-info/customer",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 18,
    groupNm: "기초정보",
    screenId: "C830000",
    screenName: "공급/외주업체 정보",
    url: "/portal/basic-info/vendor",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 19,
    groupNm: "기초정보",
    screenId: "C840000",
    screenName: "품목정보",
    url: "/portal/basic-info/item",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 20,
    groupNm: "기초정보",
    screenId: "C851000",
    screenName: "공정정보",
    url: "/portal/basic-info/process",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 21,
    groupNm: "기초정보",
    screenId: "C860000",
    screenName: "창고정보",
    url: "/portal/basic-info/warehouse",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 22,
    groupNm: "시스템",
    screenId: "C991000",
    screenName: "계정관리",
    url: "/portal/admin/users",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 23,
    groupNm: "시스템",
    screenId: "C992000",
    screenName: "권한관리",
    url: "/portal/admin/permissions",
    permissions: {
      ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      MPSI: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
];

const ROLES_STORAGE_KEY = "mpsi_system_roles_v2";
const PERMS_STORAGE_KEY = "mpsi_menu_permissions_v2";
const CHANGE_EVENT = "mpsi_permissions_changed";

export function getStoredRoles(): RoleItem[] {
  if (typeof window === "undefined") return INITIAL_ROLES;
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return INITIAL_ROLES;
    return JSON.parse(raw);
  } catch {
    return INITIAL_ROLES;
  }
}

export function saveStoredRoles(roles: RoleItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredMenuPermissions(): MenuPermissionItem[] {
  if (typeof window === "undefined") return INITIAL_MENU_PERMISSIONS;
  try {
    const raw = localStorage.getItem(PERMS_STORAGE_KEY);
    if (!raw) return INITIAL_MENU_PERMISSIONS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_MENU_PERMISSIONS;
  }
}

export function saveStoredMenuPermissions(perms: MenuPermissionItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERMS_STORAGE_KEY, JSON.stringify(perms));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch (e) {
    console.error(e);
  }
}

export function usePermissionStore() {
  const [roles, setRoles] = useState<RoleItem[]>(getStoredRoles);
  const [menuPermissions, setMenuPermissions] = useState<MenuPermissionItem[]>(getStoredMenuPermissions);

  useEffect(() => {
    const sync = () => {
      setRoles(getStoredRoles());
      setMenuPermissions(getStoredMenuPermissions());
    };
    // 1. 브라우저 마운트 시 즉시 로컬 스토리지 최신 설정값 동기화
    sync();

    // 2. 권한 변경 이벤트, 스토리지 이벤트, 역할 전환 이벤트 수신
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("mpsi_auth_role_change", sync);

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("mpsi_auth_role_change", sync);
    };
  }, []);

  const updateRoleFlag = (
    menuId: number,
    roleId: string,
    flag: keyof PermissionFlags,
    value: boolean
  ) => {
    const updated = menuPermissions.map((m) => {
      if (m.id !== menuId) return m;
      const currentRolePerms = m.permissions[roleId] || {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      };
      return {
        ...m,
        permissions: {
          ...m.permissions,
          [roleId]: {
            ...currentRolePerms,
            [flag]: value,
          },
        },
      };
    });
    setMenuPermissions(updated);
    saveStoredMenuPermissions(updated);
  };

  const setAllPermissionsForRole = (roleId: string, allow: boolean) => {
    const updated = menuPermissions.map((m) => ({
      ...m,
      permissions: {
        ...m.permissions,
        [roleId]: {
          canRead: allow,
          canCreate: allow,
          canUpdate: allow,
          canDelete: allow,
        },
      },
    }));
    setMenuPermissions(updated);
    saveStoredMenuPermissions(updated);
  };

  const toggleColumnForRole = (roleId: string, flag: keyof PermissionFlags, value: boolean) => {
    const updated = menuPermissions.map((m) => {
      const currentRolePerms = m.permissions[roleId] || {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      };
      return {
        ...m,
        permissions: {
          ...m.permissions,
          [roleId]: {
            ...currentRolePerms,
            [flag]: value,
          },
        },
      };
    });
    setMenuPermissions(updated);
    saveStoredMenuPermissions(updated);
  };

  const addRole = (newRole: RoleItem) => {
    const nextRoles = [...roles, newRole];
    setRoles(nextRoles);
    saveStoredRoles(nextRoles);
  };

  const updateRole = (roleId: string, updates: Partial<RoleItem>) => {
    const nextRoles = roles.map((r) => (r.id === roleId ? { ...r, ...updates } : r));
    setRoles(nextRoles);
    saveStoredRoles(nextRoles);
  };

  const deleteRole = (roleId: string) => {
    const nextRoles = roles.filter((r) => r.id !== roleId);
    setRoles(nextRoles);
    saveStoredRoles(nextRoles);
  };

  const addCustomMenu = (newItem: Omit<MenuPermissionItem, "id">) => {
    const id = menuPermissions.length > 0 ? Math.max(...menuPermissions.map((m) => m.id)) + 1 : 1;
    const next = [...menuPermissions, { ...newItem, id }];
    setMenuPermissions(next);
    saveStoredMenuPermissions(next);
  };

  const deleteMenu = (id: number) => {
    const next = menuPermissions.filter((m) => m.id !== id);
    setMenuPermissions(next);
    saveStoredMenuPermissions(next);
  };

  return {
    roles,
    menuPermissions,
    updateRoleFlag,
    setAllPermissionsForRole,
    toggleColumnForRole,
    addRole,
    updateRole,
    deleteRole,
    addCustomMenu,
    deleteMenu,
    saveRoles: () => saveStoredRoles(roles),
    savePermissions: () => saveStoredMenuPermissions(menuPermissions),
  };
}

/**
 * 특정 화면ID 또는 URL에 대한 역할별 권한 플래그 조회 함수
 */
export function getScreenPermission(
  screenIdOrUrl: string,
  role: string,
  customPerms?: MenuPermissionItem[]
): PermissionFlags {
  const perms = customPerms && customPerms.length > 0 ? customPerms : getStoredMenuPermissions();
  const found = perms.find((m) => m.screenId === screenIdOrUrl || m.url === screenIdOrUrl);
  if (!found) {
    return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
  }
  const rolePerm = found.permissions[role];
  if (!rolePerm) {
    return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
  }
  return rolePerm;
}

