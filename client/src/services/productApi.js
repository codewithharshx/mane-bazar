import api from "./apiClient";

export const productApi = {
  list: (params) => api.get("/products", { params }),
  getByUrlKey: (urlKey) => api.get(`/products/${urlKey}`),
  getByCategory: (urlKey) => api.get(`/products/category/${urlKey}`),
  create: (payload) => api.post("/products", payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  remove: (id) => api.delete(`/products/${id}`),
  createReview: (id, payload) => api.post(`/products/${id}/reviews`, payload)
};
