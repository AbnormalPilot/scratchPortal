import React, { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import {
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Layers,
} from 'lucide-react';

export default function ChallengeEditorModal({
  isOpen,
  onClose,
  challengeToEdit,
  onChallengeSaved,
}) {
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    fullDescription: '',
    category: 'Arcade',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    isPublished: true,
    requirements: [''],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(challengeToEdit && challengeToEdit.id);

  useEffect(() => {
    if (challengeToEdit) {
      setFormData({
        title: challengeToEdit.title || '',
        shortDescription: challengeToEdit.shortDescription || '',
        fullDescription: challengeToEdit.fullDescription || '',
        category: challengeToEdit.category || 'Arcade',
        difficulty: challengeToEdit.difficulty || 'Intermediate',
        maxCapacity: challengeToEdit.maxCapacity || 4,
        isPublished: challengeToEdit.isPublished !== false,
        requirements:
          Array.isArray(challengeToEdit.requirements) && challengeToEdit.requirements.length > 0
            ? challengeToEdit.requirements
            : [''],
      });
    } else {
      setFormData({
        title: '',
        shortDescription: '',
        fullDescription: '',
        category: 'Arcade',
        difficulty: 'Intermediate',
        maxCapacity: 4,
        isPublished: true,
        requirements: [''],
      });
    }
    setError('');
  }, [challengeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ''],
    }));
  };

  const handleRemoveRequirement = (idx) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== idx),
    }));
  };

  const handleRequirementChange = (idx, value) => {
    setFormData((prev) => {
      const updated = [...prev.requirements];
      updated[idx] = value;
      return { ...prev, requirements: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.shortDescription.trim() || !formData.fullDescription.trim()) {
      setError('Please fill in Title, Short Description, and Full Description.');
      return;
    }

    const cleanRequirements = formData.requirements
      .map((r) => r.trim())
      .filter(Boolean);

    setSaving(true);

    try {
      let savedChallenge;
      if (isEditMode) {
        const res = await api.put(`/challenges/${challengeToEdit.id}`, {
          ...formData,
          requirements: cleanRequirements,
          maxCapacity: Number(formData.maxCapacity),
        });
        savedChallenge = res.challenge;
      } else {
        const res = await api.post('/challenges', {
          ...formData,
          requirements: cleanRequirements,
          maxCapacity: Number(formData.maxCapacity),
        });
        savedChallenge = res.challenge;
      }

      if (onChallengeSaved) onChallengeSaved(savedChallenge);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      
      {/* Modal Container */}
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border-4 border-[#f6ab3c] shadow-[8px_8px_0px_#fde68a] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-[#f6ab3c] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#e69828]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-pixel tracking-tight">
                {isEditMode ? 'EDIT PROBLEM STATEMENT' : 'CREATE PROBLEM STATEMENT'}
              </h3>
              <span className="text-[11px] font-retro text-amber-100 block">
                ORGANIZER CONTROL PANEL
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-retro flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
              CHALLENGE TITLE :
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Space Defender 2026"
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-pixel text-[#1e293b] focus:border-[#f6ab3c] focus:ring-2 focus:ring-[#f6ab3c]/20 outline-none"
            />
          </div>

          {/* Meta Fields: Category, Difficulty, Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold font-pixel text-[#1e293b] mb-1">
                CATEGORY :
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-xs font-retro font-bold text-[#1e293b] focus:border-[#f6ab3c] outline-none"
              >
                <option value="Arcade">Arcade Shooter</option>
                <option value="Physics Platformer">Physics Platformer</option>
                <option value="Strategy & Tower Defense">Strategy & Defense</option>
                <option value="Simulation & Management">Simulation</option>
                <option value="Puzzle & Stealth">Puzzle & Stealth</option>
                <option value="Music & Timing">Music & Timing</option>
                <option value="Retro RPG">Retro RPG</option>
                <option value="Endless Runner">Endless Runner</option>
                <option value="Other">Custom Category</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold font-pixel text-[#1e293b] mb-1">
                DIFFICULTY :
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-xs font-retro font-bold text-[#1e293b] focus:border-[#f6ab3c] outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold font-pixel text-[#1e293b] mb-1">
                MAX CAPACITY :
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxCapacity}
                onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 text-xs font-pixel text-[#1e293b] focus:border-[#f6ab3c] outline-none"
              />
            </div>
          </div>

          {/* Release / Publish Checkbox */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between cursor-pointer" onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}>
            <div>
              <span className="font-pixel text-[10px] text-[#1e293b] block">
                RELEASE STATUS (VISIBILITY TO TEAMS) :
              </span>
              <p className="text-xs font-retro text-[#64748b]">
                {formData.isPublished ? '🚀 Published & Released (Visible to all participants)' : '⏸️ Unpublished / Draft (Hidden from students)'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="w-5 h-5 accent-[#f6ab3c] cursor-pointer"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
              SHORT CARD SUMMARY (1-2 SENTENCES) :
            </label>
            <input
              type="text"
              required
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="e.g., Defend starbase from alien dreadnoughts and asteroid waves."
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none"
            />
          </div>

          {/* Full Description & Story */}
          <div>
            <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
              FULL PROBLEM STATEMENT & BRIEF :
            </label>
            <textarea
              rows={3}
              required
              value={formData.fullDescription}
              onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
              placeholder="Write the full challenge story, mechanics, and design constraints..."
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none resize-none"
            />
          </div>

          {/* Mandatory Requirements List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold font-pixel text-[#1e293b]">
                MANDATORY GAME MECHANICS CHECKLIST :
              </label>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="px-2.5 py-1 rounded-lg bg-[#f0f7ff] hover:bg-[#e0efff] text-[#4e97fe] border border-[#bad6fc] text-[10px] font-pixel transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>ADD RULE</span>
              </button>
            </div>

            <div className="space-y-2">
              {formData.requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-[#64748b] w-5 text-center shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => handleRequirementChange(idx, e.target.value)}
                    placeholder="e.g., Player ship movement with smooth keyboard controls"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none"
                  />
                  {formData.requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="bg-[#fff9e6] px-6 py-4 border-t-2 border-[#f6ab3c]/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#64748b] border border-slate-200 text-xs font-pixel transition-all cursor-pointer shadow-sm"
          >
            <span>CANCEL</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel transition-all shadow-[3px_3px_0px_#a4640c] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'SAVING...' : isEditMode ? 'UPDATE CHALLENGE' : 'CREATE CHALLENGE'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
