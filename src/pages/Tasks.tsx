import { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, Phone, MessageSquareText, Circle } from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// Define proper TypeScript interfaces
interface User {
  id: string;
  email: string;
  phone?: string;
  [key: string]: any; // For other potential fields
}

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  [key: string]: any; // For other potential fields
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedUserId: string;
  referenceContactId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  assignedUserId: string;
  referenceContactId: string;
}

export function Tasks() {
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [isEditingTask, setIsEditingTask] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: '',
    assignedUserId: '',
    referenceContactId: ''
  });

  const getCurrentDate = (): string => new Date().toISOString().split('T')[0];
  const now = Date.now();
  const validTasks: Task[] = []
  const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userSnap, contactSnap, taskSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'contacts')),
          getDocs(collection(db, 'tasks'))
        ]);
    
        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        setContacts(contactSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
    
        const now = Date.now();
        const validTasks: Task[] = [];
    
        await Promise.all(
          taskSnap.docs.map(async docSnap => {
            const taskData = docSnap.data() as Task;
            const taskId = docSnap.id;
    
            if (
              taskData.status === 'completed' &&
              taskData.updatedAt &&
              now - new Date(taskData.updatedAt).getTime() > 24 * 60 * 60 * 1000
            ) {
              await deleteDoc(doc(db, 'tasks', taskId));
            } else {
              validTasks.push({ id: taskId, ...taskData });
            }
          })
        );
    
        setTasks(validTasks);
        setLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTask = () => {
    setIsAddingTask(true);
    setIsEditingTask(null);
    setFormData({
      title: '',
      description: '',
      dueDate: getCurrentDate(),
      assignedUserId: users[0]?.id || '',
      referenceContactId: ''
    });
  };

  const handleEditTask = (task: Task) => {
    setIsEditingTask(task.id);
    setIsAddingTask(false);
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      assignedUserId: task.assignedUserId,
      referenceContactId: task.referenceContactId || ''
    });
  };

  const handleCancel = () => {
    setIsAddingTask(false);
    setIsEditingTask(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      assignedUserId: '',
      referenceContactId: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.dueDate || !formData.assignedUserId) return;

      const taskData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (isEditingTask) {
        await updateDoc(doc(db, 'tasks', isEditingTask), taskData);
        setTasks(prev =>
          prev.map(task =>
            task.id === isEditingTask ? { id: isEditingTask, ...taskData } : task
          )
        );
      } else {
        const newRef = doc(collection(db, 'tasks'));
        await setDoc(newRef, {
          ...taskData,
          createdAt: new Date().toISOString()
        });
        setTasks(prev => [...prev, { id: newRef.id, ...taskData } as Task]);
      }

      handleCancel();
    } catch (err) {
      console.error('Failed to submit task', err);
    }
  };

  const getUserName = (id: string): string => {
    const user = users.find(u => u.id === id);
    return user?.email || 'Unknown';
  };

  const getUserPhone = (id: string): string | null => {
    const user = users.find(u => u.id === id);
    return user?.phone || null;
  };

  const getContactDetails = (id: string): { name: string; phone: string | null } => {
    const contact = contacts.find(c => c.id === id);
    return contact 
      ? { name: contact.name || 'No name', phone: contact.phone || null }
      : { name: 'None', phone: null };
  };

  const getContactName = (id: string): string => {
    return getContactDetails(id).name;
  };

  const getContactPhone = (id: string): string | null => {
    return getContactDetails(id).phone;
  };

  const getDueStatus = (dueDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays < 0) return 'text-red-500'; // Overdue
    if (diffDays === 0) return 'text-orange-500'; // Due today
    if (diffDays <= 2) return 'text-blue-500'; // Coming soon
    return 'text-gray-500'; // Normal
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  
  return (
    <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-medium">Tasks</h1>
      </div>

      {/* Add Task Button */}
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <button
          onClick={handleAddTask}
          className="text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-full transition-colors"
        >
          <Plus size={20} />
          <span>Add a task</span>
        </button>
      </div>

      {/* Task Form */}
      {(isAddingTask || isEditingTask) && (
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Circle size={20} className="text-gray-400" />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Title"
              className="flex-1 border-b border-gray-300 p-1 bg-transparent focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          
          <div className="pl-7 space-y-3">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              rows={3}
            />
            
            <div className="flex flex-col space-y-3">
              <div className="flex items-center">
                <span className="text-gray-500 text-sm w-20">Due date:</span>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  min={getCurrentDate()}
                  className="border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <span className="text-gray-500 text-sm w-20">Assign to:</span>
                <select
                  name="assignedUserId"
                  value={formData.assignedUserId}
                  onChange={handleInputChange}
                  className="border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <span className="text-gray-500 text-sm w-20">Contact:</span>
                <select
                  name="referenceContactId"
                  value={formData.referenceContactId}
                  onChange={handleInputChange}
                  className="border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Reference contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name || 'No name'} ({contact.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSubmit} 
                className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                {isEditingTask ? 'Update' : 'Save'}
              </button>
              <button 
                onClick={handleCancel} 
                className="bg-gray-200 text-gray-700 px-4 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-500">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No tasks yet. Click "Add a task" to get started.</p>
        </div>
      ) : (
        <ul className="divide-y">
          {tasks.map(task => (
            <li key={task.id} className="hover:bg-gray-50 transition-colors">
              <div className="px-4 py-3 flex items-start">
                <button className="mt-1 text-gray-400 hover:text-blue-500 transition-colors">
                  <Circle size={18} />
                </button>
                
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleEditTask(task)} 
                        className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)} 
                        className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {task.description && (
                  <p className={`text-sm mt-1 ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {task.description}
                  </p>
                  )}
                  
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    <div className={`flex items-center ${getDueStatus(task.dueDate)}`}>
                      <span className="font-medium">Due: {formatDate(task.dueDate)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <span>Assigned: {getUserName(task.assignedUserId)}</span>
                      {getUserPhone(task.assignedUserId) && (
                        <div className="flex ml-2 gap-2">
                          <a
                            href={`tel:${getUserPhone(task.assignedUserId)}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="Call user"
                          >
                            <Phone size={14} />
                          </a>
                          <a
                            href={`https://wa.me/${getUserPhone(task.assignedUserId)}?text=${encodeURIComponent('Task: ' + task.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                            title="WhatsApp user"
                          >
                            <MessageSquareText size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {task.referenceContactId && (
                      <div className="flex items-center text-gray-600">
                        <span>Contact: {getContactName(task.referenceContactId)}</span>
                        {getContactPhone(task.referenceContactId) && (
                          <div className="flex ml-2 gap-2">
                            <a
                              href={`tel:${getContactPhone(task.referenceContactId)}`}
                              className="text-blue-600 hover:text-blue-800"
                              title="Call contact"
                            >
                              <Phone size={14} />
                            </a>
                            <a
                              href={`https://wa.me/${getContactPhone(task.referenceContactId)}?text=${encodeURIComponent('Regarding task: ' + task.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800"
                              title="WhatsApp contact"
                            >
                              <MessageSquareText size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Tasks;