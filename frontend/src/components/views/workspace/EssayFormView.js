import React from 'react';

function EssayFormView({
  isAdmin,
  formData,
  setFormData,
  UNIVERSITY_OPTIONS,
  essayDegreeChoice,
  setEssayDegreeChoice,
  setEssayCustomDegree,
  DEGREE_OPTIONS,
  essayCustomDegree,
  handleSubmit,
  loading,
  setShowForm,
  setActiveNav,
  essayDraftRecovered,
  handleDiscardEssayDraft,
  onAssistOutline
}) {
  const [assistInput, setAssistInput] = React.useState('');
  const [assistLoading, setAssistLoading] = React.useState(false);
  const [assistError, setAssistError] = React.useState('');
  const [assistResult, setAssistResult] = React.useState(null);
  const [showOutlineAssist, setShowOutlineAssist] = React.useState(false);

  const handleGenerateSampleText = () => {
    const prompts = [
      'Describe a time you led a team through uncertainty. What did you learn?',
      'What matters most to you, and why?',
      'Tell us about a failure and how it changed your approach to leadership.',
      'Describe a moment that shaped your goals for business school.'
    ];
    const bodies = [
      [
        'In my second year leading a cross-functional launch, we faced a sudden regulatory change that threatened our timeline.',
        'I convened a rapid review, separated what we knew from what we assumed, and reallocated resources to validate the riskiest assumptions first.',
        'The experience taught me to lead with clarity and to prioritize learning speed over rigid plans.',
        'It also showed me the value of transparent communication when the team’s confidence is fragile.',
        'I now approach ambiguity by creating small, measurable experiments that reduce fear and build momentum.'
      ],
      [
        'I care most about building products that expand opportunity for people who are often overlooked.',
        'Growing up in a small city, I watched peers with talent lose confidence because they lacked access to mentors and networks.',
        'This shaped my focus on equitable systems and the belief that opportunity can be designed.',
        'I want to study business to scale this impact through sustainable models and responsible leadership.',
        'Long-term, I aim to build ventures that make quality education and career pathways more accessible.'
      ],
      [
        'I once underestimated the complexity of a client integration and promised a delivery date that was unrealistic.',
        'The delay damaged trust and forced me to confront how optimism can become a liability.',
        'I learned to pressure-test timelines, invite early feedback, and communicate tradeoffs directly.',
        'The setback reshaped how I lead: clarity before confidence, and accountability above speed.',
        'That lesson has made me a more dependable teammate and a more transparent leader.'
      ]
    ];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const prompt = pick(prompts);
    const paragraphs = pick(bodies);
    const content = paragraphs.join('\n\n');
    setFormData({
      ...formData,
      essay_prompt: prompt,
      essay_content: content
    });
  };

  const parseSkeletonPoints = (value) =>
    value
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

  const handleGenerateOutline = async () => {
    const skeletonPoints = parseSkeletonPoints(assistInput);
    if (skeletonPoints.length < 3) {
      setAssistError('Add at least 3 skeleton bullet points.');
      return;
    }
    if (!formData.school_name || !formData.program_type || !formData.essay_prompt) {
      setAssistError('Fill School, Degree, and Essay Prompt before generating outline.');
      return;
    }

    try {
      setAssistLoading(true);
      setAssistError('');
      const response = await onAssistOutline({
        school_name: formData.school_name,
        program_type: formData.program_type,
        essay_prompt: formData.essay_prompt,
        skeleton_points: skeletonPoints,
        target_word_count: 550
      });
      setAssistResult(response);
    } catch (error) {
      setAssistError(error?.response?.data?.detail || 'Failed to generate outline');
    } finally {
      setAssistLoading(false);
    }
  };

  return (
            <div className="essay-form" data-testid="compose-form">
            {essayDraftRecovered && (
              <div className="draft-recovered-banner">
                <p>Recovered unsaved draft from this browser.</p>
                <button type="button" onClick={handleDiscardEssayDraft}>
                  Discard local draft
                </button>
              </div>
            )}
            {formData.parent_essay_id && (
              <div className="version-notice">
                You are creating a new draft based on an existing version. The previous version stays unchanged.
              </div>
            )}
            <form onSubmit={handleSubmit} data-testid="compose-form-element">
              <div className="form-section">
                <div className="form-section-header">
                  <div>
                    <h3>Step 1: Basics</h3>
                    <p>Set the school, degree, and prompt for this essay.</p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="form-section-toggle"
                      data-testid="compose-generate-sample"
                      onClick={handleGenerateSampleText}
                    >
                      Generate sample
                    </button>
                  )}
                </div>
              <div className="form-group">
                <label>School Name</label>
                <input
                  data-testid="compose-school-input"
                  type="text"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
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
              <div className="form-group">
                <label>Degree</label>
                <select
                  data-testid="compose-degree-select"
                  value={essayDegreeChoice}
                  onChange={(e) => {
                    const choice = e.target.value;
                    setEssayDegreeChoice(choice);
                    if (choice !== 'Other') {
                      setEssayCustomDegree('');
                      setFormData({ ...formData, program_type: choice });
                    }
                  }}
                  required
                >
                  {DEGREE_OPTIONS.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
              </div>
              {essayDegreeChoice === 'Other' && (
                <div className="form-group">
                  <label>Custom Degree</label>
                  <input
                    data-testid="compose-custom-degree-input"
                    type="text"
                    value={essayCustomDegree}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEssayCustomDegree(value);
                      setFormData({ ...formData, program_type: value });
                    }}
                    placeholder="Enter your degree"
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Essay Prompt</label>
                <textarea
                  data-testid="compose-prompt-input"
                  value={formData.essay_prompt}
                  onChange={(e) => setFormData({ ...formData, essay_prompt: e.target.value })}
                  placeholder="What matters most to you, and why?"
                  required
                />
              </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div>
                    <h3>Step 2: Outline Helper (Optional)</h3>
                    <p>Add quick bullet points and get a draft outline.</p>
                  </div>
                  <button
                    type="button"
                    className="form-section-toggle"
                    onClick={() => setShowOutlineAssist((prev) => !prev)}
                    aria-expanded={showOutlineAssist}
                  >
                    {showOutlineAssist ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showOutlineAssist && (
                  <div className="form-group">
                    <label>Bullet Points</label>
                    <textarea
                      data-testid="compose-skeleton-input"
                      value={assistInput}
                      onChange={(e) => setAssistInput(e.target.value)}
                      placeholder="- Key moment&#10;- Main challenge&#10;- Why this program"
                      rows="5"
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        data-testid="compose-outline-assist-button"
                        onClick={handleGenerateOutline}
                        disabled={assistLoading}
                      >
                        {assistLoading ? 'Generating outline...' : 'Generate Outline'}
                      </button>
                      {assistResult?.outline_markdown && (
                        <button
                          type="button"
                          data-testid="compose-apply-outline-button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              essay_content: assistResult.outline_markdown
                            })
                          }
                        >
                          Use Outline in Draft
                        </button>
                      )}
                    </div>
                    {assistError && <small>{assistError}</small>}
                    {assistResult?.outline_markdown && (
                      <div className="essay-outline-assist-result" data-testid="compose-outline-output">
                        <small>{assistResult.caution}</small>
                        <pre>{assistResult.outline_markdown}</pre>
                        {Array.isArray(assistResult.next_steps) && assistResult.next_steps.length > 0 && (
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
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div>
                    <h3>Step 3: Draft</h3>
                    <p>Write or paste your essay content, then submit.</p>
                  </div>
                </div>
              <div className="form-group">
                <label>Essay Content</label>
                <textarea
                  data-testid="compose-content-input"
                  value={formData.essay_content}
                  onChange={(e) => setFormData({ ...formData, essay_content: e.target.value })}
                  placeholder="Your essay here..."
                  rows="10"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" data-testid="compose-submit-button" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Essay'}
                </button>
                <button
                  type="button"
                  data-testid="compose-cancel-button"
                  onClick={() => {
                    setShowForm(false);
                    setActiveNav('home');
                  }}
                >
                  Cancel
                </button>
              </div>
              </div>
            </form>
          </div> 
  );
}

export default EssayFormView;
