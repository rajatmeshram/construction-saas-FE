"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, PauseCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import {
  Field,
  Modal,
  btnAccentClass,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";

const HOLD_AFTER_MS = 9 * 60 * 60 * 1000;

function getCurrentCoords(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function toLocalInput(value?: string) {
  const date = value ? new Date(value) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SupervisorCheckInBar() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [holdOpen, setHoldOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [checkoutAt, setCheckoutAt] = useState(toLocalInput());
  const [message, setMessage] = useState("");

  const current = useQuery({
    queryKey: ["current-attendance"],
    queryFn: api.currentAttendance,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const attendance = current.data?.attendance;
  const active = Boolean(current.data?.active && attendance);
  const holdDue = useMemo(() => {
    if (!attendance?.punch_in_at) return false;
    if (attendance.checkout_state === "HOLD") return true;
    return now >= new Date(attendance.punch_in_at).getTime() + HOLD_AFTER_MS;
  }, [attendance, now]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["current-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["supervisor-checkins"] });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
  }

  const checkIn = useMutation({
    mutationFn: async () => {
      const coords = await getCurrentCoords();
      return api.supervisorPunchIn(coords);
    },
    onSuccess: () => {
      setMessage("Checked in.");
      invalidate();
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Check-in failed."),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      const coords = await getCurrentCoords();
      return api.supervisorPunchOut(coords);
    },
    onSuccess: () => {
      setMessage("Checked out.");
      invalidate();
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Check-out failed."),
  });

  const holdRequest = useMutation({
    mutationFn: async () => {
      const coords = await getCurrentCoords();
      return api.supervisorHoldRequest({
        reason: reason.trim(),
        checkout_at: checkoutAt ? new Date(checkoutAt).toISOString() : undefined,
        ...coords,
      });
    },
    onSuccess: () => {
      setMessage("Hold request sent to Super Admin.");
      setHoldOpen(false);
      setReason("");
      invalidate();
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Hold request failed."),
  });

  const busy = checkIn.isPending || checkOut.isPending || holdRequest.isPending;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {message ? <p className="max-w-[14rem] truncate text-xs text-gray-500">{message}</p> : null}
        {!active ? (
          <button
            type="button"
            className={`${btnAccentClass} px-3 py-1.5 text-xs`}
            disabled={busy}
            onClick={() => checkIn.mutate()}
          >
            <LogIn className="h-3.5 w-3.5" />
            Check in
          </button>
        ) : holdDue ? (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setCheckoutAt(toLocalInput());
              setHoldOpen(true);
            }}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Hold
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={busy}
            onClick={() => checkOut.mutate()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Check out
          </button>
        )}
      </div>

      <Modal
        open={holdOpen}
        title="Checkout on hold"
        subtitle="9 hours have passed since check-in. Send reason and time to Super Admin."
        onClose={() => setHoldOpen(false)}
        footer={
          <>
            <button type="button" className={btnSecondaryClass} onClick={() => setHoldOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimaryClass}
              disabled={busy || reason.trim().length < 3}
              onClick={() => holdRequest.mutate()}
            >
              Send request
            </button>
          </>
        }
      >
        <Field label="Checkout time">
          <input
            type="datetime-local"
            className={inputClass}
            value={checkoutAt}
            onChange={(event) => setCheckoutAt(event.target.value)}
          />
        </Field>
        <div className="mt-3">
          <Field label="Reason">
            <textarea
              className={inputClass}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why was checkout missed?"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
