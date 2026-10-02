export default function SpeakerToggle({ speaker, onChange }: { speaker: 'learner' | 'parent', onChange: (s: 'learner' | 'parent') => void }) {
  return (
    <div className="flex p-1 bg-gray-100 rounded-xl mb-4 shadow-inner">
      <button 
        className={`flex-1 py-3 px-4 text-lg font-medium rounded-lg transition-colors ${speaker === 'learner' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
        onClick={() => onChange('learner')}
      >
        Learner 🧑‍🎓
      </button>
      <button 
        className={`flex-1 py-3 px-4 text-lg font-medium rounded-lg transition-colors ${speaker === 'parent' ? 'bg-white shadow text-secondary' : 'text-gray-500'}`}
        onClick={() => onChange('parent')}
      >
        Parent 👨‍👩‍👦
      </button>
    </div>
  );
}
