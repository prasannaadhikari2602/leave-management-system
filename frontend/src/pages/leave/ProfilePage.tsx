import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useChangePasswordMutation } from "../../api/authApi";
import { useAppSelector } from "../../app/hooks";
import { Button, Card, CardHeader, PageHeader, RoleBadge, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/format";
import { changePasswordSchema, type ChangePasswordForm } from "../../schemas/auth";

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-black">{value || "—"}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });
  if (!user) return null;

  const onSubmit = async (values: ChangePasswordForm) => {
    try {
      await changePassword(values).unwrap();
      toast.success("Password changed");
      reset();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["current_password", "new_password", "confirm_password"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account details" action={<RoleBadge role={user.role} />} />
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Item label="Name" value={user.full_name} />
            <Item label="Email" value={user.email} />
            <Item label="Department" value={user.department_name} />
            <Item label="Reporting manager" value={user.reporting_manager_name} />
            <Item label="Joined" value={formatDate(user.date_joined)} />
          </dl>
        </Card>
        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextInput label="Current password" type="password" autoComplete="current-password" error={errors.current_password?.message} {...register("current_password")} />
            <TextInput label="New password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.new_password?.message} {...register("new_password")} />
            <TextInput label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm_password?.message} {...register("confirm_password")} />
            <Button type="submit" loading={isLoading}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
