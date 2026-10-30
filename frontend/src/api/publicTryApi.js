import axios from "axios";
import { API_URL } from "./client";

// Signed-out endpoints: a bare client, so no Authorization header, no cookies and no
// session-recovery interceptors (apiClient sends credentials, which these calls never need).
const publicClient = axios.create({ baseURL: API_URL, timeout: 30000 });

const UNAVAILABLE = {
  available: false,
  turnstile_site_key: null,
  question: null,
  min_chars: 40,
  max_chars: 1200,
};

let statusPromise = null;

// Any network error or non-200 means "not available". An unavailable result is not kept,
// so the next mount asks again; an available one is shared by every widget on the page.
export function getTryStatusApi() {
  if (!statusPromise) {
    statusPromise = publicClient
      .get("/public/try/status")
      .then(({ data }) =>
        data?.available && data.question?.id && data.question?.text
          ? { ...UNAVAILABLE, ...data }
          : UNAVAILABLE,
      )
      .catch(() => UNAVAILABLE)
      .then((status) => {
        if (!status.available) statusPromise = null;
        return status;
      });
  }
  return statusPromise;
}

export async function submitTryFollowUpApi(payload) {
  const { data } = await publicClient.post("/public/try/follow-up", payload);
  return data;
}
