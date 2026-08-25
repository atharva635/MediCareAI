export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1d]">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <div className="absolute w-8 h-8 bg-teal-500/30 rounded-full animate-ping"></div>
      </div>
      <p className="mt-4 text-teal-400 font-semibold tracking-wider text-sm uppercase animate-pulse">
        MediCare AI • Loading...
      </p>
    </div>
  );
}
