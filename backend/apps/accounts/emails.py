import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template import Context, Template
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
    <h2>{{ heading }}</h2>
    <p>Hi {{ full_name }},</p>
    <p>{{ intro }}</p>
    <p>
      <a href="{{ link }}"
         style="background:#1e3a8a;color:#ffffff;padding:12px 24px;
                text-decoration:none;border-radius:6px;display:inline-block;">
        {{ button }}
      </a>
    </p>
    <p style="color:#475569;">This link expires in {{ expiry_days }} days.</p>
  </body>
</html>
"""


def build_set_password_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL}/set-password?uid={uid}&token={token}"


def _send(user, subject, heading, intro, button):
    link = build_set_password_link(user)
    expiry_days = settings.PASSWORD_RESET_TIMEOUT // 86400

    html_body = Template(HTML_TEMPLATE).render(
        Context(
            {
                "heading": heading,
                "full_name": user.full_name,
                "intro": intro,
                "link": link,
                "button": button,
                "expiry_days": expiry_days,
            }
        )
    )
    text_body = (
        f"Hi {user.full_name},\n\n{intro}\n{link}\n\n"
        f"This link expires in {expiry_days} days."
    )

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)


def send_set_password_email(user):
    _send(
        user,
        subject="Set your password - Leave Portal",
        heading="Welcome to Leave Portal",
        intro="An account has been created for you. Set your password to activate it:",
        button="Set Password",
    )


def send_reset_password_email(user):
    _send(
        user,
        subject="Reset your password - Leave Portal",
        heading="Reset your password",
        intro="We received a request to reset your password. Choose a new one here:",
        button="Reset Password",
    )
