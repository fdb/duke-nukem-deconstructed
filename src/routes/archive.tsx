import { createFileRoute } from "@tanstack/react-router";
import { HexView } from "../components/hex-view";

const ARCHIVE_FILES = [
  { name: "DUKE3D.EXE", size: "1,178,963", desc: "Main game executable (DOS4GW 32-bit)" },
  { name: "DUKE3D.GRP", size: "11,035,779", desc: "Build engine group file — all game assets" },
  { name: "GAME.CON", size: "99,639", desc: "Actor AI, weapons, game logic scripts" },
  { name: "USER.CON", size: "36,960", desc: "User-configurable constants and settings" },
  { name: "DEFS.CON", size: "28,893", desc: "Tile and sound number definitions" },
  { name: "DUKE.RTS", size: "188,954", desc: "Remote Ridicule sounds (multiplayer taunts)" },
  { name: "SETUP.EXE", size: "27,153", desc: "Sound/video/input configuration utility" },
  { name: "MODEM.PCK", size: "4,125", desc: "Modem initialization strings" },
  { name: "DEMO1.DMO", size: "6,226", desc: "Attract-mode demo recording" },
  { name: "DEMO2.DMO", size: "9,701", desc: "Attract-mode demo recording" },
  { name: "DEMO3.DMO", size: "3,759", desc: "Attract-mode demo recording" },
];

const SHR_HEADER_HEX = [
  0x4d, 0x5a, 0xf5, 0x01, 0x1e, 0x00, 0x01, 0x00, 0x06, 0x00, 0x89, 0x0c,
  0xff, 0xff, 0x00, 0x00, 0xb0, 0x5f, 0x00, 0x00, 0x00, 0x01, 0xf0, 0xff,
  0x52, 0x00, 0x00, 0x00, 0x14, 0x11, 0x50, 0x4b, 0x4c, 0x49, 0x54, 0x45,
  0x20, 0x43, 0x6f, 0x70, 0x72, 0x2e, 0x20, 0x31, 0x39, 0x39, 0x30, 0x2d,
  0x39, 0x32, 0x20, 0x50, 0x4b, 0x57, 0x41, 0x52, 0x45, 0x20, 0x49, 0x6e,
  0x63, 0x2e, 0x20, 0x41, 0x6c, 0x6c, 0x20, 0x52, 0x69, 0x67, 0x68, 0x74,
  0x73, 0x20, 0x52, 0x65, 0x73, 0x65, 0x72, 0x76, 0x65, 0x64, 0x07, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

export const Route = createFileRoute("/archive")({
  component: ArchivePage,
});

function ArchivePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">The Archive</h1>
      <p className="text-zinc-400 mb-8">
        DN3DSW13.SHR — a 5.6 MB self-extracting PKZIP archive, the standard
        distribution format for shareware on BBSes and FTP sites in 1996.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">SHR Header — MZ + PKLITE Stub</h2>
        <p className="text-zinc-400 text-sm mb-4">
          The file starts with a DOS MZ executable header. The stub is compressed with PKLITE
          and contains the PKZIP extraction code. When run, it unpacks the embedded ZIP data
          into the current directory.
        </p>
        <div className="bg-zinc-950 border border-zinc-800 p-4 overflow-x-auto">
          <HexView
            data={new Uint8Array(SHR_HEADER_HEX)}
            highlights={[
              [0, 2, "#f97316"],
              [30, 86, "#22c55e"],
            ]}
          />
        </div>
        <div className="flex gap-6 mt-2 text-xs text-zinc-600">
          <span><span className="text-orange-500">■</span> MZ signature</span>
          <span><span className="text-green-500">■</span> PKLITE copyright string</span>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Extracted Contents</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">File</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium pl-6">Description</th>
            </tr>
          </thead>
          <tbody>
            {ARCHIVE_FILES.map((f) => (
              <tr key={f.name} className="border-b border-zinc-800/50">
                <td className="py-2 mono text-zinc-100">{f.name}</td>
                <td className="py-2 mono text-zinc-400 text-right">{f.size}</td>
                <td className="py-2 text-zinc-500 pl-6">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
