import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  useCreateDepartmentMutation, useDeleteDepartmentMutation, useListDepartmentsQuery, useUpdateDepartmentMutation,
} from "../../api/departmentsApi";
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, DataTable, Modal, PageHeader, Pagination, SearchInput, TextArea, TextInput,
} from "../../components/ui";
import { applyServerErrors, getErrorMessage } from "../../lib/errors";
import { formatDate } from "../../lib/format";
import { departmentSchema, type DepartmentForm } from "../../schemas/organization";
import type { Department } from "../../types";

function DepartmentModal({ department, open, onClose }: { department: Department | null; open: boolean; onClose: () => void }) {
  const [create, createState] = useCreateDepartmentMutation();
  const [update, updateState] = useUpdateDepartmentMutation();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<DepartmentForm>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", description: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset(department ? { name: department.name, description: department.description, is_active: department.is_active } : { name: "", description: "", is_active: true });
  }, [open, department, reset]);

  const onSubmit = async (values: DepartmentForm) => {
    try {
      if (department) await update({ id: department.id, body: values }).unwrap();
      else await create(values).unwrap();
      toast.success(department ? "Department updated" : "Department created");
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ["name", "description"])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={department ? "Edit department" : "New department"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={createState.isLoading || updateState.isLoading} onClick={handleSubmit(onSubmit)}>Save</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextInput label="Name" required error={errors.name?.message} {...register("name")} />
        <TextArea label="Description" error={errors.description?.message} {...register("description")} />
        <Checkbox label="Active" description="Inactive departments cannot receive new users." {...register("is_active")} />
      </form>
    </Modal>
  );
}

export default function DepartmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const { data, isFetching, error, refetch } = useListDepartmentsQuery({ page, search });
  const [remove, removeState] = useDeleteDepartmentMutation();

  const openModal = (d: Department | null) => { setEditing(d); setModalOpen(true); };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id).unwrap();
      toast.success("Department deleted");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Departments"
        description="The structure of your company."
        actions={<><SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search departments…" /><Button icon={<FiPlus />} onClick={() => openModal(null)}>New department</Button></>}
      />
      <Card padded={false}>
        <DataTable
          rows={data?.data}
          rowKey={(d) => d.id}
          loading={isFetching}
          error={error}
          onRetry={refetch}
          emptyTitle="No departments yet"
          emptyMessage="Create your first department to start adding people."
          emptyAction={<Button icon={<FiPlus />} onClick={() => openModal(null)}>New department</Button>}
          columns={[
            { header: "Name", cell: (d) => <div><p className="font-medium">{d.name}</p>{d.description && <p className="max-w-md truncate text-xs text-slate-500">{d.description}</p>}</div> },
            { header: "People", cell: (d) => d.user_count },
            { header: "Status", cell: (d) => <Badge tone={d.is_active ? "green" : "gray"}>{d.is_active ? "Active" : "Inactive"}</Badge> },
            { header: "Created", cell: (d) => formatDate(d.created_at) },
            {
              header: "", className: "text-right",
              cell: (d) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openModal(d)} aria-label={`Edit ${d.name}`} />
                  <Button size="sm" variant="ghost" className="text-red-600" icon={<FiTrash2 />} onClick={() => setDeleting(d)} aria-label={`Delete ${d.name}`} />
                </div>
              ),
            },
          ]}
        />
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </Card>
      <DepartmentModal open={modalOpen} department={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete department?"
        message={`"${deleting?.name}" will be permanently removed. Departments with people cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete"
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
