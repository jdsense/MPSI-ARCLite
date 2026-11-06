// src/app/portal/admin/permissions/page.tsx
"use client";

import React, { useState } from "react";
import { 
  Shield, Check, Plus, Trash2, Save, 
  Layers, CheckSquare, XSquare, Settings, 
  Building2, Wrench, Factory, Lock, Search, RefreshCw, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  usePermissionStore, 
  RoleItem, 
  MenuPermissionItem,
  PermissionFlags
} from "@/lib/permission-store";

export default function PermissionManagementPage() {
  const {
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
    saveRoles,
    savePermissions,
  } = usePermissionStore();

  // 현재 선택된 권한 ID
  const [selectedRoleId, setSelectedRoleId] = useState<string>("ADMIN");

  // 테이블 검색/필터 상태
  const [roleFilterName, setRoleFilterName] = useState("");
  const [roleFilterUsed, setRoleFilterUsed] = useState<"ALL" | "Y" | "N">("ALL");

  const [menuFilterGroup, setMenuFilterGroup] = useState("");
  const [menuFilterScreenId, setMenuFilterScreenId] = useState("");
  const [menuFilterScreenName, setMenuFilterScreenName] = useState("");

  // 메뉴 체크박스 다중 선택 (삭제용)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

  // 신규 권한 모달 상태
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ id: "", name: "", system: "MPSI SCM", startPage: "C010000" });

  // 신규 메뉴 모달 상태
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [newMenuForm, setNewMenuForm] = useState({
    groupNm: "기초정보",
    screenId: "",
    screenName: "",
    url: "",
  });

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  // 필터링된 권한 목록
  const filteredRoles = roles.filter((r) => {
    if (roleFilterName && !r.name.toLowerCase().includes(roleFilterName.toLowerCase())) return false;
    if (roleFilterUsed === "Y" && !r.isUsed) return false;
    if (roleFilterUsed === "N" && r.isUsed) return false;
    return true;
  });

  // 필터링된 메뉴 목록
  const filteredMenus = menuPermissions.filter((m) => {
    if (menuFilterGroup && !m.groupNm.toLowerCase().includes(menuFilterGroup.toLowerCase())) return false;
    if (menuFilterScreenId && !m.screenId.toLowerCase().includes(menuFilterScreenId.toLowerCase())) return false;
    if (menuFilterScreenName && !m.screenName.toLowerCase().includes(menuFilterScreenName.toLowerCase())) return false;
    return true;
  });

  // 권한별 개별 체크박스 토글
  const handleFlagChange = (menuId: number, flag: keyof PermissionFlags, val: boolean) => {
    if (!selectedRole) return;
    updateRoleFlag(menuId, selectedRole.id, flag, val);
  };

  // 일괄 이용 (전체 true)
  const handleSetAll = (allow: boolean) => {
    if (!selectedRole) return;
    setAllPermissionsForRole(selectedRole.id, allow);
  };

  // 컬럼별 전체 토글
  const handleToggleColumn = (flag: keyof PermissionFlags) => {
    if (!selectedRole) return;
    const allChecked = filteredMenus.every((m) => m.permissions[selectedRole.id]?.[flag]);
    toggleColumnForRole(selectedRole.id, flag, !allChecked);
  };

  // 저장 알림
  const handleSaveAll = () => {
    saveRoles();
    savePermissions();
    alert(`[${selectedRole.name}]의 메뉴 권한 설정이 브라우저 스토리지 및 시스템에 영구 저장되었습니다.`);
  };

  // 신규 권한 등록
  const handleCreateRole = () => {
    if (!newRoleForm.id.trim() || !newRoleForm.name.trim()) {
      alert("권한 코드와 권한명을 입력해주세요.");
      return;
    }
    addRole({
      id: newRoleForm.id.trim().toUpperCase(),
      name: newRoleForm.name.trim(),
      system: newRoleForm.system,
      startPage: newRoleForm.startPage,
      isUsed: true,
    });
    setIsAddRoleModalOpen(false);
    setSelectedRoleId(newRoleForm.id.trim().toUpperCase());
    setNewRoleForm({ id: "", name: "", system: "MPSI SCM", startPage: "C010000" });
  };

  // 권한 삭제
  const handleDeleteSelectedRole = () => {
    if (["ADMIN", "MPSI", "VENDOR_MOLD", "VENDOR_MASS"].includes(selectedRole.id)) {
      alert("시스템 기본 필수 4대 권한은 삭제할 수 없습니다.");
      return;
    }
    if (confirm(`권한 [${selectedRole.name}]을(를) 삭제하시겠습니까?`)) {
      deleteRole(selectedRole.id);
      setSelectedRoleId("ADMIN");
    }
  };

  // 신규 화면/메뉴 등록
  const handleCreateMenu = () => {
    if (!newMenuForm.screenId.trim() || !newMenuForm.screenName.trim()) {
      alert("화면ID와 화면명을 입력해주세요.");
      return;
    }
    addCustomMenu({
      groupNm: newMenuForm.groupNm,
      screenId: newMenuForm.screenId.trim(),
      screenName: newMenuForm.screenName.trim(),
      url: newMenuForm.url.trim() || `/portal/${newMenuForm.screenId.toLowerCase()}`,
      permissions: {
        ADMIN: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
        MPSI: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
        VENDOR_MOLD: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
        VENDOR_MASS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      },
    });
    setIsAddMenuModalOpen(false);
    setNewMenuForm({ groupNm: "기초정보", screenId: "", screenName: "", url: "" });
  };

  // 선택된 메뉴 일괄 삭제
  const handleDeleteSelectedMenus = () => {
    if (selectedMenuIds.length === 0) {
      alert("삭제할 화면 행을 체크해주세요.");
      return;
    }
    if (confirm(`선택한 ${selectedMenuIds.length}개 화면을 메뉴 권한 목록에서 삭제하시겠습니까?`)) {
      selectedMenuIds.forEach((id) => deleteMenu(id));
      setSelectedMenuIds([]);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 0. 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Settings className="h-3.5 w-3.5 text-zinc-400" />
        <span>시스템관리</span>
        <span className="text-zinc-300">›</span>
        <span className="font-bold text-zinc-800 dark:text-zinc-100">권한관리 (C992000)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[660px]">
        {/* ============================================================== */}
        {/* 좌측 영역: 권한목록 */}
        {/* ============================================================== */}
        <div className="md:col-span-4 bg-white dark:bg-zinc-900 border rounded-md shadow-xs flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
              <Shield className="h-4 w-4 text-sky-600" />
              <span>권한목록</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] font-bold text-zinc-700" onClick={handleSaveAll}>
                <Save className="h-3 w-3" />
                저장
              </Button>
              <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-sky-700" onClick={() => setIsAddRoleModalOpen(true)}>
                <Plus className="h-3 w-3" />
                ROW+
              </Button>
              <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-rose-600 border-rose-200" onClick={handleDeleteSelectedRole}>
                <Trash2 className="h-3 w-3" />
                삭제
              </Button>
            </div>
          </div>

          {/* 테이블 헤더 필터 영역 (스크린샷 매칭) */}
          <div className="grid grid-cols-12 gap-1 p-1.5 bg-zinc-100/70 dark:bg-zinc-800/70 border-b text-[10px]">
            <div className="col-span-3 text-center text-zinc-500 font-bold self-center">필터</div>
            <div className="col-span-6">
              <Input 
                value={roleFilterName}
                onChange={(e) => setRoleFilterName(e.target.value)}
                placeholder="권한명 검색"
                className="h-6 text-[10px] bg-white px-1.5"
              />
            </div>
            <div className="col-span-3">
              <select
                value={roleFilterUsed}
                onChange={(e) => setRoleFilterUsed(e.target.value as any)}
                className="h-6 w-full rounded border bg-white px-1 text-[10px]"
              >
                <option value="ALL">전체</option>
                <option value="Y">Y (사용)</option>
                <option value="N">N (미사용)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
              <thead className="sticky top-0 bg-[#1e293b] text-white">
                <tr>
                  <th className="p-1.5 w-10 text-center border-r border-slate-700">Idx</th>
                  <th className="p-1.5 w-8 text-center border-r border-slate-700">선택</th>
                  <th className="p-1.5 border-r border-slate-700 min-w-[120px]">권한명</th>
                  <th className="p-1.5 min-w-[70px] text-center">사용여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRoles.map((r, idx) => {
                  const isSelected = selectedRole.id === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRoleId(r.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-100/80 dark:bg-amber-950/40 font-bold text-amber-950 dark:text-amber-100"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <td className="p-2 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                      <td className="p-2 text-center border-r">
                        <input
                          type="radio"
                          name="roleSelector"
                          checked={isSelected}
                          onChange={() => setSelectedRoleId(r.id)}
                        />
                      </td>
                      <td className="p-2 border-r font-medium flex items-center gap-1.5">
                        {r.id === "ADMIN" && <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        {r.id === "MPSI" && <Building2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
                        {r.id === "VENDOR_MOLD" && <Wrench className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                        {r.id === "VENDOR_MASS" && <Factory className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        {!["ADMIN", "MPSI", "VENDOR_MOLD", "VENDOR_MASS"].includes(r.id) && (
                          <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span>{r.name}</span>
                      </td>
                      <td className="p-2 text-center font-bold">
                        <span className={r.isUsed ? "text-emerald-600" : "text-zinc-400"}>
                          {r.isUsed ? "Y" : "N"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/40 border-t text-[11px] text-zinc-500">
            <span>총 <b className="font-bold text-zinc-800 dark:text-zinc-200">{filteredRoles.length}</b> 건</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 우측 상하 영역: 시스템그룹권한 & 메뉴권한 */}
        {/* ============================================================== */}
        <div className="md:col-span-8 flex flex-col gap-3">
          {/* 우측 상단: 시스템그룹권한 */}
          <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs flex flex-col overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-sky-600" />
                <span>시스템그룹권한</span>
                <span className="text-[10px] font-normal text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300">
                  선택 권한: <b>{selectedRole.name} ({selectedRole.id})</b>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                <thead className="bg-[#1e293b] text-white">
                  <tr>
                    <th className="p-1.5 w-10 text-center border-r border-slate-700">Idx</th>
                    <th className="p-1.5 w-8 text-center border-r border-slate-700">선택</th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[120px]">권한</th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[120px]">시스템</th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[120px]">시작페이지</th>
                    <th className="p-1.5 min-w-[70px] text-center">사용여부</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-amber-50/50 dark:bg-zinc-800/40">
                    <td className="p-2 text-center font-mono text-zinc-400 border-r">1</td>
                    <td className="p-2 text-center border-r">
                      <input type="radio" checked readOnly />
                    </td>
                    <td className="p-2 border-r font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedRole.name}
                    </td>
                    <td className="p-2 border-r text-zinc-700 dark:text-zinc-300">
                      <input 
                        type="text" 
                        value={selectedRole.system} 
                        onChange={(e) => updateRole(selectedRole.id, { system: e.target.value })}
                        className="h-6 w-full rounded border px-1.5 text-xs bg-white dark:bg-zinc-900"
                      />
                    </td>
                    <td className="p-2 border-r font-mono">
                      <select
                        value={selectedRole.startPage}
                        onChange={(e) => updateRole(selectedRole.id, { startPage: e.target.value })}
                        className="h-6 w-full rounded border px-1 text-xs bg-white dark:bg-zinc-900 font-mono font-bold text-sky-600"
                      >
                        <option value="C010000">C010000 (프로젝트 관리대장)</option>
                        <option value="C020000">C020000 (통합 대시보드)</option>
                        <option value="C110000">C110000 (원청사 견적)</option>
                        <option value="C650000">C650000 (금형 협력사 포털)</option>
                        <option value="C850000">C850000 (양산 협력사 포털)</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedRole.isUsed}
                        onChange={(e) => updateRole(selectedRole.id, { isUsed: e.target.checked })}
                        className="rounded"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end px-3 py-1 bg-zinc-50 dark:bg-zinc-800/40 border-t text-[11px] text-zinc-500">
              <span>총 <b>1</b> 건</span>
            </div>
          </div>

          {/* 우측 하단: 메뉴권한 (실제 인터랙티브 체크박스 & MPSI 전체 화면 매핑) */}
          <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
              <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
                <Lock className="h-4 w-4 text-sky-600" />
                <span>메뉴권한 (MPSI 실제 화면 연계)</span>
                <span className="text-[10px] font-normal text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200">
                  대상 권한: <b>{selectedRole.name}</b>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold" onClick={() => handleSetAll(true)}>
                  <CheckSquare className="h-3 w-3" />
                  일괄이용
                </Button>
                <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-zinc-600 bg-zinc-100 hover:bg-zinc-200" onClick={() => handleSetAll(false)}>
                  <XSquare className="h-3 w-3" />
                  일괄불가
                </Button>
                <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-sky-700" onClick={() => setIsAddMenuModalOpen(true)}>
                  <Plus className="h-3 w-3" />
                  ROW+
                </Button>
                <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] text-rose-600 border-rose-200" onClick={handleDeleteSelectedMenus}>
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
                <Button size="xs" variant="outline" className="h-6 px-2.5 text-[10px] font-bold bg-sky-600 text-white hover:bg-sky-700 border-sky-600" onClick={handleSaveAll}>
                  <Save className="h-3 w-3" />
                  저장
                </Button>
              </div>
            </div>

            {/* 필터 헤더 입력줄 (스크린샷의 X 입력창 매칭) */}
            <div className="grid grid-cols-12 gap-1 p-1.5 bg-zinc-100/70 dark:bg-zinc-800/70 border-b text-[10px]">
              <div className="col-span-1 text-center text-zinc-400 font-bold self-center">필터</div>
              <div className="col-span-2">
                <Input 
                  value={menuFilterGroup}
                  onChange={(e) => setMenuFilterGroup(e.target.value)}
                  placeholder="GROUPNM 검색"
                  className="h-6 text-[10px] bg-white px-1.5"
                />
              </div>
              <div className="col-span-2">
                <Input 
                  value={menuFilterScreenId}
                  onChange={(e) => setMenuFilterScreenId(e.target.value)}
                  placeholder="화면ID (C...)"
                  className="h-6 text-[10px] bg-white px-1.5 font-mono"
                />
              </div>
              <div className="col-span-4">
                <Input 
                  value={menuFilterScreenName}
                  onChange={(e) => setMenuFilterScreenName(e.target.value)}
                  placeholder="화면명 검색"
                  className="h-6 text-[10px] bg-white px-1.5"
                />
              </div>
              <div className="col-span-3 flex items-center justify-end text-zinc-500 font-bold pr-2">
                컬럼명을 클릭하면 전체 토글
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[460px]">
              <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                <thead className="sticky top-0 bg-[#1e293b] text-white z-10 select-none">
                  <tr>
                    <th className="p-1.5 w-10 text-center border-r border-slate-700">Idx</th>
                    <th className="p-1.5 w-8 text-center border-r border-slate-700">
                      <input 
                        type="checkbox" 
                        checked={selectedMenuIds.length > 0 && selectedMenuIds.length === filteredMenus.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMenuIds(filteredMenus.map((m) => m.id));
                          else setSelectedMenuIds([]);
                        }}
                        className="rounded" 
                        title="전체 행 선택"
                      />
                    </th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[80px]">GROUPNM ↑1</th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[90px]">화면ID ↑2</th>
                    <th className="p-1.5 border-r border-slate-700 min-w-[190px]">화면명 (경로)</th>
                    
                    {/* 개별 컬럼 헤더 클릭 시 해당 권한의 전체 토글 */}
                    <th 
                      onClick={() => handleToggleColumn("canRead")}
                      className="p-1.5 border-r border-slate-700 min-w-[50px] text-center cursor-pointer hover:bg-slate-700"
                      title="클릭하여 조회 권한 전체 토글"
                    >
                      조회 ↕
                    </th>
                    <th 
                      onClick={() => handleToggleColumn("canCreate")}
                      className="p-1.5 border-r border-slate-700 min-w-[50px] text-center cursor-pointer hover:bg-slate-700"
                      title="클릭하여 등록 권한 전체 토글"
                    >
                      등록 ↕
                    </th>
                    <th 
                      onClick={() => handleToggleColumn("canUpdate")}
                      className="p-1.5 border-r border-slate-700 min-w-[50px] text-center cursor-pointer hover:bg-slate-700"
                      title="클릭하여 수정 권한 전체 토글"
                    >
                      수정 ↕
                    </th>
                    <th 
                      onClick={() => handleToggleColumn("canDelete")}
                      className="p-1.5 min-w-[50px] text-center cursor-pointer hover:bg-slate-700"
                      title="클릭하여 삭제 권한 전체 토글"
                    >
                      삭제 ↕
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredMenus.map((item, idx) => {
                    const flags: PermissionFlags = item.permissions[selectedRole.id] || {
                      canRead: false,
                      canCreate: false,
                      canUpdate: false,
                      canDelete: false,
                    };
                    const isAnyActive = flags.canRead || flags.canCreate || flags.canUpdate || flags.canDelete;
                    const isRowChecked = selectedMenuIds.includes(item.id);

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-sky-50/50 dark:hover:bg-zinc-800/40 transition-colors ${
                          !isAnyActive ? "opacity-50 bg-zinc-50/60 dark:bg-zinc-900/30" : "bg-white dark:bg-zinc-900"
                        }`}
                      >
                        <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                        <td className="p-1.5 text-center border-r">
                          <input 
                            type="checkbox" 
                            checked={isRowChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMenuIds([...selectedMenuIds, item.id]);
                              else setSelectedMenuIds(selectedMenuIds.filter((id) => id !== item.id));
                            }}
                            className="rounded" 
                          />
                        </td>
                        <td className="p-1.5 border-r text-zinc-600 dark:text-zinc-400 font-medium">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                            {item.groupNm}
                          </span>
                        </td>
                        <td className="p-1.5 border-r font-mono text-sky-600 dark:text-sky-400 font-bold">{item.screenId}</td>
                        <td className="p-1.5 border-r font-medium text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-1.5">
                            <span>{item.screenName}</span>
                            <span className="text-[10px] font-mono text-zinc-400">({item.url})</span>
                          </div>
                        </td>

                        {/* 실제 수정 가능한 체크박스 4개 */}
                        <td className="p-1.5 border-r text-center">
                          <input 
                            type="checkbox" 
                            checked={flags.canRead} 
                            onChange={(e) => handleFlagChange(item.id, "canRead", e.target.checked)}
                            className="rounded cursor-pointer h-4 w-4 accent-sky-600" 
                          />
                        </td>
                        <td className="p-1.5 border-r text-center">
                          <input 
                            type="checkbox" 
                            checked={flags.canCreate} 
                            onChange={(e) => handleFlagChange(item.id, "canCreate", e.target.checked)}
                            className="rounded cursor-pointer h-4 w-4 accent-sky-600" 
                          />
                        </td>
                        <td className="p-1.5 border-r text-center">
                          <input 
                            type="checkbox" 
                            checked={flags.canUpdate} 
                            onChange={(e) => handleFlagChange(item.id, "canUpdate", e.target.checked)}
                            className="rounded cursor-pointer h-4 w-4 accent-sky-600" 
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={flags.canDelete} 
                            onChange={(e) => handleFlagChange(item.id, "canDelete", e.target.checked)}
                            className="rounded cursor-pointer h-4 w-4 accent-rose-600" 
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/40 border-t text-[11px] text-zinc-500">
              <span className="text-[10px] text-zinc-400">
                * 체크박스 변경 시 즉시 반영되며, [저장] 클릭 시 전체 역할 매트릭스가 브라우저 스토리지에 영구 보존됩니다.
              </span>
              <span>총 <b className="font-bold text-zinc-800 dark:text-zinc-200">{filteredMenus.length}</b> 건</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 신규 권한 등록 모달 */}
      {/* ============================================================== */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-lg shadow-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <span className="font-bold">신규 권한 등록</span>
              <button onClick={() => setIsAddRoleModalOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">권한 코드 (ID)</label>
                <Input 
                  value={newRoleForm.id}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, id: e.target.value })}
                  placeholder="예: QUALITY_MANAGER"
                  className="h-8 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">권한명</label>
                <Input 
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  placeholder="예: 품질관리팀장"
                  className="h-8"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">시작 페이지</label>
                <select
                  value={newRoleForm.startPage}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, startPage: e.target.value })}
                  className="h-8 w-full rounded border px-2 text-xs"
                >
                  <option value="C010000">C010000 (프로젝트 관리대장)</option>
                  <option value="C020000">C020000 (통합 대시보드)</option>
                  <option value="C110000">C110000 (원청사 견적)</option>
                  <option value="C650000">C650000 (금형 협력사 포털)</option>
                  <option value="C850000">C850000 (양산 협력사 포털)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsAddRoleModalOpen(false)}>취소</Button>
              <Button size="sm" className="bg-sky-600 text-white font-bold" onClick={handleCreateRole}>등록</Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 신규 화면/메뉴 등록 모달 */}
      {/* ============================================================== */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-lg shadow-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <span className="font-bold">신규 화면/메뉴 등록</span>
              <button onClick={() => setIsAddMenuModalOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">그룹명 (GROUPNM)</label>
                <select
                  value={newMenuForm.groupNm}
                  onChange={(e) => setNewMenuForm({ ...newMenuForm, groupNm: e.target.value })}
                  className="h-8 w-full rounded border px-2 text-xs"
                >
                  <option value="프로젝트">프로젝트</option>
                  <option value="대시보드">대시보드</option>
                  <option value="수주/견적">수주/견적</option>
                  <option value="금형개발">금형개발</option>
                  <option value="사출양산">사출양산</option>
                  <option value="물류배송">물류배송</option>
                  <option value="협력사포털">협력사포털</option>
                  <option value="기초정보">기초정보</option>
                  <option value="시스템">시스템</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">화면ID (Screen ID)</label>
                <Input 
                  value={newMenuForm.screenId}
                  onChange={(e) => setNewMenuForm({ ...newMenuForm, screenId: e.target.value })}
                  placeholder="예: C870000"
                  className="h-8 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">화면명</label>
                <Input 
                  value={newMenuForm.screenName}
                  onChange={(e) => setNewMenuForm({ ...newMenuForm, screenName: e.target.value })}
                  placeholder="예: 설비예지보전"
                  className="h-8"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1 font-bold">접속 URL 경로</label>
                <Input 
                  value={newMenuForm.url}
                  onChange={(e) => setNewMenuForm({ ...newMenuForm, url: e.target.value })}
                  placeholder="예: /portal/facility/maintenance"
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsAddMenuModalOpen(false)}>취소</Button>
              <Button size="sm" className="bg-sky-600 text-white font-bold" onClick={handleCreateMenu}>등록</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
