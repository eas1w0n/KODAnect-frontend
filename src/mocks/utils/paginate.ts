export interface CursorInfo {
  seq: number;
  date: string;
}

export interface PaginationResult<T> {
  content: T[];
  hasNext: boolean;
  nextCursor: { cursor: number; date: string } | null;
  totalCount: number;
}

// 페이지네이션
export function createCursorPagination<T>(
  items: T[],
  size: number,
  cursor: CursorInfo | undefined,
  getSeq: (item: T) => number,
  getDate: (item: T) => string,
): PaginationResult<T> {
  let start = 0; // 첫 페이지

  // 커서를 찾으면 idx+1 부터, 없으면 빈 결과 반환
  if (cursor) {
    const idx = items.findIndex(
      (item) => getSeq(item) === cursor.seq && getDate(item) === cursor.date,
    );
    start = idx >= 0 ? idx + 1 : items.length;
  }

  // 데이터 슬라이싱 및 다음 커서 계산
  const content = items.slice(start, start + size);
  const hasNext = start + size < items.length;
  const last = content.at(-1); // 현재 페이지의 마지막 아이템
  const nextCursor =
    hasNext && last
      ? {
          cursor: getSeq(last),
          date: getDate(last),
        }
      : null;

  return { content, hasNext, nextCursor, totalCount: items.length };
}

// 정렬 유틸
export const createDateDescSorter =
  <T>(getDate: (item: T) => string, getSeq: (item: T) => number) =>
  (a: T, b: T) => {
    const ta = new Date(getDate(a)).getTime();
    const tb = new Date(getDate(b)).getTime();
    if (ta !== tb) return tb - ta; // 날짜 내림차순
    return getSeq(b) - getSeq(a); // 같은 날짜면 seq 내림차순
  };
