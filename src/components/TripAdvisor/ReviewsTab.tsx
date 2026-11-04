import React, { useEffect, useState } from 'react';

export const ReviewsTab = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('/api/tripadvisor/reviews?status=drafted')
      .then(res => res.json())
      .then(setReviews);
  }, []);

  const confirmPublish = async (id: string) => {
    await fetch(`/api/tripadvisor/reviews/${id}/publish-confirm`, { method: 'POST' });
    setReviews(reviews.filter((r: any) => r.id !== id));
  };

  return (
    <div className="p-4">
      {reviews.map((r: any) => (
        <div key={r.id} className="border p-2 my-2">
          <p>{r.text}</p>
          <button 
            className="bg-green-500 text-white p-2"
            onClick={() => confirmPublish(r.id)}
          >
            Conferma
          </button>
        </div>
      ))}
    </div>
  );
};
