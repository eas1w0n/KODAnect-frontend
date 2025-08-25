import { fakerKO as faker } from "@faker-js/faker";
import type { ApiResponse } from "@/shared/api/common/types";
import type { CommentPagination } from "@/shared/api/recipient-view/comment/types";
import type {
  HeavenLetterDetail,
  HeavenLetterDetailResponse,
} from "@/shared/api/letter-view/letter/types";

//시드 고정
faker.seed(42);

/** 전역 데이터: HeavenLetterDetail[] 만 사용 (새 타입 없음) */
const TOTAL = 300;

function makeCommentPaginationForLetter(size = 3): CommentPagination {
  const comments = Array.from({ length: size }, () => ({
    commentSeq: faker.number.int({ min: 1, max: 10000 }),
    donateSeq: 0,
    commentWriter: faker.person.fullName(),
    contents: faker.lorem.sentences({ min: 1, max: 3 }),
    writeTime: faker.date.past().toISOString(),
  }));

  comments.sort((a, b) => new Date(b.writeTime).getTime() - new Date(a.writeTime).getTime());

  return {
    content: comments,
    comments,
    commentNextCursor: 0,
    commentHasNext: false,
  };
}

function makeHeavenLetterDetail(seq?: number): HeavenLetterDetail {
  const writeDt = faker.date.past();
  const anonymityFlag = faker.helpers.arrayElement<"Y" | "N">(["Y", "N"]);
  const donorName = faker.person.fullName();
  const writerName = anonymityFlag === "Y" ? "익명" : faker.person.fullName();

  const letterSeq = seq ?? faker.number.int({ min: 1, max: 1_000_000 });
  const donateSeq = faker.number.int({ min: 1, max: 10_000 });

  return {
    letterSeq,
    donateSeq,
    donorName,
    letterTitle: faker.lorem.words({ min: 2, max: 6 }),
    letterWriter: writerName,
    anonymityFlag,
    readCount: faker.number.int({ min: 0, max: 100 }),
    letterContents: `
      <p>${faker.lorem.paragraphs({ min: 2, max: 5 }).replace(/\n/g, "</p><p>")}</p>
    `,
    // 30% 확률로 이미지 붙이기
    fileName:
      Math.random() < 0.3
        ? faker.image.urlLoremFlickr({ width: 640, height: 480, category: "nature" })
        : "",
    orgFileName: Math.random() < 0.2 ? `원본_${letterSeq}.jpg` : "",
    writeTime: writeDt.toISOString().slice(0, 10),
    cursorCommentPaginationResponse: makeCommentPaginationForLetter(3),
  };
}

/** 한 번만 생성해 재사용 */
export const ALL_HEAVEN_LETTERS: HeavenLetterDetail[] = Array.from({ length: TOTAL }, () =>
  makeHeavenLetterDetail(),
);

/** 정렬: writeTime 내림차순 → 같은 날짜면 letterSeq 내림차순 */
const byWriteDesc = (a: HeavenLetterDetail, b: HeavenLetterDetail) => {
  const ta = new Date(a.writeTime).getTime();
  const tb = new Date(b.writeTime).getTime();
  if (ta !== tb) return tb - ta;
  return b.letterSeq - a.letterSeq;
};

ALL_HEAVEN_LETTERS.sort(byWriteDesc);

/** 커서 페이징 (Memorial.ts와 동일 규칙: date(YYYY-MM-DD) + seq) */
function sliceByCursor(
  size: number,
  cursor?: { seq: number; date: string }, // date는 YYYY-MM-DD
) {
  let start = 0;
  if (cursor) {
    const idx = ALL_HEAVEN_LETTERS.findIndex(
      (d) => d.letterSeq === cursor.seq && d.writeTime.slice(0, 10) === cursor.date,
    );
    start = idx >= 0 ? idx + 1 : ALL_HEAVEN_LETTERS.length;
  }

  const window = ALL_HEAVEN_LETTERS.slice(start, start + size);
  const hasNext = start + size < ALL_HEAVEN_LETTERS.length;
  const last = window.at(-1);
  const nextCursor =
    hasNext && last ? { cursor: last.letterSeq, date: last.writeTime.slice(0, 10) } : null;

  return { window, hasNext, nextCursor, totalCount: ALL_HEAVEN_LETTERS.length };
}

/** 목록 응답: LetterCardData[] 로 바로 내려줌 (추가 타입 없음) */
export function heavenLetterListResponse(params?: {
  size?: number;
  cursorSeq?: number;
  cursorDate?: string; // YYYY-MM-DD
}): ApiResponse<{
  content: Array<{
    letterSeq: number;
    donateSeq: number;
    donorName: string;
    letterWriter: string;
    letterTitle: string;
    readCount: number;
    writeTime: string; // YYYY-MM-DD
  }>;
  hasNext: boolean;
  nextCursor: { cursor: number; date: string } | null;
  totalCount: number;
}> {
  const size = params?.size ?? 30;
  const cursor =
    params?.cursorSeq && params?.cursorDate
      ? { seq: params.cursorSeq, date: params.cursorDate }
      : undefined;

  const { window, hasNext, nextCursor, totalCount } = sliceByCursor(size, cursor);

  // 목록은 원시 필드 그대로 내려줌 (UI 매퍼에서 LetterCardData로 변환)
  const items = window.map((d) => ({
    letterSeq: d.letterSeq,
    donateSeq: d.donateSeq,
    donorName: d.donorName,
    letterWriter: d.letterWriter, // ← "추모자" 표시에 필요
    letterTitle: d.letterTitle,
    readCount: d.readCount,
    writeTime: d.writeTime.slice(0, 10), // YYYY-MM-DD
  }));

  return {
    success: true,
    code: 200,
    message: "하늘나라 편지 목록 조회 성공",
    data: { content: items, hasNext, nextCursor, totalCount },
  };
}

/** 상세: HeavenLetterDetail 그대로 사용 (캐시 포함) */
const DETAIL_CACHE = new Map<number, HeavenLetterDetail>();

export function getHeavenLetterDetail(letterSeq: number): HeavenLetterDetail {
  if (DETAIL_CACHE.has(letterSeq)) return DETAIL_CACHE.get(letterSeq)!;

  // 목록에서 찾고, 없으면 새로 생성해서 합류
  let found = ALL_HEAVEN_LETTERS.find((d) => d.letterSeq === letterSeq);
  if (!found) {
    found = makeHeavenLetterDetail(letterSeq);
    ALL_HEAVEN_LETTERS.push(found);
    ALL_HEAVEN_LETTERS.sort(byWriteDesc);
  }

  DETAIL_CACHE.set(letterSeq, found);
  return found;
}

export function heavenLetterDetailResponse(letterSeq: number): HeavenLetterDetailResponse {
  return {
    success: true,
    code: 200,
    message: "하늘나라 편지 상세 조회 성공",
    data: getHeavenLetterDetail(letterSeq),
  };
}
