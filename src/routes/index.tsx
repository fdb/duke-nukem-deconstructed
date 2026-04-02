import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-500">
        Duke Nukem 3D — Reverse Engineering Explorer
      </h1>
      <p className="mt-4 text-zinc-400">Loading...</p>
    </div>
  ),
});
