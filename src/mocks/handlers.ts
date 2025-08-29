import { http, HttpResponse } from "msw";
import {
  donorListResponse,
  donorDetailResponse,
  makeCommentPagination,
  makeHeavenLetterPagination,
} from "@/mocks/data/Memorial";
import {
  heavenLetterDetailResponse,
  heavenLetterListResponse,
  commentPagination,
} from "@/mocks/data/heaven";

export const handlers = [
  // 기증자 목록 조회
  http.get("*/remembrance/search", ({ request }) => {
    const url = new URL(request.url);

    const size = Number(url.searchParams.get("size") ?? "30");
    const cursorSeq = url.searchParams.get("cursor");
    const cursorDate = url.searchParams.get("date");

    const body = donorListResponse({
      size,
      cursorSeq: cursorSeq ? Number(cursorSeq) : undefined,
      cursorDate: cursorDate ?? undefined,
    });

    return HttpResponse.json(body, { status: 200 });
  }),

  // 기증자 상세 조회
  http.get("*/remembrance/:donateSeq", ({ params }) => {
    const donateSeq = Number(params.donateSeq);
    const body = donorDetailResponse(donateSeq);
    return HttpResponse.json(body, { status: 200 });
  }),

  // 기증자 댓글 더보기
  http.get("*/remembrance/:donateSeq/comment", ({ request, params }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get("size")) || 3;
    const cursor = url.searchParams.get("cursor");
    const cursorSeq = cursor ? Number(cursor) : undefined;

    const donateSeq = Number(params.donateSeq);
    const data = makeCommentPagination(donateSeq, size, cursorSeq);

    return HttpResponse.json(
      { success: true, code: 200, message: "댓글 조회 성공", data },
      { status: 200 },
    );
  }),

  // 기증자 편지 더보기
  http.get("*/heavenLetters/:letterSeq/remembrance", ({ request, params }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get("size")) || 3;
    const cursor = url.searchParams.get("cursor");
    const cursorSeq = cursor ? Number(cursor) : undefined;
    const donateSeq = Number(params.letterSeq);

    const data = makeHeavenLetterPagination(donateSeq, size, cursorSeq);

    return HttpResponse.json(
      { success: true, code: 200, message: "편지 조회 성공", data },
      { status: 200 },
    );
  }),

  // 하늘나라 편지 목록 조회
  http.get("*/heavenLetters", ({ request }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get("size") ?? "30");
    const cursorSeq = url.searchParams.get("cursor");
    const cursorDate = url.searchParams.get("date"); // YYYY-MM-DD

    const body = heavenLetterListResponse({
      size,
      cursorSeq: cursorSeq ? Number(cursorSeq) : undefined,
      cursorDate: cursorDate ?? undefined,
    });

    return HttpResponse.json(body, { status: 200 });
  }),

  // 하늘나라 편지 상세 조회
  http.get("*/heavenLetters/:letterSeq", ({ params }) => {
    const letterSeq = Number(params.letterSeq);
    const body = heavenLetterDetailResponse(letterSeq);
    return HttpResponse.json(body, { status: 200 });
  }),

  // 하늘나라 편지 댓글 더보기
  http.get("*/heavenLetters/:letterSeq/comments", ({ request, params }) => {
    const url = new URL(request.url);
    const size = Number(url.searchParams.get("size")) || 3;
    const cursor = url.searchParams.get("commentCursor");
    const cursorSeq = cursor ? Number(cursor) : undefined;

    const letterSeq = Number(params.letterSeq);
    const data = commentPagination(letterSeq, size, cursorSeq);

    return HttpResponse.json(
      { success: true, code: 200, message: "댓글 조회 성공", data },
      { status: 200 },
    );
  }),
];
