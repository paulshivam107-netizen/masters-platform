import { apiClient } from "./client";

const root = "/interviews";
const options = (signal) => ({ signal, timeout: 70000 });
export const getInterviewQuestions = (signal) =>
  apiClient.get(`${root}/questions`, options(signal)).then((r) => r.data);
export const extractResume = (file, format, signal) =>
  apiClient
    .post(`${root}/resume/extract`, file, {
      ...options(signal),
      params: { format },
      headers: { "Content-Type": "application/octet-stream" },
    })
    .then((r) => r.data);
export const createResumeQuestions = (payload, signal) =>
  apiClient
    .post(`${root}/resume/question-sets`, payload, options(signal))
    .then((r) => r.data);
export const listResumeQuestions = (offset = 0, signal) =>
  apiClient
    .get(`${root}/resume/question-sets`, {
      ...options(signal),
      params: { offset },
    })
    .then((r) => r.data);
export const deleteResumeQuestions = (id, signal) =>
  apiClient.delete(`${root}/resume/question-sets/${id}`, options(signal));
export const getInterviewCapabilities = (signal) =>
  apiClient.get(`${root}/capabilities`, options(signal)).then((r) => r.data);
export const listInterviews = (offset = 0, signal) =>
  apiClient
    .get(`${root}/sessions`, { ...options(signal), params: { offset } })
    .then((r) => r.data);
export const createInterview = (payload, signal) =>
  apiClient
    .post(`${root}/sessions`, payload, options(signal))
    .then((r) => r.data);
export const getInterview = (id, signal) =>
  apiClient.get(`${root}/sessions/${id}`, options(signal)).then((r) => r.data);
export const answerInterview = (id, payload, signal) =>
  apiClient
    .post(`${root}/sessions/${id}/answers`, payload, options(signal))
    .then((r) => r.data);
export const finishInterview = (id, payload, signal) =>
  apiClient
    .post(`${root}/sessions/${id}/finish`, payload, options(signal))
    .then((r) => r.data);
export const deleteInterview = (id, signal) =>
  apiClient.delete(`${root}/sessions/${id}`, options(signal));
export const transcribeInterview = (id, blob, payload, signal) =>
  apiClient
    .post(`${root}/sessions/${id}/transcribe`, blob, {
      ...options(signal),
      params: payload,
      headers: { "Content-Type": blob.type || "audio/webm" },
    })
    .then((r) => r.data);
export const speakInterviewQuestion = (id, payload, signal) =>
  apiClient
    .post(`${root}/sessions/${id}/speech`, payload, {
      ...options(signal),
      responseType: "blob",
    })
    .then((r) => r.data);

export async function interviewError(error) {
  let data = error.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  if (error.response?.status === 401)
    return "Your sign-in expired. Sign in again to continue this saved interview.";
  if (typeof data?.detail === "string") return data.detail;
  if (error.response?.status === 422)
    return "Check the interview details and answer length, then try again.";
  return "We could not reach the interview service. Your answer is still here. Reload the session or retry when connected.";
}
