// Fondo low-poly: malla de triángulos en tonos piedra con un resplandor de brasa
// en la base. Se genera de forma determinista (mismo resultado en cada render).
const COLS = 6;
const ROWS = 12;
const W = 100;
const H = 200;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMesh() {
  const rand = mulberry32(1987);
  const points: [number, number][][] = [];
  for (let r = 0; r <= ROWS; r++) {
    const row: [number, number][] = [];
    for (let c = 0; c <= COLS; c++) {
      const edgeX = c === 0 || c === COLS;
      const edgeY = r === 0 || r === ROWS;
      const jx = edgeX ? 0 : (rand() - 0.5) * (W / COLS) * 0.7;
      const jy = edgeY ? 0 : (rand() - 0.5) * (H / ROWS) * 0.7;
      row.push([(c * W) / COLS + jx, (r * H) / ROWS + jy]);
    }
    points.push(row);
  }

  const triangles: { d: string; fill: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = points[r][c];
      const b = points[r][c + 1];
      const d = points[r + 1][c];
      const e = points[r + 1][c + 1];
      const tris = rand() > 0.5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      for (const tri of tris) {
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3 / H; // 0 arriba, 1 abajo
        const lightness = 4 + rand() * 3 + cy * 2;
        triangles.push({
          d: `M${tri.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`,
          fill: `hsl(30 ${(10 + cy * 14).toFixed(1)}% ${lightness.toFixed(1)}%)`,
        });
      }
    }
  }
  return triangles;
}

const MESH = buildMesh();

export function LowPolyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {MESH.map((t, i) => (
          <path key={i} d={t.d} fill={t.fill} />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_110%,rgba(217,120,43,0.16),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_40%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
