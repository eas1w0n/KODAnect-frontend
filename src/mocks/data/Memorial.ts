import { fakerKO as faker } from "@faker-js/faker";
import type { DonorData, DonorListResponse } from "@/shared/types/remembrance/DonorData.types";
import type { ApiResponse } from "@/shared/api/common/types";

/** 시드 고정 */
faker.seed(42);

/** 기증자 목록 조회 데이터 */

// 1) 아이템 생성기
const makeDonor = (): DonorData => ({
  donateSeq: faker.number.int({ min: 1, max: 100000 }),
  donorName: faker.person.fullName(),
  genderFlag: faker.helpers.arrayElement(["M", "F"]),
  donateAge: faker.number.int({ min: 1, max: 100 }),
  donateDate: faker.date.past().toISOString().slice(0, 10), // YYYY-MM-DD
  commentCount: faker.number.int({ min: 0, max: 50 }),
  letterCount: faker.number.int({ min: 0, max: 50 }),
});

// 2) 전역 데이터셋 300개를 한 번만 생성
const TOTAL = 300;
export const ALL_DONORS: DonorData[] = Array.from({ length: TOTAL }, makeDonor);

// 3) 날짜 내림차순 → 같은 날짜면 donateSeq 내림차순
const byDateDesc = (a: DonorData, b: DonorData) => {
  const ta = new Date(a.donateDate).getTime();
  const tb = new Date(b.donateDate).getTime();
  if (ta !== tb) return tb - ta;
  return b.donateSeq - a.donateSeq;
};

// 4) 정렬 한 번만 적용
ALL_DONORS.sort(byDateDesc);

// 5) 커서 기반 페이지 추출
function slice(size: number, cursor?: { seq: number; date: string }) {
  let start = 0;

  if (cursor) {
    // cursor가 가리키는 아이템의 "다음"부터 시작
    const idx = ALL_DONORS.findIndex(
      (d) => d.donateSeq === cursor.seq && d.donateDate === cursor.date,
    );
    start = idx >= 0 ? idx + 1 : ALL_DONORS.length;
  }

  const content = ALL_DONORS.slice(start, start + size);
  const hasNext = start + size < ALL_DONORS.length;
  const last = content.at(-1);
  const nextCursor = hasNext && last ? { cursor: last.donateSeq, date: last.donateDate } : null;

  return { content, hasNext, nextCursor, totalCount: ALL_DONORS.length };
}

// 6) 응답 빌더
export function donorListResponse(params?: {
  size?: number;
  cursorSeq?: number;
  cursorDate?: string;
}): ApiResponse<DonorListResponse> {
  const size = params?.size ?? 30;
  const cursor =
    params?.cursorSeq && params?.cursorDate
      ? { seq: params.cursorSeq, date: params.cursorDate }
      : undefined;

  const { content, hasNext, nextCursor, totalCount } = slice(size, cursor);

  return {
    success: true,
    code: 200,
    message: "게시글 조회 성공",
    data: { content, hasNext, nextCursor, totalCount },
  };
}
