import { fakerKO as faker } from "@faker-js/faker";
import { format, parseISO } from "date-fns";
import type { DonorData, DonorListResponse } from "@/shared/types/remembrance/DonorData.types";
import type { ApiResponse } from "@/shared/api/common/types";
import type { MemberDetail, MemberDetailResponse } from "@/shared/api/members-view/member/types";
import type { HeavenLetterPagination } from "@/shared/api/members-view/letter/types";
import type { CommentPagination } from "@/shared/api/recipient-view/comment/types";
import { createCursorPagination, createDateDescSorter } from "@/mocks/utils/paginate";
import { commentPoolManager } from "@/mocks/utils/commentPool";
import { letterPoolManager } from "@/mocks/utils/letterPool";

/** 시드 고정 */
faker.seed(42);

/** 기증자 목록 조회 데이터 */

// 아이템 생성
const makeDonor = (): DonorData => ({
  donateSeq: faker.number.int({ min: 1, max: 10000 }),
  donorName: faker.person.fullName(),
  genderFlag: faker.helpers.arrayElement(["M", "F"]),
  donateAge: faker.number.int({ min: 1, max: 100 }),
  donateDate: faker.date.past().toISOString().slice(0, 10), // YYYY-MM-DD
  commentCount: faker.number.int({ min: 0, max: 30 }),
  letterCount: faker.number.int({ min: 0, max: 30 }),
});

// 전역 데이터셋 300개를 한 번만 생성
const TOTAL = 300;
export const ALL_DONORS: DonorData[] = Array.from({ length: TOTAL }, makeDonor);

// 정렬 유틸 사용
const sorter = createDateDescSorter(
  (item: DonorData) => item.donateDate,
  (item: DonorData) => item.donateSeq,
);

// 정렬 한 번만 적용
ALL_DONORS.sort(sorter);

// 기증자 목록 응답 - 페이지네이션 유틸 사용
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

  const { content, hasNext, nextCursor, totalCount } = createCursorPagination(
    ALL_DONORS,
    size,
    cursor,
    (item) => item.donateSeq,
    (item) => item.donateDate,
  );

  return {
    success: true,
    code: 200,
    message: "게시글 조회 성공",
    data: { content, hasNext, nextCursor, totalCount },
  };
}

/** 기증자 상세 조회 데이터 */

// 추모 메세지 템플릿 (데모용)
function tributeMessage(donor: DonorData): string {
  const genderText = donor.genderFlag === "F" ? "여" : "남";
  const ageText = donor.donateAge ? `(${genderText},${donor.donateAge})` : "";
  const donateDate = format(parseISO(donor.donateDate), "yyyy.MM.dd");

  return `
    <p>${donor.donorName} 님 ${ageText}은 ${donateDate} 환자들에게 귀중한 장기를 선물해 주셨습니다.</p>
    <p>한국장기조직기증원은 귀한 생명을 나눠주신 기증자와 유가족께 깊이 감사드리며, </p>
    <p>앞으로도 기증자 유가족들이 건강한 삶을 유지할 수 있도록 최선을 다해 지원할 것입니다.</p>
    <p>고인의 명복을 빕니다.</p>
  `;
}

// 상세 정보 생성 함수
export function makeDonorDetail(donateSeq: number): MemberDetail {
  const donor = ALL_DONORS.find((d) => d.donateSeq === donateSeq);
  if (!donor) throw new Error("기증자 없음");
  return {
    donateSeq: donor.donateSeq,
    donorName: donor.donorName,
    donateTitle: faker.lorem.words(2),
    contents: tributeMessage(donor),
    fileName: null,
    orgFileName: null,
    writer: faker.person.fullName(),
    donateDate: donor.donateDate,
    genderFlag: donor.genderFlag ?? "M",
    donateAge: donor.donateAge ?? 0,

    // 이모지 카운트
    flowerCount: faker.number.int({ min: 0, max: 100 }),
    loveCount: faker.number.int({ min: 0, max: 100 }),
    seeCount: faker.number.int({ min: 0, max: 100 }),
    missCount: faker.number.int({ min: 0, max: 100 }),
    proudCount: faker.number.int({ min: 0, max: 100 }),
    hardCount: faker.number.int({ min: 0, max: 100 }),
    sadCount: faker.number.int({ min: 0, max: 100 }),

    writeTime: faker.date.past().toISOString(),

    // 페이지네이션
    memorialCommentResponses: makeCommentPagination(donor.donateSeq, 3),
    heavenLetterResponses: makeHeavenLetterPagination(donor.donateSeq, 3),
  };
}

// 캐싱
const DETAIL_CACHE = new Map<number, MemberDetail>();

export function getDonorDetail(donateSeq: number): MemberDetail {
  if (!DETAIL_CACHE.has(donateSeq)) {
    DETAIL_CACHE.set(donateSeq, makeDonorDetail(donateSeq));
  }
  return DETAIL_CACHE.get(donateSeq)!;
}

// 응답
export function donorDetailResponse(donateSeq: number): MemberDetailResponse {
  return {
    success: true,
    code: 200,
    message: "기증자 상세 조회 성공",
    data: getDonorDetail(donateSeq),
  };
}

// 기증자별 댓글 풀 유틸 사용
export function makeCommentPagination(
  donateSeq: number,
  size = 3,
  cursorSeq?: number,
): CommentPagination {
  // 목록에서 설정해둔 commentCount 사용
  const donor = ALL_DONORS.find((d) => d.donateSeq === donateSeq);
  const poolSize = donor?.commentCount ?? 0;

  return commentPoolManager.createAndSlice(
    `donor-${donateSeq}`,
    poolSize,
    "donateSeq",
    donateSeq,
    size,
    cursorSeq,
  );
}

// 기증자별 편지 풀 유틸 사용
export function makeHeavenLetterPagination(
  donateSeq: number,
  size = 3,
  cursorSeq?: number,
): HeavenLetterPagination {
  const donor = ALL_DONORS.find((d) => d.donateSeq === donateSeq);
  const poolSize = donor?.letterCount ?? 0;

  return letterPoolManager.createAndSlice(donateSeq, poolSize, size, cursorSeq);
}
