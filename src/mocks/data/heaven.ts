import { fakerKO as faker } from "@faker-js/faker";
import type { ApiResponse } from "@/shared/api/common/types";
import type {
  HeavenLetterDetail,
  HeavenLetterDetailResponse,
} from "@/shared/api/letter-view/letter/types";
import type { Comment, CommentPagination } from "@/shared/api/recipient-view/comment/types";

// 시드 고정
faker.seed(42);

/** 전역 데이터: HeavenLetterDetail[] 만 사용 */
const TOTAL = 300;

/** 댓글 풀 + 슬라이스 */
const commentsByLetter = new Map<number, Comment[]>();

function LetterCommentPool(letterSeq: number, poolSize = 10): Comment[] {
  if (!commentsByLetter.has(letterSeq)) {
    const pool: Comment[] = Array.from({ length: poolSize }, () => ({
      commentSeq: faker.number.int({ min: 1, max: 1000000 }),
      letterSeq, // 편지 기준
      commentWriter: faker.person.fullName(),
      contents: faker.lorem.sentences({ min: 1, max: 3 }),
      writeTime: faker.date.past().toISOString(),
    })).sort((a, b) => new Date(b.writeTime!).getTime() - new Date(a.writeTime!).getTime());
    commentsByLetter.set(letterSeq, pool);
  }
  return commentsByLetter.get(letterSeq)!;
}

function sliceLetterComments(letterSeq: number, size = 3, cursorSeq?: number): CommentPagination {
  const pool = LetterCommentPool(letterSeq);

  let start = 0;
  if (cursorSeq) {
    const idx = pool.findIndex((c) => c.commentSeq === cursorSeq);
    start = idx >= 0 ? idx + 1 : pool.length;
  }

  const page = pool.slice(start, start + size);
  const hasNext = start + size < pool.length;
  const nextCursor = hasNext && page.length ? page.at(-1)!.commentSeq : 0;

  return {
    content: page,
    comments: page,
    commentHasNext: hasNext,
    commentNextCursor: nextCursor,
  };
}

/** 커서 기반 */
export function commentPagination(
  letterSeq: number,
  size = 3,
  cursorSeq?: number,
): CommentPagination {
  return sliceLetterComments(letterSeq, size, cursorSeq);
}

/* ------------------------- 편지 상세 생성 ------------------------- */
function heavenLetterDetail(seq?: number): HeavenLetterDetail {
  const writeDt = faker.date.past();
  const anonymityFlag = faker.helpers.arrayElement<"Y" | "N">(["Y", "N"]);
  const donorName = faker.person.fullName();
  const writerName = anonymityFlag === "Y" ? "익명" : faker.person.fullName();

  const letterSeq = seq ?? faker.number.int({ min: 1, max: 1000000 });
  const donateSeq = faker.number.int({ min: 1, max: 10000 });

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

    // 초기 댓글 페이지 (cursor 없음)
    cursorCommentPaginationResponse: commentPagination(letterSeq, 3),
  };
}

/* ---------- 목록/정렬/커서 페이징 (기존 유지) ---------- */
/** 한 번만 생성해 재사용 */
export const allHeavenLetters: HeavenLetterDetail[] = Array.from({ length: TOTAL }, () =>
  heavenLetterDetail(),
);

/** writeTime 내림차순 → 같은 날짜면 letterSeq 내림차순 */
const byWriteDesc = (a: HeavenLetterDetail, b: HeavenLetterDetail) => {
  const ta = new Date(a.writeTime).getTime();
  const tb = new Date(b.writeTime).getTime();
  if (ta !== tb) return tb - ta;
  return b.letterSeq - a.letterSeq;
};

allHeavenLetters.sort(byWriteDesc);

/** 커서 페이징 (편지 목록용) */
function sliceByCursor(
  size: number,
  cursor?: { seq: number; date: string }, // date는 YYYY-MM-DD
) {
  let start = 0;
  if (cursor) {
    const idx = allHeavenLetters.findIndex(
      (d) => d.letterSeq === cursor.seq && d.writeTime.slice(0, 10) === cursor.date,
    );
    start = idx >= 0 ? idx + 1 : allHeavenLetters.length;
  }

  const window = allHeavenLetters.slice(start, start + size);
  const hasNext = start + size < allHeavenLetters.length;
  const last = window.at(-1);
  const nextCursor =
    hasNext && last ? { cursor: last.letterSeq, date: last.writeTime.slice(0, 10) } : null;

  return { window, hasNext, nextCursor, totalCount: allHeavenLetters.length };
}

/** 목록 응답: LetterCardData[] 로 바로 내려줌 */
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

  const items = window.map((d) => ({
    letterSeq: d.letterSeq,
    donateSeq: d.donateSeq,
    donorName: d.donorName,
    letterWriter: d.letterWriter,
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

/** 상세: HeavenLetterDetail 그대로 사용 */
const DETAIL_CACHE = new Map<number, HeavenLetterDetail>();

export function getHeavenLetterDetail(letterSeq: number): HeavenLetterDetail {
  if (DETAIL_CACHE.has(letterSeq)) return DETAIL_CACHE.get(letterSeq)!;

  // 목록에서 찾고, 없으면 새로 생성
  let found = allHeavenLetters.find((d) => d.letterSeq === letterSeq);
  if (!found) {
    found = heavenLetterDetail(letterSeq);
    allHeavenLetters.push(found);
    allHeavenLetters.sort(byWriteDesc);
  }

  DETAIL_CACHE.set(letterSeq, found);
  return found;
}

export function heavenLetterDetailResponse(
  letterSeq: number,
  opts?: { commentSize?: number; commentCursor?: number },
): HeavenLetterDetailResponse {
  const base = getHeavenLetterDetail(letterSeq); // 캐시된 상세 가져오기

  const size = opts?.commentSize ?? 3;
  const cursor = opts?.commentCursor;

  // 댓글 페이지네이션은 항상 새로 계산해서 내려줌
  const withComments: HeavenLetterDetail = {
    ...base,
    cursorCommentPaginationResponse: commentPagination(letterSeq, size, cursor),
  };

  return {
    success: true,
    code: 200,
    message: "하늘나라 편지 상세 조회 성공",
    data: withComments,
  };
}
