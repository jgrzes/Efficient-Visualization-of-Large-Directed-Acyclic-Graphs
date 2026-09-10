const NODE_COUNT = 100;
const EDGE_COUNT = 200;
const RADIUS = 50;

const initialPointPositions = new Float32Array(NODE_COUNT * 2);

const LEVEL_SIZES = [1, 2, 4, 8, 16, 32, 37];
const levels: number[][] = [];
let nodeIndex = 0;

for (const size of LEVEL_SIZES) {
  const level = [];
  for (let i = 0; i < size; i++) {
    level.push(nodeIndex++);
  }
  levels.push(level);
}

const LEVEL_GAP = (RADIUS * 2) / (levels.length - 1);
const MAX_WIDTH = Math.max(...LEVEL_SIZES);
const X_SPACING = (RADIUS * 2) / MAX_WIDTH;

levels.forEach((level, levelIndex) => {
  const y = (RADIUS * 2) - (levelIndex * LEVEL_GAP);
  const levelWidth = (level.length - 1) * X_SPACING;
  
  level.forEach((nodeId, indexInLevel) => {
    const x = RADIUS - levelWidth / 2 + indexInLevel * X_SPACING;
    
    initialPointPositions[nodeId * 2] = x;
    initialPointPositions[nodeId * 2 + 1] = y;
  });
});

const linksSet = new Set<string>();

for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
  const parents = levels[levelIndex];
  const children = levels[levelIndex + 1];

  children.forEach((child, childIndex) => {
    const parentIndex = Math.floor((childIndex / children.length) * parents.length);
    linksSet.add(`${parents[parentIndex]}-${child}`);
  });
}

while (linksSet.size < EDGE_COUNT) {
  const sourceLevel = Math.floor(Math.random() * (levels.length - 1));
  const targetLevel = sourceLevel + 1;
  
  const parents = levels[sourceLevel];
  const children = levels[targetLevel];
  
  const randomParent = parents[Math.floor(Math.random() * parents.length)];
  const randomChild = children[Math.floor(Math.random() * children.length)];
  
  linksSet.add(`${randomParent}-${randomChild}`);
}

const initialLinks: number[] = [];
linksSet.forEach(link => {
  const [source, target] = link.split('-').map(Number);
  initialLinks.push(source, target);
});

export { initialPointPositions, initialLinks };