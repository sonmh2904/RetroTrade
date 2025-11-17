import api from "../customizeAPI";

export const createAIChatSession = async (): Promise<Response> => {
  return api.post("/ai-chat/session");
};

export const sendAIMessage = async (
  sessionId: string,
  message: string
): Promise<Response> => {
  return api.post("/ai-chat/message", { sessionId, message });
};

export const getAIChatHistory = async (
  sessionId: string
): Promise<Response> => {
  return api.get(`/ai-chat/history/${sessionId}`);
};
