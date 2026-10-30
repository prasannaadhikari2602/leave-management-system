import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../api/authApi";
import { Button, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { loginSchema, type LoginForm } from "../../schemas/auth";
import { AuthShell } from "./AuthShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const {
    register, handleSubmit, setError, formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values).unwrap();
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== "/login" ? from : "/dashboard", { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, ["email", "password"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your leave.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register("email")} />
        <TextInput label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-navy-700 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={isLoading} className="w-full">Sign in</Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">
        New here? Your HR team will email you a link to set your password.
      </p>
    </AuthShell>
  );
}
