import { createEssayApplicationActions } from "./essayApplicationActions";
import { writeUserValue } from "./workspaceStorage";
import { ESSAY_DRAFT_KEY, APPLICATION_DRAFT_KEY } from "./drafts";
jest.mock("../api", () => ({}));
function setup(userId) {
  const setters = {};
  for (const name of [
    "setFormData",
    "setEssayDegreeChoice",
    "setEssayCustomDegree",
    "setSelectedEssay",
    "setReview",
    "setShowVersions",
    "setShowForm",
    "setShowApplicationForm",
    "setEditingApplicationId",
    "setActiveNav",
    "setEssayDraftRecovered",
    "setApplicationFormData",
    "setApplicationDegreeChoice",
    "setApplicationCustomDegree",
    "setApplicationDraftRecovered",
  ])
    setters[name] = jest.fn();
  return {
    setters,
    actions: createEssayApplicationActions({
      ...setters,
      userId,
      degreeOptions: ["MBA", "Other"],
      applications: [],
      selectedApplicationId: null,
    }),
  };
}
beforeEach(() => localStorage.clear());
test("opening a new essay recovers the current account draft and its custom programme", () => {
  writeUserValue(1, ESSAY_DRAFT_KEY, {
    school_name: "Test school",
    program_type: "Two-year PGP",
    essay_content: "An unfinished thought",
    essay_prompt: "Why MBA now?",
  });
  const { actions, setters } = setup(1);
  actions.handleOpenNewEssayForm();
  expect(setters.setFormData).toHaveBeenCalledWith(
    expect.objectContaining({ essay_content: "An unfinished thought" }),
  );
  expect(setters.setEssayCustomDegree).toHaveBeenCalledWith("Two-year PGP");
  expect(setters.setEssayDraftRecovered).toHaveBeenCalledWith(true);
  const other = setup(2);
  other.actions.handleOpenNewEssayForm();
  expect(other.setters.setEssayDraftRecovered).toHaveBeenCalledWith(false);
});
test("application draft recovery restores a custom programme without losing the draft", () => {
  writeUserValue(1, APPLICATION_DRAFT_KEY, {
    school_name: "Test school",
    program_name: "PGPX",
    deadline: "2027-01-20",
  });
  const { actions, setters } = setup(1);
  actions.handleOpenApplicationForm();
  expect(setters.setApplicationFormData).toHaveBeenCalledWith(
    expect.objectContaining({ program_name: "PGPX", deadline: "2027-01-20" }),
  );
  expect(setters.setApplicationCustomDegree).toHaveBeenCalledWith("PGPX");
  expect(setters.setApplicationDraftRecovered).toHaveBeenCalledWith(true);
});
