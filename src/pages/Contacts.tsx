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
import { Trash2, Edit, MessageSquareText, Phone, X } from 'lucide-react';
import { toast } from 'react-toastify';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company_name: string;
  date_of_birth: string;
  date_of_anniversary: string;
  categories: string[];
  notes?: string;
  createdAt: Timestamp;
  uploadedBy: string;
};

export function Contacts() {
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    date_of_birth: '',
    date_of_anniversary: '',
    categories: [] as string[],
    notes: '',
  });
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const email = localStorage.getItem('userEmail');

  useEffect(() => {
    fetchCategories();
    fetchContacts();
  }, []);

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'contacts'));
    const allCategories = snapshot.docs
      .flatMap((doc) => {
        const data = doc.data();
        // Handle both old format (single category) and new format (categories array)
        if (Array.isArray(data.categories)) {
          return data.categories;
        } else if (data.category) {
          return [data.category];
        }
        return [];
      })
      .filter((cat): cat is string => cat !== undefined && cat.trim() !== '');
    const uniqueCategories = [...new Set(allCategories)];
    setCategories(uniqueCategories);
  };

  const handleAddNewCategory = async () => {
    if (newCategory.trim()) {
      if (!categories.includes(newCategory)) {
        setCategories((prev) => [...prev, newCategory]);
      }
      
      if (!form.categories.includes(newCategory)) {
        setForm((prev) => ({ ...prev, categories: [...prev.categories, newCategory] }));
      }
      
      setShowAddCategory(false);
      setNewCategory('');
    } else {
      toast.error('Category name cannot be empty.');
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.querySelector('.category-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      setIsCategoryDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const data: Contact[] = snapshot.docs
        .map((doc) => {
          const docData = doc.data();
          // Handle migration from old format (single category) to new format (categories array)
          let categories = docData.categories;
          if (!categories && docData.category) {
            categories = [docData.category];
          }
          
          return {
            id: doc.id,
            ...docData,
            categories: categories || [],
          } as Contact;
        })
        .filter((contact) => contact.uploadedBy === email);

      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error('Name, Phone number and Email are required.');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error('Enter a valid 10-digit phone number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const exists = snapshot.docs.some(
        (doc) => doc.data().phone === form.phone && doc.id !== editContactId
      );

      if (exists) {
        toast.error('A contact with this number already exists.');
        return;
      }

      if (editContactId) {
        await updateDoc(doc(db, 'contacts', editContactId), {
          ...form,
          updatedAt: Timestamp.now(),
        });
        setContacts(contacts.map((c) => (c.id === editContactId ? { ...c, ...form } : c)));
        setEditContactId(null);
      } else {
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
        categories: [],
        notes: '',
      });

      toast.success(editContactId ? 'Contact updated successfully!' : 'Contact added successfully!');
      fetchContacts();
    } catch (err) {
      console.error('Error adding/updating contact:', err);
      toast.error('Failed to add/update contact.');
    }
  };

  const handleEdit = (contact: Contact) => {
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      company_name: contact.company_name,
      date_of_birth: contact.date_of_birth,
      date_of_anniversary: contact.date_of_anniversary,
      categories: contact.categories || [],
      notes: contact.notes || '',
    });
    setEditContactId(contact.id);
  };

  const deleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      toast.success('Contact deleted successfully!');
      fetchContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast.error('Failed to delete contact.');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => cat !== categoryToRemove),
    }));
  };

  const addCategory = (categoryToAdd: string) => {
    if (!form.categories.includes(categoryToAdd)) {
      setForm((prev) => ({
        ...prev,
        categories: [...prev.categories, categoryToAdd],
      }));
    }
    setCategorySearchQuery('');
    setIsCategoryDropdownOpen(false);
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

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:text-base">Categories</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.categories.map((cat) => (
                <div 
                  key={cat}
                  className="bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center text-xs sm:text-sm"
                >
                  <span>{cat}</span>
                  <button 
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                  >
                    <X size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="category-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:text-base">Add Categories</label>
            <div className="relative w-full">
              <input
                type="text"
                className="w-full border px-3 py-2 rounded focus:outline-none"
                placeholder="Search or select categories..."
                value={categorySearchQuery}
                onChange={(e) => {
                  setCategorySearchQuery(e.target.value);
                  setIsCategoryDropdownOpen(true);
                }}
                onFocus={() => setIsCategoryDropdownOpen(true)}
              />
              {isCategoryDropdownOpen && (
                <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
                  {categories
                    .filter((cat) =>
                      cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
                    )
                    .map((category) => (
                      <div
                        key={category}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => addCategory(category)}
                      >
                        {category}
                      </div>
                    ))}
                  <div
                    className="p-2 hover:bg-gray-100 cursor-pointer text-blue-600"
                    onClick={() => {
                      setShowAddCategory(true);
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    + Add New Category
                  </div>
                </div>
              )}
            </div>
            {showAddCategory && (
              <div className="mt-2 p-2 bg-white border rounded shadow-lg">
                <input
                  type="text"
                  placeholder="Enter new category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border px-2 py-1 rounded mb-2"
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-2 py-1 bg-blue-600 text-white rounded mr-2"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-2 py-1 border rounded"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

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
                  categories: [],
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
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p><strong>Name:</strong> {contact.name}</p>
                    <p><strong>Email:</strong> {contact.email}</p>
                    <p><strong>Phone:</strong> {contact.phone}</p>
                    <p><strong>Address:</strong> {contact.address}</p>
                    <p><strong>Company:</strong> {contact.company_name}</p>
                    <p><strong>DOB:</strong> {contact.date_of_birth}</p>
                    <p><strong>Anniversary:</strong> {contact.date_of_anniversary}</p>
                    <p><strong>Categories:</strong> {contact.categories?.join(', ') || 'None'}</p>
                    {contact.notes && <p><strong>Notes:</strong> {contact.notes}</p>}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-2 sm:mt-0">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                        title="Edit Contact"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
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

export default Contacts;