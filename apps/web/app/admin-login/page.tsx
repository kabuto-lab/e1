import { AdminAuth } from "@/page/AdminAuth";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0a0a0a_0%,#1a1a1a_50%,#0f0f0f_100%)] p-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-gold/20 bg-[#1a1a1a]/80 p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <AdminAuth />
      </div>
    </div>
  );
};
