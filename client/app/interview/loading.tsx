import { Spinner } from "@/components/app/ui/feedback";

export default function InterviewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
      <Spinner />
    </div>
  );
}
