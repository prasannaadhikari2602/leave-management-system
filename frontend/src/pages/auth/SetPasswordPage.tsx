import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSetPasswordMutation } from "../../api/authApi";
import { Button, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { setPasswordSchema, type SetPasswordForm } from "../../schemas/auth";
import { AuthShell } from "./AuthShell";

/** Opened from the invitation / reset email: /set-password?uid=...&token=... */
export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [setPassword, { isLoading }] = useSetPasswordMutation();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
  });

  if (!uid || !token) {
    return (
      <AuthShell title="Link not valid" subtitle="This password link is incomplete or has expired.">
        <Link to="/forgot-password" className="text-sm font-medium text-navy-700 hover:underline">Request a new link</Link>
      </AuthShell>
    );
  }

  const onSubmit = async (values: SetPasswordForm) => {
    try {
      await setPassword({ uid, token, ...values }).unwrap();
      toast.success("Password saved. You can now sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, ["password", "confirm_password"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Choose your password" subtitle="This activates your account.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message} {...register("password")} />
        <TextInput label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm_password?.message} {...register("confirm_password")} />
        <Button type="submit" loading={isLoading} className="w-full">Save password</Button>
      </form>
    </AuthShell>
  );
}
