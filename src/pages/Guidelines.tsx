import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Edit } from 'lucide-react';
import { toast } from 'react-toastify';

type Guideline = {
  id: string;
  title: string;
  description: string;
  createdAt: Timestamp;
  uploadedBy: string;
};

export const Guidelines: React.FC = () => {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
  });
  const [editGuidelineId, setEditGuidelineId] = useState<string | null>(null); // Added to track edit mode
  const email = localStorage.getItem('userEmail');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const fetchGuidelines = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'guidelines'));
      const data: Guideline[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Guideline, 'id'>),
        }))
        .filter((g) => g.uploadedBy === email);

      setGuidelines(data);
    } catch (err) {
      console.error('Error fetching guidelines:', err);
      toast.error('Failed to load guidelines');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.description) {
      toast.error('Please fill in both fields');
      return;
    }

    try {
      if (editGuidelineId) {
        // Update existing guideline
        await updateDoc(doc(db, 'guidelines', editGuidelineId), {
          ...form,
          updatedAt: Timestamp.now(),
        });
        setGuidelines(guidelines.map((g) => (g.id === editGuidelineId ? { ...g, ...form } : g)));
        setEditGuidelineId(null);
      } else {
        // Add new guideline
        await addDoc(collection(db, 'guidelines'), {
          ...form,
          createdAt: Timestamp.now(),
          uploadedBy: email || '',
        });
      }

      setForm({ title: '', description: '' });
      toast.success(editGuidelineId ? 'Guideline updated!' : 'Guideline added!');
      fetchGuidelines();
    } catch (err) {
      console.error('Error adding/updating guideline:', err);
      toast.error('Failed to add/update guideline');
    }
  };

  const handleEdit = (guideline: Guideline) => {
    // Set form with guideline data and enter edit mode
    setForm({
      title: guideline.title,
      description: guideline.description,
    });
    setEditGuidelineId(guideline.id);
  };

  const deleteGuideline = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guidelines', id));
      toast.success('Guideline deleted');
      fetchGuidelines();
    } catch (err) {
      console.error('Error deleting guideline:', err);
      toast.error('Failed to delete guideline');
    }
  };

  useEffect(() => {
    fetchGuidelines();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Guidelines & SOP</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add/Edit Guideline</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {editGuidelineId ? 'Update Guideline' : 'Add Guideline'}
          </button>
          {editGuidelineId && (
            <button
              type="button"
              onClick={() => {
                setForm({ title: '', description: '' });
                setEditGuidelineId(null);
              }}
              className="ml-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Existing Guidelines</h2>
        {guidelines.length === 0 ? (
          <p>No guidelines added yet.</p>
        ) : (
          <ul className="space-y-4">
            {guidelines.map((g) => (
              <li key={g.id} className="border-b pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p><strong>Title:</strong> {g.title}</p>
                    <p><strong>Description:</strong> {g.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(g)}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteGuideline(g.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Guidelines;