"use client";

import React from "react";
import { FolderKanban, Check, ChevronDown } from "lucide-react";
import { useProjectMaster, ProjectItem } from "@/lib/project-store";

interface ProjectSelectorProps {
  value?: string; // projectNo
  onChange: (projectNo: string, project?: ProjectItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ProjectSelector({
  value,
  onChange,
  placeholder = "연계할 프로젝트를 선택하세요 (관리번호 / 프로젝트명)",
  className = "",
  disabled = false,
}: ProjectSelectorProps) {
  const { projects, activeProjects } = useProjectMaster();
  const list = activeProjects && activeProjects.length > 0 ? activeProjects : projects;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNo = e.target.value;
    const found = list.find((p) => p.projectNo === selectedNo);
    onChange(selectedNo, found);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <FolderKanban className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-600 pointer-events-none" />
      <select
        value={value || ""}
        onChange={handleSelect}
        disabled={disabled}
        className="w-full h-8 pl-8 pr-7 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-hidden focus:ring-1 focus:ring-sky-500 appearance-none text-zinc-800 dark:text-zinc-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {list.map((p) => {
          return (
            <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
              [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName}){p.changeType ? ` [${p.changeType}]` : ""}
            </option>
          );
        })}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
    </div>
  );
}
