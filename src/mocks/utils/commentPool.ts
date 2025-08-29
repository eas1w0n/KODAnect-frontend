import { fakerKO as faker } from "@faker-js/faker";
import type { Comment, CommentPagination } from "@/shared/api/recipient-view/comment/types";

export class CommentPoolManager {
  private pools = new Map<string, Comment[]>();

  // 풀 생성 또는 가져오기
  getOrCreatePool(
    key: string,
    poolSize: number,
    keyField: "letterSeq" | "donateSeq",
    keyValue: number,
  ): Comment[] {
    if (!this.pools.has(key)) {
      const pool: Comment[] = Array.from({ length: poolSize }, () => ({
        commentSeq: faker.number.int({ min: 1, max: 1000000 }),
        [keyField]: keyValue, // 동적 속성 할당
        commentWriter: faker.person.fullName(),
        contents: faker.lorem.sentences({ min: 1, max: 3 }),
        writeTime: faker.date.past().toISOString(),
      })).sort((a, b) => new Date(b.writeTime!).getTime() - new Date(a.writeTime!).getTime()); // 최신순 정렬

      this.pools.set(key, pool);
    }
    return this.pools.get(key)!;
  }

  // 커서 기반으로 댓글 슬라이스
  sliceComments(key: string, size: number, cursorSeq?: number): CommentPagination {
    const pool = this.pools.get(key) || [];

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

  // 한 번에 풀 생성하고 슬라이스
  createAndSlice(
    key: string,
    poolSize: number,
    keyField: "letterSeq" | "donateSeq",
    keyValue: number,
    size: number,
    cursorSeq?: number,
  ): CommentPagination {
    this.getOrCreatePool(key, poolSize, keyField, keyValue);
    return this.sliceComments(key, size, cursorSeq);
  }
}

// 싱글톤 인스턴스 (모든 곳에서 같은 풀 공유)
export const commentPoolManager = new CommentPoolManager();
