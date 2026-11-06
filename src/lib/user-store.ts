// src/lib/user-store.ts
"use client";

import { useState, useEffect } from "react";
import { RoleType } from "./role-store";
import { DEFAULT_INITIAL_PASSWORD_HASH } from "./auth-crypto";
import { UserAccountItem, INITIAL_USER_ACCOUNTS } from "./user-constants";

export { type UserAccountItem, INITIAL_USER_ACCOUNTS };

const STORAGE_KEY = "mpsi_user_accounts_v2"; // 패스워드 암호화 필드가 추가된 v2 스토리지
const EVENT_NAME = "mpsi_user_accounts_change";

export function getStoredUserAccounts(): UserAccountItem[] {
  if (typeof window === "undefined") return INITIAL_USER_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USER_ACCOUNTS));
      return INITIAL_USER_ACCOUNTS;
    }
    const parsed: UserAccountItem[] = JSON.parse(raw);
    // passwordHash 누락 시 기본 해시 주입
    return parsed.map((u) => ({
      ...u,
      passwordHash: u.passwordHash || DEFAULT_INITIAL_PASSWORD_HASH,
    }));
  } catch (e) {
    console.error("Failed to load user accounts from storage", e);
    return INITIAL_USER_ACCOUNTS;
  }
}

export function saveUserAccountsToStorage(users: UserAccountItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: users }));
  } catch (e) {
    console.error("Failed to save user accounts to storage", e);
  }
}

export function findUserByLoginId(userId: string): UserAccountItem | undefined {
  const list = getStoredUserAccounts();
  return list.find((u) => u.userId.toLowerCase() === userId.trim().toLowerCase());
}

// React 훅
export function useUserAccountStore() {
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로컬 및 DB 동기화
  const fetchFromDb = async () => {
    try {
      const res = await fetch("/api/v1/admin/users");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveUserAccountsToStorage(json.data);
          setUsers(json.data);
          return;
        }
      }
    } catch (e) {
      console.warn("DB user fetch error, fallback to localStorage:", e);
    }
    setUsers(getStoredUserAccounts());
  };

  const sync = () => {
    setUsers(getStoredUserAccounts());
  };

  useEffect(() => {
    // 1차 즉시 로컬 데이터 노출
    sync();
    setIsLoading(false);

    // 2차 백엔드 DB와 양방향 동기화
    fetchFromDb();

    const handleUpdate = () => sync();
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const addUser = (newUser: Omit<UserAccountItem, "id">) => {
    const current = getStoredUserAccounts();
    const id = current.length > 0 ? Math.max(...current.map((u) => u.id)) + 1 : 1;
    const item: UserAccountItem = { ...newUser, id };
    const nextList = [item, ...current];
    saveUserAccountsToStorage(nextList);
    setUsers(nextList);

    // 비동기 DB 영구 저장
    fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch((err) => console.error("Failed to persist user to DB:", err));

    return item;
  };

  const updateUser = (id: number, updates: Partial<UserAccountItem>) => {
    const current = getStoredUserAccounts();
    const target = current.find((u) => u.id === id);
    const updated = target ? { ...target, ...updates } : null;
    const nextList = current.map((u) => (u.id === id ? { ...u, ...updates } : u));
    saveUserAccountsToStorage(nextList);
    setUsers(nextList);

    // 비동기 DB 업데이트 반영
    if (updated) {
      fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch((err) => console.error("Failed to update user in DB:", err));
    }
  };

  const deleteUser = (id: number) => {
    const current = getStoredUserAccounts();
    const target = current.find((u) => u.id === id);
    const nextList = current.filter((u) => u.id !== id);
    saveUserAccountsToStorage(nextList);
    setUsers(nextList);

    // 비동기 DB 삭제 반영
    if (target?.userId) {
      fetch(`/api/v1/admin/users?userId=${encodeURIComponent(target.userId)}`, {
        method: "DELETE",
      }).catch((err) => console.error("Failed to delete user in DB:", err));
    }
  };

  const deleteUsers = (ids: number[]) => {
    const current = getStoredUserAccounts();
    const idSet = new Set(ids);
    const toDelete = current.filter((u) => idSet.has(u.id));
    const nextList = current.filter((u) => !idSet.has(u.id));
    saveUserAccountsToStorage(nextList);
    setUsers(nextList);

    toDelete.forEach((u) => {
      fetch(`/api/v1/admin/users?userId=${encodeURIComponent(u.userId)}`, {
        method: "DELETE",
      }).catch((err) => console.error("Failed to delete user in DB:", err));
    });
  };

  const saveAllUsers = (newList: UserAccountItem[]) => {
    saveUserAccountsToStorage(newList);
    setUsers(newList);
  };

  return {
    users,
    isLoading,
    addUser,
    updateUser,
    deleteUser,
    deleteUsers,
    saveAllUsers,
    refresh: sync,
  };
}
