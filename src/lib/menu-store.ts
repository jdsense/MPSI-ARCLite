"use client";

import { useEffect, useState, useCallback } from "react";
import initialMenusJson from "@/config/menu-config.json";
import { RoleType } from "@/lib/role-store";

export interface SubMenuConfigItem {
  id: string;
  title: string;
  url: string;
  roles: RoleType[];
}

export interface MenuConfigItem {
  id: string;
  groupTitle?: string;
  title: string;
  icon: string;
  isGroupMenu?: boolean;
  baseUrl?: string;
  url?: string;
  roles: RoleType[];
  flattenForRole?: RoleType;
  submenus?: SubMenuConfigItem[];
}

const MENU_STORAGE_KEY = "mpsi_master_menu_config_v1";
const MENU_EVENT = "mpsi_menus_updated";

export const INITIAL_MASTER_MENUS: MenuConfigItem[] = initialMenusJson as MenuConfigItem[];

export function getCachedMasterMenus(): MenuConfigItem[] {
  if (typeof window === "undefined") return INITIAL_MASTER_MENUS;
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return INITIAL_MASTER_MENUS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MASTER_MENUS;
  } catch {
    return INITIAL_MASTER_MENUS;
  }
}

export function setCachedMasterMenus(menus: MenuConfigItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menus));
    window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: menus }));
  } catch {
    // ignore
  }
}

/** 마스터 메뉴 설정에서 특정 URL에 대한 해당 역할(Role)의 접근 허용 여부 판별 */
export function isUrlExplicitlyAllowedInMenuConfig(
  pathname: string,
  role: RoleType,
  menus: MenuConfigItem[]
): boolean | null {
  if (role === "ADMIN") return true;
  let foundInConfig = false;
  let allowedForRole = false;

  for (const menu of menus) {
    if (menu.url === pathname) {
      foundInConfig = true;
      if (menu.roles?.includes(role)) allowedForRole = true;
    }
    if (menu.submenus) {
      for (const sub of menu.submenus) {
        if (sub.url === pathname) {
          foundInConfig = true;
          if (sub.roles?.includes(role)) allowedForRole = true;
        }
      }
    }
  }

  if (!foundInConfig) return null; // 메뉴 설정에 없는 세부 페이지 URL은 기본 역할 규칙 따름
  return allowedForRole;
}

/** 마스터 메뉴 설정에서 현재 경로(pathname)의 최신 메뉴명을 반환 (이름 수정 시 헤더 타이틀 즉시 동기화) */
export function getDynamicMenuTitle(pathname: string, menus: MenuConfigItem[]): string | null {
  for (const menu of menus) {
    if (menu.submenus) {
      for (const sub of menu.submenus) {
        if (sub.url === pathname) return sub.title;
      }
    }
    if (menu.url === pathname) return menu.title;
  }
  return null;
}

export function useMenuConfigStore() {
  const [menus, setMenus] = useState<MenuConfigItem[]>(() => getCachedMasterMenus());
  const [saving, setSaving] = useState(false);

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/menus", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.menus)) {
        setMenus(data.menus);
        localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data.menus));
      }
    } catch {
      // fallback to cached/initial
    }
  }, []);

  useEffect(() => {
    fetchMenus();
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<MenuConfigItem[]>;
      if (ce.detail && Array.isArray(ce.detail)) {
        setMenus(ce.detail);
      } else {
        setMenus(getCachedMasterMenus());
      }
    };
    window.addEventListener(MENU_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(MENU_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [fetchMenus]);

  const saveMenus = useCallback(async (nextMenus: MenuConfigItem[]) => {
    setSaving(true);
    setMenus(nextMenus);
    setCachedMasterMenus(nextMenus);
    try {
      const res = await fetch("/api/v1/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menus: nextMenus }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.menus)) {
        setMenus(data.menus);
        setCachedMasterMenus(data.menus);
      }
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    menus,
    saving,
    saveMenus,
    refreshMenus: fetchMenus,
  };
}

