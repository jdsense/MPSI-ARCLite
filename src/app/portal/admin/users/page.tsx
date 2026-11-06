// src/app/portal/admin/users/page.tsx
"use client";

import React, { useState } from "react";
import { 
  Users, Plus, Trash2, Edit3, Shield, 
  Building2, Wrench, Factory, CheckCircle2,
  Save, RotateCcw, X, Check, Lock, AlertCircle, KeyRound, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  useUserAccountStore, 
  UserAccountItem, 
  INITIAL_USER_ACCOUNTS 
} from "@/lib/user-store";
import { RoleType } from "@/lib/role-store";
import { 
  validatePasswordPolicy, 
  hashPassword, 
  DEFAULT_INITIAL_PASSWORD, 
  DEFAULT_INITIAL_PASSWORD_HASH 
} from "@/lib/auth-crypto";

// 권한 ID 표준 매핑
const ROLE_OPTIONS: { id: RoleType; name: string }[] = [
  { id: "ADMIN", name: "시스템관리자" },
  { id: "MPSI", name: "MPSI 본사" },
  { id: "VENDOR_MOLD", name: "금형 협력사" },
  { id: "VENDOR_MASS", name: "양산 협력사" },
];

// 협력사 표준 코드 매핑
const VENDOR_OPTIONS = [
  { code: "", name: "(본사/해당없음)" },
  { code: "1", name: "1 (시스템/본사)" },
  { code: "WOOSUNG", name: "WOOSUNG - 우성정공(주)" },
  { code: "NEWMOLD", name: "NEWMOLD - (주)뉴몰드" },
  { code: "DAEHAN", name: "DAEHAN - 대한금형정공" },
  { code: "SAMWOO", name: "SAMWOO - (주)삼우정밀" },
  { code: "SEWON", name: "SEWON - 세원사출(주)" },
  { code: "JEIL", name: "JEIL - 제일프라테크" },
];

export default function UserManagementPage() {
  const { 
    users, 
    addUser, 
    updateUser, 
    deleteUser, 
    saveAllUsers 
  } = useUserAccountStore();

  // 단일 선택된 행 ID
  const [selectedUserId, setSelectedUserId] = useState<number>(1);

  // 테이블 컬럼별 필터 (스크린샷 필터 행 대응)
  const [filterUserId, setFilterUserId] = useState("");
  const [filterUserName, setFilterUserName] = useState("");
  const [filterRoleName, setFilterRoleName] = useState("ALL");
  const [filterVendorCode, setFilterVendorCode] = useState("");

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 모달 상태 (신규 등록 및 수정)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<UserAccountItem> | null>(null);

  // 비밀번호 입력 상태
  const [inputPassword, setInputPassword] = useState("");
  const [inputPasswordConfirm, setInputPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 필터링 적용된 목록
  const filteredUsers = users.filter((u) => {
    if (filterUserId && !u.userId.toLowerCase().includes(filterUserId.toLowerCase())) return false;
    if (filterUserName && !u.userName.toLowerCase().includes(filterUserName.toLowerCase())) return false;
    if (filterRoleName !== "ALL" && u.roleName !== filterRoleName) return false;
    if (filterVendorCode && !u.vendorCode.toLowerCase().includes(filterVendorCode.toLowerCase())) return false;
    return true;
  });

  // 신규 계정 추가 모달 열기
  const handleOpenAddModal = () => {
    setEditingItem({
      userId: "",
      userName: "",
      roleId: "MPSI",
      roleName: "MPSI 본사",
      vendorCode: "",
      vendorName: "MPSI 본사",
      department: "SCM 총괄팀",
      email: "",
      tel: "",
      isUsed: true,
      passwordHash: "",
    });
    setInputPassword("");
    setInputPasswordConfirm("");
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // 기존 계정 수정 모달 열기
  const handleOpenEditModal = (item: UserAccountItem) => {
    setEditingItem({ ...item });
    setInputPassword(""); // 기존 비밀번호는 비워두어 미입력 시 유지
    setInputPasswordConfirm("");
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // 모달 저장 처리 (비밀번호 정책 검증 및 암호화 적용)
  const handleSaveModal = async () => {
    if (!editingItem) return;
    if (!editingItem.userId?.trim()) {
      alert("로그인 ID를 입력해주세요.");
      return;
    }
    if (!editingItem.userName?.trim()) {
      alert("사용자명을 입력해주세요.");
      return;
    }

    const isNew = !editingItem.id;
    let finalPasswordHash = editingItem.passwordHash || DEFAULT_INITIAL_PASSWORD_HASH;

    // 신규 등록이거나 비밀번호가 입력된 경우 비밀번호 정책 검증
    if (isNew || inputPassword.trim().length > 0) {
      if (isNew && !inputPassword.trim()) {
        alert("신규 계정의 초기 비밀번호를 입력해주세요.\n(규칙: 영문 + 숫자 + 특수문자 조합 8자 이상)");
        return;
      }

      const policyCheck = validatePasswordPolicy(inputPassword);
      if (!policyCheck.isValid) {
        alert(`비밀번호 보안 정책 불충족:\n${policyCheck.message}\n\n※ 영문, 숫자, 특수문자를 각각 최소 1자 이상 포함하여 8자 이상으로 설정해야 합니다.`);
        return;
      }

      if (inputPassword !== inputPasswordConfirm) {
        alert("비밀번호와 비밀번호 확인 입력값이 일치하지 않습니다.");
        return;
      }

      // SHA-256 단방향 암호화 해싱 적용
      finalPasswordHash = await hashPassword(inputPassword);
    }

    const roleObj = ROLE_OPTIONS.find((r) => r.id === editingItem.roleId) || ROLE_OPTIONS[1];
    const vendorObj = VENDOR_OPTIONS.find((v) => v.code === editingItem.vendorCode);

    const payload = {
      userId: editingItem.userId.trim(),
      userName: editingItem.userName.trim(),
      passwordHash: finalPasswordHash, // 암호화된 해시만 저장
      roleId: roleObj.id,
      roleName: roleObj.name,
      vendorCode: editingItem.vendorCode || "",
      vendorName: vendorObj?.name || (roleObj.id === "MPSI" ? "MPSI 본사" : "협력사"),
      department: editingItem.department || "SCM 사업부",
      email: editingItem.email || `${editingItem.userId.trim()}@mpsi.co.kr`,
      tel: editingItem.tel || "02-555-0100",
      isUsed: editingItem.isUsed !== undefined ? editingItem.isUsed : true,
      lastLogin: editingItem.lastLogin || "접속 이력 없음",
    };

    if (editingItem.id) {
      updateUser(editingItem.id, payload);
      showToast(`계정 [${payload.userId}] 정보(암호화 패스워드 포함)가 수정되었습니다.`);
    } else {
      // 중복 체크
      if (users.some((u) => u.userId.toLowerCase() === payload.userId.toLowerCase())) {
        alert("이미 존재하는 로그인 ID입니다.");
        return;
      }
      addUser(payload);
      showToast(`신규 계정 [${payload.userId}]이 성공적으로 등록되었습니다. (비밀번호 암호화 저장 완료)`);
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  // 선택된 행 삭제
  const handleDeleteSelected = () => {
    const target = users.find((u) => u.id === selectedUserId);
    if (!target) return;
    if (target.userId === "admin") {
      alert("시스템 최고관리자(admin) 계정은 삭제할 수 없습니다.");
      return;
    }
    if (confirm(`선택한 계정 [${target.userId} / ${target.userName}]을(를) 삭제하시겠습니까?`)) {
      deleteUser(selectedUserId);
      showToast(`계정 [${target.userId}]이 삭제되었습니다.`);
      if (filteredUsers.length > 1) {
        setSelectedUserId(filteredUsers[0].id);
      }
    }
  };

  // 초기화 (시드 재설정)
  const handleResetToSeed = () => {
    if (confirm(`계정 목록을 기본 표준 4대 계정 상태로 초기화하시겠습니까?\n(기본 초기 비밀번호는 '${DEFAULT_INITIAL_PASSWORD}'로 설정됩니다)`)) {
      saveAllUsers(INITIAL_USER_ACCOUNTS);
      showToast("계정 목록이 초기 상태로 복구되었습니다.");
    }
  };

  // 패스워드 실시간 정책 충족 검사기
  const passCheck = validatePasswordPolicy(inputPassword);

  return (
    <div className="flex flex-col gap-2.5 text-xs">
      {/* 0. 브레드크럼 */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-zinc-400" />
          <span>시스템관리</span>
          <span className="text-zinc-300">›</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-100">계정관리 (C991000)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium flex items-center gap-1">
            <Lock className="h-3 w-3" />
            단방향 SHA-256 암호화 보안 적용 중
          </span>
        </div>
      </div>

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-md shadow-lg border border-slate-700 flex items-center gap-2 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. 상단 컨트롤 바 (스크린샷 MES/SCM 표준 바) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-600" />
          <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs">
            시스템 사용자 계정 및 권한 매핑 목록
          </span>
          <span className="text-[11px] text-zinc-500 font-normal">
            (총 <b className="text-sky-600 font-mono font-bold">{filteredUsers.length}</b>건)
          </span>
        </div>

        {/* 상단 액션 버튼 그룹 */}
        <div className="flex items-center gap-1.5">
          <Button 
            size="xs" 
            variant="outline"
            className="h-7 px-2.5 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
            onClick={handleResetToSeed}
            title="초기 4대 계정 상태로 복구 (초기 비번: Mpsi2026!@)"
          >
            <RotateCcw className="h-3 w-3" />
            초기화
          </Button>
          <Button 
            size="xs" 
            className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1 shadow-2xs"
            onClick={handleOpenAddModal}
          >
            <Plus className="h-3.5 w-3.5" />
            ROW+ (계정 추가)
          </Button>
          <Button 
            size="xs" 
            variant="outline"
            className="h-7 px-3 text-xs font-bold gap-1 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-2xs"
            onClick={() => {
              const target = users.find((u) => u.id === selectedUserId);
              if (target) {
                handleOpenEditModal(target);
              } else if (users.length > 0) {
                handleOpenEditModal(users[0]);
              }
            }}
            title="선택된 계정 정보 및 비밀번호 수정"
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-600" />
            수정
          </Button>
          <Button 
            size="xs" 
            variant="outline"
            className="h-7 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </Button>
          <Button 
            size="xs" 
            className="h-7 px-3 bg-zinc-800 hover:bg-zinc-900 text-white font-bold gap-1 shadow-2xs"
            onClick={() => showToast("계정 정보가 안전하게 저장되었습니다.")}
          >
            <Save className="h-3.5 w-3.5" />
            저장
          </Button>
        </div>
      </div>

      {/* 2. 사용자 계정 그리드 (사용자 업로드 스크린샷 100% 동일 구조) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-2xs overflow-hidden flex flex-col min-h-[460px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
            {/* 스크린샷과 동일한 프리미엄 다크 네이비 헤더 */}
            <thead className="bg-[#182234] text-white">
              <tr className="border-b border-slate-700">
                <th className="p-2 w-12 text-center border-r border-slate-700 font-bold">Idx</th>
                <th className="p-2 border-r border-slate-700 min-w-[140px] text-center font-bold">로그인ID</th>
                <th className="p-2 border-r border-slate-700 min-w-[160px] text-center font-bold">사용자명</th>
                <th className="p-2 border-r border-slate-700 min-w-[160px] text-center font-bold">권한ID</th>
                <th className="p-2 border-r border-slate-700 min-w-[150px] text-center font-bold">협력사ID(업체코드)</th>
                <th className="p-2 border-r border-slate-700 min-w-[110px] text-center font-bold text-amber-300">비밀번호 보안</th>
                <th className="p-2 min-w-[90px] text-center font-bold">관리</th>
              </tr>
              {/* 스크린샷과 동일한 헤더 아래 인라인 필터 행 */}
              <tr className="bg-slate-100 dark:bg-zinc-800 text-zinc-700 border-b border-slate-300 dark:border-zinc-700">
                <th className="p-1 text-center border-r border-slate-300 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400">필터</span>
                </th>
                {/* 로그인ID 검색 필터 */}
                <th className="p-1 border-r border-slate-300 dark:border-zinc-700 relative">
                  <div className="flex items-center bg-white dark:bg-zinc-900 rounded border px-1.5 h-6">
                    <input 
                      type="text"
                      value={filterUserId}
                      onChange={(e) => setFilterUserId(e.target.value)}
                      placeholder="검색"
                      className="w-full bg-transparent text-[10px] font-mono outline-hidden"
                    />
                    {filterUserId && (
                      <button onClick={() => setFilterUserId("")} className="text-zinc-400 hover:text-zinc-600">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
                {/* 사용자명 검색 필터 */}
                <th className="p-1 border-r border-slate-300 dark:border-zinc-700 relative">
                  <div className="flex items-center bg-white dark:bg-zinc-900 rounded border px-1.5 h-6">
                    <input 
                      type="text"
                      value={filterUserName}
                      onChange={(e) => setFilterUserName(e.target.value)}
                      placeholder="검색"
                      className="w-full bg-transparent text-[10px] outline-hidden"
                    />
                    {filterUserName && (
                      <button onClick={() => setFilterUserName("")} className="text-zinc-400 hover:text-zinc-600">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
                {/* 권한ID 드롭다운 필터 */}
                <th className="p-1 border-r border-slate-300 dark:border-zinc-700">
                  <select
                    value={filterRoleName}
                    onChange={(e) => setFilterRoleName(e.target.value)}
                    className="w-full h-6 rounded border bg-white dark:bg-zinc-900 px-1 text-[10px] font-bold text-zinc-700 outline-hidden"
                  >
                    <option value="ALL">전체 권한</option>
                    <option value="양산 협력사">양산 협력사</option>
                    <option value="금형 협력사">금형 협력사</option>
                    <option value="MPSI 본사">MPSI 본사</option>
                    <option value="시스템관리자">시스템관리자</option>
                  </select>
                </th>
                {/* 협력사ID 검색 필터 */}
                <th className="p-1 border-r border-slate-300 dark:border-zinc-700 relative">
                  <div className="flex items-center bg-white dark:bg-zinc-900 rounded border px-1.5 h-6">
                    <input 
                      type="text"
                      value={filterVendorCode}
                      onChange={(e) => setFilterVendorCode(e.target.value)}
                      placeholder="검색"
                      className="w-full bg-transparent text-[10px] font-mono outline-hidden"
                    />
                    {filterVendorCode && (
                      <button onClick={() => setFilterVendorCode("")} className="text-zinc-400 hover:text-zinc-600">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
                {/* 비밀번호 보안 열 필터 안내 */}
                <th className="p-1 text-center font-normal text-[10px] text-zinc-400 border-r border-slate-300 dark:border-zinc-700">
                  SHA-256
                </th>
                {/* 관리 열 */}
                <th className="p-1 text-center font-normal text-[10px] text-zinc-400">
                  수정
                </th>
              </tr>
            </thead>

            {/* 본문 행 데이터 (스크린샷 행 스타일 일치) */}
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    일치하는 계정 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isSelected = selectedUserId === u.id;
                  return (
                    <tr 
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      onDoubleClick={() => handleOpenEditModal(u)}
                      title="더블클릭 시 계정 정보 및 비밀번호 수정"
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/70" 
                          : "hover:bg-sky-50/50 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      {/* 1. Idx & 선택 라디오 */}
                      <td className="p-2 text-center border-r border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-zinc-500 w-3">{idx + 1}</span>
                          <input 
                            type="radio" 
                            name="selectedAccountRow"
                            checked={isSelected}
                            onChange={() => setSelectedUserId(u.id)}
                            className="cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* 2. 로그인ID */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-mono font-bold text-sky-700 dark:text-sky-300">
                        <span>{u.userId}</span>
                      </td>

                      {/* 3. 사용자명 */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
                        {u.userName}
                      </td>

                      {/* 4. 권한ID */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.roleId === "ADMIN" 
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : u.roleId === "MPSI"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                            : u.roleId === "VENDOR_MOLD"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {u.roleId === "ADMIN" && <Shield className="h-3 w-3" />}
                          {u.roleId === "MPSI" && <Building2 className="h-3 w-3" />}
                          {u.roleId === "VENDOR_MOLD" && <Wrench className="h-3 w-3" />}
                          {u.roleId === "VENDOR_MASS" && <Factory className="h-3 w-3" />}
                          {u.roleName}
                        </span>
                      </td>

                      {/* 5. 협력사ID(업체코드) */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {u.vendorCode || "-"}
                      </td>

                      {/* 6. 비밀번호 보안 상태 (암호화 보관 표기) */}
                      <td className="p-2 text-center font-mono border-r border-zinc-200 dark:border-zinc-800">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-[10px] border"
                          title="SHA-256 단방향 암호화 해시로 데이터베이스에 보관 중"
                        >
                          <Lock className="h-2.5 w-2.5 text-emerald-600" />
                          암호화 보관
                        </span>
                      </td>

                      {/* 7. 관리 열 (수정 버튼 명시) */}
                      <td className="p-2 text-center">
                        <Button 
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(u);
                          }}
                          className="h-6 px-2 text-[10px] rounded-md font-bold gap-1 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 shadow-2xs"
                          title="계정 정보 및 비밀번호 수정"
                        >
                          <Edit3 className="h-3 w-3 text-amber-600" />
                          수정
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 그리드 하단 안내 바 */}
        <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-t flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              * 선택된 계정: {users.find(u => u.id === selectedUserId)?.userId || "-"} 
              ({users.find(u => u.id === selectedUserId)?.userName || "-"})
            </span>
            <span className="text-zinc-400">|</span>
            <span>
              권한: <b className="text-sky-600">{users.find(u => u.id === selectedUserId)?.roleName || "-"}</b>
            </span>
            {users.find(u => u.id === selectedUserId)?.vendorCode && (
              <>
                <span className="text-zinc-400">|</span>
                <span>업체코드: <b className="font-mono text-purple-700">{users.find(u => u.id === selectedUserId)?.vendorCode}</b></span>
              </>
            )}
            <Button
              size="xs"
              variant="outline"
              className="h-5 px-2 text-[10px] text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 gap-1 ml-2 font-bold"
              onClick={() => {
                const target = users.find(u => u.id === selectedUserId);
                if (target) handleOpenEditModal(target);
              }}
            >
              <Edit3 className="h-2.5 w-2.5" />
              선택 계정 수정
            </Button>
          </div>
          <span className="text-[10px] text-zinc-400">
            총 {filteredUsers.length}건
          </span>
        </div>
      </div>

      {/* 3. [신규 계정 등록 및 수정 모달 (비밀번호 정책 & 암호화 적용)] */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-lg shadow-2xl border overflow-hidden flex flex-col">
            {/* 모달 상단 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#182234] text-white">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {editingItem.id ? `계정 정보 및 비밀번호 수정 [${editingItem.userId}]` : "신규 계정 등록 (ROW+)"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 입력 폼 */}
            <div className="p-4 flex flex-col gap-3 text-xs max-h-[80vh] overflow-y-auto">
              {/* 1. 로그인ID */}
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                  로그인 ID <span className="text-red-500">*</span>
                </label>
                <Input 
                  value={editingItem.userId || ""} 
                  onChange={(e) => setEditingItem({ ...editingItem, userId: e.target.value })}
                  placeholder="예: woosung, newmold, mpsi, admin"
                  disabled={!!editingItem.id} // 수정 시 ID는 변경 불가
                  className="h-7 text-xs font-mono font-bold"
                />
              </div>

              {/* 2. 사용자명 */}
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                  사용자명 / 직책 <span className="text-red-500">*</span>
                </label>
                <Input 
                  value={editingItem.userName || ""} 
                  onChange={(e) => setEditingItem({ ...editingItem, userName: e.target.value })}
                  placeholder="예: 배희섭 금형팀장, 관리자, 뉴몰드"
                  className="h-7 text-xs font-bold"
                />
              </div>

              {/* 🔒 3. 패스워드 설정 (영문+숫자+특수문자 8자 이상 & 단방향 암호화) */}
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                    <span>비밀번호 (Password) {!editingItem.id && <span className="text-red-500">*</span>}</span>
                  </label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                    SHA-256 암호화 저장
                  </span>
                </div>

                {editingItem.id && (
                  <p className="text-[10px] text-zinc-500">
                    * 기존 비밀번호를 유지하시려면 비워두세요. 입력 시 새 비밀번호로 암호화 변경됩니다.
                  </p>
                )}

                {/* 비밀번호 입력란 */}
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="영문 + 숫자 + 특수문자 조합 8자 이상"
                    className="h-7 text-xs pr-8 font-mono"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1.5 text-zinc-400 hover:text-zinc-600"
                    title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* 비밀번호 확인란 */}
                <div>
                  <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-0.5 font-bold">
                    비밀번호 확인
                  </label>
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={inputPasswordConfirm}
                    onChange={(e) => setInputPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 한 번 더 입력하세요"
                    className="h-7 text-xs font-mono"
                  />
                </div>

                {/* 실시간 정책 검증 안내 */}
                {inputPassword.length > 0 && (
                  <div className="flex flex-col gap-0.5 pt-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {passCheck.isValid ? (
                        <Check className="h-3 w-3 text-emerald-600 font-bold" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-rose-500 font-bold" />
                      )}
                      <span className={passCheck.isValid ? "text-emerald-700 font-bold" : "text-rose-600"}>
                        {passCheck.message} (영문, 숫자, 특수문자 포함 8자 이상)
                      </span>
                    </div>
                    {inputPasswordConfirm.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {inputPassword === inputPasswordConfirm ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600 font-bold" />
                            <span className="text-emerald-700 font-bold">비밀번호가 일치합니다.</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 text-rose-500 font-bold" />
                            <span className="text-rose-600 font-bold">비밀번호가 일치하지 않습니다.</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. 권한ID (4대 권한) */}
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                  권한 ID (권한 역할 그룹) <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingItem.roleId || "MPSI"}
                  onChange={(e) => {
                    const rId = e.target.value as RoleType;
                    const rObj = ROLE_OPTIONS.find((r) => r.id === rId);
                    setEditingItem({ 
                      ...editingItem, 
                      roleId: rId,
                      roleName: rObj?.name || "MPSI 본사",
                    });
                  }}
                  className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-800"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.id}] {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. 협력사ID(업체코드) */}
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                  <span>협력사ID(업체코드)</span>
                  <span className="text-[10px] text-zinc-400">금형/양산 협력사인 경우 필수 지정</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={editingItem.vendorCode || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, vendorCode: e.target.value })}
                    className="h-7 flex-1 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-purple-800"
                  >
                    {VENDOR_OPTIONS.map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. 부서 및 연락처 (선택) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">소속 부서</label>
                  <Input 
                    value={editingItem.department || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem, department: e.target.value })}
                    placeholder="예: 금형기술팀"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">연락처</label>
                  <Input 
                    value={editingItem.tel || ""} 
                    onChange={(e) => setEditingItem({ ...editingItem, tel: e.target.value })}
                    placeholder="010-0000-0000"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-7 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveModal}
                className="h-7 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1 shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                저장 (암호화 적용)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
