from django.db.utils import InterfaceError, OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, (InterfaceError, OperationalError, ProgrammingError)):
        return Response(
            {
                "status": "error",
                "message": "Database is not ready. Check DATABASE_URL and run migrations.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "status": "error",
            "message": "Server error. Check backend logs.",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
