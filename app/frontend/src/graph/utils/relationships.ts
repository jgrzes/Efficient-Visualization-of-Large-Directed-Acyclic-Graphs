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
