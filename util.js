export const resolve = promised =>
  Promise.resolve(promised).then(resolvable => {
    if (resolvable && resolvable.default) {
      return resolvable.default;
    }

    return resolvable;
  });
