import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex items-center justify-center space-x-2 pt-4 pb-2 border-t border-white/5">
      <button
        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/5 text-xs font-bold text-neutral-300 hover:border-neutral-700 hover:text-white disabled:opacity-40 disabled:hover:border-white/5 disabled:hover:text-neutral-300 transition"
      >
        Anterior
      </button>
      
      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, idx) => {
          const pageNum = idx + 1;
          if (
            pageNum === 1 || 
            pageNum === totalPages || 
            Math.abs(pageNum - currentPage) <= 1
          ) {
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`h-7 w-7 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                  currentPage === pageNum
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "bg-neutral-900 border border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
                }`}
              >
                {pageNum}
              </button>
            );
          }
          if (
            (pageNum === 2 && currentPage > 3) || 
            (pageNum === totalPages - 1 && currentPage < totalPages - 2)
          ) {
            return (
              <span key={pageNum} className="px-1 text-xs text-neutral-600 font-bold">...</span>
            );
          }
          return null;
        })}
      </div>

      <button
        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/5 text-xs font-bold text-neutral-300 hover:border-neutral-700 hover:text-white disabled:opacity-40 disabled:hover:border-white/5 disabled:hover:text-neutral-300 transition"
      >
        Siguiente
      </button>
    </div>
  );
};
