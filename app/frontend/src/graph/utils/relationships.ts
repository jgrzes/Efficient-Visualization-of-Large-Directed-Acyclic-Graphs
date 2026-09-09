type ParentEdge = {
  parent: number;
  edgeIndex: number;
};

export type ParentsByNode = Map<number, ParentEdge[]>;

export const computeParentsChildren = (
  selectedIndices: number[],
  flatLinks: Float32Array
) => {
  const parents: number[] = [];
  const children: number[] = [];
  const selectedSet = new Set<number>(selectedIndices);

  for (let i = 0; i < flatLinks.length; i += 2) {
    const source = flatLinks[i];
    const target = flatLinks[i + 1];

    if (selectedSet.has(target)) parents.push(source);
    else if (selectedSet.has(source)) children.push(target);
  }

  return { parents, children };
};

export const buildParentsByNode = (
  flatLinks: Float32Array
): ParentsByNode => {
  const parentsByNode: ParentsByNode = new Map();

  for (let i = 0; i < flatLinks.length; i += 2) {
    const source = flatLinks[i];
    const target = flatLinks[i + 1];
    const edgeIndex = i / 2;

    const parents = parentsByNode.get(target) ?? [];

    parents.push({
      parent: source,
      edgeIndex,
    });

    parentsByNode.set(target, parents);
  }

  return parentsByNode;
};

export const computeShortestPathToRoot = (
  startNode: number,
  parentsByNode: ParentsByNode
) => {
  const queue: number[] = [startNode];
  let head = 0;

  const visited = new Set<number>([startNode]);

  const previous = new Map<
    number,
    { child: number; edgeIndex: number }
  >();

  let root: number | null = null;

  while (head < queue.length) {
    const current = queue[head++];
    const parents = parentsByNode.get(current) ?? [];

    if (parents.length === 0) {
      root = current;
      break;
    }

    for (const { parent, edgeIndex } of parents) {
      if (visited.has(parent)) {
        continue;
      }

      visited.add(parent);

      previous.set(parent, {
        child: current,
        edgeIndex,
      });

      queue.push(parent);
    }
  }

  const pathNodes = new Set<number>();
  const pathEdges = new Set<number>();

  if (root === null) {
    return { pathNodes, pathEdges };
  }

  let current = root;
  pathNodes.add(current);

  while (current !== startNode) {
    const step = previous.get(current);

    if (!step) {
      break;
    }

    pathEdges.add(step.edgeIndex);
    pathNodes.add(step.child);

    current = step.child;
  }

  return { pathNodes, pathEdges };
};