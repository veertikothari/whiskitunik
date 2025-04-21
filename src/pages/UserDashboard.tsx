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
import Chart from 'chart.js/auto';

// Define TypeScript interfaces
interface User {
  id: string;
  email: string;
  phone: string;
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
  category: string;
  [key: string]: any;
}

interface Guideline {
  id: string;
  title: string;
  description: string;
}

interface TimeLog {
  date: string;
  hours: number;
  userId?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'date-wise' | '';
  repeatDate?: string;
  assignedUserId: string;
  referenceContactId?: string;
  guidelineId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  timeLogs?: TimeLog[];
}

export const UserDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeInputs, setTimeInputs] = useState<{ [taskId: string]: string }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);

  const navigate = useNavigate();
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('name');

  const today = new Date('2025-04-21').toISOString().split('T')[0];

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
    const user = users.find((u) => u.id === id);
    return user?.name || 'Unknown';
  };

  const getUserPhone = (id: string): string | null => {
    const user = users.find((u) => u.id === id);
    return user?.phone || null;
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

  const getDueStatus = (dueDate: string): string => {
    const today = new Date('2025-04-21');
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffTime < 0) return '#ef4444'; // red
    if (diffDays === 0) return '#f97316'; // orange
    if (diffDays <= 2) return '#3b82f6'; // blue
    return '#6b7280'; // gray
  };

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const [userSnap, contactSnap, guidelineSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'contacts')),
          getDocs(collection(db, 'guidelines')),
        ]);

        setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User)));
        setContacts(contactSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Contact)));
        setGuidelines(guidelineSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Guideline)));

        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', email));
        const userSnapResult = await getDocs(userQuery);

        if (userSnapResult.empty) throw new Error('User not found.');
        const currentUserId = userSnapResult.docs[0].id;
        setUserId(currentUserId);

        const tasksRef = collection(db, 'tasks');
        const tasksQuery = query(tasksRef, where('assignedUserId', '==', currentUserId));
        const tasksSnap = await getDocs(tasksQuery);

        const now = Date.now();
        const baseTasks = tasksSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Task));
        const recurringTasks: Task[] = [];

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

          const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'completed';
          const status = isOverdue ? 'overdue' : task.status || 'pending';

          if (isRecurring && task.status !== 'completed') {
            const newTask: Task = { ...task, id: `${task.id}-${today}`, dueDate: today + 'T' + task.dueDate.split('T')[1], status };
            recurringTasks.push(newTask);
          }
          if (!(task.status === 'completed' && task.updatedAt && now - new Date(task.updatedAt).getTime() > 30 * 24 * 60 * 60 * 1000)) {
            recurringTasks.push({ ...task, status });
          }
        });

        setTasks(recurringTasks);
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
    if (tasks.length > 0 && !chartInstance) {
      const ctx = document.getElementById('taskChart') as HTMLCanvasElement;
      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const overdue = tasks.filter((t) => t.status === 'overdue').length;
      const completed = tasks.filter((t) => t.status === 'completed').length;

      const newChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Pending', 'In Progress', 'Overdue', 'Completed'],
          datasets: [{
            data: [pending, inProgress, overdue, completed],
            backgroundColor: ['#f1f7b5', '#9ea1d4', '#fd8a81', '#a8d1d1'],
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Task Status Distribution' },
          },
          onClick: (_, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const sectionIds = ['pending', 'in_progress', 'overdue', 'completed'];
              const section = document.getElementById(`${sectionIds[index]}-section`);
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            }
          },
        },
      });
      setChartInstance(newChart);
    }
    return () => {
      if (chartInstance) chartInstance.destroy();
    };
  }, [tasks, chartInstance]);

  const handleTimeInputChange = (taskId: string, value: string) => {
    setTimeInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubmitTime = async (taskId: string) => {
    const hours = parseFloat(timeInputs[taskId]);
    if (isNaN(hours) || hours <= 0 || !userId) return;

    const today = new Date('2025-04-21').toISOString().split('T')[0];
    const task = tasks.find((t) => t.id === taskId);
    const alreadyLogged = task?.timeLogs?.some((log) => log.date === today);

    if (alreadyLogged) return;

    const taskRef = doc(db, 'tasks', taskId.split('-')[0]);
    const newTimeLog: TimeLog = { date: today, hours, userId };

    try {
      await updateDoc(taskRef, { timeLogs: arrayUnion(newTimeLog) });
      setTasks((prev) =>
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
    try {
      const originalTaskId = taskId.split('-')[0];
      const taskRef = doc(db, 'tasks', originalTaskId);
      await updateDoc(taskRef, { status: validStatus });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: validStatus } : task
        )
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status');
    }
  };

  const handleAddTask = () => navigate('/usertasks');

  if (loading) return <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>Loading tasks...</div>;
  if (error) return <div style={{ padding: '24px', color: '#ef4444', textAlign: 'center' }}>{error}</div>;

  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress');
  const overdueTasks = tasks.filter((task) => task.status === 'overdue');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '16px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>
          Hi, {name}
        </h1>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '24px' }}>
          It always seems impossible until it's done.
        </h3>

        {/* Pie Chart */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <canvas id="taskChart" style={{ maxWidth: '400px', margin: '0 auto' }}></canvas>
        </div>

        {/* Pending Section */}
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
              pendingTasks.map((task) => (
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
                    <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>{task.title}</h4>
                    {task.description && <p style={{ color: '#4b5563', fontSize: '14px' }}>{task.description}</p>}
                    <div style={{ display: 'grid', gap: '4px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '500', color: getDueStatus(task.dueDate) }}>
                        Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
                      </span>
                      {task.frequency && (
                        <span style={{ color: '#4b5563' }}>
                          Frequency: {task.frequency}
                          {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
                        </span>
                      )}
                      <span style={{ color: '#4b5563' }}>
                        Assigned: {getUserName(task.assignedUserId)}
                        {getUserPhone(task.assignedUserId) && (
                          <div style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                            
                          </div>
                        )}
                      </span>
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* In Progress Section */}
        <div id="in_progress-section" style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
            In Progress <span style={{ fontSize: '14px', color: '#6b7280' }}>({inProgressTasks.length})</span>
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {inProgressTasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No tasks in progress</p>
            ) : (
              inProgressTasks.map((task) => (
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
                    <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>{task.title}</h4>
                    {task.description && <p style={{ color: '#4b5563', fontSize: '14px' }}>{task.description}</p>}
                    <div style={{ display: 'grid', gap: '4px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '500', color: getDueStatus(task.dueDate) }}>
                        Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
                      </span>
                      {task.frequency && (
                        <span style={{ color: '#4b5563' }}>
                          Frequency: {task.frequency}
                          {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
                        </span>
                      )}
                      <span style={{ color: '#4b5563' }}>
                        Assigned: {getUserName(task.assignedUserId)}
                        {getUserPhone(task.assignedUserId) && (
                          <div style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                            
                          </div>
                        )}
                      </span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Hours"
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
                            opacity: task.timeLogs?.some((log) => log.date === today) ? '0.5' : '1',
                          }}
                          onClick={() => handleSubmitTime(task.id)}
                          disabled={!!task.timeLogs?.some((log) => log.date === today)}
                        >
                          Log Time
                        </button>
                      </div>
                    </div>
                    {task.timeLogs && task.timeLogs.length > 0 && (
                      <p style={{ marginTop: '8px', color: '#4b5563', fontSize: '14px' }}>
                        Logged: {task.timeLogs[task.timeLogs.length - 1].hours} hr
                        {task.timeLogs[task.timeLogs.length - 1].hours !== 1 ? 's' : ''} on{' '}
                        {task.timeLogs[task.timeLogs.length - 1].date}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Section */}
        <div id="overdue-section" style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
            Overdue <span style={{ fontSize: '14px', color: '#6b7280' }}>({overdueTasks.length})</span>
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {overdueTasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No overdue tasks</p>
            ) : (
              overdueTasks.map((task) => (
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
                    <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>{task.title}</h4>
                    {task.description && <p style={{ color: '#4b5563', fontSize: '14px' }}>{task.description}</p>}
                    <div style={{ display: 'grid', gap: '4px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '500', color: getDueStatus(task.dueDate) }}>
                        Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
                      </span>
                      {task.frequency && (
                        <span style={{ color: '#4b5563' }}>
                          Frequency: {task.frequency}
                          {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
                        </span>
                      )}
                      <span style={{ color: '#4b5563' }}>
                        Assigned: {getUserName(task.assignedUserId)}
                        {getUserPhone(task.assignedUserId) && (
                          <div style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                            
                          </div>
                        )}
                      </span>
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Section */}
        <div id="completed-section">
          <h3 style={{ fontSize: '20px', fontWeight: '500', color: '#374151', marginBottom: '16px' }}>
            Completed <span style={{ fontSize: '14px', color: '#6b7280' }}>({completedTasks.length})</span>
          </h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {completedTasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No completed tasks</p>
            ) : (
              completedTasks.map((task) => (
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
                    <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>{task.title}</h4>
                    {task.description && <p style={{ color: '#4b5563', fontSize: '14px' }}>{task.description}</p>}
                    <div style={{ display: 'grid', gap: '4px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '500', color: getDueStatus(task.dueDate) }}>
                        Due: {formatDateTime(task.dueDate.split('T')[0], task.dueDate.split('T')[1]?.slice(0, 5) || '00:00')}
                      </span>
                      {task.frequency && (
                        <span style={{ color: '#4b5563' }}>
                          Frequency: {task.frequency}
                          {task.frequency === 'date-wise' && task.repeatDate ? ` (Repeat: ${task.repeatDate})` : ''}
                        </span>
                      )}
                      <span style={{ color: '#4b5563' }}>
                        Assigned: {getUserName(task.assignedUserId)}
                        {getUserPhone(task.assignedUserId) && (
                          <div style={{ display: 'inline-flex', marginLeft: '4px', gap: '4px' }}>
                            
                          </div>
                        )}
                      </span>
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;