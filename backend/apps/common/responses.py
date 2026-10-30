"""Helpers that give every endpoint the same response envelope."""

from rest_framework import status
from rest_framework.response import Response

from .pagination import StandardPagination


def success_response(data=None, message="", status_code=status.HTTP_200_OK):
    return Response(
        {"success": True, "message": message, "data": data},
        status=status_code,
    )


def paginated_response(request, queryset, serializer_class, message=""):
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    data = serializer_class(page, many=True, context={"request": request}).data
    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
            "pagination": {
                "count": paginator.page.paginator.count,
                "page": paginator.page.number,
                "page_size": paginator.get_page_size(request),
                "total_pages": paginator.page.paginator.num_pages,
            },
        }
    )


def parse_bool(value):
    """'true'/'false' query-param -> bool, anything else -> None."""
    if value is None:
        return None
    value = str(value).strip().lower()
    if value in {"true", "1"}:
        return True
    if value in {"false", "0"}:
        return False
    return None
