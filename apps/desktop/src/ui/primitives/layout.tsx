import type { ReactNode } from 'react';

import { Button } from './actions.js';

export interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly label?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label = 'Paginação',
}: PaginationProps) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error('Pagination totalPages must be a positive integer.');
  }
  if (!Number.isInteger(currentPage) || currentPage < 1 || currentPage > totalPages) {
    throw new Error('Pagination currentPage must be an integer within totalPages.');
  }

  return (
    <nav aria-label={label} className="rv-pagination">
      <Button
        aria-label="Página anterior"
        disabled={currentPage === 1}
        leadingIcon="previous"
        onClick={() => onPageChange(currentPage - 1)}
        variant="quiet"
      >
        Anterior
      </Button>
      <div className="rv-pagination__pages">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const current = page === currentPage;
          return (
            <Button
              aria-current={current ? 'page' : undefined}
              aria-label={current ? `Página ${page}, atual` : `Página ${page}`}
              data-selected={current || undefined}
              disabled={current}
              key={page}
              onClick={() => onPageChange(page)}
              variant="quiet"
            >
              {page}
            </Button>
          );
        })}
      </div>
      <span aria-live="polite" className="rv-pagination__summary">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        aria-label="Próxima página"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        variant="quiet"
      >
        Próxima
      </Button>
    </nav>
  );
}

export interface ScrollAreaProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function ScrollArea({ label, children, className }: ScrollAreaProps) {
  return (
    <section
      aria-label={label}
      className={['rv-scroll-area', className].filter(Boolean).join(' ')}
      role="region"
      tabIndex={0}
    >
      <p className="rv-scroll-area__affordance">Use a rolagem para acessar todo o conteúdo.</p>
      <div className="rv-scroll-area__content">{children}</div>
    </section>
  );
}
