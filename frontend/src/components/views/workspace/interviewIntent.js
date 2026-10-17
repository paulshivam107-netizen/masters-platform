// A one-shot hint from another view (for example Today) about how the Interviews view should open.
let intent = "";
export const setInterviewIntent = (value) => {
  intent = value || "";
};
export const getInterviewIntent = () => intent;
export const clearInterviewIntent = () => {
  intent = "";
};

// Older sessions and saved profiles carry a route; new ones are "auto".
export const routeLabel = (route) =>
  route === "cat"
    ? "Two-year MBA"
    : route === "experienced"
      ? "Experienced professionals"
      : "MBA, EMBA or MiM";
