import { z } from "zod";

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const setPasswordSchema = z
  .object({
    password,
    confirm_password: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type SetPasswordForm = z.infer<typeof setPasswordSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: password,
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((v) => v.new_password !== v.current_password, {
    message: "Choose a different password",
    path: ["new_password"],
  });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
