import { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import { X, Plus, Trash2, Save, AlertTriangle, Wrench } from 'lucide-react';

export default function ChallengeEditorModal({
  isOpen,
  onClose,
  challengeToEdit,
  onChallengeSaved,
  onChallengeDeleted,
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState('');

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
    setShowConfirmDelete(false);
    setDeleteWarning('');
  }, [challengeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (force = false) => {
    if (!isEditMode) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/challenges/${challengeToEdit.id}${force ? '?force=true' : ''}`);
      if (onChallengeDeleted) {
        onChallengeDeleted(challengeToEdit);
      } else if (onChallengeSaved) {
        onChallengeSaved(null);
      }
      onClose();
    } catch (err) {
      if (err.hasClaimedTeams || err.message?.includes('claimed')) {
        setDeleteWarning(err.message || 'Squads have claimed this quest.');
        setShowConfirmDelete(true);
      } else {
        setError(err.message || 'Failed to delete challenge.');
        setShowConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  };

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
            <Wrench className="w-5 h-5" />
            <div>
              <h3 className="text-sm sm:text-base font-bold font-pixel tracking-tight">
                {isEditMode ? 'EDIT CREATIVE THEME' : 'CREATE CREATIVE THEME'}
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
              THEME TITLE :
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Sacrifices Must Be Made"
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-pixel text-[#1e293b] focus:border-[#f6ab3c] focus:ring-2 focus:ring-[#f6ab3c]/20 outline-none"
            />
          </div>

          {/* Capacity Field */}
          <div>
            <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
              MAX SQUAD CAPACITY (SEATS PER THEME) :
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.maxCapacity}
              onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs font-pixel text-[#1e293b] focus:border-[#f6ab3c] outline-none"
            />
          </div>

          {/* Release / Publish Checkbox */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between cursor-pointer" onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}>
            <div>
              <span className="font-pixel text-[10px] text-[#1e293b] block">
                RELEASE STATUS (VISIBILITY TO TEAMS) :
              </span>
              <p className="text-xs font-retro text-[#64748b]">
                {formData.isPublished ? 'Published & Released (Visible to all participants)' : 'Unpublished / Draft (Hidden from students)'}
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
              SHORT SUMMARY (1-2 SENTENCES) :
            </label>
            <input
              type="text"
              required
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="e.g., Every gain requires giving something up."
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-retro text-[#1e293b] focus:border-[#f6ab3c] outline-none"
            />
          </div>

          {/* Creative Example Concept */}
          <div>
            <label className="block text-xs font-bold font-pixel text-[#1e293b] mb-1">
              CREATIVE EXAMPLE CONCEPT & INSPIRATION :
            </label>
            <textarea
              rows={3}
              required
              value={formData.fullDescription}
              onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
              placeholder="e.g., Maybe you have to delete a random item from your inventory every time you level up."
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
                    placeholder="e.g., Player movement controls"
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={saving || deleting}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-pixel font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE THEME</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="submit"
                disabled={saving || deleting}
                className="px-5 py-2.5 rounded-xl bg-[#f6ab3c] hover:bg-[#e69828] text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#a4640c] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'SAVING...' : isEditMode ? 'SAVE CHANGES' : 'CREATE THEME'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-4 border-rose-400 shadow-[8px_8px_0px_#fda4af] max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold font-pixel text-[#1e293b]">
                  DELETE THEME?
                </h4>
                <p className="text-xs font-retro text-[#64748b]">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs font-retro text-[#475569] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#1e293b]">"{formData.title}"</strong>?
            </p>

            {deleteWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-retro flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{deleteWarning}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(false);
                  setDeleteWarning('');
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-pixel text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleDelete(Boolean(deleteWarning))}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-pixel font-bold shadow-[2px_2px_0px_#9f1239] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'DELETING...' : deleteWarning ? 'FORCE DELETE & UNASSIGN' : 'YES, DELETE'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
