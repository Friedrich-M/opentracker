export const percentFilter = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  const total = data.reduce((n, { y }) => n + y, 0);
  return data.map(({ x, y, ...props }) => ({ x, y, z: total ? (y / total) * 100 : 0, ...props }));
};

