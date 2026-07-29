import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger(__name__)


class ProblemError(BaseModel):
    field: str
    message: str
    code: str


class ProblemDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    code: str
    request_id: str
    errors: list[ProblemError] | None = None


class ApiProblem(Exception):
    def __init__(
        self,
        *,
        status: int,
        title: str,
        detail: str,
        code: str,
        type: str = "about:blank",
    ) -> None:
        self.status = status
        self.title = title
        self.detail = detail
        self.code = code
        self.type = type


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unavailable")


def _response(problem: ProblemDetail) -> JSONResponse:
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(exclude_none=True),
        media_type="application/problem+json",
    )


def _problem(
    request: Request,
    *,
    status: int,
    title: str,
    detail: str,
    code: str,
    type: str = "about:blank",
    errors: list[ProblemError] | None = None,
) -> ProblemDetail:
    return ProblemDetail(
        type=type,
        title=title,
        status=status,
        detail=detail,
        instance=request.url.path,
        code=code,
        request_id=_request_id(request),
        errors=errors,
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiProblem)
    async def handle_api_problem(request: Request, exc: ApiProblem) -> JSONResponse:
        return _response(
            _problem(
                request,
                status=exc.status,
                title=exc.title,
                detail=exc.detail,
                code=exc.code,
                type=exc.type,
            )
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            ProblemError(
                field=".".join(str(part) for part in error["loc"]),
                message=error["msg"],
                code=error["type"],
            )
            for error in exc.errors()
        ]
        return _response(
            _problem(
                request,
                status=422,
                title="Request validation failed",
                detail="One or more request values are invalid.",
                code="request_validation_failed",
                errors=errors,
            )
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "The request failed."
        return _response(
            _problem(
                request,
                status=exc.status_code,
                title=_http_title(exc.status_code),
                detail=detail,
                code=f"http_{exc.status_code}",
            )
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error request_id=%s", _request_id(request))
        return _response(
            _problem(
                request,
                status=500,
                title="Internal server error",
                detail="An unexpected error occurred.",
                code="internal_server_error",
            )
        )


def _http_title(status_code: int) -> str:
    titles: dict[int, str] = {
        400: "Bad request",
        401: "Authentication required",
        403: "Forbidden",
        404: "Resource not found",
        405: "Method not allowed",
        409: "Conflict",
        429: "Too many requests",
        503: "Service unavailable",
    }
    return titles.get(status_code, "Request failed")
