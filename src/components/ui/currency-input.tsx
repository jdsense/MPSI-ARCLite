"use client";

import React from "react";
import { Input } from "@/components/ui/input";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | string | undefined | null;
  onChange: (value: number) => void;
  allowEmpty?: boolean;
}

/**
 * 천 단위 콤마(,)가 실시간으로 포맷팅되어 표시되는 통화/금액 전용 입력 컴포넌트
 * - 숫자만 입력받고 실시간 toLocaleString() 적용 (예: 10,000,000)
 * - onChange에 순수 number(정수) 전달
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0", className, allowEmpty = true, ...props }, ref) => {
    // 화면에 보여줄 포맷팅된 문자열 계산
    let displayValue = "";
    if (value !== undefined && value !== null && value !== "") {
      const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9]/g, ""));
      if (!isNaN(num)) {
        if (num === 0) {
          displayValue = allowEmpty && (value === "" || value === undefined) ? "" : "0";
        } else {
          displayValue = num.toLocaleString();
        }
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      if (raw === "") {
        onChange(0);
      } else {
        const parsed = parseInt(raw, 10);
        onChange(isNaN(parsed) ? 0 : parsed);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
