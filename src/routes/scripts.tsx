import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGrp } from "../context/grp-context";

const CON_FILES = ["GAME.CON", "USER.CON", "DEFS.CON"];

const KEYWORD_RE = /\b(actor|enda|state|ends|move|ai|action|define|gamevar|include|ifcount|ifpdistl|ifrnd|ifcansee|ifhitweapon|ifdead|ifai|ifaction|ifmove|spawn|shoot|sound|debris|addkills|killit|sizeto|ifp|ifspritepal|ifgapzl|ifnotmoving|operate|myos|myospal|quote|palfrom|globalsound)\b/g;
const COMMENT_RE = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
const NUMBER_RE = /\b(\d+)\b/g;

function highlightCon(source: string): string {
  let html = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(COMMENT_RE, '<span class="text-zinc-600">$1</span>');
  html = html.replace(KEYWORD_RE, '<span class="text-orange-400">$1</span>');
  html = html.replace(NUMBER_RE, '<span class="text-cyan-400">$1</span>');

  return html;
}

export const Route = createFileRoute("/scripts")({
  component: ScriptsPage,
});

function ScriptsPage() {
  const { archive } = useGrp();
  const [activeFile, setActiveFile] = useState("GAME.CON");

  const source = useMemo(() => {
    const bytes = archive.getFileBytes(activeFile);
    return new TextDecoder("ascii").decode(bytes);
  }, [archive, activeFile]);

  const highlighted = useMemo(() => highlightCon(source), [source]);
  const lines = source.split("\n").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">CON Scripts</h1>
      <p className="text-zinc-400 mb-6">
        Duke3D's game logic is defined in .CON files — a custom scripting
        language by Todd Replogle. Actors, weapons, AI behaviors, sound
        triggers, and game constants are all here.
      </p>

      <div className="flex gap-2 mb-4">
        {CON_FILES.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFile(f)}
            className={`px-4 py-1 text-sm font-semibold border ${
              activeFile === f
                ? "bg-orange-500 text-zinc-950 border-orange-500"
                : "bg-zinc-950 text-zinc-400 border-zinc-700 hover:text-zinc-100"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-zinc-600 text-sm self-center ml-4">{lines} lines</span>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 overflow-auto max-h-[70vh]">
        <pre className="p-4 text-xs leading-relaxed mono">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
