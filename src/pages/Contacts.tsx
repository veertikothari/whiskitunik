import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: Timestamp;
};

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const data: Contact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError('Name and Email are required.');
      return;
    }
  
    try {
      // Check if email already exists
      const snapshot = await getDocs(collection(db, 'contacts'));
      const exists = snapshot.docs.some(
        (doc) => doc.data().email.toLowerCase() === form.email.toLowerCase()
      );
  
      if (exists) {
        setError('A contact with this number already exists.');
        return;
      }
  
      await addDoc(collection(db, 'contacts'), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        createdAt: Timestamp.now(),
      });
  
      setForm({ name: '', email: '', phone: '' });
      setSuccess('Contact added successfully!');
      fetchContacts();
    } catch (err) {
      console.error('Error adding contact:', err);
      setError('Failed to add contact.');
    }
  };
  

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Contacts</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Contact</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {error && <p className="text-red-600">{error}</p>}
          {success && <p className="text-green-600">{success}</p>}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Contact
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">All Contacts</h2>
        {loading ? (
          <p>Loading...</p>
        ) : contacts.length === 0 ? (
          <p>No contacts available.</p>
        ) : (
          <ul className="space-y-4">
            {contacts.map((contact) => (
              <li key={contact.id} className="border-b pb-2">
                <p>
                  <strong>Name:</strong> {contact.name}
                </p>
                <p>
                  <strong>Email:</strong> {contact.email}
                </p>
                {contact.phone && (
                  <p>
                    <strong>Phone:</strong> {contact.phone}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Contacts;
