import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _first_message(data):
    """Pull a single human readable message out of DRF's error structure."""
    if isinstance(data, str):
        return data
    if isinstance(data, (list, tuple)):
        return _first_message(data[0]) if data else ""
    if isinstance(data, dict):
        if "detail" in data:
            return _first_message(data["detail"])
        for key, value in data.items():
            message = _first_message(value)
            if not message:
                continue
            if key == "non_field_errors":
                return message
            return f"{key.replace('_', ' ').capitalize()}: {message}"
    return ""


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None and isinstance(exc, IntegrityError):
        logger.warning("Integrity error: %s", exc)
        return Response(
            {
                "success": False,
                "status_code": 409,
                "message": "This change conflicts with existing data.",
                "errors": {"detail": "This change conflicts with existing data."},
            },
            status=status.HTTP_409_CONFLICT,
        )

    if response is not None:
        errors = response.data
        response.data = {
            "success": False,
            "status_code": response.status_code,
            "message": _first_message(errors) or "Request failed.",
            "errors": errors,
        }
        return response

    logger.exception("Unhandled exception", exc_info=exc)
    return Response(
        {
            "success": False,
            "status_code": 500,
            "message": "Internal server error.",
            "errors": {"detail": "Internal server error."},
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
