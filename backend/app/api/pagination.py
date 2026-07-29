from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field


DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class PageParams(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=MAX_PAGE_SIZE)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def get_page_params(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    items: list[ItemT]
    page: int
    page_size: int
    total: int
    pages: int

    @classmethod
    def create(cls, *, items: list[ItemT], params: PageParams, total: int) -> "Page[ItemT]":
        pages = (total + params.page_size - 1) // params.page_size if total else 0
        return cls(
            items=items,
            page=params.page,
            page_size=params.page_size,
            total=total,
            pages=pages,
        )
