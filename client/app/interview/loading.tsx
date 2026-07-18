import { Spinner } from "@/components/app/ui/feedback";

export default function InterviewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bodhi-bg">
      <Spinner />
    </div>
  );
}
