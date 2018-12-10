export const resolveModule = resolvable => {
  if (resolvable && (resolvable.__esModule || resolvable.default)) {
    return resolvable.default;
  }

  return resolvable;
};

export const resolve = promised =>
  Promise.resolve(promised).then(resolveModule);
