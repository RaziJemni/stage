from typing import Annotated

from fastapi import Depends
from fastapi.testclient import TestClient

from app.api.pagination import Page, PageParams, get_page_params
from app.main import create_app


def create_test_client() -> TestClient:
    app = create_app()

    @app.get("/api/v1/test-pagination", include_in_schema=False)
    def test_pagination(
        params: Annotated[PageParams, Depends(get_page_params)],
    ) -> Page[str]:
        return Page[str].create(items=["one"], params=params, total=21)

    @app.get("/api/v1/test-error", include_in_schema=False)
    def test_error() -> None:
        raise RuntimeError("sensitive internal detail")

    return TestClient(app, raise_server_exceptions=False)


def test_unknown_route_uses_problem_details() -> None:
    response = create_test_client().get("/api/v1/missing")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.headers["x-request-id"] == response.json()["request_id"]
    assert response.json()["code"] == "http_404"
    assert response.json()["instance"] == "/api/v1/missing"


def test_pagination_defaults_and_metadata() -> None:
    response = create_test_client().get("/api/v1/test-pagination")

    assert response.status_code == 200
    assert response.json() == {
        "items": ["one"],
        "page": 1,
        "page_size": 20,
        "total": 21,
        "pages": 2,
    }


def test_invalid_pagination_uses_stable_validation_error() -> None:
    response = create_test_client().get("/api/v1/test-pagination?page_size=101")

    assert response.status_code == 422
    assert response.json()["code"] == "request_validation_failed"
    assert response.json()["errors"][0]["field"] == "query.page_size"


def test_openapi_uses_versioned_contract_path() -> None:
    client = create_test_client()

    assert client.get("/api/v1/openapi.json").status_code == 200
    assert client.get("/openapi.json").status_code == 404


def test_unexpected_error_does_not_leak_internal_details() -> None:
    response = create_test_client().get("/api/v1/test-error")

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "internal_server_error"
    assert "sensitive internal detail" not in response.text
