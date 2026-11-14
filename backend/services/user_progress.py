"""How far each account has got, read from rows the app already keeps (no events, no new tables).

The furthest milestone reached answers "where did this person stop". Milestones are ordered; an account
that started an interview without building résumé questions (the taster) simply skips that one.
"""
from sqlalchemy import case, func

from models import InterviewOperation, InterviewSession, RefreshToken, ResumeQuestionSet

STEPS = ("signed_up", "verified", "resume_questions", "interview_started", "interview_answered", "interview_completed")


def user_progress(db, users):
    """users: rows with id, email_verified and created_at. Returns {user_id: progress}.

    Five grouped queries however many users there are. A refresh-token row is written at sign-in and each
    time a saved session is renewed, so its dates are the best record of when someone came back; the
    verification click has no timestamp of its own, so that step carries no date.
    """
    ids = [user.id for user in users]
    if not ids:
        return {}
    seen = {r.user_id: r for r in db.query(
        RefreshToken.user_id, func.max(RefreshToken.created_at).label("last_seen"),
        func.count(func.distinct(func.date(RefreshToken.created_at))).label("days"),
    ).filter(RefreshToken.user_id.in_(ids)).group_by(RefreshToken.user_id)}
    resume = {r.user_id: r for r in db.query(
        ResumeQuestionSet.user_id,
        func.sum(case((ResumeQuestionSet.status == "completed", 1), else_=0)).label("ok"),
        func.sum(case((ResumeQuestionSet.status == "failed", 1), else_=0)).label("failed"),
        func.min(case((ResumeQuestionSet.status == "completed", ResumeQuestionSet.created_at))).label("first_ok"),
    ).filter(ResumeQuestionSet.user_id.in_(ids)).group_by(ResumeQuestionSet.user_id)}
    sessions = {r.user_id: r for r in db.query(
        InterviewSession.user_id, func.count(InterviewSession.id).label("started"),
        func.min(InterviewSession.created_at).label("first_started"),
        func.sum(case((InterviewSession.status == "completed", 1), else_=0)).label("completed"),
        func.min(case((InterviewSession.status == "completed", InterviewSession.updated_at))).label("first_completed"),
    ).filter(InterviewSession.user_id.in_(ids)).group_by(InterviewSession.user_id)}
    answers = {r.user_id: r for r in db.query(
        InterviewSession.user_id, func.count(InterviewOperation.id).label("given"),
        func.min(InterviewOperation.created_at).label("first_answer"),
    ).join(InterviewSession, InterviewSession.id == InterviewOperation.session_id)
        .filter(InterviewSession.user_id.in_(ids), InterviewOperation.kind == "answer", InterviewOperation.status == "succeeded")
        .group_by(InterviewSession.user_id)}

    result = {}
    for user in users:
        seen_row, resume_row, session_row, answer_row = (table.get(user.id) for table in (seen, resume, sessions, answers))
        reached = [("signed_up", user.created_at)]  # in STEPS order, so the last entry is the furthest
        if user.email_verified:
            reached.append(("verified", None))
        if resume_row and resume_row.ok:
            reached.append(("resume_questions", resume_row.first_ok))
        if session_row:
            reached.append(("interview_started", session_row.first_started))
        if answer_row:
            reached.append(("interview_answered", answer_row.first_answer))
        if session_row and session_row.completed:
            reached.append(("interview_completed", session_row.first_completed))
        step, when = reached[-1]
        result[user.id] = {
            "furthest_step": step, "furthest_step_at": when,
            "last_seen_at": seen_row.last_seen if seen_row else None, "active_days": int(seen_row.days) if seen_row else 0,
            "resume_ok": int(resume_row.ok or 0) if resume_row else 0, "resume_failed": int(resume_row.failed or 0) if resume_row else 0,
            "interviews_started": int(session_row.started) if session_row else 0,
            "interviews_completed": int(session_row.completed or 0) if session_row else 0,
            "answers_given": int(answer_row.given) if answer_row else 0,
        }
    return result
