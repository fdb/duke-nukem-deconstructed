import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { parseGrp } from "../lib/grp";
import { parsePalette, parseLookupDat } from "../lib/palette";
import { parseArt, renderTileToRGBA } from "../lib/art";
import { parseMap } from "../lib/map";
import type {
  GrpArchive,
  Palette,
  LookupTable,
  ArtFile,
  ArtTile,
  BuildMap,
} from "../lib/types";

interface GrpContextValue {
  archive: GrpArchive;
  palette: Palette;
  lookupTables: LookupTable[];
  artFiles: ArtFile[];
  getTile(tileNum: number): ArtTile | undefined;
  renderTile(tileNum: number): Uint8Array | undefined;
  getMap(name: string): BuildMap;
}

const GrpContext = createContext<GrpContextValue | null>(null);

export function GrpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    | { status: "loading"; progress: string }
    | { status: "ready"; value: GrpContextValue }
    | { status: "error"; error: string }
  >({ status: "loading", progress: "Fetching DUKE3D.GRP..." });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Try S3 first (for production), fall back to local (for dev)
        let response = await fetch("https://enigmeta-website.s3.amazonaws.com/media/projects/2026-duke-nukem-deconstruction/DUKE3D.GRP").catch(() => null);
        if (!response || !response.ok) {
          response = await fetch("/DUKE3D.GRP");
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        setState({ status: "loading", progress: "Parsing GRP archive..." });
        const archive = parseGrp(buffer);

        setState({ status: "loading", progress: "Loading palette..." });
        const palette = parsePalette(archive.getFile("PALETTE.DAT"));
        const lookupTables = parseLookupDat(archive.getFile("LOOKUP.DAT"));

        setState({ status: "loading", progress: "Decoding art tiles..." });
        const artFiles: ArtFile[] = [];
        for (const entry of archive.files) {
          if (entry.name.endsWith(".ART")) {
            artFiles.push(parseArt(archive.getFile(entry.name)));
          }
        }

        const mapCache = new Map<string, BuildMap>();

        const value: GrpContextValue = {
          archive,
          palette,
          lookupTables,
          artFiles,
          getTile(tileNum: number): ArtTile | undefined {
            for (const art of artFiles) {
              if (tileNum >= art.firstTile && tileNum <= art.lastTile) {
                return art.tiles[tileNum - art.firstTile];
              }
            }
            return undefined;
          },
          renderTile(tileNum: number): Uint8Array | undefined {
            const tile = value.getTile(tileNum);
            if (!tile || tile.width === 0 || tile.height === 0) return undefined;
            return renderTileToRGBA(tile, palette.colors);
          },
          getMap(name: string): BuildMap {
            const cached = mapCache.get(name);
            if (cached) return cached;
            const parsed = parseMap(archive.getFile(name));
            mapCache.set(name, parsed);
            return parsed;
          },
        };

        if (!cancelled) setState({ status: "ready", value });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-orange-500 text-lg font-bold mb-2">Loading</div>
          <div className="text-zinc-400">{state.progress}</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg font-bold mb-2">Error</div>
          <div className="text-zinc-400">{state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <GrpContext.Provider value={state.value}>{children}</GrpContext.Provider>
  );
}

export function useGrp(): GrpContextValue {
  const ctx = useContext(GrpContext);
  if (!ctx) throw new Error("useGrp must be used within GrpProvider");
  return ctx;
}
