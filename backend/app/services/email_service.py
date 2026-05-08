import resend
from app.core.config import settings

resend.api_key = settings.resend_api_key

STATUS_SUBJECTS = {
    "interview": "Interview Invitation — {company}",
    "offer": "Job Offer Received — {company}",
    "rejected": "Application Update — {company}",
}

STATUS_BODIES = {
    "interview": (
        "Great news! You've been invited to interview at {company} for the {job_title} role.\n\n"
        "Log in to HireLens to prepare with AI-generated interview questions."
    ),
    "offer": (
        "Congratulations! You've received an offer from {company} for {job_title}.\n\n"
        "Review your offer details in HireLens."
    ),
    "rejected": (
        "Your application for {job_title} at {company} has been updated to 'rejected'.\n\n"
        "Don't be discouraged — keep track of your job search in HireLens."
    ),
}


def send_status_notification(to_email: str, status: str, job_title: str, company: str) -> None:
    """Send email notification when application status changes to interview/offer/rejected."""
    if status not in STATUS_SUBJECTS or not settings.resend_api_key:
        return
    subject = STATUS_SUBJECTS[status].format(company=company)
    body = STATUS_BODIES[status].format(company=company, job_title=job_title)
    try:
        resend.Emails.send({
            "from": "HireLens <notifications@hirelens.app>",
            "to": [to_email],
            "subject": subject,
            "text": body,
        })
    except Exception:
        pass  # Email delivery is best-effort; don't fail the API call
