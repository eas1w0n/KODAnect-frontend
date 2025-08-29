import { fakerKO as faker } from "@faker-js/faker";
import type { HeavenLetter, HeavenLetterPagination } from "@/shared/api/members-view/letter/types";

export class LetterPoolManager {
  private pools = new Map<string, HeavenLetter[]>();

  // 풀 생성 (donor 단위)
  getOrCreatePool(donateSeq: number, poolSize: number): HeavenLetter[] {
    const key = `donor-${donateSeq}`;
    if (!this.pools.has(key)) {
      const pool: HeavenLetter[] = Array.from({ length: poolSize }, () => ({
        letterSeq: faker.number.int({ min: 1, max: 1000000 }),
        donateSeq,
        letterTitle: faker.lorem.words(3),
        readCount: faker.number.int({ min: 0, max: 100 }),
        writeTime: faker.date.past().toISOString().slice(0, 10),
      })).sort((a, b) => new Date(b.writeTime).getTime() - new Date(a.writeTime).getTime());

      this.pools.set(key, pool);
    }
    return this.pools.get(key)!;
  }

  // 커서 기반 슬라이스
  sliceLetters(donateSeq: number, size: number, cursorSeq?: number): HeavenLetterPagination {
    const pool = this.pools.get(`donor-${donateSeq}`) ?? [];

    let start = 0;
    if (cursorSeq) {
      const idx = pool.findIndex((l) => l.letterSeq === cursorSeq);
      start = idx >= 0 ? idx + 1 : pool.length;
    }

    const page = pool.slice(start, start + size);
    const hasNext = start + size < pool.length;
    const nextCursor = hasNext && page.length ? page.at(-1)!.letterSeq : 0;

    return {
      content: page,
      hasNext,
      nextCursor,
      totalCount: pool.length,
    };
  }

  // 한 번에 풀 생성 + 슬라이스
  createAndSlice(
    donateSeq: number,
    poolSize: number,
    size: number,
    cursorSeq?: number,
  ): HeavenLetterPagination {
    this.getOrCreatePool(donateSeq, poolSize);
    return this.sliceLetters(donateSeq, size, cursorSeq);
  }
}

// 싱글톤 인스턴스
export const letterPoolManager = new LetterPoolManager();
