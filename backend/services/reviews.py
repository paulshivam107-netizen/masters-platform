import re

from models import Essay


def generate_mock_review(essay: Essay) -> tuple[str, float]:
    """Generate a realistic mock AI review for development/testing."""
    word_count = len(essay.essay_content.split())

    if word_count < 100:
        score = 4.5
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Developing (4.5/10)**

Your essay for {essay.school_name}'s {essay.program_type} program shows promise but needs significant development.

**Strengths:**
- You've made a start on addressing the prompt
- Basic structure is present

**Areas for Improvement:**
1. **Length & Depth**: At {word_count} words, this essay is too brief. Most competitive essays are 500-650 words.
2. **Storytelling**: Add concrete anecdotes and experiences.
3. **Structure**: Consider reorganizing with a clear narrative arc.
4. **Specificity**: Replace general statements with specific details.

**Recommendations:**
- Expand to at least 500 words
- Add 2-3 specific examples from your experience
- Show, don't tell - use vivid descriptions

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""
    elif word_count < 300:
        score = 6.5
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Good Foundation (6.5/10)**

Your {essay.program_type} application essay for {essay.school_name} demonstrates good potential.

**Strengths:**
- Adequate length ({word_count} words)
- Clear attempt to address the prompt
- Some personal experiences included

**Areas for Improvement:**
1. **Opening Impact**: Your introduction needs a stronger hook.
2. **Depth of Reflection**: Dig deeper into the "why" and "so what".
3. **School-Specific Content**: Add more specific references to {essay.school_name}.
4. **Transitions**: Strengthen connections between sections.

**Score: 6.5/10** - Competitive foundation, needs refinement.

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""
    else:
        score = 8.0
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Strong & Competitive (8.0/10)**

Excellent work on your {essay.program_type} essay for {essay.school_name}!

**Major Strengths:**
- Compelling narrative with clear arc
- Strong opening that engages the reader
- Specific examples with concrete details
- Appropriate length: {word_count} words
- Authentic personal voice

**Minor Refinements:**
1. Consider expanding one key section by 50-75 words
2. Weave in one more {essay.school_name}-specific detail
3. Polish transitions between paragraphs

**Competitiveness: HIGH** - This would be competitive at top programs.

**Score: 8.0/10** - You're in great shape!

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""

    return review, score


def extract_score(review_text: str) -> float:
    """Extract score from review text."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", review_text)
    if match:
        return float(match.group(1))
    return 0.0


def generate_mock_outline(
    *,
    school_name: str,
    program_type: str,
    essay_prompt: str,
    skeleton_points: list[str],
    target_word_count: int
) -> tuple[str, list[str]]:
    """Generate a deterministic mock outline scaffold from student-provided bullets."""
    cleaned_points = [point.strip() for point in skeleton_points if point and point.strip()]
    top_points = cleaned_points[:5]
    if len(top_points) < 3:
        top_points += ["Add a specific anecdote", "Link to school fit", "Close with future impact"]
    section_word_budget = max(70, int(target_word_count / 5))
    intro_budget = max(80, int(target_word_count * 0.18))
    conclusion_budget = max(80, int(target_word_count * 0.15))

    outline_lines = [
        "## Draft Outline (Mock Assist Mode)",
        f"- **School / Program:** {school_name} ({program_type})",
        f"- **Target Length:** ~{target_word_count} words",
        f"- **Prompt Focus:** {essay_prompt}",
        "",
        f"### 1) Hook + Context (~{intro_budget} words)",
        f"- Open with a vivid moment tied to: **{top_points[0]}**",
        "- Establish why this moment matters now.",
        "",
        f"### 2) Core Experience #1 (~{section_word_budget} words)",
        f"- Build the story around: **{top_points[1]}**",
        "- Show action, challenge, and measurable result.",
        "",
        f"### 3) Core Experience #2 (~{section_word_budget} words)",
        f"- Expand with: **{top_points[2]}**",
        "- Add reflection: what changed in your perspective?",
        "",
        f"### 4) School Fit + Why Now (~{section_word_budget} words)",
        f"- Connect your goals to {school_name} offerings (courses, clubs, culture).",
        f"- Use this angle: **{top_points[3] if len(top_points) > 3 else 'specific program fit and timing'}**",
        "",
        f"### 5) Forward-Looking Close (~{conclusion_budget} words)",
        f"- Reinforce long-term intent with: **{top_points[4] if len(top_points) > 4 else 'clear post-program impact'}**",
        "- End with a concrete contribution statement.",
    ]

    next_steps = [
        "Turn each section bullet into 2-4 concrete sentences before polishing tone.",
        "Include at least two measurable outcomes (numbers, scale, or scope).",
        "Reference 1-2 specific program elements to strengthen school fit.",
    ]

    return "\n".join(outline_lines), next_steps
