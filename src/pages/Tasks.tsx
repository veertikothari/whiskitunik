import { useState, useEffect, useRef } from 'react';
import { Trash2, Edit, Plus, Phone, MessageSquareText, Circle, X } from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  [key: string]: any;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company_name: string;
  date_of_birth: string;
  date_of_anniversary: string;
  categories: string[];
  [key: string]: any;
}

interface Guideline {
  id: string;
  title: string;
  description: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'date-wise' | '';
  frequencySubdivision?: {
    daily?: 'morning' | 'afternoon' | 'evening';
    weekly?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    monthly?: 'beginning' | 'middle' | 'end';
  };
  repeatDate?: string;
  assignedUserId: string;
  referenceContactId?: string;
  guidelineId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByEmail: string;
  status: string;
  priority?: 'low' | 'medium' | 'high';
  isPrivate: boolean;
  links?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'date-wise' | '';
  frequencySubdivision: {
    daily?: 'morning' | 'afternoon' | 'evening';
    weekly?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    monthly?: 'beginning' | 'middle' | 'end';
  };
  repeatDate?: string;
  assignedUserId: string;
  referenceContactId: string;
  guidelineId: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | '';
  isPrivate: boolean;
  links: string;
}

interface NewContactForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  company_name: string;
  date_of_birth: string;
  date_of_anniversary: string;
  categories: string[];
}

interface NewGuidelineForm {
  title: string;
  description: string;
}

export function Tasks() {
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [isEditingTask, setIsEditingTask] = useState<string | null>(null);
  const [showNewContactForm, setShowNewContactForm] = useState<boolean>(false);
  const [showNewGuidelineForm, setShowNewGuidelineForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    frequency: '',
    frequencySubdivision: {},
    repeatDate: '',
    assignedUserId: '',
    referenceContactId: '',
    guidelineId: '',
    priority: '',
    status: 'pending',
    isPrivate: false,
    links: '',
  });
  const [newContactForm, setNewContactForm] = useState<NewContactForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    date_of_birth: '',
    date_of_anniversary: '',
    categories: [],
  });
  const [newGuidelineForm, setNewGuidelineForm] = useState<NewGuidelineForm>({
    title: '',
    description: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [filterDueDate, setFilterDueDate] = useState<string>('');
  const [filterAssignedUser, setFilterAssignedUser] = useState<string>('');
  const [filterFrequency, setFilterFrequency] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterUserSearch, setFilterUserSearch] = useState<string>('');
  const [taskUserSearch, setTaskUserSearch] = useState<string>('');
  const [contactSearch, setContactSearch] = useState<string>('');
  const [prioritySearch, setPrioritySearch] = useState<string>('');
  const [guidelineSearch, setGuidelineSearch] = useState<string>('');
  const [isOverdueFilterActive, setIsOverdueFilterActive] = useState<boolean>(false);

  const email = localStorage.getItem('userEmail');
  const today = new Date().toISOString().split('T')[0];

  // Dropdown refs
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [showTaskUserDropdown, setShowTaskUserDropdown] = useState(false);
  const taskUserDropdownRef = useRef<HTMLDivElement>(null);
  const [showFilterUserDropdown, setShowFilterUserDropdown] = useState(false);
  const filterUserDropdownRef = useRef<HTMLDivElement>(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const [showFilterGuidelineDropdown, setShowFilterGuidelineDropdown] = useState(false);
  const filterGuidelineDropdownRef = useRef<HTMLDivElement>(null);
  const [showGuidelineDropdown, setShowGuidelineDropdown] = useState(false);
  const guidelineDropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentDate = (): string => new Date().toISOString().split('T')[0];
  const getCurrentTime = (): string => new Date().toTimeString().slice(0, 5);
  const formatDateTime = (date: string, time: string): string => {
    return new Date(`${date}T${time}`).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOverdueTime = (dueDate: string): string => {
    const now = new Date();
    const taskDue = new Date(dueDate);
    const diffMs = now.getTime() - taskDue.getTime();
    
    if (diffMs <= 0) return '';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0 || days > 0) timeString += `${hours}h `;
    timeString += `${minutes}m`;

    return ` (Overdue by: ${timeString.trim()})`;
  };

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'contacts'));
      const allCategories = snapshot.docs
        .flatMap((doc) => {
          if (!doc.exists()) return [];
          const data = doc.data();
          return Array.isArray(data.categories) ? data.categories : data.category ? [data.category] : [];
        })
        .filter((cat): cat is string => cat !== undefined && cat.trim() !== '');
      const uniqueCategories = [...new Set(allCategories)];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => 
    {
    const fetchData = async () => {
      try {
        const [userSnap, contactSnap, guidelineSnap, taskSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'contacts')),
          getDocs(collection(db, 'guidelines')),
          getDocs(collection(db, 'tasks')),
        ]);

        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        setContacts(
          contactSnap.docs.map(doc => {
            const data = doc.data();
            const categories = Array.isArray(data.categories)
              ? data.categories
              : data.category && typeof data.category === 'string'
              ? [data.category]
              : [];
            return {
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              address: data.address || '',
              company_name: data.company_name || '',
              date_of_birth: data.date_of_birth || '',
              date_of_anniversary: data.date_of_anniversary || '',
              categories,
            } as Contact;
          })
        );
        setGuidelines(guidelineSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guideline)));

        const now = Date.now();
        const validTasks: Task[] = [];
        const baseTasks = taskSnap.docs.map(docSnap => {
          const taskData = docSnap.data();
          return {
            id: docSnap.id,
            ...taskData,
            assignedUserId: taskData.assignedUserId || '',
            isPrivate: taskData.isPrivate || false,
            links: taskData.links || '',
          } as Task;
        }).filter(task => task.createdByEmail === email);

        await Promise.all(
          taskSnap.docs.map(async docSnap => {
            const taskData = docSnap.data() as Task;
            const taskId = docSnap.id;

            if (
              taskData.status === 'completed' &&
              taskData.updatedAt &&
              now - new Date(taskData.updatedAt).getTime() > 30 * 24 * 60 * 60 * 1000
            ) {
              await deleteDoc(doc(db, 'tasks', taskId));
            } else {
              validTasks.push({
                id: taskId,
                ...taskData,
                assignedUserId: taskData.assignedUserId || '',
                isPrivate: taskData.isPrivate || false,
                links: taskData.links || '',
              });
            }
          })
        );

        const recurringTasks: Task[] = [];
        baseTasks.forEach(task => {
          const taskDate = new Date(task.dueDate);
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);
          taskDate.setHours(0, 0, 0, 0);

          let isRecurring = false;
          switch (task.frequency) {
            case 'daily':
              isRecurring = true;
              break;
            case 'weekly':
              isRecurring = (todayDate.getTime() - taskDate.getTime()) % (7 * 24 * 60 * 60 * 1000) === 0;
              break;
            case 'monthly':
              isRecurring = taskDate.getDate() === todayDate.getDate() && taskDate.getMonth() !== todayDate.getMonth();
              break;
            case 'date-wise':
              if (task.repeatDate) {
                const repeatDate = new Date(task.repeatDate).getTime();
                isRecurring = todayDate.getTime() >= repeatDate;
              }
              break;
            default:
              isRecurring = false;
          }

          if (isRecurring && task.status !== 'completed') {
            const newTask: Task = {
              ...task,
              id: `${task.id}-${today}`,
              dueDate: today + 'T' + (task.dueDate.split('T')[1] || '00:00'),
              links: task.links || '',
            };
            recurringTasks.push(newTask);
          }
          if (
            !(task.status === 'completed' && task.updatedAt && now - new Date(task.updatedAt).getTime() > 30 * 24 * 60 * 60 * 1000)
          ) {
            recurringTasks.push(task);
          }
        });

        setTasks(recurringTasks);
        await fetchCategories();
        setLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setLoading(false);
        console.error(err);
      }
    };

    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'contacts'));
        const allCategories = snapshot.docs
          .flatMap((doc) => {
            if (!doc.exists()) return [];
            const data = doc.data();
            return Array.isArray(data.categories) ? data.categories : data.category ? [data.category] : [];
          })
          .filter((cat): cat is string => cat !== undefined && cat.trim() !== '');
        const uniqueCategories = [...new Set(allCategories)];
        console.log('Fetched categories:', uniqueCategories);
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Fetch categories error:', err);
      }
    };

    fetchData();
  }, [email, today]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      if (type === 'checkbox') {
        return { ...prev, [name]: (e.target as HTMLInputElement).checked };
      }
      if (name === 'frequency') {
        const newSubdivision = value === 'date-wise' ? { repeatDate: prev.repeatDate || getCurrentDate() } : {};
        return { ...prev, [name]: value, frequencySubdivision: newSubdivision };
      }
      if (name.startsWith('frequencySubdivision')) {
        const subType = name.split('.')[1];
        return {
          ...prev,
          frequencySubdivision: { ...prev.frequencySubdivision, [subType]: value },
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleNewContactInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNewGuidelineInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewGuidelineForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = (category: string) => {
    if (!newContactForm.categories.includes(category)) {
      setNewContactForm(prev => ({
        ...prev,
        categories: [...prev.categories, category],
      }));
    }
    setCategorySearchQuery('');
    setIsCategoryDropdownOpen(false);
  };

  const handleRemoveCategory = (category: string) => {
    setNewContactForm(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat !== category),
    }));
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      if (!categories.includes(newCategory)) {
        setCategories(prev => [...prev, newCategory]);
      }
      if (!newContactForm.categories.includes(newCategory)) {
        setNewContactForm(prev => ({
          ...prev,
          categories: [...prev.categories, newCategory],
        }));
      }
      setShowAddCategory(false);
      setNewCategory('');
    }
  };

  const handleAddTask = () => {
    setIsAddingTask(true);
    setIsEditingTask(null);
    setShowNewContactForm(false);
    setShowNewGuidelineForm(false);
    setFormData({
      title: '',
      description: '',
      dueDate: getCurrentDate(),
      dueTime: getCurrentTime(),
      frequency: '',
      frequencySubdivision: {},
      repeatDate: '',
      assignedUserId: '',
      referenceContactId: '',
      guidelineId: '',
      priority: 'medium',
      status: 'pending',
      isPrivate: false,
      links: '',
    });
    setNewContactForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      company_name: '',
      date_of_birth: '',
      date_of_anniversary: '',
      categories: [],
    });
    setNewGuidelineForm({ title: '', description: '' });
    setTaskUserSearch('');
    setContactSearch('');
    setPrioritySearch('');
    setGuidelineSearch('');
  };

  const handleEditTask = (task: Task) => {
    setIsEditingTask(task.id);
    setIsAddingTask(false);
    setShowNewContactForm(false);
    setShowNewGuidelineForm(false);
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.split('T')[0],
      dueTime: task.dueDate.split('T')[1]?.slice(0, 5) || getCurrentTime(),
      frequency: task.frequency || '',
      frequencySubdivision: task.frequencySubdivision || {},
      repeatDate: task.repeatDate || '',
      assignedUserId: task.assignedUserId || '',
      referenceContactId: task.referenceContactId || '',
      guidelineId: task.guidelineId || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      isPrivate: task.isPrivate || false,
      links: task.links || '',
    });
    setTaskUserSearch('');
    setContactSearch('');
    setPrioritySearch('');
    setGuidelineSearch('');
  };

  const handleCancel = () => {
    setIsAddingTask(false);
    setIsEditingTask(null);
    setShowNewContactForm(false);
    setShowNewGuidelineForm(false);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      dueTime: '',
      frequency: '',
      frequencySubdivision: {},
      repeatDate: '',
      assignedUserId: '',
      referenceContactId: '',
      guidelineId: '',
      priority: '',
      status: '',
      isPrivate: false,
      links: '',
    });
    setNewContactForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      company_name: '',
      date_of_birth: '',
      date_of_anniversary: '',
      categories: [],
    });
    setNewGuidelineForm({ title: '', description: '' });
    setTaskUserSearch('');
    setContactSearch('');
    setPrioritySearch('');
    setGuidelineSearch('');
    setFilterUserSearch('');
    setCategorySearchQuery('');
    setShowAddCategory(false);
    setNewCategory('');
    setIsCategoryDropdownOpen(false);
  };

  const handleAddNewContact = async () => {
    try {
      if (!newContactForm.name || !newContactForm.phone) return;

      const newRef = doc(collection(db, 'contacts'));
      await setDoc(newRef, {
        ...newContactForm,
        createdAt: new Date().toISOString(),
      });

      const newContact = { id: newRef.id, ...newContactForm } as Contact;
      setContacts(prev => [...prev, newContact]);
      setFormData(prev => ({ ...prev, referenceContactId: newRef.id }));
      setNewContactForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        company_name: '',
        date_of_birth: '',
        date_of_anniversary: '',
        categories: [],
      });
      setShowNewContactForm(false);
      setCategorySearchQuery('');
      setShowAddCategory(false);
      setNewCategory('');
      setIsCategoryDropdownOpen(false);
    } catch (err) {
      console.error('Failed to add contact', err);
    }
  };

  const handleAddNewGuideline = async () => {
    try {
      if (!newGuidelineForm.title) return;

      const newRef = doc(collection(db, 'guidelines'));
      await setDoc(newRef, {
        title: newGuidelineForm.title,
        description: newGuidelineForm.description,
        createdAt: new Date().toISOString(),
      });

      const newGuideline = { id: newRef.id, ...newGuidelineForm } as Guideline;
      setGuidelines(prev => [...prev, newGuideline]);
      setFormData(prev => ({
        ...prev,
        guidelineId: newRef.id,
        description: newGuidelineForm.description,
      }));
      setNewGuidelineForm({ title: '', description: '' });
      setShowNewGuidelineForm(false);
    } catch (err) {
      console.error('Failed to add guideline', err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.dueDate || !formData.assignedUserId) return;

      const taskData: Omit<Task, 'id'> = {
        ...formData,
        dueDate: `${formData.dueDate}T${formData.dueTime}`,
        updatedAt: new Date().toISOString(),
        createdByEmail: email || '',
        isPrivate: formData.isPrivate,
        links: formData.links,
      };

      if (isEditingTask) {
        await updateDoc(doc(db, 'tasks', isEditingTask), taskData);
        setTasks(prev =>
          prev.map(task =>
            task.id === isEditingTask ? { ...taskData, id: isEditingTask } : task
          )
        );
      } else {
        const newRef = doc(collection(db, 'tasks'));
        await setDoc(newRef, {
          ...taskData,
          createdAt: new Date().toISOString(),
        });
        setTasks(prev => [...prev, { ...taskData, id: newRef.id }]);
      }

      handleCancel();
    } catch (err) {
      console.error('Failed to submit task', err);
    }
  };

  const getUserName = (id: string): string => {
    const user = users.find(u => u.id === id);
    return user?.name || 'Unknown';
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

  const getGuidelineTitle = (id: string): string => {
    const guideline = guidelines.find(g => g.id === id);
    return guideline?.title || 'None';
  };

  const getDueStatus = (dueDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffTime < 0) return 'text-red-500';
    if (diffDays === 0) return 'text-orange-500';
    if (diffDays <= 2) return 'text-blue-500';
    return 'text-gray-500';
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const filteredAndSortedTasks = tasks
    .filter(task => {
      const isAdminTask = task.createdByEmail === email;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDueDate = new Date(task.dueDate);

      return (
        (!task.isPrivate || !isAdminTask) &&
        (!filterDueDate ||
          (isOverdueFilterActive
            ? taskDueDate.getTime() < today.getTime() && task.status !== 'completed'
            : task.dueDate.split('T')[0] === filterDueDate)
        ) &&
        (!filterAssignedUser || task.assignedUserId === filterAssignedUser) &&
        (!filterFrequency || task.frequency === filterFrequency) &&
        (!filterPriority || task.priority === filterPriority)
      );
    })
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'dueDate':
          return multiplier * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        case 'assignedUser':
          const aName = getUserName(a.assignedUserId);
          const bName = getUserName(b.assignedUserId);
          return multiplier * aName.localeCompare(bName);
        case 'frequency':
          return multiplier * (a.frequency || '').localeCompare(b.frequency || '');
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return multiplier * ((priorityOrder[b.priority || 'medium'] || 0) - (priorityOrder[a.priority || 'medium'] || 0));
        default:
          return 0;
      }
    });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFrequencySubdivisionDisplay = (task: Task): string => {
    if (!task.frequencySubdivision) return '';
    if (task.frequency === 'daily' && task.frequencySubdivision.daily) {
      return ` (${task.frequencySubdivision.daily})`;
    }
    if (task.frequency === 'weekly' && task.frequencySubdivision.weekly) {
      return ` (${task.frequencySubdivision.weekly})`;
    }
    if (task.frequency === 'monthly' && task.frequencySubdivision.monthly) {
      return ` (${task.frequencySubdivision.monthly})`;
    }
    return '';
  };

  const handleTaskUserSelect = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedUserId: userId,
    }));
    setShowTaskUserDropdown(false);
    setTaskUserSearch('');
  };

  const handleFilterUserSelect = (userId: string) => {
    setFilterAssignedUser(userId);
    setShowFilterUserDropdown(false);
    setFilterUserSearch('');
  };

  const handleContactSelect = (contactId: string) => {
    setFormData(prev => ({ ...prev, referenceContactId: contactId }));
    setShowContactDropdown(false);
    setContactSearch('');
  };

  const handleGuidelineSelect = (guidelineId: string) => {
    const guideline = guidelines.find(g => g.id === guidelineId);
    setFormData(prev => ({
      ...prev,
      guidelineId: guidelineId,
      description: guideline ? guideline.description : prev.description,
    }));
    setShowGuidelineDropdown(false);
    setGuidelineSearch('');
  };

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const handlePrioritySelect = (priority: string) => {
    setFormData(prev => ({ ...prev, priority: priority as 'low' | 'medium' | 'high' }));
    setShowPriorityDropdown(false);
    setPrioritySearch('');
  };

  const handleOverdueFilter = () => {
    setFilterDueDate('');
    setFilterAssignedUser('');
    setFilterFrequency('');
    setFilterPriority('');
    setSortField('dueDate');
    setSortDirection('asc');
    setFilterUserSearch('');
    setIsOverdueFilterActive(true);
  };

  const handleResetFilters = () => {
    setFilterDueDate('');
    setFilterAssignedUser('');
    setFilterFrequency('');
    setFilterPriority('');
    setSortField('dueDate');
    setSortDirection('asc');
    setFilterUserSearch('');
    setIsOverdueFilterActive(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterUserDropdownRef.current && !filterUserDropdownRef.current.contains(event.target as Node)) {
        setShowFilterUserDropdown(false);
      }
      if (taskUserDropdownRef.current && !taskUserDropdownRef.current.contains(event.target as Node)) {
        setShowTaskUserDropdown(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
      if (guidelineDropdownRef.current && !guidelineDropdownRef.current.contains(event.target as Node)) {
        setShowGuidelineDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      {/* Filter and Sort Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters & Sorting</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Due Date</label>
            <input
              type="date"
              value={filterDueDate}
              onChange={(e) => {
                setFilterDueDate(e.target.value);
                setIsOverdueFilterActive(false);
              }}
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
          <div ref={filterUserDropdownRef}>
            <label className="block text-sm text-gray-700">Assigned User</label>
            <div className="relative">
              <input
                type="text"
                value={filterAssignedUser ? getUserName(filterAssignedUser) : filterUserSearch}
                onChange={(e) => setFilterUserSearch(e.target.value)}
                onFocus={() => setShowFilterUserDropdown(true)}
                placeholder="Search users..."
                className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
              {showFilterUserDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                  {users
                    .filter(user =>
                      user.name.toLowerCase().includes(filterUserSearch.toLowerCase()) ||
                      user.email.toLowerCase().includes(filterUserSearch.toLowerCase())
                    )
                    .map(user => (
                      <div
                        key={user.id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer ${
                          filterAssignedUser === user.id ? 'bg-blue-100' : ''
                        }`}
                        onClick={() => handleFilterUserSelect(user.id)}
                      >
                        {user.name} ({user.email})
                      </div>
                    ))}
                  <div
                    className={`p-2 hover:bg-gray-100 cursor-pointer ${
                      filterAssignedUser === '' ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => handleFilterUserSelect('')}
                  >
                    All Users
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Frequency</label>
            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">All Frequencies</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="date-wise">Date-wise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleSort('dueDate')}
              className={`px-3 py-1 rounded ${sortField === 'dueDate' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Due Date {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('assignedUser')}
              className={`px-3 py-1 rounded ${sortField === 'assignedUser' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Assigned {sortField === 'assignedUser' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('frequency')}
              className={`px-3 py-1 rounded ${sortField === 'frequency' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Frequency {sortField === 'frequency' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('priority')}
              className={`px-3 py-1 rounded ${sortField === 'priority' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Priority {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={handleOverdueFilter}
              className={`px-3 py-1 rounded ${isOverdueFilterActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Overdue
            </button>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-3 py-1 rounded bg-gray-200 text-gray-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Add Task Button */}
      <div className="mb-4">
        <button
          onClick={handleAddTask}
          className="bg-blue-600 text-white px-3 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm sm:text-base md:text-lg"
        >
          <Plus size={16} />
          Add a task
        </button>
      </div>

      {/* Task Form */}
      {(isAddingTask || isEditingTask) && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <Circle size={20} className="text-gray-400" />
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Title"
              className="flex-1 border-b border-gray-300 p-2 bg-transparent focus:outline-none focus:border-blue-500 text-sm sm:text-base md:text-lg"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description + References"
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
              rows={3}
            />
            <input
              type="url"
              name="links"
              value={formData.links}
              onChange={handleInputChange}
              placeholder="Add a link (e.g., https://example.com)"
              className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  min={getCurrentDate()}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Due Time</label>
                <input
                  type="time"
                  name="dueTime"
                  value={formData.dueTime}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Frequency</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                >
                  <option value="">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="date-wise">Date-wise</option>
                </select>
              </div>
              {formData.frequency === 'daily' && (
                <div>
                  <label className="block text-sm sm:text-base md:text-lg text-gray-700">Daily Schedule</label>
                  <select
                    name="frequencySubdivision.daily"
                    value={formData.frequencySubdivision.daily || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  >
                    <option value="">Select time</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              )}
              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm sm:text-base md:text-lg text-gray-700">Weekly Day</label>
                  <select
                    name="frequencySubdivision.weekly"
                    value={formData.frequencySubdivision.weekly || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  >
                    <option value="">Select day</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
              )}
              {formData.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm sm:text-base md:text-lg text-gray-700">Monthly Period</label>
                  <select
                    name="frequencySubdivision.monthly"
                    value={formData.frequencySubdivision.monthly || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  >
                    <option value="">Select period</option>
                    <option value="beginning">Beginning</option>
                    <option value="middle">Middle</option>
                    <option value="end">End</option>
                  </select>
                </div>
              )}
              {formData.frequency === 'date-wise' && (
                <div>
                  <label className="block text-sm sm:text-base md:text-lg text-gray-700">Repeat Date</label>
                  <input
                    type="date"
                    name="repeatDate"
                    value={formData.repeatDate || ''}
                    onChange={handleInputChange}
                    min={getCurrentDate()}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                </div>
              )}
              <div ref={taskUserDropdownRef}>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Assign to</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.assignedUserId ? getUserName(formData.assignedUserId) : taskUserSearch}
                    onChange={(e) => setTaskUserSearch(e.target.value)}
                    onFocus={() => setShowTaskUserDropdown(true)}
                    placeholder="Search users..."
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  {showTaskUserDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                      {users
                        .filter(user =>
                          user.name.toLowerCase().includes(taskUserSearch.toLowerCase()) ||
                          user.email.toLowerCase().includes(taskUserSearch.toLowerCase())
                        )
                        .map(user => (
                          <div
                            key={user.id}
                            className={`p-2 hover:bg-gray-100 cursor-pointer ${
                              formData.assignedUserId === user.id ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => handleTaskUserSelect(user.id)}
                          >
                            {user.name} ({user.email})
                          </div>
                        ))}
                      <div
                        className={`p-2 hover:bg-gray-100 cursor-pointer ${
                          formData.assignedUserId === '' ? 'bg-blue-100' : ''
                        }`}
                        onClick={() => handleTaskUserSelect('')}
                      >
                        None
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div ref={priorityDropdownRef}>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Priority</label>
                <div className="relative">
                  <input
                    type="text"
                    value={prioritySearch || formData.priority}
                    onChange={(e) => setPrioritySearch(e.target.value)}
                    onFocus={() => setShowPriorityDropdown(true)}
                    placeholder="Select priority"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  {showPriorityDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                      {priorities
                        .filter(p => p.label.toLowerCase().includes(prioritySearch.toLowerCase()))
                        .map(p => (
                          <div
                            key={p.value}
                            className={`p-2 hover:bg-gray-100 cursor-pointer ${
                              formData.priority === p.value ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => handlePrioritySelect(p.value)}
                          >
                            {p.label}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div ref={guidelineDropdownRef}>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Guideline</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={guidelineSearch || (formData.guidelineId ? getGuidelineTitle(formData.guidelineId) : '')}
                      onChange={(e) => setGuidelineSearch(e.target.value)}
                      onFocus={() => setShowGuidelineDropdown(true)}
                      placeholder="Search guidelines..."
                      className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                    />
                    {showGuidelineDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                        {guidelines
                          .filter(guideline =>
                            guideline.title.toLowerCase().includes(guidelineSearch.toLowerCase())
                          )
                          .map(guideline => (
                            <div
                              key={guideline.id}
                              className={`p-2 hover:bg-gray-100 cursor-pointer ${
                                formData.guidelineId === guideline.id ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => handleGuidelineSelect(guideline.id)}
                            >
                              {guideline.title}
                            </div>
                          ))}
                        <div
                          className={`p-2 hover:bg-gray-100 cursor-pointer ${
                            formData.guidelineId === '' ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => handleGuidelineSelect('')}
                        >
                          None
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNewGuidelineForm(!showNewGuidelineForm)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              {showNewGuidelineForm && (
                <div className="col-span-2 space-y-2 p-4 bg-white rounded-lg shadow">
                  <input
                    type="text"
                    name="title"
                    value={newGuidelineForm.title}
                    onChange={handleNewGuidelineInputChange}
                    placeholder="Guideline Title"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <textarea
                    name="description"
                    value={newGuidelineForm.description}
                    onChange={handleNewGuidelineInputChange}
                    placeholder="Guideline Description"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewGuideline}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm sm:text-base md:text-lg"
                    >
                      Save Guideline
                    </button>
                    <button
                      onClick={() => setShowNewGuidelineForm(false)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm sm:text-base md:text-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <div ref={contactDropdownRef}>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Contact</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={contactSearch || (formData.referenceContactId ? getContactName(formData.referenceContactId) : '')}
                      onChange={(e) => setContactSearch(e.target.value)}
                      onFocus={() => setShowContactDropdown(true)}
                      placeholder="Search contacts..."
                      className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                    />
                    {showContactDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                        {contacts
                          .filter(contact =>
                            contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                            contact.phone.toLowerCase().includes(contactSearch.toLowerCase())
                          )
                          .map(contact => (
                            <div
                              key={contact.id}
                              className={`p-2 hover:bg-gray-100 cursor-pointer ${
                                formData.referenceContactId === contact.id ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => handleContactSelect(contact.id)}
                            >
                              {contact.name} ({contact.phone || 'No phone'})
                            </div>
                          ))}
                        <div
                          className={`p-2 hover:bg-gray-100 cursor-pointer ${
                            formData.referenceContactId === '' ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => handleContactSelect('')}
                        >
                          None
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNewContactForm(!showNewContactForm)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base md:text-lg text-gray-700">Private Task</label>
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={formData.isPrivate}
                  onChange={handleInputChange}
                  className="mt-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Hide from admin view</span>
              </div>
              {showNewContactForm && (
                <div className="col-span-2 space-y-2 p-4 bg-white rounded-lg shadow">
                  <input
                    type="text"
                    name="name"
                    value={newContactForm.name}
                    onChange={handleNewContactInputChange}
                    placeholder="Name *"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <input
                    type="email"
                    name="email"
                    value={newContactForm.email}
                    onChange={handleNewContactInputChange}
                    placeholder="Email *"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={newContactForm.phone}
                    onChange={handleNewContactInputChange}
                    placeholder="Phone *"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <input
                    type="text"
                    name="address"
                    value={newContactForm.address}
                    onChange={handleNewContactInputChange}
                    placeholder="Address"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <input
                    type="text"
                    name="company_name"
                    value={newContactForm.company_name}
                    onChange={handleNewContactInputChange}
                    placeholder="Company"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newContactForm.date_of_birth}
                    onChange={handleNewContactInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <label className="block text-sm font-medium mb-1">Date of Anniversary</label>
                  <input
                    type="date"
                    name="date_of_anniversary"
                    value={newContactForm.date_of_anniversary}
                    onChange={handleNewContactInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
                  />
                  <div className="w-full" ref={categoryDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:text-base">Categories</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {newContactForm.categories.map((cat) => (
                        <div
                          key={cat}
                          className="bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center text-xs sm:text-sm"
                        >
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat)}
                            className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
                          >
                            <X size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="relative w-full">
                      <input
                        type="text"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base md:text-lg"
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
                            .filter((cat) => cat.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                            .map((category) => (
                              <div
                                key={category}
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleAddCategory(category)}
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
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddNewContact}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm sm:text-base md:text-lg"
                    >
                      Save Contact
                    </button>
                    <button
                      onClick={() => setShowNewContactForm(false)}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 text-sm sm:text-base md:text-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base md:text-lg"
              >
                {isEditingTask ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors text-sm sm:text-base md:text-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-500 text-sm sm:text-base md:text-lg">Loading tasks...</p>
        </div>
      ) : filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <p>No tasks match the current filters.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredAndSortedTasks.map(task => (
            <li key={task.id} className="bg-white p-4 rounded-lg shadow hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Circle size={16} className="text-gray-400" />
                    <h3
                      className={`font-medium text-sm sm:text-base md:text-lg ${
                        task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                  {task.description && (
                    <p
                      className={`text-xs sm:text-sm md:text-base mb-2 ${
                        task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-600'
                      }`}
                    >
                      {task.description}
                    </p>
                  )}
                  {task.links && (
                    <p className="text-xs sm:text-sm md:text-base mb-2 text-blue-600 hover:underline">
                      <a
                        href={task.links.startsWith('http://') || task.links.startsWith('https://') ? task.links : `https://${task.links}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {task.links}
                      </a>
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm md:text-base">
                    <span className={`font-medium ${getDueStatus(task.dueDate)}`}>
                      Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
                      {task.status !== 'completed' && getOverdueTime(task.dueDate)}
                    </span>
                    {task.frequency && (
                      <span className="text-gray-600">
                        Frequency: {task.frequency}
                        {getFrequencySubdivisionDisplay(task)}
                        {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
                      </span>
                    )}
                    <span className="text-gray-600">
                      Assigned: {task.assignedUserId ? getUserName(task.assignedUserId) : 'None'}
                      {task.assignedUserId && getUserPhone(task.assignedUserId) && (
                        <div className="inline-flex ml-1 gap-1">
                          <a
                            href={`tel:${getUserPhone(task.assignedUserId)}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Phone size={12} />
                          </a>
                          <a
                            href={`https://wa.me/${getUserPhone(task.assignedUserId)}?text=${encodeURIComponent('Task: ' + task.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                          >
                            <MessageSquareText size={12} />
                          </a>
                        </div>
                      )}
                    </span>
                    {task.priority && (
                      <span className="text-gray-600">
                        Priority:{' '}
                        <span
                          className={
                            task.priority === 'high'
                              ? 'text-red-500'
                              : task.priority === 'medium'
                              ? 'text-yellow-500'
                              : 'text-green-500'
                          }
                        >
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </span>
                    )}
                    {task.referenceContactId && (
                      <span className="text-gray-600">
                        Contact: {getContactName(task.referenceContactId)}
                        {getContactPhone(task.referenceContactId) && (
                          <div className="inline-flex ml-1 gap-1">
                            <a
                              href={`tel:${getContactPhone(task.referenceContactId)}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Phone size={12} />
                            </a>
                            <a
                              href={`https://wa.me/${getContactPhone(
                                task.referenceContactId
                              )}?text=${encodeURIComponent('Regarding task: ' + task.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800"
                            >
                              <MessageSquareText size={12} />
                            </a>
                          </div>
                        )}
                      </span>
                    )}
                    {task.guidelineId && (
                      <span className="text-gray-600">Guideline: {getGuidelineTitle(task.guidelineId)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
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
  );
}

export default Tasks;
