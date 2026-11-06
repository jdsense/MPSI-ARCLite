"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Layers,
  LayoutDashboard,
  Database,
  Briefcase,
  FileText,
  Wrench,
  Factory,
  Truck,
  ChevronDown,
  Users,
  BookOpen,
  ClipboardList,
  Hammer,
  Gauge,
  FileCheck2,
  PackageCheck,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
  Settings,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FolderPlus,
  Folder,
  LucideIcon,
} from "lucide-react";
import { useAuthRole, RoleType, getHomePathForRole } from "@/lib/role-store";
import { usePermissionStore, getStoredMenuPermissions } from "@/lib/permission-store";
import {
  useMenuConfigStore,
  MenuConfigItem,
  SubMenuConfigItem,
  INITIAL_MASTER_MENUS,
} from "@/lib/menu-store";

// 서브메뉴 항목 인터페이스
export interface SubMenuItem {
  id?: string;
  title: string;
  url: string;
  roles?: RoleType[];
}

// 메뉴 항목 인터페이스
export interface NavigationMenuItem {
  id?: string;
  groupTitle?: string;
  title: string;
  url?: string;
  icon: LucideIcon;
  iconName?: string;
  isGroupMenu?: boolean;
  baseUrl?: string;
  roles?: RoleType[];
  flattenForRole?: RoleType;
  submenus?: SubMenuItem[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  FileSpreadsheet,
  Wrench,
  Factory,
  Truck,
  Database,
  Settings,
  Layers,
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  Hammer,
  Gauge,
  FileCheck2,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  Folder,
};

const PICKABLE_ICONS: { name: string; label: string }[] = [
  { name: "Briefcase", label: "프로젝트" },
  { name: "FileSpreadsheet", label: "견적/문서" },
  { name: "Wrench", label: "금형/공구" },
  { name: "Factory", label: "양산/공장" },
  { name: "Truck", label: "물류/배송" },
  { name: "Database", label: "기초DB" },
  { name: "Settings", label: "시스템" },
  { name: "Layers", label: "통합계층" },
  { name: "Users", label: "사용자" },
  { name: "ClipboardList", label: "점검표" },
  { name: "Gauge", label: "계측/성능" },
  { name: "Folder", label: "그룹폴더" },
];

function resolveIcon(name?: string): LucideIcon {
  if (!name) return FileText;
  return ICON_MAP[name] || FileText;
}

const ROLE_OPTIONS: { role: RoleType; label: string; color: string }[] = [
  { role: "MPSI", label: "MPSI 본사", color: "text-sky-600 border-sky-300 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300" },
  { role: "VENDOR_MOLD", label: "금형 협력사", color: "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300" },
  { role: "VENDOR_MASS", label: "양산 협력사", color: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300" },
];

interface EditDialogState {
  mode: "add-group" | "edit-group" | "edit-menu" | "add-menu" | "edit-sub" | "add-sub";
  groupTitle: string;
  originalGroupTitle?: string;
  menuId?: string;
  subId?: string;
  title: string;
  url: string;
  icon: string;
  isGroupMenu: boolean;
  roles: RoleType[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const { role, vendorName, nodeConfig } = useAuthRole();
  const { menuPermissions } = usePermissionStore();
  const { menus: masterMenus, saving, saveMenus } = useMenuConfigStore();

  // 최고 관리자 전용 메뉴 에디트 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [dialog, setDialog] = useState<EditDialogState | null>(null);

  const isAdmin = role === "ADMIN";

  // 권한(canRead) 검사 헬퍼 함수
  const isMenuAllowed = (url?: string, itemRoles?: RoleType[]): boolean => {
    if (!url || url === "#") return true;
    if (role === "ADMIN") return true;

    // 1. 마스터 메뉴 설정(menu-config.json)에 지정된 노출 권한(roles) 최우선 적용
    if (itemRoles && Array.isArray(itemRoles)) {
      if (!itemRoles.includes(role)) return false;
      return true;
    }

    // 2. 기본 URL 프리픽스 가드
    if (url.startsWith("/portal/admin")) return false;
    if (url.startsWith("/portal/vendor-portal/mold/") && role !== "VENDOR_MOLD") return false;
    if (url.startsWith("/portal/vendor-portal/mass/") && role !== "VENDOR_MASS") return false;

    // 3. 권한 관리 매트릭스(permission-store) 검사
    const perms =
      menuPermissions && menuPermissions.length > 0 ? menuPermissions : getStoredMenuPermissions();

    let found = perms.find((m) => m.url === url);
    if (!found && url.includes("/vendor-portal/mold/")) {
      const suffix = url.replace("/portal/vendor-portal/mold/", "");
      found =
        suffix === "projects"
          ? perms.find((m) => m.screenId === "C650000")
          : perms.find((m) => m.url === `/portal/mold-dev/${suffix}`);
    }
    if (!found && url.includes("/vendor-portal/mass/")) {
      const suffix = url.replace("/portal/vendor-portal/mass/", "");
      found =
        suffix === "projects"
          ? perms.find((m) => m.screenId === "C850000")
          : perms.find((m) => m.url === `/portal/mass-prod/${suffix}`);
    }

    if (!found) return true;
    const rolePerm = found.permissions[role];
    if (!rolePerm) return true;
    return rolePerm.canRead !== false;
  };

  // 상단 회사명 + ARCFORGE 타이틀 및 서브타이틀 결정
  let companyTitle = vendorName || "MPSI";
  if (role === "ADMIN" || role === "MPSI") {
    companyTitle = "MPSI";
  } else if (!companyTitle && nodeConfig.nodeName) {
    companyTitle = nodeConfig.nodeName;
  }
  const portalTitle = `${companyTitle} ARCFORGE`;

  let portalSubTitle = "본사 총괄 관제";
  let themeColorClass = "text-sky-600";
  let defaultGroupLabel = "MPSI 메인 공정 메뉴";

  if (nodeConfig.nodeType === "VENDOR_MOLD" || role === "VENDOR_MOLD") {
    portalSubTitle = nodeConfig.isStandalone ? "금형제작 독립 시스템" : "금형제작 협력사 포털";
    themeColorClass = "text-purple-600";
    defaultGroupLabel = "금형 제작 외주 공정 (Step 1~10)";
  } else if (nodeConfig.nodeType === "VENDOR_MASS" || role === "VENDOR_MASS") {
    portalSubTitle = nodeConfig.isStandalone ? "사출양산 독립 시스템" : "사출양산 협력사 포털";
    themeColorClass = "text-emerald-600";
    defaultGroupLabel = "사출 양산 외주 공정 (Step 11~13)";
  } else if (role === "ADMIN") {
    portalSubTitle = "시스템 최고관리자";
    themeColorClass = "text-amber-600";
    defaultGroupLabel = "MPSI 메인 공정 메뉴";
  }

  // 마스터 메뉴(masterMenus)로부터 현재 로그인한 역할(role)에 맞는 메뉴 트리 생성
  const activeMenus: NavigationMenuItem[] = (() => {
    const out: NavigationMenuItem[] = [];
    const effectiveRole: RoleType =
      nodeConfig.nodeType === "VENDOR_MOLD"
        ? "VENDOR_MOLD"
        : nodeConfig.nodeType === "VENDOR_MASS"
        ? "VENDOR_MASS"
        : role;

    for (const m of masterMenus) {
      const menuRoles: RoleType[] = m.roles || ["ADMIN"];
      const allowedSubmenus = (m.submenus || []).filter((sub) => {
        const subRoles: RoleType[] = sub.roles || menuRoles;
        if (effectiveRole === "ADMIN") return true;
        return subRoles.includes(effectiveRole) && isMenuAllowed(sub.url, subRoles);
      });

      // 금형 협력사(VENDOR_MOLD) / 양산 협력사(VENDOR_MASS) 전용 그룹은 해당 협력사 로그인 시 하위메뉴를 펼쳐서 노출
      if (effectiveRole !== "ADMIN" && m.flattenForRole === effectiveRole) {
        for (const sub of allowedSubmenus) {
          out.push({
            id: sub.id,
            groupTitle: defaultGroupLabel,
            title: sub.title,
            url: sub.url,
            icon: resolveIcon(m.icon),
            iconName: m.icon,
            isGroupMenu: false,
            roles: sub.roles,
          });
        }
        continue;
      }

      if (effectiveRole !== "ADMIN") {
        const hasParentRole = menuRoles.includes(effectiveRole);
        if (!hasParentRole && allowedSubmenus.length === 0) continue;
        if (m.submenus && m.submenus.length > 0 && allowedSubmenus.length === 0) continue;
        if (!m.submenus?.length && !isMenuAllowed(m.url, menuRoles)) continue;
      }

      out.push({
        id: m.id,
        groupTitle: m.groupTitle || defaultGroupLabel,
        title: m.title,
        url: m.url,
        baseUrl: m.baseUrl,
        icon: resolveIcon(m.icon),
        iconName: m.icon,
        isGroupMenu: m.isGroupMenu ?? Boolean(m.submenus && m.submenus.length > 0),
        roles: menuRoles,
        flattenForRole: m.flattenForRole,
        submenus: allowedSubmenus.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          roles: s.roles || menuRoles,
        })),
      });
    }
    return out;
  })();

  // 섹션 그룹(groupTitle)별로 메뉴 묶기 (순서 보존)
  const groupedSections: { groupTitle: string; items: NavigationMenuItem[] }[] = [];
  for (const item of activeMenus) {
    const gTitle = item.groupTitle || defaultGroupLabel;
    const existing = groupedSections.find((g) => g.groupTitle === gTitle);
    if (existing) {
      existing.items.push(item);
    } else {
      groupedSections.push({ groupTitle: gTitle, items: [item] });
    }
  }

  const allDistinctGroupTitles = Array.from(
    new Set(masterMenus.map((m) => m.groupTitle || "MPSI 메인 공정 메뉴"))
  );

  const handleSubmenuToggle = (title: string, baseUrl?: string) => {
    setOpenMenus((prev) => {
      const isCurrentlyOpen =
        prev[title] !== undefined ? prev[title] : baseUrl ? pathname.startsWith(baseUrl) : false;
      return {
        ...prev,
        [title]: !isCurrentlyOpen,
      };
    });
  };

  // ───── [1. 상위 섹션 그룹(Group) CRUD 핸들러] ─────
  const openAddGroupDialog = () => {
    const slug = `group-${Date.now().toString(36).slice(-4)}`;
    setDialog({
      mode: "add-group",
      groupTitle: "",
      title: "",
      url: `/portal/custom/${slug}`,
      icon: "Folder",
      isGroupMenu: true,
      roles: ["ADMIN", "MPSI"],
    });
  };

  const openEditGroupDialog = (gTitle: string) => {
    const firstInGroup = masterMenus.find((m) => (m.groupTitle || "MPSI 메인 공정 메뉴") === gTitle);
    setDialog({
      mode: "edit-group",
      groupTitle: gTitle,
      originalGroupTitle: gTitle,
      title: gTitle,
      url: "/portal/project",
      icon: "Folder",
      isGroupMenu: true,
      roles: firstInGroup?.roles || ["ADMIN", "MPSI"],
    });
  };

  const moveGroupSection = async (gTitle: string, dir: -1 | 1) => {
    const groupOrder = Array.from(
      new Set(masterMenus.map((m) => m.groupTitle || "MPSI 메인 공정 메뉴"))
    );
    const idx = groupOrder.indexOf(gTitle);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= groupOrder.length) return;

    const nextGroupOrder = [...groupOrder];
    const [moved] = nextGroupOrder.splice(idx, 1);
    nextGroupOrder.splice(targetIdx, 0, moved);

    const reordered: MenuConfigItem[] = [];
    for (const gt of nextGroupOrder) {
      for (const m of masterMenus) {
        if ((m.groupTitle || "MPSI 메인 공정 메뉴") === gt) {
          reordered.push(m);
        }
      }
    }
    await saveMenus(reordered);
  };

  const deleteGroupSection = async (gTitle: string) => {
    const count = masterMenus.filter((m) => (m.groupTitle || "MPSI 메인 공정 메뉴") === gTitle).length;
    if (
      !window.confirm(
        `[${gTitle}] 그룹과 그 안의 메뉴 ${count}개를 모두 삭제하시겠습니까?\n(모든 권한의 사이드바에서 함께 제거됩니다)`
      )
    )
      return;
    const next = masterMenus.filter((m) => (m.groupTitle || "MPSI 메인 공정 메뉴") !== gTitle);
    await saveMenus(next);
  };

  // ───── [2. 그룹메뉴(대메뉴) & 하위 메뉴 CRUD 핸들러] ─────
  const moveMenu = async (menuId: string, dir: -1 | 1) => {
    const idx = masterMenus.findIndex((m) => m.id === menuId);
    if (idx < 0) return;
    const currentGroup = masterMenus[idx].groupTitle || "MPSI 메인 공정 메뉴";
    // 같은 섹션 그룹 내에서 이전/다음 메뉴와 위치 교환
    const sameGroupIndices = masterMenus
      .map((m, i) => ((m.groupTitle || "MPSI 메인 공정 메뉴") === currentGroup ? i : -1))
      .filter((i) => i >= 0);
    const posInGroup = sameGroupIndices.indexOf(idx);
    const targetPos = posInGroup + dir;
    if (targetPos < 0 || targetPos >= sameGroupIndices.length) return;

    const targetIdx = sameGroupIndices[targetPos];
    const next = [...masterMenus];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    await saveMenus(next);
  };

  const moveSubmenu = async (menuId: string, subIdx: number, dir: -1 | 1) => {
    const next = masterMenus.map((m) => {
      if (m.id !== menuId || !m.submenus) return m;
      const targetIdx = subIdx + dir;
      if (targetIdx < 0 || targetIdx >= m.submenus.length) return m;
      const subs = [...m.submenus];
      const [item] = subs.splice(subIdx, 1);
      subs.splice(targetIdx, 0, item);
      return { ...m, submenus: subs };
    });
    await saveMenus(next);
  };

  const deleteMenuItem = async (menuId: string) => {
    const target = masterMenus.find((m) => m.id === menuId);
    if (!target) return;
    if (
      !window.confirm(
        `[${target.title}] 그룹메뉴(대메뉴)를 삭제하시겠습니까?\n(하위 메뉴를 포함해 모든 권한의 사이드바에서 함께 제거됩니다)`
      )
    )
      return;
    const next = masterMenus.filter((m) => m.id !== menuId);
    await saveMenus(next);
  };

  const deleteSubmenuItem = async (menuId: string, subId: string, subTitle: string) => {
    if (
      !window.confirm(
        `[${subTitle}] 하위 메뉴를 삭제하시겠습니까?\n(모든 권한의 사이드바에서 함께 제거됩니다)`
      )
    )
      return;
    const next = masterMenus.map((m) => {
      if (m.id !== menuId || !m.submenus) return m;
      return { ...m, submenus: m.submenus.filter((s) => s.id !== subId) };
    });
    await saveMenus(next);
  };

  const openAddMainMenuDialog = (targetGroupTitle?: string) => {
    const slug = `group-${Date.now().toString(36).slice(-4)}`;
    setDialog({
      mode: "add-menu",
      groupTitle: targetGroupTitle || allDistinctGroupTitles[0] || "MPSI 메인 공정 메뉴",
      title: "",
      url: `/portal/custom/${slug}`,
      icon: "Folder",
      isGroupMenu: true,
      roles: ["ADMIN", "MPSI"],
    });
  };

  const openEditMainMenuDialog = (m: MenuConfigItem) => {
    setDialog({
      mode: "edit-menu",
      groupTitle: m.groupTitle || "MPSI 메인 공정 메뉴",
      menuId: m.id,
      title: m.title,
      url: m.url || m.baseUrl || "/portal/project",
      icon: m.icon || "Briefcase",
      isGroupMenu: m.isGroupMenu ?? Boolean(m.submenus && m.submenus.length > 0),
      roles: m.roles || ["ADMIN"],
    });
  };

  const openAddSubMenuDialog = (m: MenuConfigItem) => {
    const base = (m.baseUrl || m.url || "/portal/admin").replace(/\/+$/, "");
    const slug = `page-${Date.now().toString(36).slice(-4)}`;
    setDialog({
      mode: "add-sub",
      groupTitle: m.groupTitle || "MPSI 메인 공정 메뉴",
      menuId: m.id,
      title: "",
      url: `${base}/${slug}`,
      icon: m.icon || "FileText",
      isGroupMenu: false,
      roles: m.roles || ["ADMIN", "MPSI"],
    });
  };

  const openEditSubMenuDialog = (m: MenuConfigItem, s: SubMenuConfigItem) => {
    setDialog({
      mode: "edit-sub",
      groupTitle: m.groupTitle || "MPSI 메인 공정 메뉴",
      menuId: m.id,
      subId: s.id,
      title: s.title,
      url: s.url,
      icon: m.icon || "FileText",
      isGroupMenu: false,
      roles: s.roles || m.roles || ["ADMIN"],
    });
  };

  const toggleDialogRole = (r: RoleType) => {
    if (!dialog) return;
    const has = dialog.roles.includes(r);
    const nextRoles: RoleType[] = has
      ? dialog.roles.filter((x) => x !== r)
      : [...dialog.roles, r];
    if (!nextRoles.includes("ADMIN")) nextRoles.unshift("ADMIN");
    setDialog({ ...dialog, roles: nextRoles });
  };

  const handleDialogSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const rolesWithAdmin: RoleType[] = Array.from(new Set<RoleType>(["ADMIN", ...dialog.roles]));

    // 1) 새 섹션 그룹(카테고리) + 첫 그룹메뉴 생성
    if (dialog.mode === "add-group") {
      const cleanGroup = dialog.groupTitle.trim();
      if (!cleanGroup) return;
      const firstMenuTitle = dialog.title.trim() || `${cleanGroup} 메인`;
      const cleanUrl = dialog.url.trim().startsWith("/")
        ? dialog.url.trim()
        : `/portal/${dialog.url.trim()}`;
      const id = `menu-${Date.now().toString(36)}`;
      const newMenu: MenuConfigItem = {
        id,
        groupTitle: cleanGroup,
        title: firstMenuTitle,
        icon: dialog.icon || "Folder",
        isGroupMenu: dialog.isGroupMenu,
        baseUrl: cleanUrl,
        url: cleanUrl,
        roles: rolesWithAdmin,
        submenus: dialog.isGroupMenu
          ? [
              {
                id: `sub-${Date.now().toString(36)}`,
                title: `${firstMenuTitle} 대장`,
                url: cleanUrl,
                roles: rolesWithAdmin,
              },
            ]
          : [],
      };
      setOpenMenus((prev) => ({ ...prev, [firstMenuTitle]: true }));
      await saveMenus([...masterMenus, newMenu]);
      setDialog(null);
      return;
    }

    // 2) 섹션 그룹명 및 그룹 전체 권한 일괄 수정
    if (dialog.mode === "edit-group" && dialog.originalGroupTitle) {
      const newGroupTitle = dialog.groupTitle.trim();
      if (!newGroupTitle) return;
      const next = masterMenus.map((m) => {
        if ((m.groupTitle || "MPSI 메인 공정 메뉴") !== dialog.originalGroupTitle) return m;
        return {
          ...m,
          groupTitle: newGroupTitle,
          roles: rolesWithAdmin,
          submenus: m.submenus?.map((s) => ({ ...s, roles: rolesWithAdmin })),
        };
      });
      await saveMenus(next);
      setDialog(null);
      return;
    }

    if (!dialog.title.trim()) return;
    const cleanTitle = dialog.title.trim();
    const cleanGroup = (dialog.groupTitle || "MPSI 메인 공정 메뉴").trim();
    const cleanUrl = dialog.url.trim().startsWith("/")
      ? dialog.url.trim()
      : `/portal/${dialog.url.trim()}`;

    // 3) 그룹메뉴(대메뉴) 추가
    if (dialog.mode === "add-menu") {
      const id = `menu-${Date.now().toString(36)}`;
      const newMenu: MenuConfigItem = {
        id,
        groupTitle: cleanGroup,
        title: cleanTitle,
        icon: dialog.icon || "Folder",
        isGroupMenu: dialog.isGroupMenu,
        baseUrl: cleanUrl,
        url: cleanUrl,
        roles: rolesWithAdmin,
        submenus: dialog.isGroupMenu
          ? [
              {
                id: `sub-${Date.now().toString(36)}`,
                title: `${cleanTitle} 관리`,
                url: cleanUrl,
                roles: rolesWithAdmin,
              },
            ]
          : [],
      };
      if (dialog.isGroupMenu) {
        setOpenMenus((prev) => ({ ...prev, [cleanTitle]: true }));
      }
      await saveMenus([...masterMenus, newMenu]);
    } else if (dialog.mode === "edit-menu" && dialog.menuId) {
      // 4) 그룹메뉴(대메뉴) 수정
      const next = masterMenus.map((m) => {
        if (m.id !== dialog.menuId) return m;
        let updatedSubs = m.submenus?.map((s) => ({
          ...s,
          roles: rolesWithAdmin,
        })) || [];
        // 단일 메뉴에서 폴더형 그룹메뉴로 전환했는데 하위 메뉴가 비어있다면 기본 하위메뉴 1개 자동 생성
        if (dialog.isGroupMenu && updatedSubs.length === 0) {
          updatedSubs = [
            {
              id: `sub-${Date.now().toString(36)}`,
              title: `${cleanTitle} 관리`,
              url: cleanUrl,
              roles: rolesWithAdmin,
            },
          ];
        }
        return {
          ...m,
          groupTitle: cleanGroup,
          title: cleanTitle,
          icon: dialog.icon || m.icon,
          isGroupMenu: dialog.isGroupMenu,
          baseUrl: cleanUrl,
          url: cleanUrl,
          roles: rolesWithAdmin,
          submenus: dialog.isGroupMenu ? updatedSubs : [],
        };
      });
      await saveMenus(next);
    } else if (dialog.mode === "add-sub" && dialog.menuId) {
      // 5) 하위 메뉴 추가
      const subId = `sub-${Date.now().toString(36)}`;
      const next = masterMenus.map((m) => {
        if (m.id !== dialog.menuId) return m;
        const nextRoles = Array.from(new Set<RoleType>([...(m.roles || ["ADMIN"]), ...rolesWithAdmin]));
        return {
          ...m,
          isGroupMenu: true,
          roles: nextRoles,
          submenus: [
            ...(m.submenus || []),
            {
              id: subId,
              title: cleanTitle,
              url: cleanUrl,
              roles: rolesWithAdmin,
            },
          ],
        };
      });
      const parent = masterMenus.find((m) => m.id === dialog.menuId);
      if (parent) {
        setOpenMenus((prev) => ({ ...prev, [parent.title]: true }));
      }
      await saveMenus(next);
    } else if (dialog.mode === "edit-sub" && dialog.menuId && dialog.subId) {
      // 6) 하위 메뉴 수정
      const next = masterMenus.map((m) => {
        if (m.id !== dialog.menuId || !m.submenus) return m;
        const nextSubs = m.submenus.map((s) =>
          s.id === dialog.subId
            ? { ...s, title: cleanTitle, url: cleanUrl, roles: rolesWithAdmin }
            : s
        );
        const unionRoles = Array.from(
          new Set<RoleType>([
            ...(m.roles || ["ADMIN"]),
            ...nextSubs.flatMap((s) => s.roles || []),
          ])
        );
        return { ...m, roles: unionRoles, submenus: nextSubs };
      });
      await saveMenus(next);
    }

    setDialog(null);
  };

  const handleResetDefaultMenus = async () => {
    if (!window.confirm("모든 그룹 및 메뉴 구성을 초기 기본 상태로 복원하시겠습니까?")) return;
    await saveMenus(INITIAL_MASTER_MENUS);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <Link
            href={getHomePathForRole(role)}
            className="flex items-center gap-2 font-bold text-base hover:opacity-85 transition-opacity min-w-0"
            title={`${portalTitle} 프로젝트 관리로 이동`}
          >
            <Layers className={`h-5 w-5 ${themeColorClass} shrink-0`} />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-bold tracking-tight">{portalTitle}</span>
              <span className="text-[11px] text-muted-foreground font-normal truncate">
                {portalSubTitle}
              </span>
            </div>
          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsEditMode((v) => !v);
                setDialog(null);
              }}
              className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                isEditMode
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
              }`}
              title="그룹메뉴 및 하위메뉴 CRUD 편집 모드"
            >
              {isEditMode ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>편집 완료</span>
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" />
                  <span>메뉴 편집</span>
                </>
              )}
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* 최고 관리자 전용 메뉴 & 그룹 CRUD 툴바 */}
        {isEditMode && isAdmin && (
          <div className="mx-2 mt-2 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-[10px] text-amber-900 dark:text-amber-200 space-y-2">
            <div className="font-bold flex items-center justify-between">
              <span>⚡ 그룹메뉴 & 메뉴 CRUD 모드</span>
              {saving && <span className="text-amber-600 animate-pulse">저장 중...</span>}
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-300/90 leading-snug">
              섹션 그룹·폴더형 그룹메뉴·하위메뉴를 자유롭게 추가/수정/삭제하면 <b>본사·금형·양산 협력사</b>에 동시 반영됩니다.
            </p>
            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <button
                type="button"
                onClick={openAddGroupDialog}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
              >
                <FolderPlus className="h-3 w-3" />
                + 섹션 그룹 추가
              </button>
              <button
                type="button"
                onClick={() => openAddMainMenuDialog()}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
              >
                <Plus className="h-3 w-3" />
                + 그룹메뉴 추가
              </button>
            </div>
            <button
              type="button"
              onClick={handleResetDefaultMenus}
              className="w-full inline-flex items-center justify-center gap-1 py-1 px-2 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-300 border border-amber-300 dark:border-zinc-700 font-medium text-[10px] cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              기본 메뉴 구성으로 초기화
            </button>
          </div>
        )}

        {/* 그룹 / 그룹메뉴 / 하위메뉴 통합 CRUD 모달 폼 */}
        {isEditMode && isAdmin && dialog && (
          <form
            onSubmit={handleDialogSave}
            className="mx-2 mt-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border-2 border-blue-500 shadow-xl space-y-2.5 text-xs"
          >
            <div className="flex items-center justify-between border-b pb-1.5 dark:border-zinc-800">
              <span className="font-bold text-[11px] text-blue-700 dark:text-blue-300">
                {dialog.mode === "add-group" && "📁 새 섹션 그룹(카테고리) 생성"}
                {dialog.mode === "edit-group" && "✏️ 섹션 그룹명 및 일괄 권한 수정"}
                {dialog.mode === "add-menu" && "➕ 새 그룹메뉴(대메뉴) 추가"}
                {dialog.mode === "edit-menu" && "✏️ 그룹메뉴(대메뉴) 수정"}
                {dialog.mode === "add-sub" && "➕ 하위 메뉴(신규 페이지) 추가"}
                {dialog.mode === "edit-sub" && "✏️ 하위 메뉴 수정"}
              </span>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 섹션 그룹명 입력 또는 선택 */}
            {(dialog.mode === "add-group" || dialog.mode === "edit-group") && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  섹션 그룹명 (상단 구분 타이틀)
                </label>
                <input
                  type="text"
                  value={dialog.groupTitle}
                  onChange={(e) => setDialog({ ...dialog, groupTitle: e.target.value })}
                  placeholder="예: 품질 및 설비 통합 관제"
                  required
                  autoFocus
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {(dialog.mode === "add-menu" || dialog.mode === "edit-menu") && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  소속 섹션 그룹 (기존 그룹 선택 또는 직접 입력)
                </label>
                <input
                  type="text"
                  list="sidebar-group-titles-list"
                  value={dialog.groupTitle}
                  onChange={(e) => setDialog({ ...dialog, groupTitle: e.target.value })}
                  placeholder="섹션 그룹명"
                  required
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-semibold focus:outline-none focus:border-blue-500"
                />
                <datalist id="sidebar-group-titles-list">
                  {allDistinctGroupTitles.map((gt) => (
                    <option key={gt} value={gt} />
                  ))}
                </datalist>
              </div>
            )}

            {/* 메뉴명 입력 (edit-group이 아닐 때) */}
            {dialog.mode !== "edit-group" && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  {dialog.mode === "add-group"
                    ? "첫 번째 그룹메뉴(대메뉴) 이름"
                    : dialog.mode.includes("menu")
                    ? "그룹메뉴(대메뉴) 이름"
                    : "하위 메뉴 이름"}
                </label>
                <input
                  type="text"
                  value={dialog.title}
                  onChange={(e) => setDialog({ ...dialog, title: e.target.value })}
                  placeholder="예: 품질보증 관리"
                  required
                  autoFocus={dialog.mode !== "add-group"}
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* 그룹메뉴 유형(폴더형 vs 단일형) & 아이콘 선택기 */}
            {(dialog.mode === "add-group" || dialog.mode === "add-menu" || dialog.mode === "edit-menu") && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    메뉴 구조 유형
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setDialog({ ...dialog, isGroupMenu: true })}
                      className={`py-1 px-2 rounded text-[10px] font-bold border cursor-pointer ${
                        dialog.isGroupMenu
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      📁 폴더형 그룹메뉴
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ ...dialog, isGroupMenu: false })}
                      className={`py-1 px-2 rounded text-[10px] font-bold border cursor-pointer ${
                        !dialog.isGroupMenu
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      📄 단일 페이지 메뉴
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    아이콘 선택
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {PICKABLE_ICONS.map((ic) => {
                      const IcComp = resolveIcon(ic.name);
                      const selected = dialog.icon === ic.name;
                      return (
                        <button
                          key={ic.name}
                          type="button"
                          onClick={() => setDialog({ ...dialog, icon: ic.name })}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium border cursor-pointer ${
                            selected
                              ? "bg-amber-500 text-white border-amber-600 font-bold"
                              : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <IcComp className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* 연결 URL */}
            {dialog.mode !== "edit-group" && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  연결 URL (없는 경로면 빈 페이지 자동 생성)
                </label>
                <input
                  type="text"
                  value={dialog.url}
                  onChange={(e) => setDialog({ ...dialog, url: e.target.value })}
                  placeholder="/portal/..."
                  required
                  className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* 타 권한 동시 노출 선택 */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                함께 반영할 권한 (체크된 권한에 동시 노출)
              </label>
              <div className="flex flex-wrap gap-1">
                {ROLE_OPTIONS.map((opt) => {
                  const checked = dialog.roles.includes(opt.role);
                  return (
                    <button
                      key={opt.role}
                      type="button"
                      onClick={() => toggleDialogRole(opt.role)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        checked
                          ? opt.color
                          : "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
                      }`}
                    >
                      {checked ? "✓ " : "+ "}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
              >
                저장 및 전체 반영
              </button>
            </div>
          </form>
        )}

        {/* 섹션 그룹별 렌더링 */}
        {groupedSections.map((section, secIdx) => (
          <SidebarGroup key={section.groupTitle} className="py-1.5">
            <div className="flex items-center justify-between px-2 mb-1">
              <SidebarGroupLabel className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 px-0 truncate">
                {section.groupTitle}
              </SidebarGroupLabel>

              {/* 에디트 모드일 때 섹션 그룹 CRUD 컨트롤 노출 */}
              {isEditMode && isAdmin && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openAddMainMenuDialog(section.groupTitle)}
                    className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-600"
                    title={`[${section.groupTitle}] 그룹에 새 그룹메뉴 추가`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditGroupDialog(section.groupTitle)}
                    className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600"
                    title={`[${section.groupTitle}] 그룹명 및 권한 수정`}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGroupSection(section.groupTitle, -1)}
                    disabled={secIdx === 0}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                    title="그룹 위로 이동"
                  >
                    <ArrowUp className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGroupSection(section.groupTitle, 1)}
                    disabled={secIdx === groupedSections.length - 1}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                    title="그룹 아래로 이동"
                  >
                    <ArrowDown className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGroupSection(section.groupTitle)}
                    className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                    title={`[${section.groupTitle}] 그룹 전체 삭제`}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>

            <SidebarMenu>
              {section.items.map((menu, itemIdxInGroup) => {
                const Icon = menu.icon;
                const rawMenu = masterMenus.find((m) => m.id === menu.id);
                const hasSubmenus = Boolean(menu.submenus && menu.submenus.length > 0);
                const isSubmenuOpen =
                  isEditMode ||
                  (openMenus[menu.title] !== undefined
                    ? openMenus[menu.title]
                    : menu.baseUrl
                    ? pathname.startsWith(menu.baseUrl)
                    : false);

                const isParentActive = menu.baseUrl
                  ? pathname.startsWith(menu.baseUrl)
                  : menu.url
                  ? pathname === menu.url
                  : false;

                // 1) 에디트 모드일 때 (그룹메뉴/대메뉴 및 하위메뉴 CRUD 버튼 표시)
                if (isEditMode && isAdmin && rawMenu) {
                  return (
                    <SidebarMenuItem key={menu.id || menu.title} className="mb-1">
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700">
                        <div
                          onClick={() => handleSubmenuToggle(menu.title, menu.baseUrl)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <Icon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs font-bold truncate">{menu.title}</span>
                          <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono shrink-0">
                            {rawMenu.submenus && rawMenu.submenus.length > 0
                              ? `그룹(${rawMenu.submenus.length})`
                              : "단일"}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openAddSubMenuDialog(rawMenu)}
                            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-600"
                            title="하위 메뉴 추가 (그룹메뉴화)"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditMainMenuDialog(rawMenu)}
                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600"
                            title="그룹메뉴 설정(이름·그룹·아이콘·권한) 수정"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMenu(rawMenu.id, -1)}
                            disabled={itemIdxInGroup === 0}
                            className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                            title="위로 이동"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMenu(rawMenu.id, 1)}
                            disabled={itemIdxInGroup === section.items.length - 1}
                            className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                            title="아래로 이동"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMenuItem(rawMenu.id)}
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                            title="그룹메뉴 삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {rawMenu.submenus && rawMenu.submenus.length > 0 && (
                        <SidebarMenuSub className="mt-1 space-y-1">
                          {rawMenu.submenus.map((sub, subIdx) => (
                            <SidebarMenuSubItem key={sub.id || sub.url}>
                              <div className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-[11px]">
                                <span
                                  onClick={() => router.push(sub.url)}
                                  className="truncate flex-1 cursor-pointer hover:text-blue-600 font-medium"
                                  title={sub.url}
                                >
                                  {sub.title}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditSubMenuDialog(rawMenu, sub)}
                                    className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600"
                                    title="하위 메뉴 수정"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSubmenu(rawMenu.id, subIdx, -1)}
                                    disabled={subIdx === 0}
                                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                                    title="위로 이동"
                                  >
                                    <ArrowUp className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveSubmenu(rawMenu.id, subIdx, 1)}
                                    disabled={subIdx === rawMenu.submenus!.length - 1}
                                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 disabled:opacity-30"
                                    title="아래로 이동"
                                  >
                                    <ArrowDown className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSubmenuItem(rawMenu.id, sub.id, sub.title)}
                                    className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                                    title="하위 메뉴 삭제"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // 2) 일반 네비게이션 모드: 서브메뉴가 있는 복합 그룹메뉴
                if (hasSubmenus) {
                  return (
                    <SidebarMenuItem key={menu.id || menu.title}>
                      <SidebarMenuButton
                        isActive={isParentActive}
                        onClick={() => {
                          handleSubmenuToggle(menu.title, menu.baseUrl);
                          if (menu.url && menu.submenus && menu.submenus.length === 1) {
                            router.push(menu.url);
                          }
                        }}
                        className="flex items-center justify-between w-full font-medium cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate text-[13px]">{menu.title}</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                            isSubmenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </SidebarMenuButton>

                      {isSubmenuOpen && (
                        <SidebarMenuSub>
                          {menu.submenus!.map((sub) => {
                            const isSubActive = pathname === sub.url;
                            return (
                              <SidebarMenuSubItem key={sub.id || sub.url}>
                                <SidebarMenuSubButton
                                  isActive={isSubActive}
                                  onClick={() => router.push(sub.url)}
                                  className="cursor-pointer text-xs py-1.5"
                                >
                                  <span className="truncate">{sub.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // 3) 일반 네비게이션 모드: 단일 메뉴
                const isActive = menu.url
                  ? pathname === menu.url || pathname.startsWith(menu.url + "/")
                  : false;

                return (
                  <SidebarMenuItem key={menu.id || menu.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => menu.url && router.push(menu.url)}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate text-[13px]">{menu.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
