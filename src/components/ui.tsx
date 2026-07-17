import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Reference-inspired design tokens */
export const pageBg = "bg-[#f7f6f3]";
export const panelClass = "rounded-xl border border-gray-200 bg-white";
export const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
export const btnPrimaryClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50";
export const btnSecondaryClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";
export const btnAccentClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50";
export const emptyStateClass = "px-4 py-10 text-center text-sm text-gray-500";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Label left, control right — like reference bulk-update modal */
export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-3 border-b border-gray-100 py-3 last:border-0 sm:grid-cols-[140px_1fr]">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function PageMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{children}</p>
  );
}

export function ContentCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${panelClass} overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 px-1 pb-px">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              selected
                ? "border border-b-white border-gray-200 bg-white text-violet-700"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={`${inputClass} max-w-xs`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function DataTableRow({
  children,
  onClick,
  zebra,
}: {
  children: ReactNode;
  onClick?: () => void;
  zebra?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition ${onClick ? "cursor-pointer hover:bg-violet-50/40" : ""} ${zebra ? "bg-violet-50/20" : "bg-white"}`}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`whitespace-nowrap px-4 py-2.5 text-gray-700 ${className}`}>{children}</td>;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  from,
  to,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize && totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500">
        Showing {from}-{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnSecondaryClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-xs font-medium text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={btnSecondaryClass}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "green" | "amber" | "red" | "violet" | "blue";
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "bg-white",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 ${tone} p-4`}>
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export function ListPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <ContentCard title={title}>
      {hasItems ? <div className="space-y-2">{children}</div> : <p className={emptyStateClass}>{empty}</p>}
    </ContentCard>
  );
}

export function ListItem({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{meta}</p>
    </div>
  );
}

export type PickerMember = {
  id: number;
  full_name?: string;
  username: string;
  mobile_number?: string;
};

export function SubsectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</h4>;
}

export function MemberPicker({
  members,
  selected,
  onChange,
  emptyMessage = "No members available.",
  getBadge,
  maxHeight = "max-h-64",
}: {
  members: PickerMember[];
  selected: number[];
  onChange: (ids: number[]) => void;
  emptyMessage?: string;
  getBadge?: (id: number) => { label: string; tone: "gray" | "green" | "amber" | "red" | "violet" | "blue" } | null;
  maxHeight?: string;
}) {
  if (!members.length) {
    return <p className={emptyStateClass}>{emptyMessage}</p>;
  }

  return (
    <div className={`overflow-y-auto rounded-lg border border-gray-200 ${maxHeight}`}>
      <ul className="divide-y divide-gray-100">
        {members.map((member) => {
          const checked = selected.includes(member.id);
          const badge = getBadge?.(member.id);
          return (
            <li key={member.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50 ${
                  checked ? "bg-violet-50/60" : "bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((id) => id !== member.id) : [...selected, member.id])
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{member.full_name || member.username}</p>
                  {member.mobile_number && <p className="text-xs text-gray-500">{member.mobile_number}</p>}
                </div>
                {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MemberList({
  members,
  emptyMessage = "None assigned.",
  getBadge,
}: {
  members: PickerMember[];
  emptyMessage?: string;
  getBadge?: (id: number) => { label: string; tone: "gray" | "green" | "amber" | "red" | "violet" | "blue" } | null;
}) {
  if (!members.length) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
      {members.map((member) => {
        const badge = getBadge?.(member.id);
        return (
          <li key={member.id} className="flex items-center justify-between gap-3 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{member.full_name || member.username}</p>
              {member.mobile_number && <p className="text-xs text-gray-500">{member.mobile_number}</p>}
            </div>
            {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

export function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}
