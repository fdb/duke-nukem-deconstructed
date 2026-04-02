interface HexViewProps {
  data: Uint8Array;
  limit?: number;
  highlights?: [number, number, string][];
}

export function HexView({ data, limit = 256, highlights = [] }: HexViewProps) {
  const bytes = data.slice(0, limit);
  const rows: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }

  function getHighlight(byteIndex: number): string | undefined {
    for (const [start, end, color] of highlights) {
      if (byteIndex >= start && byteIndex < end) return color;
    }
    return undefined;
  }

  return (
    <div className="mono text-xs overflow-x-auto">
      <table className="border-collapse">
        <tbody>
          {rows.map((row, rowIdx) => {
            const offset = rowIdx * 16;
            return (
              <tr key={offset}>
                <td className="text-zinc-600 pr-4 select-none">
                  {offset.toString(16).padStart(8, "0")}
                </td>
                <td className="pr-4">
                  {Array.from(row).map((b, i) => {
                    const color = getHighlight(offset + i);
                    return (
                      <span
                        key={i}
                        className={color ? "" : "text-zinc-300"}
                        style={color ? { color } : undefined}
                      >
                        {b.toString(16).padStart(2, "0")}
                        {i === 7 ? "  " : " "}
                      </span>
                    );
                  })}
                </td>
                <td className="text-zinc-600">
                  {Array.from(row)
                    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
                    .join("")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
