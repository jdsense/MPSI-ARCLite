"use client";

import React, { useState } from "react";
import { 
  PackageCheck, Truck, Plus, Save, 
  Sparkles, X, CheckCircle2, Clock, 
  FileText, Calendar, Building2, TrendingUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectMaster } from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";

export default function VendorMassDeliveryPage() {
  const { projects, updateStep } = useProjectMaster();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "(주)뉴몰드";
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const vendorProjects = projects.filter(
    (p) => p.massVendor.includes(currentVendor) || currentVendor.includes(p.massVendor)
  );

  const [deliveryForms, setDeliveryForms] = useState<Record<string, {
    newQty: number;
    invoiceNo: string;
    deliveryDate: string;
  }>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getForm = (projectNo: string) => {
    if (deliveryForms[projectNo]) return deliveryForms[projectNo];
    const today = new Date().toISOString().slice(0, 10);
    return {
      newQty: 1000,
      invoiceNo: `INV-${today.replace(/-/g, "")}-01`,
      deliveryDate: today,
    };
  };

  const handleChange = (projectNo: string, field: string, val: any) => {
    const cur = getForm(projectNo);
    setDeliveryForms((prev) => ({
      ...prev,
      [projectNo]: { ...cur, [field]: val },
    }));
  };

  const handleRegisterDelivery = (project: any) => {
    const form = getForm(project.projectNo);
    const added = Number(form.newQty || 0);
    const totalDelivered = Number(project.deliveredQty) + added;
    const isCompleted = totalDelivered >= project.orderQty;

    updateStep(project.projectNo, {
      deliveredQty: totalDelivered,
      currentStep: isCompleted ? 13 : 13,
      stepStatus: isCompleted ? "완료" : "진행중",
      notes: `[${currentVendor} 출하] ${form.deliveryDate} ${added.toLocaleString()}EA 납품 (송장: ${form.invoiceNo}) - 누적: ${totalDelivered.toLocaleString()}EA`,
    });

    showToast(`[${project.projectNo}] ${added.toLocaleString()}EA 납품 등록 완료! (누적 납품: ${totalDelivered.toLocaleString()}EA)`);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 배너 */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <Truck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              [{currentVendor}] 완제품 사출 출하 및 MPSI 납품 실적 관리 (Step 13)
            </h3>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              생산 완료된 사출품의 출하 송장(Invoice) 및 납품 수량을 등록하여 MPSI 본사 입고 검사 시스템으로 전송합니다.
            </span>
          </div>
        </div>
      </div>

      {/* 납품 등록 카드 목록 */}
      <div className="flex flex-col gap-3">
        {vendorProjects.map((p) => {
          const form = getForm(p.projectNo);
          const rate = p.orderQty > 0 ? Math.round((p.deliveredQty / p.orderQty) * 100) : 0;
          const remain = Math.max(0, p.orderQty - p.deliveredQty);

          return (
            <div key={p.id} className="bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-xs flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2">
                <div>
                  <span className="font-mono font-bold text-sm text-emerald-700">{p.projectNo}</span>
                  <span className="ml-2 font-bold text-zinc-800 dark:text-zinc-100">{p.productName}</span>
                  <span className="text-zinc-500 ml-1">({p.projectName})</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>총 발주: <b className="font-mono">{p.orderQty.toLocaleString()} EA</b></span>
                  <span>누적 납품: <b className="font-mono text-emerald-700">{p.deliveredQty.toLocaleString()} EA ({rate}%)</b></span>
                  <span>잔여 수량: <b className="font-mono text-amber-600">{remain.toLocaleString()} EA</b></span>
                </div>
              </div>

              {/* 신규 납품 등록 폼 (Create) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border">
                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">납품 일자</label>
                  <Input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => handleChange(p.projectNo, "deliveryDate", e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1 font-bold text-emerald-700">금회 출하 수량 (EA) <span className="text-red-500">*</span></label>
                  <Input
                    type="number"
                    min={1}
                    value={form.newQty}
                    onChange={(e) => handleChange(p.projectNo, "newQty", Number(e.target.value))}
                    className="h-7 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">납품 송장 번호 (Invoice)</label>
                  <Input
                    value={form.invoiceNo}
                    onChange={(e) => handleChange(p.projectNo, "invoiceNo", e.target.value)}
                    className="h-7 text-xs font-mono"
                  />
                </div>

                <Button
                  onClick={() => handleRegisterDelivery(p)}
                  className="h-7 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  출하/납품 실적 등록
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
