import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long"),
  is_active: z.boolean(),
});
export type DepartmentForm = z.infer<typeof departmentSchema>;

// Select inputs hold strings; they are converted to numbers on submit.
export const userSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter the full name").max(150, "Name is too long"),
    email: z.email("Enter a valid email address"),
    role: z.enum(["manager", "employee"], { error: "Choose a role" }),
    department: z.string().min(1, "Choose a department"),
    reporting_manager: z.string(),
    is_active: z.boolean(),
  })
  .refine((v) => v.role !== "employee" || v.reporting_manager !== "", {
    message: "Employees need a reporting manager",
    path: ["reporting_manager"],
  });
export type UserForm = z.infer<typeof userSchema>;
