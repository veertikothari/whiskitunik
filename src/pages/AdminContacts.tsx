import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Edit, MessageSquareText, Phone } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company_name: string;
  date_of_birth: string;
  date_of_anniversary: string;
  category: string;
  notes?: string;
  createdAt: Timestamp;
  uploadedBy:string;
};

export function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    date_of_birth: '',
    date_of_anniversary: '',
    category: '',
    notes: '',
  });
  const [editContactId, setEditContactId] = useState<string | null>(null); // Added to track edit mode
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const email = localStorage.getItem('userEmail');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const data: Contact[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Contact, 'id'>),
        }))
        .filter((contact) =>
          email === 'galanikesh@gmail.com' ||
          email === 'urvi@oxyjinn.com' ||
          email === 'ngroutines@gmail.com'
            ? true
            : (doc.data() as any).uploadedBy === email
        );
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setError('Name, Phone number and Email are required.');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.phone)) {
      setError('Enter a valid 10-digit phone number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const exists = snapshot.docs.some(
        (doc) => doc.data().phone === form.phone && doc.id !== editContactId // Modified to exclude current contact during edit
      );

      if (exists) {
        setError('A contact with this number already exists.');
        return;
      }

      if (editContactId) {
        // Update existing contact
        await updateDoc(doc(db, 'contacts', editContactId), {
          ...form,
          updatedAt: Timestamp.now(),
        });
        setContacts(contacts.map((c) => (c.id === editContactId ? { ...c, ...form } : c)));
        setEditContactId(null);
      } else {
        // Add new contact
        await addDoc(collection(db, 'contacts'), {
          ...form,
          createdAt: Timestamp.now(),
          uploadedBy: email || '',
        });
      }

      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        company_name: '',
        date_of_birth: '',
        date_of_anniversary: '',
        category: '',
        notes: '',
      });
      setTimeout(() => {
        setSuccess(editContactId ? 'Contact updated successfully!' : 'Contact added successfully!');
      }, 3000);
      fetchContacts();
    } catch (err) {
      console.error('Error adding/updating contact:', err);
      setError('Failed to add/update contact.');
    }
  };

  const handleEdit = (contact: Contact) => {
    // Set form with contact data and enter edit mode
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      company_name: contact.company_name,
      date_of_birth: contact.date_of_birth,
      date_of_anniversary: contact.date_of_anniversary,
      category: contact.category,
      notes: contact.notes || '',
    });
    setEditContactId(contact.id);
  };

  const deleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      setSuccess('Contact deleted successfully!');
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError('Failed to delete contact.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Contacts</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add/Edit Contact</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Name', name: 'name', type: 'text', required: true },
            { label: 'Email', name: 'email', type: 'email', required: true },
            { label: 'Phone', name: 'phone', type: 'text', required: true },
            { label: 'Address', name: 'address', type: 'text' },
            { label: 'Company Name', name: 'company_name', type: 'text' },
            { label: 'Date of Birth', name: 'date_of_birth', type: 'date' },
            { label: 'Date of Anniversary', name: 'date_of_anniversary', type: 'date' },
            { label: 'Category', name: 'category', type: 'text' },
          ].map((input) => (
            <div key={input.name}>
              <label className="block text-sm font-medium mb-1">
                {input.label}
                {input.required && ' *'}
              </label>
              <input
                type={input.type}
                name={input.name}
                value={(form as any)[input.name]}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required={input.required}
              />
            </div>
          ))}

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              rows={3}
              placeholder="Optional notes..."
            />
          </div>

          {error && <p className="text-red-600">{error}</p>}
          {success && <p className="text-green-600">{success}</p>}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {editContactId ? 'Update Contact' : 'Add Contact'}
          </button>
          {editContactId && (
            <button
              type="button"
              onClick={() => {
                setForm({
                  name: '',
                  email: '',
                  phone: '',
                  address: '',
                  company_name: '',
                  date_of_birth: '',
                  date_of_anniversary: '',
                  category: '',
                  notes: '',
                });
                setEditContactId(null);
              }}
              className="ml-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="space-y-1">
                    <p><strong>Name:</strong> {contact.name}</p>
                    <p><strong>Email:</strong> {contact.email}</p>
                    <p><strong>Phone:</strong> {contact.phone}</p>
                    <p><strong>Address:</strong> {contact.address}</p>
                    <p><strong>Company:</strong> {contact.company_name}</p>
                    <p><strong>DOB:</strong> {contact.date_of_birth}</p>
                    <p><strong>Anniversary:</strong> {contact.date_of_anniversary}</p>
                    <p><strong>Category:</strong> {contact.category}</p>
                    {contact.notes && <p><strong>Notes:</strong> {contact.notes}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-2 sm:mt-0">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                        title="Edit Contact"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 size={18} />
                      </button>
                    
                    <div className="flex space-x-2">
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"
                        title="Call Contact"
                      >
                        <Phone size={18} />
                      </a>
                      <a
                        href={`https://wa.me/${contact.phone}?text=Hello%20${encodeURIComponent(contact.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition-colors"
                        title="Message on WhatsApp"
                      >
                        <MessageSquareText size={18} />
                      </a>
                    </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminContacts;