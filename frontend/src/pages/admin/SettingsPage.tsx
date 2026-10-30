import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "../../api/reportsApi";
import { Button, Card, Checkbox, ErrorState, PageHeader, Spinner, TextInput } from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { settingsSchema, type SettingsForm } from "../../schemas/leave";

export default function SettingsPage() {
  const { data, isLoading, error, refetch } = useGetSettingsQuery();
  const [update, { isLoading: saving }] = useUpdateSettingsMutation();
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { company_name: "", support_email: "", email_notifications_enabled: false },
  });

  useEffect(() => {
    if (data) reset({ company_name: data.company_name, support_email: data.support_email, email_notifications_enabled: data.email_notifications_enabled });
  }, [data, reset]);

  const onSubmit = async (values: SettingsForm) => {
    try {
      await update(values).unwrap();
      toast.success("Settings saved");
    } catch (e) {
      if (!applyServerErrors(e, setError, ["company_name", "support_email"])) toast.error(getErrorMessage(e));
    }
  };

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Settings" description="Company information and notification preferences." />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextInput label="Company name" required error={errors.company_name?.message} {...register("company_name")} />
          <TextInput label="Support email" type="email" hint="Shown to staff who need help from HR." error={errors.support_email?.message} {...register("support_email")} />
          <Checkbox label="Email notifications" description="Also email people when a leave request is submitted, decided or cancelled. In-app notifications are always on." {...register("email_notifications_enabled")} />
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={!isDirty}>Save settings</Button></div>
        </form>
      </Card>
    </>
  );
}
