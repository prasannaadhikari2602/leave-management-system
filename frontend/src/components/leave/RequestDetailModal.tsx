import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAppSelector } from "../../app/hooks";
import {
  useApproveRequestMutation, useCancelRequestMutation, useGetRequestQuery, useRejectRequestMutation,
} from "../../api/leavesApi";
import { getErrorMessage } from "../../lib/errors";
import { capitalize, formatDateTime, formatDays, formatRange, todayISO } from "../../lib/format";
import { reviewSchema, type ReviewForm } from "../../schemas/leave";
import { Button, ConfirmDialog, ErrorState, Modal, Spinner, StatusBadge, TextArea } from "../ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-black">{children}</dd>
    </div>
  );
}

/** Shows one request with its audit trail and the actions the viewer may take. */
export function RequestDetailModal({ requestId, onClose }: { requestId: number | null; onClose: () => void }) {
  const me = useAppSelector((s) => s.auth.user);
  const { data: request, isFetching, error, refetch } = useGetRequestQuery(requestId ?? 0, { skip: requestId === null });
  const [cancelRequest, cancelState] = useCancelRequestMutation();
  const [approve, approveState] = useApproveRequestMutation();
  const [reject, rejectState] = useRejectRequestMutation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { comment: "" },
  });

  const isOwner = !!me && request?.employee === me.id;
  const canCancel =
    isOwner && !!request && (request.status === "pending" || (request.status === "approved" && request.start_date >= todayISO()));
  const canReview = !!me && !!request && request.approver === me.id && request.status === "pending" && !isOwner;

  const close = () => {
    reset();
    setConfirmCancel(false);
    onClose();
  };

  const decide = (kind: "approve" | "reject") =>
    handleSubmit(async ({ comment }) => {
      if (!request) return;
      try {
        const action = kind === "approve" ? approve : reject;
        await action({ id: request.id, comment }).unwrap();
        toast.success(kind === "approve" ? "Leave approved" : "Leave rejected");
        close();
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    });

  const doCancel = async () => {
    if (!request) return;
    try {
      await cancelRequest(request.id).unwrap();
      toast.success("Leave request cancelled");
      close();
    } catch (e) {
      toast.error(getErrorMessage(e));
      setConfirmCancel(false);
    }
  };

  const busy = approveState.isLoading || rejectState.isLoading;

  return (
    <>
      <Modal
        open={requestId !== null}
        title="Leave request"
        size="md"
        onClose={close}
        footer={
          request && (canReview || canCancel) ? (
            <>
              {canCancel && <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel leave</Button>}
              {canReview && (
                <>
                  <Button variant="secondary" loading={rejectState.isLoading} disabled={busy} onClick={decide("reject")}>Reject</Button>
                  <Button variant="success" loading={approveState.isLoading} disabled={busy} onClick={decide("approve")}>Approve</Button>
                </>
              )}
            </>
          ) : undefined
        }
      >
        {isFetching && !request ? (
          <Spinner />
        ) : error || !request ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-black">{request.employee_name}</p>
                <p className="text-xs text-slate-500">{request.department_name ?? "No department"}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
              <Row label="Leave type">{request.leave_type_name}</Row>
              <Row label="Dates">{formatRange(request.start_date, request.end_date)}</Row>
              <Row label="Duration">{formatDays(request.total_days)} day(s){request.is_half_day && " (half day)"}</Row>
              <Row label="Reason"><span className="whitespace-pre-wrap">{request.reason}</span></Row>
              <Row label="Approver">{request.approver_name ?? "Automatic"}</Row>
              {request.decision_comment && <Row label="Comment">{request.decision_comment}</Row>}
              <Row label="Submitted">{formatDateTime(request.created_at)}</Row>
            </dl>

            {canReview && (
              <div className="mt-4">
                <TextArea label="Comment (optional)" placeholder="Add a note for the employee" error={errors.comment?.message} {...register("comment")} />
              </div>
            )}

            {!!request.history?.length && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-black">History</p>
                <ol className="space-y-3 border-l-2 border-navy-100 pl-4">
                  {request.history.map((h) => (
                    <li key={h.id} className="relative text-sm">
                      <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-navy-700" />
                      <p className="font-medium text-black">{capitalize(h.action)} <span className="font-normal text-slate-500">by {h.action_by_name}</span></p>
                      {h.comment && <p className="text-slate-600">{h.comment}</p>}
                      <p className="text-xs text-slate-400">{formatDateTime(h.created_at)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmCancel}
        danger
        title="Cancel this leave?"
        message={request?.status === "approved" ? "Your approved leave will be cancelled and the days returned to your balance." : "This pending request will be withdrawn."}
        confirmLabel="Yes, cancel leave"
        loading={cancelState.isLoading}
        onConfirm={doCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}
