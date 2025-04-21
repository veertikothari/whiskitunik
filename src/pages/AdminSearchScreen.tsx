import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

type SearchResult = {
  id: string;
  title: string;
  content: string;
  url: string;
  collection: string;
};

export const AdminSearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCollectionData = async (collectionName: string) => {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      switch (collectionName) {
        case 'contacts':
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data() as { name: string }).name,
            content: `${(doc.data() as { email: string }).email} ${(doc.data() as { phone: string }).phone} ${(doc.data() as { address: string }).address || ''} ${(doc.data() as { company_name: string }).company_name || ''} ${(doc.data() as { category: string }).category || ''} ${(doc.data() as { notes: string }).notes || ''}`,
            url: `/admincontacts`,
            collection: 'contacts',
          }));
        case 'guidelines':
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data() as { title: string }).title,
            content: (doc.data() as { description: string }).description,
            url: `/adminguidelines`,
            collection: 'guidelines',
          }));
        case 'tasks':
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data() as { title: string }).title,
            content: `${(doc.data() as { description: string }).description || ''} ${(doc.data() as { dueDate: string }).dueDate || ''} ${(doc.data() as { assignedUserId: string }).assignedUserId || ''}`,
            url: `/tasks`,
            collection: 'tasks',
          }));
        case 'users':
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data() as { email: string }).email,
            content: `${(doc.data() as { phone: string }).phone || ''}`,
            url: `/adduser`,
            collection: 'users',
          }));
        case 'projectTemplates':
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data() as { title: string }).title || `Template ${doc.id}`,
            content: (doc.data() as { description: string }).description || 'No description',
            url: `/templates`,
            collection: 'projectTemplates',
          }));
        default:
          return [];
      }
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      return [];
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    const collections = ['contacts', 'guidelines', 'tasks', 'users', 'projectTemplates'];
    let allResults: SearchResult[] = [];

    for (const collectionName of collections) {
      const data = await fetchCollectionData(collectionName);
      allResults = [...allResults, ...data];
    }

    const results = allResults.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
    setLoading(false);
  };

  const navigateToPage = (url: string) => {
    navigate(url);
  };

  useEffect(() => {
    if (searchQuery.length > 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Global Search</h1>
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search across app and collections..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {loading && <p className="text-gray-600">Searching...</p>}
      {!loading && searchResults.length > 0 && (
        <ul className="space-y-4">
          {searchResults.map((result) => (
            <li key={result.id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{result.title}</h2>
              <p className="text-gray-700">{result.content.substring(0, 100)}...</p>
              <p className="text-sm text-gray-500">Collection: {result.collection}</p>
              <button
                onClick={() => navigateToPage(result.url)}
                className="mt-2 text-blue-600 hover:underline"
              >
                Go to Page
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && searchResults.length === 0 && searchQuery.length > 2 && (
        <p className="text-gray-600">No results found.</p>
      )}
    </div>
  );
};

export default AdminSearchScreen;