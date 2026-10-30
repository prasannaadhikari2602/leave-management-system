import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../../api/authApi";
import { Button, TextInput } from "../../components/ui";
import { getErrorMessage } from "../../lib/errors";
import { forgotPasswordSchema, type ForgotPasswordForm } from "../../schemas/auth";
import { AuthShell } from "./AuthShell";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [forgot, { isLoading }] = useForgotPasswordMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    try {
      await forgot(values).unwrap();
      setSent(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="rounded-xl border border-navy-200 bg-navy-50 p-5 text-center">
          <FiMail className="mx-auto mb-2 text-navy-700" size={26} />
          <p className="font-semibold text-black">Check your inbox</p>
          <p className="mt-1 text-sm text-slate-600">If an account exists for that email, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Button type="submit" loading={isLoading} className="w-full">Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <FiArrowLeft /> Back to sign in
      </Link>
    </AuthShell>
  );
}
