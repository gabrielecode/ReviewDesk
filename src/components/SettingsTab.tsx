import React, { useState, useEffect } from 'react';
import { Business } from '../types';

interface SettingsTabProps {
  business: Business;
  onUpdateBusiness: (updated: Partial<Business>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ business, onUpdateBusiness }) => {
  const [formData, setFormData] = useState<Business>(business);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(business);
  }, [business]);

  const handleChange = (field: keyof Business, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl text-[#1C2321]">Impostazioni attività</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Informazioni generali */}
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Informazioni generali</h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome attività</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#667069] block">Località</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Preferenze risposta IA */}
        <div className="panel-card p-5 space-y-4">
          <h3 className="font-semibold text-xs text-[#1C2321] uppercase tracking-wide">Preferenze risposta</h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Nome firmatario</label>
              <input
                type="text"
                required
                value={formData.signerName}
                onChange={(e) => handleChange('signerName', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Tono delle risposte</label>
              <select
                value={formData.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                className="input-field w-full text-xs cursor-pointer"
              >
                <option value="caloroso">Caloroso</option>
                <option value="formale">Formale</option>
                <option value="diretto">Diretto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Frasi da evitare</label>
              <input
                type="text"
                value={formData.phrasesToAvoid}
                onChange={(e) => handleChange('phrasesToAvoid', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#667069] block">Contatto privato per casi negativi</label>
              <input
                type="text"
                value={formData.privateContact}
                onChange={(e) => handleChange('privateContact', e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-medium text-[#1F5F4A]">Impostazioni salvate</span>
          ) : (
            <span></span>
          )}
          <button
            type="submit"
            className="btn-primary px-5 py-2 text-xs font-medium"
          >
            Salva modifiche
          </button>
        </div>
      </form>
    </div>
  );
};
