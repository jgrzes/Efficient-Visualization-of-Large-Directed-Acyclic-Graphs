const NODE_COUNT = 100;
const EDGE_COUNT = 200;
const RADIUS = 50;

const initialPointPositions = new Float32Array(NODE_COUNT * 2);

for (let i = 0; i < NODE_COUNT; i++) {
  const x = Math.cos((i / NODE_COUNT) * 2 * Math.PI) * RADIUS + RADIUS;
  const y = Math.sin((i / NODE_COUNT) * 2 * Math.PI) * RADIUS + RADIUS;

  initialPointPositions[i * 2] = x;
  initialPointPositions[i * 2 + 1] = y;
}

const initialLinks: number[] = [];
for (let i = 0; i < EDGE_COUNT; i++) {
  const source = Math.floor(Math.random() * NODE_COUNT);
  let target = Math.floor(Math.random() * NODE_COUNT);
  while (target === source) {
    target = Math.floor(Math.random() * NODE_COUNT);
  }
  initialLinks.push(source, target);
}

export { initialPointPositions as initialPointPositions, initialLinks as initialLinks };
