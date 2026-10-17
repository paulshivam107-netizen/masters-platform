import React from "react";
import "./WorkspaceAccount.css";

function EssayFormView({
  isAdmin,
  formData,
  setFormData,
  UNIVERSITY_OPTIONS,
  setEssayDegreeChoice,
  setEssayCustomDegree,
  DEGREE_OPTIONS,
  handleSubmit,
  loading,
  setShowForm,
  setActiveNav,
  essayDraftRecovered,
  handleDiscardEssayDraft,
  onAssistOutline,
}) {
  const [assistInput, setAssistInput] = React.useState("");
  const [assistLoading, setAssistLoading] = React.useState(false);
  const [assistError, setAssistError] = React.useState("");
  const [assistResult, setAssistResult] = React.useState(null);
  const [showOutlineAssist, setShowOutlineAssist] = React.useState(false);

  const handleGenerateSampleText = () => {
    const prompts = [
      "Describe a time you led a team through uncertainty. What did you learn?",
      "What matters most to you, and why?",
      "Tell us about a failure and how it changed your approach to leadership.",
      "Describe a moment that shaped your goals for business school.",
    ];
    const bodies = [
      [
        "In my second year leading a cross-functional launch, we faced a sudden regulatory change that threatened our timeline.",
        "I convened a rapid review, separated what we knew from what we assumed, and reallocated resources to validate the riskiest assumptions first.",
        "The experience taught me to lead with clarity and to prioritize learning speed over rigid plans.",
        "It also showed me the value of transparent communication when the team’s confidence is fragile.",
        "I now approach ambiguity by creating small, measurable experiments that reduce fear and build momentum.",
      ],
      [
        "I care most about building products that expand opportunity for people who are often overlooked.",
        "Growing up in a small city, I watched peers with talent lose confidence because they lacked access to mentors and networks.",
        "This shaped my focus on equitable systems and the belief that opportunity can be designed.",
        "I want to study business to scale this impact through sustainable models and responsible leadership.",
        "Long-term, I aim to build ventures that make quality education and career pathways more accessible.",
      ],
      [
        "I once underestimated the complexity of a client integration and promised a delivery date that was unrealistic.",
        "The delay damaged trust and forced me to confront how optimism can become a liability.",
        "I learned to pressure-test timelines, invite early feedback, and communicate tradeoffs directly.",
        "The setback reshaped how I lead: clarity before confidence, and accountability above speed.",
        "That lesson has made me a more dependable teammate and a more transparent leader.",
      ],
    ];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const prompt = pick(prompts);
    const paragraphs = pick(bodies);
    const content = paragraphs.join("\n\n");
    setFormData({
      ...formData,
      essay_prompt: prompt,
      essay_content: content,
    });
  };

  const parseSkeletonPoints = (value) =>
    value
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

  const handleGenerateOutline = async () => {
    const skeletonPoints = parseSkeletonPoints(assistInput);
    if (skeletonPoints.length < 3) {
      setAssistError("Add at least 3 skeleton bullet points.");
      return;
    }
    if (
      !formData.school_name ||
      !formData.program_type ||
      !formData.essay_prompt
    ) {
      setAssistError(
        "Fill School, Programme, and Essay Prompt before generating outline.",
      );
      return;
    }

    try {
      setAssistLoading(true);
      setAssistError("");
      const response = await onAssistOutline({
        school_name: formData.school_name,
        program_type: formData.program_type,
        essay_prompt: formData.essay_prompt,
        skeleton_points: skeletonPoints,
        target_word_count: 550,
      });
      setAssistResult(response);
    } catch (error) {
      setAssistError(
        error?.response?.data?.detail || "Failed to generate outline",
      );
    } finally {
      setAssistLoading(false);
    }
  };

  const content = formData.essay_content || "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="wac-page wac-compose" data-testid="compose-form">
      {essayDraftRecovered && (
        <div className="ws-alert ws-alert--warn">
          <p>Recovered unsaved draft from this browser.</p>
          <button
            type="button"
            className="ws-btn ws-btn--sm"
            onClick={handleDiscardEssayDraft}
          >
            Discard local draft
          </button>
        </div>
      )}
      {formData.parent_essay_id && (
        <div className="ws-alert">
          <p>
            You are creating a new draft based on an existing version. The
            previous version stays unchanged.
          </p>
        </div>
      )}
      <form
        className="ws-stack"
        onSubmit={handleSubmit}
        data-testid="compose-form-element"
      >
        <section className="ws-card ws-stack ws-stack--sm">
          <div className="ws-row ws-row--between">
            <div>
              <h3 className="ws-h3">Essay details</h3>
              <p className="ws-help">
                Choose the programme and the question you are responding to.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="ws-btn ws-btn--sm"
                data-testid="compose-generate-sample"
                onClick={handleGenerateSampleText}
              >
                Generate sample
              </button>
            )}
          </div>
          <div className="ws-grid ws-grid--2">
            <div className="ws-field">
              <label className="ws-label" htmlFor="essayformview-field-1">
                School name
              </label>
              <input
                id="essayformview-field-1"
                className="ws-input"
                data-testid="compose-school-input"
                type="text"
                value={formData.school_name}
                onChange={(e) =>
                  setFormData({ ...formData, school_name: e.target.value })
                }
                list="university-options"
                placeholder="e.g., Harvard Business School"
                required
              />
              <datalist id="university-options">
                {UNIVERSITY_OPTIONS.map((school) => (
                  <option key={school} value={school} />
                ))}
              </datalist>
            </div>
            <div className="ws-field">
              <label className="ws-label" htmlFor="essay-programme">
                Programme
              </label>
              <input
                id="essay-programme"
                className="ws-input"
                data-testid="compose-program-input"
                value={formData.program_type}
                list="essay-programme-options"
                required
                minLength={2}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, program_type: value });
                  setEssayDegreeChoice(
                    DEGREE_OPTIONS.includes(value) ? value : "Other",
                  );
                  setEssayCustomDegree(
                    DEGREE_OPTIONS.includes(value) ? "" : value,
                  );
                }}
              />
              <datalist id="essay-programme-options">
                {DEGREE_OPTIONS.filter((value) => value !== "Other").map(
                  (value) => (
                    <option key={value} value={value} />
                  ),
                )}
              </datalist>
            </div>
          </div>
          <div className="ws-field">
            <label className="ws-label" htmlFor="essayformview-field-4">
              Essay prompt
            </label>
            <textarea
              id="essayformview-field-4"
              className="ws-textarea wac-prompt-input"
              data-testid="compose-prompt-input"
              value={formData.essay_prompt}
              onChange={(e) =>
                setFormData({ ...formData, essay_prompt: e.target.value })
              }
              placeholder="What matters most to you, and why?"
              required
            />
            <p className="ws-help">Paste the question exactly as the school words it.</p>
          </div>
        </section>

        <section className="ws-card ws-stack ws-stack--sm">
          <div className="ws-row ws-row--between">
            <div>
              <h3 className="ws-h3">Outline helper (optional)</h3>
              <p className="ws-help">
                Add quick bullet points and get a draft outline.
              </p>
            </div>
            <button
              type="button"
              className="ws-btn ws-btn--sm"
              onClick={() => setShowOutlineAssist((prev) => !prev)}
              aria-expanded={showOutlineAssist}
            >
              {showOutlineAssist ? "Hide" : "Show"}
            </button>
          </div>
          {showOutlineAssist && (
            <div className="ws-stack ws-stack--sm">
              <div className="ws-field">
                <label className="ws-label" htmlFor="essayformview-field-5">
                  Bullet points
                </label>
                <textarea
                  id="essayformview-field-5"
                  className="ws-textarea"
                  data-testid="compose-skeleton-input"
                  value={assistInput}
                  onChange={(e) => setAssistInput(e.target.value)}
                  placeholder="- Key moment&#10;- Main challenge&#10;- Why this program"
                  rows="5"
                />
              </div>
              <div className="ws-row">
                <button
                  type="button"
                  className="ws-btn"
                  data-testid="compose-outline-assist-button"
                  onClick={handleGenerateOutline}
                  disabled={assistLoading}
                >
                  {assistLoading ? "Generating outline..." : "Generate Outline"}
                </button>
                {assistResult?.outline_markdown && (
                  <button
                    type="button"
                    className="ws-btn"
                    data-testid="compose-apply-outline-button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        essay_content: assistResult.outline_markdown,
                      })
                    }
                  >
                    Use Outline in Draft
                  </button>
                )}
              </div>
              {assistError && <p className="ws-error">{assistError}</p>}
              {assistResult?.outline_markdown && (
                <div
                  className="wac-outline"
                  data-testid="compose-outline-output"
                >
                  <small>{assistResult.caution}</small>
                  <pre>{assistResult.outline_markdown}</pre>
                  {Array.isArray(assistResult.next_steps) &&
                    assistResult.next_steps.length > 0 && (
                      <ul>
                        {assistResult.next_steps.map((step, index) => (
                          <li key={`${step}-${index}`}>{step}</li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="ws-card wac-draft">
          <div>
            <h3 className="ws-h3">Your draft</h3>
            <p className="ws-help">
              Write or paste your response. Save it to return to it later.
            </p>
          </div>
          <div className="ws-field">
            <label className="ws-label" htmlFor="essayformview-field-6">
              Essay content
            </label>
            <textarea
              id="essayformview-field-6"
              className="ws-textarea wac-editor"
              data-testid="compose-content-input"
              value={formData.essay_content}
              onChange={(e) =>
                setFormData({ ...formData, essay_content: e.target.value })
              }
              placeholder="Your essay here..."
              rows="14"
              minLength={20}
              required
            />
          </div>
          <div className="wac-draft__bar">
            <p className="wac-count ws-small" aria-live="polite">
              <strong className="ws-num">{wordCount}</strong>{" "}
              {wordCount === 1 ? "word" : "words"}
              <span aria-hidden="true"> · </span>
              <span className="ws-num">{content.length}</span> characters
              <span className="wac-count__note">
                {" "}
                Check the school’s official word limit.
              </span>
            </p>
            <div className="ws-row">
              <button
                type="button"
                className="ws-btn"
                data-testid="compose-cancel-button"
                onClick={() => {
                  setShowForm(false);
                  setActiveNav("home");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ws-btn ws-btn--primary"
                data-testid="compose-submit-button"
                disabled={loading}
              >
                {loading ? "Saving…" : "Save draft"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default EssayFormView;
