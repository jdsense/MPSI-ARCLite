"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import overrides from "@/config/arc-wizard-overrides.json";

/**
 * ARC-WIZARD 숨김 컬럼 설정 적용기 (모든 사용자 공통)
 * src/config/arc-wizard-overrides.json 의 hiddenColumns[pathname] 에 지정된
 * 테이블 컬럼(헤더 텍스트 기준)을 화면에서 숨긴다. 테이블이 다시 그려져도 자동 재적용된다.
 */
const HIDDEN_ATTR = "data-arc-hidden";

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

function applyHiddenColumns(columns: string[]) {
  // 1) 이전 적용분 복원
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach((el) => {
    el.style.display = "";
    el.removeAttribute(HIDDEN_ATTR);
  });
  if (!columns.length) return;
  const targets = columns.map(normalize);

  document.querySelectorAll("table").forEach((table) => {
    if (table.closest(".arc-wizard-root")) return;
    const headerRows = table.tHead?.rows;
    const headerRow = headerRows && headerRows.length ? headerRows[headerRows.length - 1] : table.rows[0];
    if (!headerRow) return;
    const cells = Array.from(headerRow.cells);

    const indexes: number[] = [];
    cells.forEach((cell, idx) => {
      const text = normalize(cell.textContent || "");
      if (targets.some((t) => text === t || (t.length >= 2 && text.startsWith(t)))) indexes.push(idx);
    });
    if (!indexes.length) return;

    const hide = (el: HTMLElement) => {
      el.style.display = "none";
      el.setAttribute(HIDDEN_ATTR, "1");
    };
    indexes.forEach((i) => hide(cells[i]));
    Array.from(table.rows).forEach((row) => {
      if (row === headerRow || row.cells.length !== cells.length) return; // colspan 행은 건드리지 않음
      indexes.forEach((i) => row.cells[i] && hide(row.cells[i]));
    });
  });
}

export function ArcColumnOverrides() {
  const pathname = usePathname();
  const columns: string[] = (overrides.hiddenColumns as Record<string, string[]>)[pathname] || [];
  const key = columns.join("|");

  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyHiddenColumns(columns));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      applyHiddenColumns([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, key]);

  return null;
}

