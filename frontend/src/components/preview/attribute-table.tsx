"use client";

export function AttributeTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  if (rows.length === 0 || columns.length === 0) {
    return <p className="text-sm text-muted-foreground">No attributes to preview.</p>;
  }
  return (
    <div className="max-h-80 overflow-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/60">
              {columns.map((c) => (
                <td
                  key={c}
                  className="max-w-[260px] truncate px-2 py-1 text-muted-foreground"
                  title={String(r[c] ?? "")}
                >
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
