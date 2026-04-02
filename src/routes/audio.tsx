import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo, useCallback } from "react";
import { useGrp } from "../context/grp-context";
import { parseVoc } from "../lib/voc";

export const Route = createFileRoute("/audio")({
  component: AudioPage,
});

function AudioPage() {
  const { archive } = useGrp();
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const vocFiles = useMemo(
    () => archive.files.filter((f) => f.name.endsWith(".VOC")),
    [archive],
  );
  const midFiles = useMemo(
    () => archive.files.filter((f) => f.name.endsWith(".MID")),
    [archive],
  );

  const playVoc = useCallback(
    (name: string) => {
      sourceRef.current?.stop();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const vocData = parseVoc(archive.getFile(name));
      const buffer = ctx.createBuffer(1, vocData.samples.length, vocData.sampleRate);
      buffer.getChannelData(0).set(vocData.samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(null);
      source.start();

      sourceRef.current = source;
      setPlaying(name);
    },
    [archive],
  );

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    setPlaying(null);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">Audio</h1>
      <p className="text-zinc-400 mb-8">
        {vocFiles.length} Creative Voice files (.VOC) — 8-bit unsigned PCM
        decoded to Web Audio. Sound effects, Duke's one-liners, ambience, and
        enemy sounds.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Sound Effects ({vocFiles.length})
        </h2>
        <div className="overflow-y-auto max-h-[50vh] border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="p-2 font-medium w-8"></th>
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {vocFiles.map((f) => (
                <tr
                  key={f.name}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${
                    playing === f.name ? "bg-orange-500/10" : ""
                  }`}
                  onClick={() => playing === f.name ? stop() : playVoc(f.name)}
                >
                  <td className="p-2 text-center">
                    {playing === f.name ? (
                      <span className="text-orange-500">■</span>
                    ) : (
                      <span className="text-zinc-600">▶</span>
                    )}
                  </td>
                  <td className="p-2 mono text-zinc-100">{f.name}</td>
                  <td className="p-2 mono text-zinc-400 text-right">{f.size.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Music ({midFiles.length} MIDI tracks)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium pl-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {midFiles.map((f) => (
              <tr key={f.name} className="border-b border-zinc-800/50">
                <td className="py-2 mono text-zinc-100">{f.name}</td>
                <td className="py-2 mono text-zinc-400 text-right">{f.size.toLocaleString()}</td>
                <td className="py-2 text-zinc-500 pl-4">
                  {f.name === "GRABBAG.MID" ? "Main theme" : "Level music"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-zinc-600 text-sm mt-4">
          MIDI playback requires a soundfont — listed here for reference.
        </p>
      </section>
    </div>
  );
}
