export function normalizeReview(item: any): any {
  return {
    sourceReviewId: item.reviewId,
    placeId: item.locationId,
    placeName: item.name,
    rating: item.rating,
    title: item.title,
    text: item.text,
    language: item.language,
    publishedAt: new Date(item.publishedDate),
    reviewerName: item.reviewerName,
    tripType: item.tripType,
    stayDate: item.stayDate,
    subRatings: item.subratings,
    ownerResponse: item.mgmtResponse,
    canReply: !!item.mgmtResponseUrl,
    directReplyUrl: item.mgmtResponseUrl,
    rawPayload: item,
  };
}
