
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Phone, MessageSquareText } from 'lucide-react';

// Define TypeScript interfaces
interface User {
  id: string;
  email: string;
  phone: string;
  name?: string;
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

interface ParentTask {
  id: string;
  title: string;
  createdAt: string;
  createdByEmail: string;
}

interface TimeLog {
  date: string;
  minutes: number;
  userId?: string;
}

interface LoginTime {
  userId: string;
  timestamp: string; // ISO string, e.g., "2025-05-11T12:34:56Z"
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
  assignedUserId: string; // Comma-separated string for multiple users, e.g., "user1,user2", or single ID
  referenceContactId?: string;
  guidelineId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByEmail: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority?: 'low' | 'medium' | 'high';
  isPrivate: boolean;
  links?: string;
  parentTaskId?: string;
  timeLogs?: TimeLog[];
  loginTimes?: LoginTime[];
}

export const Dashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeInputs, setTimeInputs] = useState<{ [taskId: string]: string }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');

  const navigate = useNavigate();
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('name');

  const today = new Date().toISOString().split('T')[0];

  const formatDateTime = (date: string, time: string): string => {
    return new Date(`${date}T${time}`).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (id: string): string => {
    if (!id) return 'None';
    const userIds = id.split(',').filter(uid => uid.trim());
    if (userIds.length === 0) return 'None';
    const names = userIds
      .map(uid => {
        const user = users.find(u => u.id === uid);
        return user?.name || 'Unknown';
      })
      .filter(name => name !== 'Unknown');
    return names.length > 0 ? names.join(', ') : 'None';
  };

  const getUserPhone = (id: string): (string | null)[] => {
    if (!id) return [];
    const userIds = id.split(',').filter(uid => uid.trim());
    return userIds
      .map(uid => {
        const user = users.find(u => u.id === uid);
        return user?.phone || null;
      })
      .filter(phone => phone !== null);
  };

  const getContactDetails = (id: string): { name: string; phone: string | null } => {
    const contact = contacts.find((c) => c.id === id);
    return contact
      ? { name: contact.name || 'No name', phone: contact.phone || null }
      : { name: 'None', phone: null };
  };

  const getContactName = (id: string): string => getContactDetails(id).name;
  const getContactPhone = (id: string): string | null => getContactDetails(id).phone;

  const getGuidelineTitle = (id: string): string => {
    const guideline = guidelines.find((g) => g.id === id);
    return guideline?.title || 'None';
  };

  const getParentTaskTitle = (id: string): string => {
    const parentTask = parentTasks.find((t) => t.id === id);
    return parentTask?.title || 'None';
  };

  const getDueStatus = (dueDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffTime < 0) return '#ef4444'; // red
    if (diffDays === 0) return '#f97316'; // orange
    if (diffDays <= 2) return '#3b82f6'; // blue
    return '#6b7280'; // gray
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

  const hasUserLoggedTime = (task: Task): boolean => {
    if (!task.timeLogs || !userId) return false;
    return task.timeLogs.some((log) => log.userId === userId);
  };

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const [userSnap, contactSnap, guidelineSnap, parentTaskSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'contacts')),
          getDocs(collection(db, 'guidelines')),
          getDocs(collection(db, 'parentTasks')),
        ]);

        setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User)));
        setContacts(
          contactSnap.docs.map((doc) => {
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
        setGuidelines(guidelineSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Guideline)));
        setParentTasks(parentTaskSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ParentTask)));

        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', email));
        const userSnapResult = await getDocs(userQuery);

        if (userSnapResult.empty) throw new Error('User not found.');
        const currentUserId = userSnapResult.docs[0].id;
        setUserId(currentUserId);

        const tasksRef = collection(db, 'tasks');
        const tasksSnap = await getDocs(tasksRef);

        // Filter tasks to include those where the current user is an assignee (single or exactly two assignees)
        const baseTasks = tasksSnap.docs
          .map((docSnap) => {
            const taskData = docSnap.data();
            return {
              id: docSnap.id,
              ...taskData,
              assignedUserId: taskData.assignedUserId || '',
              isPrivate: taskData.isPrivate || false,
              links: taskData.links || '',
              parentTaskId: taskData.parentTaskId || '',
              status: taskData.status || 'pending',
              timeLogs: taskData.timeLogs || [],
              loginTimes: taskData.loginTimes || [],
              createdByEmail: taskData.createdByEmail || '',
            } as Task;
          })
          .filter((task) => {
            const userIds = task.assignedUserId.split(',').filter((id) => id.trim());
            return (userIds.length === 1 || userIds.length === 2) && userIds.includes(currentUserId);
          });

        const allTasks: Task[] = [];

        baseTasks.forEach((task) => {
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
              isRecurring = taskDate.getDate() === todayDate.getDate();
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

          const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'completed';
          const status = isOverdue ? 'overdue' : task.status;

          // Add the original task with updated status
          allTasks.push({ ...task, status });

          // Add recurring instances if applicable
          if (isRecurring && task.status !== 'completed') {
            const newTask: Task = {
              ...task,
              id: `${task.id}-${today}`,
              dueDate: today + 'T' + (task.dueDate.split('T')[1] || '00:00'),
              status,
            };
            allTasks.push(newTask);
          }
        });

        setTasks(allTasks);
        setFilteredTasks(allTasks);
        setError('');
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email, navigate, today]);

  useEffect(() => {
    // Filter and sort tasks
    let updatedTasks = [...tasks];

    // Apply status filter
    if (statusFilter !== 'all') {
      updatedTasks = updatedTasks.filter((task) => task.status === statusFilter);
    }

    // Apply sorting
    updatedTasks.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    setFilteredTasks(updatedTasks);
  }, [tasks, statusFilter, sortBy]);

  const handleTimeInputChange = (taskId: string, value: string) => {
    setTimeInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubmitTime = async (taskId: string) => {
    const minutes = parseFloat(timeInputs[taskId]);
    if (isNaN(minutes) || minutes <= 0 || !userId) return;

    const today = new Date().toISOString().split('T')[0];
    const task = tasks.find((t) => t.id === taskId);
    const alreadyLogged = task?.timeLogs?.some((log) => log.date === today && log.userId === userId);

    if (alreadyLogged) return;

    const taskRef = doc(db, 'tasks', taskId.split('-')[0]);
    const newTimeLog: TimeLog = { date: today, minutes, userId };

    try {
      await updateDoc(taskRef, { timeLogs: arrayUnion(newTimeLog) });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, timeLogs: [...(task.timeLogs || []), newTimeLog] }
            : task
        )
      );
      setFilteredTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, timeLogs: [...(task.timeLogs || []), newTimeLog] }
            : task
        )
      );
      setTimeInputs((prev) => ({ ...prev, [taskId]: '' }));
    } catch (err) {
      console.error('Error updating time log:', err);
      setError('Failed to submit time');
    }
  };

  const validateStatus = (value: string): Task['status'] => {
    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue'] as const;
    return validStatuses.includes(value as any) ? value as Task['status'] : 'pending';
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const validStatus = validateStatus(status);
    if (!userId) return;

    try {
      const originalTaskId = taskId.split('-')[0];
      const taskRef = doc(db, 'tasks', originalTaskId);
      const updates: { status: Task['status']; loginTimes?: LoginTime[] } = { status: validStatus };

      // If moving to in_progress, record login time
      if (validStatus === 'in_progress') {
        const newLoginTime: LoginTime = {
          userId,
          timestamp: new Date().toISOString(),
        };
        updates.loginTimes = arrayUnion(newLoginTime);
      }

      await updateDoc(taskRef, updates);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: validStatus,
                loginTimes:
                  validStatus === 'in_progress'
                    ? [...(task.loginTimes || []), { userId, timestamp: new Date().toISOString() }]
                    : task.loginTimes,
              }
            : task
        )
      );
      setFilteredTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: validStatus,
                loginTimes:
                  validStatus === 'in_progress'
                    ? [...(task.loginTimes || []), { userId, timestamp: new Date().toISOString() }]
                    : task.loginTimes,
              }
            : task
        )
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status');
    }
  };

  const handleAddTask = () => navigate('/tasks');

  if (loading) return <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>Loading tasks...</div>;
  if (error) return <div style={{ padding: '24px', color: '#ef4444', textAlign: 'center' }}>{error}</div>;

  const pendingTasks = filteredTasks.filter((task) => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter((task) => task.status === 'in_progress');
  const overdueTasks = filteredTasks.filter((task) => task.status === 'overdue');
  const completedTasks = filteredTasks.filter((task) => task.status === 'completed');

  // Render individual task component
  const renderTask = (task: Task) => (
    <div
      key={task.id}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>
          {task.title} {task.parentTaskId ? `(${getParentTaskTitle(task.parentTaskId)})` : ''}
        </h4>
        {task.description && <p style={{ color: '#4b5563', fontSize: '14px' }}>{task.description}</p>}
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
        <div style={{ display: 'grid', gap: '4px', fontSize: '14px' }}>
          <span style={{ fontWeight: '500', color: getDueStatus(task.dueDate) }}>
            Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
          </span>
          {task.frequency && (
            <span style={{ color: '#4b5563' }}>
              Frequency: {task.frequency}
              {getFrequencySubdivisionDisplay(task)}
              {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
            </span>
          )}
          <span style={{ color: '#4b5563' }}>
            Assigned: {getUserName(task.assignedUserId)}
            {getUserPhone(task.assignedUserId).map((phone, index) => (
              phone && (
                <div key={index} style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                  <a
                    href={`tel:${phone}`}
                    style={{ color: '#2563eb' }}
                    aria-label={`Call ${getUserName(task.assignedUserId.split(',')[index])}`}
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent('Regarding task: ' + task.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#16a34a' }}
                    aria-label={`Message ${getUserName(task.assignedUserId.split(',')[index])} on WhatsApp about ${task.title}`}
                  >
                    <MessageSquareText size={16} />
                  </a>
                </div>
              )
            ))}
          </span>
          {task.priority && (
            <span style={{ color: '#4b5563' }}>
              Priority:{' '}
              <span
                style={{
                  color:
                    task.priority === 'high'
                      ? '#ef4444'
                      : task.priority === 'medium'
                      ? '#f97316'
                      : '#22c55e',
                }}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            </span>
          )}
          {task.referenceContactId && (
            <span style={{ color: '#4b5563' }}>
              Contact: {getContactName(task.referenceContactId)}
              {getContactPhone(task.referenceContactId) && (
                <div style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                  <a
                    href={`tel:${getContactPhone(task.referenceContactId)}`}
                    style={{ color: '#2563eb' }}
                    aria-label={`Call ${getContactName(task.referenceContactId)}`}
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`https://wa.me/${getContactPhone(task.referenceContactId)}?text=${encodeURIComponent('Regarding task: ' + task.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#16a34a' }}
                    aria-label={`Message ${getContactName(task.referenceContactId)} on WhatsApp about ${task.title}`}
                  >
                    <MessageSquareText size={16} />
                  </a>
                </div>
              )}
            </span>
          )}
          {task.guidelineId && (
            <span style={{ color: '#4b5563' }}>Guideline: {getGuidelineTitle(task.guidelineId)}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {task.status === 'pending' && (
            <button
              style={{
                backgroundColor: '#facc15',
                color: '#ffffff',
                fontSize: '14px',
                padding: '4px 12px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
            >
              Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <>
              {hasUserLoggedTime(task) && (
                <button
                  style={{
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    fontSize: '14px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => updateTaskStatus(task.id, 'completed')}
                >
                  Complete
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Minutes"
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '14px',
                    width: '80px',
                  }}
                  value={timeInputs[task.id] || ''}
                  onChange={(e) => handleTimeInputChange(task.id, e.target.value)}
                />
                <button
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '14px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: task.timeLogs?.some((log) => log.date === today && log.userId === userId) ? '0.5' : '1',
                  }}
                  onClick={() => handleSubmitTime(task.id)}
                  disabled={!!task.timeLogs?.some((log) => log.date === today && log.userId === userId)}
                >
                  Log Time
                </button>
              </div>
            </>
          )}
          {task.status === 'overdue' && (
            <button
              style={{
                backgroundColor: '#facc15',
                color: '#ffffff',
                fontSize: '14px',
                padding: '4px 12px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
            >
              Start
            </button>
          )}
        </div>
        {task.timeLogs && task.timeLogs.length > 0 && (
          <p style={{ marginTop: '8px', color: '#4b5563', fontSize: '14px' }}>
            Logged: {task.timeLogs[task.timeLogs.length - 1].minutes} min
            {task.timeLogs[task.timeLogs.length - 1].minutes !== 1 ? 's' : ''}.
            {task.timeLogs[task.timeLogs.length - 1].date}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>
          Hi, {name || 'User'}
        </h1>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>
          It always seems impossible until it's done.
        </h3>

        {/* Filter and Sort Controls */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '14px', color: '#4b5563', marginRight: '8px' }}>Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#4b5563', marginRight: '8px' }}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
              }}
            >
              <option value="dueDate">Due Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        {/* Tasks Display */}
        {statusFilter === 'all' ? (
          <div style={{ maxHeight: '700px', overflowY: 'auto', paddingRight: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151' }}>
                Tasks <span style={{ fontSize: '14px', color: '#6b7280' }}>({filteredTasks.length})</span>
              </h3>
              <button
                onClick={handleAddTask}
                style={{ color: '#2563eb', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
            {filteredTasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No tasks available</p>
            ) : (
              filteredTasks.map(renderTask)
            )}
          </div>
        ) : (
          <>
            {/* Pending Section */}
            {statusFilter === 'pending' && (
              <div id="pending-section" style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151' }}>
                    Pending <span style={{ fontSize: '14px', color: '#6b7280' }}>({pendingTasks.length})</span>
                  </h3>
                  <button
                    onClick={handleAddTask}
                    style={{ color: '#2563eb', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {pendingTasks.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No pending tasks</p>
                  ) : (
                    pendingTasks.map(renderTask)
                  )}
                </div>
              </div>
            )}

            {/* In Progress Section */}
            {statusFilter === 'in_progress' && (
              <div id="in_progress-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
                  In Progress <span style={{ fontSize: '14px', color: '#6b7280' }}>({inProgressTasks.length})</span>
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {inProgressTasks.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No tasks in progress</p>
                  ) : (
                    inProgressTasks.map(renderTask)
                  )}
                </div>
              </div>
            )}

            {/* Overdue Section */}
            {statusFilter === 'overdue' && (
              <div id="overdue-section" style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
                  Overdue <span style={{ fontSize: '14px', color: '#6b7280' }}>({overdueTasks.length})</span>
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {overdueTasks.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No overdue tasks</p>
                  ) : (
                    overdueTasks.map(renderTask)
                  )}
                </div>
              </div>
            )}

            {/* Completed Section */}
            {statusFilter === 'completed' && (
              <div id="completed-section">
                <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
                  Completed <span style={{ fontSize: '14px', color: '#6b7280' }}>({completedTasks.length})</span>
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {completedTasks.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No completed tasks</p>
                  ) : (
                    completedTasks.map(renderTask)
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
