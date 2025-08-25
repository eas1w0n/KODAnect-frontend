import { http, HttpResponse } from "msw";
import { donorListResponse, donorDetailResponse } from "@/mocks/data/Memorial";

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
];
