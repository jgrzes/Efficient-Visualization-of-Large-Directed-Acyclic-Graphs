export default function LoadingModal() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 p-6 bg-black rounded-2xl shadow-lg border border-gray w-72">
        <div className="w-10 h-10 border-4 border-white-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-200 font-medium">Loading graph...</p>
      </div>
    </div>
  );
}
