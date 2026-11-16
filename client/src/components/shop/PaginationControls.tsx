import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Pagination } from '@/types';

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  label?: string;
}

export const PaginationControls = ({
  pagination,
  onPageChange,
  label = 'results',
}: PaginationControlsProps) => {
  if (pagination.totalPages <= 1) return null;

  const firstOnPage = (pagination.page - 1) * pagination.limit + 1;
  const lastOnPage = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <nav
      className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted-foreground">
        Showing <span className="tabular font-medium text-foreground">{firstOnPage}</span>–
        <span className="tabular font-medium text-foreground">{lastOnPage}</span> of{' '}
        <span className="tabular font-medium text-foreground">{pagination.total}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>

        <span className="tabular px-2 text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
};
