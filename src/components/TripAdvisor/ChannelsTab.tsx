import React, { useState } from 'react';

export const ChannelsTab = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const addSource = async () => {
    setLoading(true);
    await fetch('/api/tripadvisor/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeUrl: url, businessId: 'biz-123' }) // TODO: Get active businessId
    });
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">TripAdvisor</h2>
      <input 
        className="border p-2 w-full my-2"
        placeholder="TripAdvisor URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button 
        className="bg-blue-500 text-white p-2"
        onClick={addSource}
        disabled={loading}
      >
        {loading ? 'Aggiunta...' : 'Aggiungi'}
      </button>
    </div>
  );
};
