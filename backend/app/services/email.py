import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

_SEND_FOR_STATUSES = {'interview', 'offer', 'rejected', 'applied', 'ghosted'}

_SUBJECTS = {
    'interview': '🎉 Interview invitation — {role}',
    'offer':     '🎉 Job offer received — {role}',
    'rejected':  'Application update — {role}',
    'applied':   'Application marked as applied — {role}',
    'ghosted':   'Application update — {role}',
}

_BODIES = {
    'interview': 'Great news! Your application for <strong>{role}</strong> has moved to the <strong>interview</strong> stage.',
    'offer':     'Congratulations! You received a job offer for <strong>{role}</strong>.',
    'rejected':  'Your application for <strong>{role}</strong> was marked as rejected. Keep going — the right role is out there.',
    'applied':   'Your application for <strong>{role}</strong> has been marked as applied. Good luck!',
    'ghosted':   'Your application for <strong>{role}</strong> has been marked as ghosted.',
}


async def send_status_email(user_email: str, status: str, job_title: str | None, company: str | None) -> None:
    settings = get_settings()
    if not settings.resend_api_key or status not in _SEND_FOR_STATUSES:
        return

    role = ' @ '.join(filter(None, [job_title, company])) or 'Unknown Role'
    subject = _SUBJECTS[status].format(role=role)
    body_line = _BODIES[status].format(role=role)

    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <div style="background:linear-gradient(135deg,#5566f8,#7c3aed);padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">HireLens</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">AI-powered career coaching</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none">
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px">{body_line}</p>
        <a href="https://hire-lens-topaz.vercel.app/applications"
           style="display:inline-block;background:#5566f8;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
          View Applications
        </a>
      </div>
      <div style="padding:16px 32px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">HireLens · AI-powered recruitment screening</p>
      </div>
    </div>
    """

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                'https://api.resend.com/emails',
                headers={'Authorization': f'Bearer {settings.resend_api_key}'},
                json={
                    'from': f'HireLens <{settings.resend_from_email}>',
                    'to': [user_email],
                    'subject': subject,
                    'html': html,
                },
            )
            if resp.status_code >= 400:
                logger.warning("Resend API error %s: %s", resp.status_code, resp.text)
            else:
                logger.info("Status email sent to %s for status=%s", user_email, status)
    except Exception as e:
        logger.warning("Failed to send status email: %s", e)
