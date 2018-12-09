export const express = (request, response, next) => {
  return {
    next,
    request,
    response
  };
};
