"use client";

import { ReactNode } from "react";

export interface SelectOption {
  label: string;
  value: string;
}

interface BaseProps {
  label: string;
  hint?: string;
}

interface ChildrenProps extends BaseProps {
  children: ReactNode;
  value?: never;
  onChange?: never;
  options?: never;
  type?: never;
  placeholder?: never;
  required?: never;
  disabled?: never;
}

interface ControlledProps extends BaseProps {
  children?: never;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
}

type FormFieldProps = ChildrenProps | ControlledProps;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  fontSize: "0.85rem",
  color: "#0F172A",
  background: "#FFFFFF",
  transition: "all 0.2s ease",
  outline: "none",
};

export default function FormField(props: FormFieldProps) {
  const { label, hint } = props;
  const disabledBg = "#F8FAFC";

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <label style={{
        fontSize: "0.72rem", fontWeight: 600, color: "#475569",
        marginBottom: "0.3rem", display: "block",
        letterSpacing: "0.04em", textTransform: "uppercase" as const,
      }}>
        {label}
        {"required" in props && props.required && <span style={{ color: "#EF4444" }}> *</span>}
      </label>
      {"children" in props && props.children ? (
        props.children
      ) : "options" in props && props.options ? (
        <select
          value={(props as ControlledProps).value}
          onChange={(e) => (props as ControlledProps).onChange(e.target.value)}
          required={(props as ControlledProps).required}
          disabled={(props as ControlledProps).disabled}
          style={{
            ...inputStyle,
            appearance: "auto" as const,
            background: (props as ControlledProps).disabled ? disabledBg : "#FFFFFF",
            color: (props as ControlledProps).value ? "#0F172A" : "#94A3B8",
          }}
        >
          <option value="" style={{ color: "#94A3B8" }}>
            {(props as ControlledProps).placeholder || `Select ${label.toLowerCase()}...`}
          </option>
          {(props as ControlledProps).options!.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : "value" in props ? (
        <input
          type={(props as ControlledProps).type || "text"}
          value={(props as ControlledProps).value}
          onChange={(e) => (props as ControlledProps).onChange(e.target.value)}
          placeholder={(props as ControlledProps).placeholder}
          required={(props as ControlledProps).required}
          disabled={(props as ControlledProps).disabled}
          style={{
            ...inputStyle,
            background: (props as ControlledProps).disabled ? disabledBg : "#FFFFFF",
          }}
        />
      ) : null}
      {hint && <span style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: "0.2rem", display: "block" }}>{hint}</span>}
    </div>
  );
}
