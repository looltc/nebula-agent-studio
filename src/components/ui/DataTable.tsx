import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import styles from './DataTable.module.css';
import { cx } from '@/lib/cx';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  zebra?: boolean;
  pageSize?: number;
  className?: string;
}

type SortDir = 'asc' | 'desc';

function toComparable(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  return String(value);
}

export function DataTable<T,>({
  columns,
  data,
  rowKey,
  onRowClick,
  empty,
  zebra = false,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0); // 0-indexed

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = toComparable((a as Record<string, unknown>)[sortKey]);
      const bv = toComparable((b as Record<string, unknown>)[sortKey]);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir, columns]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = total === 0 ? 0 : safePage * pageSize + 1;
  const end = Math.min((safePage + 1) * pageSize, total);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const renderCell = (col: DataTableColumn<T>, row: T): ReactNode => {
    if (col.render) return col.render(row);
    const v = (row as Record<string, unknown>)[col.key];
    return v === null || v === undefined ? '' : String(v);
  };

  if (total === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={cx(styles.wrapper, className)}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cx(
                      styles.th,
                      col.sortable && styles.sortable,
                      isActive && styles.thActive,
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={col.sortable ? () => handleSort(col) : undefined}
                    aria-sort={
                      isActive
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : col.sortable
                          ? 'none'
                          : undefined
                    }
                  >
                    <span className={styles.thInner}>
                      {col.header}
                      {col.sortable && (
                        <span className={styles.sortIcon} aria-hidden="true">
                          {isActive ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  className={cx(
                    styles.tr,
                    zebra && styles.zebra,
                    onRowClick && styles.clickable,
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={styles.td}>
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <span className={styles.counts}>
          Showing {start}-{end} of {total}
        </span>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <PageNumbers
            current={safePage}
            total={totalPages}
            onGo={setPage}
          />
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- page number helpers ---------- */

function PageNumbers({
  current,
  total,
  onGo,
}: {
  current: number;
  total: number;
  onGo: (page: number) => void;
}) {
  // Windowed: show first, last, and a window around current with ellipses.
  const pages = buildPageList(current, total);
  return (
    <>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className={styles.gap}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cx(styles.pageBtn, p === current && styles.pageActive)}
            onClick={() => onGo(p)}
            aria-current={p === current ? 'page' : undefined}
          >
            {p + 1}
          </button>
        ),
      )}
    </>
  );
}

function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const result: Array<number | '…'> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) result.push('…');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < total - 2) result.push('…');
  result.push(total - 1);
  return result;
}
