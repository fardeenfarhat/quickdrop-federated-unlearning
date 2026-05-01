import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

export const health = () => api.get("/api/health");

// Training
export const startTraining = (params) => api.post("/api/training/start", params);
export const getTrainingStatus = () => api.get("/api/training/status");
export const resetState = () => api.post("/api/training/reset");

// Clients
export const getClients = () => api.get("/api/clients");
export const getClientSamples = (id, n = 16) => api.get(`/api/clients/${id}/samples?n=${n}`);
export const getClientAccuracy = (id) => api.get(`/api/clients/${id}/accuracy`);

// Unlearning
export const startDistillation = (params) => api.post("/api/unlearn/distill", params);
export const runUnlearning = (params) => api.post("/api/unlearn/run", params);
export const getUnlearnStatus = () => api.get("/api/unlearn/status");
