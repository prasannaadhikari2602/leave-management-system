import { z } from "zod";
import { daysBetween, todayISO } from "../lib/format";

const number = (label: string) => z.number({ error: `Enter ${label}` });

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  description: z.string().max(500, "Description is too long"),
  is_active: z.boolean(),
});
export type LeaveTypeForm = z.infer<typeof leaveTypeSchema>;

export const leavePolicySchema = z.object({
  leave_type: z.string().min(1, "Choose a leave type"),
  annual_entitlement: number("the yearly days").min(0, "Cannot be negative").max(366, "Cannot exceed 366"),
  max_consecutive_days: number("a limit").int("Use whole days").min(1, "At least 1 day").max(366, "Cannot exceed 366"),
  half_day_allowed: z.boolean(),
  approval_required: z.boolean(),
  is_active: z.boolean(),
});
export type LeavePolicyForm = z.infer<typeof leavePolicySchema>;

export const applyLeaveSchema = z
  .object({
    leave_type: z.string().min(1, "Choose a leave type"),
    start_date: z.string().min(1, "Choose a start date"),
    end_date: z.string().min(1, "Choose an end date"),
    is_half_day: z.boolean(),
    reason: z.string().trim().min(3, "Please give a short reason").max(1000, "Reason is too long"),
  })
  .superRefine((v, ctx) => {
    if (v.start_date && v.start_date < todayISO()) {
      ctx.addIssue({ code: "custom", path: ["start_date"], message: "Start date cannot be in the past" });
    }
    if (v.start_date && v.end_date) {
      if (v.end_date < v.start_date) {
        ctx.addIssue({ code: "custom", path: ["end_date"], message: "End date cannot be before start date" });
      } else if (v.start_date.slice(0, 4) !== v.end_date.slice(0, 4)) {
        ctx.addIssue({ code: "custom", path: ["end_date"], message: "Request cannot span two calendar years" });
      } else if (v.is_half_day && daysBetween(v.start_date, v.end_date) !== 1) {
        ctx.addIssue({ code: "custom", path: ["is_half_day"], message: "A half day must be a single date" });
      }
    }
  });
export type ApplyLeaveForm = z.infer<typeof applyLeaveSchema>;

export const reviewSchema = z.object({
  comment: z.string().max(500, "Comment is too long"),
});
export type ReviewForm = z.infer<typeof reviewSchema>;

export const entitlementSchema = z.object({
  entitled_days: number("the days").min(0, "Cannot be negative").max(366, "Cannot exceed 366"),
});
export type EntitlementForm = z.infer<typeof entitlementSchema>;

export const allocateSchema = z.object({
  year: number("a year").int().min(2000, "Enter a valid year").max(2100, "Enter a valid year"),
});
export type AllocateForm = z.infer<typeof allocateSchema>;

export const settingsSchema = z.object({
  company_name: z.string().trim().min(2, "Enter the company name").max(150, "Name is too long"),
  support_email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  email_notifications_enabled: z.boolean(),
});
export type SettingsForm = z.infer<typeof settingsSchema>;
